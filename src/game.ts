import { finite, integer, usable } from "./model.ts";
import type { Feed, Json, Snapshot } from "./model.ts";
export type Vote = "run" | "sleep";
export interface Score {
  name: string;
  correct: number;
}
interface Round {
  votes: Record<string, { name: string; vote: Vote }>;
  knownRun: boolean;
  result?: Vote;
  awarded?: boolean;
}
interface SavedGame {
  version: 1;
  rounds: Record<string, Round>;
  scores: Record<string, Score>;
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface Reveal {
  round: number;
  result: Vote;
  correct: number;
  at: number;
}
export class ChatGame {
  rounds: Record<string, Round> = Object.create(null);
  scores: Record<string, Score> = Object.create(null);
  reveal: Reveal | null = null;
  activeRound: number | null = null;
  storageAvailable = true;
  private storage: StorageLike | null;
  private key: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAnchor: { through: number; work: bigint } | null = null;
  constructor(
    channel: string,
    session: string,
    installation: string,
    storage: StorageLike | null,
  ) {
    this.storage = storage;
    this.key = `wheel-cheer:v1:${installation}:${channel}:${session}`;
    this.storageAvailable = storage !== null;
    try {
      const saved = JSON.parse(
        storage?.getItem(this.key) ?? "null",
      ) as SavedGame | null;
      if (saved?.version === 1) {
        for (const [id, value] of Object.entries(saved.rounds ?? {}).slice(
          -144,
        )) {
          if (!/^\d+$/.test(id) || !value || typeof value.votes !== "object")
            continue;
          const votes: Round["votes"] = Object.create(null);
          for (const [user, v] of Object.entries(value.votes).slice(0, 10_000))
            if (
              /^[a-z0-9_]{1,25}$/.test(user) &&
              v &&
              (v.vote === "run" || v.vote === "sleep")
            )
              votes[user] = { name: String(v.name).slice(0, 25), vote: v.vote };
          this.rounds[id] = {
            votes,
            knownRun: value.knownRun === true,
            result:
              value.result === "run" || value.result === "sleep"
                ? value.result
                : undefined,
            awarded: value.awarded === true,
          };
        }
        for (const [id, score] of Object.entries(saved.scores ?? {}).slice(
          0,
          10_000,
        ))
          if (
            /^[a-z0-9_]{1,25}$/.test(id) &&
            score &&
            Number.isSafeInteger(score.correct) &&
            score.correct >= 0
          )
            this.scores[id] = {
              name: String(score.name).slice(0, 25),
              correct: score.correct,
            };
      }
    } catch {
      this.storageAvailable = false;
    }
  }
  vote(
    user: string,
    display: string,
    vote: Vote,
    round: number | null,
  ): boolean {
    if (
      round === null ||
      round !== this.activeRound ||
      !/^[a-z0-9_]{1,25}$/.test(user)
    )
      return false;
    const entry = this.getRound(round);
    if (entry.awarded || entry.result) return false;
    if (!entry.votes[user] && Object.keys(entry.votes).length >= 10_000)
      return false;
    entry.votes[user] = { name: display.slice(0, 25), vote };
    this.scheduleSave();
    return true;
  }
  counts(): { run: number; sleep: number } {
    const counts = { run: 0, sleep: 0 };
    if (this.activeRound !== null)
      for (const item of Object.values(
        this.rounds[this.activeRound]?.votes ?? {},
      ))
        counts[item.vote]++;
    return counts;
  }
  top(): Score[] {
    return Object.values(this.scores)
      .filter((s) => s.correct > 0)
      .sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name))
      .slice(0, 10);
  }
  pending(): number {
    return Object.entries(this.rounds).filter(
      ([id, r]) =>
        this.activeRound !== null &&
        Number(id) < this.activeRound &&
        !r.awarded &&
        Object.keys(r.votes).length > 0,
    ).length;
  }
  ingest(snapshot: Snapshot, feed: Feed): void {
    this.activeRound = snapshot.round;
    if (!snapshot.online || snapshot.round === null) return;
    const current = this.getRound(snapshot.round);
    const status = usable(feed.status, Date.now());
    const core = usable(feed.core, Date.now());
    const snapshotRound = snapshot.round;
    const generated = Date.parse(status?.generatedAt ?? "");
    const roundStart =
      snapshot.roundEndsAt === null ? Infinity : snapshot.roundEndsAt - 600_000;
    if (
      generated >= roundStart &&
      generated < roundStart + 600_000 &&
      integer(status?.builder?.queued?.openRoundWorkUnits) !== null &&
      integer(status?.builder?.queued?.openRoundWorkUnits)! > 0n
    )
      current.knownRun = true;
    const settled = snapshot.settledThrough;
    if (settled === null) return;
    const outcomes = new Map<number, Vote>();
    if (
      core?.installationId === snapshot.installation &&
      Array.isArray(core?.events)
    ) {
      for (const event of core.events) {
        if (!event || typeof event !== "object") continue;
        const args: Json = Object.fromEntries(
          (Array.isArray(event.arguments) ? event.arguments : []).map(
            (a: Json) => [a?.name, a?.value],
          ),
        );
        if (event.eventName === "RoundRecorded") {
          const id = finite(args.roundId),
            work = integer(args.work);
          if (id !== null && work !== null)
            outcomes.set(id, work > 0n ? "run" : "sleep");
        }
        if (event.eventName === "BatchSettled") {
          const before = finite(args.previousSettledThroughRound),
            through = finite(args.settledThroughRound),
            active = finite(args.activeRoundCount);
          if (
            before === null ||
            through === null ||
            active === null ||
            through - before > 144 ||
            through <= before
          )
            continue;
          if (active === 0 || active === through - before)
            for (let id = before + 1; id <= through; id++)
              outcomes.set(id, active === 0 ? "sleep" : "run");
        }
      }
    }
    const work = integer(status?.builder?.anchor?.cumulativeWork);
    if (
      work !== null &&
      this.lastAnchor &&
      settled > this.lastAnchor.through &&
      work >= this.lastAnchor.work
    ) {
      const delta = work - this.lastAnchor.work;
      if (
        settled - this.lastAnchor.through <= 144 &&
        (delta === 0n || settled - this.lastAnchor.through === 1)
      ) {
        for (let id = this.lastAnchor.through + 1; id <= settled; id++)
          outcomes.set(id, delta > 0n ? "run" : "sleep");
      }
    }
    if (work !== null) this.lastAnchor = { through: settled, work };
    for (const [key, entry] of Object.entries(this.rounds)) {
      const round = Number(key);
      if (entry.awarded || round >= snapshotRound || round > settled) continue;
      const result = outcomes.get(round) ?? (entry.knownRun ? "run" : null);
      if (result) this.resolve(round, result, snapshot.now);
      // Ambiguous batches are left unknown. Never infer sleeping from absent movement.
    }
    for (const key of Object.keys(this.rounds))
      if (Number(key) < snapshotRound - 144) delete this.rounds[key];
    this.scheduleSave();
  }
  resolve(round: number, result: Vote, at = Date.now()): void {
    const entry = this.rounds[round];
    if (!entry || entry.awarded) return;
    entry.result = result;
    entry.awarded = true;
    let correct = 0;
    for (const [id, v] of Object.entries(entry.votes))
      if (v.vote === result) {
        if (!this.scores[id] && Object.keys(this.scores).length >= 10_000)
          continue;
        const score = this.scores[id] ?? { name: v.name, correct: 0 };
        this.scores[id] = { name: v.name, correct: score.correct + 1 };
        correct++;
      }
    this.reveal = { round, result, correct, at };
    entry.votes = Object.create(null);
    this.scheduleSave();
  }
  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.storage) return;
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({
          version: 1,
          rounds: this.rounds,
          scores: this.scores,
        }),
      );
    } catch {
      this.storageAvailable = false;
    }
  }
  private getRound(id: number): Round {
    return (
      this.rounds[id] ??
      (this.rounds[id] = { votes: Object.create(null), knownRun: false })
    );
  }
  private scheduleSave(): void {
    this.saveTimer ??= setTimeout(() => this.flush(), 750);
  }
}
export function safeStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
