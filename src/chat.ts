export type ChatStatus =
  | "off"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "unavailable";
export interface ChatMessage {
  user: string;
  name: string;
  command: "run" | "sleep" | "squeek";
}
export function parseMessage(
  line: string,
  channel: string,
): ChatMessage | null {
  const match = line.match(
    /^(?:@([^ ]+) )?:([a-z0-9_]+)![^ ]+ PRIVMSG #([a-z0-9_]+) :(.+)$/i,
  );
  if (!match || match[3].toLowerCase() !== channel) return null;
  const command = match[4]
    .trim()
    .match(/^!(run|sleep|squeek)$/i)?.[1]
    ?.toLowerCase() as ChatMessage["command"] | undefined;
  if (!command) return null;
  const tags = Object.fromEntries(
    (match[1] ?? "").split(";").map((t) => {
      const at = t.indexOf("=");
      return [t.slice(0, at), t.slice(at + 1)];
    }),
  );
  const display = tags["display-name"]
    ?.replace(/\\s/g, " ")
    .replace(/\\:/g, ";")
    .replace(/\\\\/g, "\\");
  return { user: match[2].toLowerCase(), name: display || match[2], command };
}
export class TwitchChat {
  status: ChatStatus = "off";
  private socket: WebSocket | null = null;
  private reconnect: ReturnType<typeof setTimeout> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private attempts = 0;
  private channel: string;
  private onMessage: (message: ChatMessage) => void;
  private onStatus: (status: ChatStatus) => void;
  constructor(
    channel: string,
    onMessage: (message: ChatMessage) => void,
    onStatus: (status: ChatStatus) => void,
  ) {
    this.channel = channel;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }
  start(): void {
    if (!this.channel) return;
    this.stopped = false;
    this.connect();
  }
  stop(): void {
    this.stopped = true;
    if (this.reconnect) clearTimeout(this.reconnect);
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
    this.setStatus("off");
  }
  private setStatus(status: ChatStatus): void {
    this.status = status;
    this.onStatus(status);
  }
  private connect(): void {
    if (this.stopped) return;
    this.setStatus(this.attempts ? "reconnecting" : "connecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket("wss://irc-ws.chat.twitch.tv");
    } catch {
      this.setStatus("unavailable");
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    const nick = `justinfan${(crypto.getRandomValues(new Uint32Array(1))[0] % 900000) + 100000}`;
    let buffer = "";
    let lastReceive = Date.now();
    socket.onopen = () => {
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands\r\n");
      socket.send(`NICK ${nick}\r\n`);
      socket.send(`JOIN #${this.channel}\r\n`);
      this.heartbeat = setInterval(() => {
        if (Date.now() - lastReceive > 180_000) {
          socket.close();
          return;
        }
        if (socket.readyState === WebSocket.OPEN)
          socket.send("PING :wheel-cheer\r\n");
      }, 60_000);
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      lastReceive = Date.now();
      buffer += event.data;
      if (buffer.length > 131_072) {
        socket.close();
        return;
      }
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("PING ")) {
          socket.send(`PONG ${line.slice(5)}\r\n`);
          continue;
        }
        if (
          line.includes(` 366 ${nick} #${this.channel} `) ||
          (line.startsWith(`:${nick}!`) &&
            line.includes(` JOIN #${this.channel}`))
        ) {
          this.attempts = 0;
          this.setStatus("connected");
        }
        if (/ RECONNECT(?: |$)/.test(line)) {
          socket.close();
          continue;
        }
        const message = parseMessage(line, this.channel);
        if (message) this.onMessage(message);
      }
    };
    socket.onerror = () => this.setStatus("unavailable");
    socket.onclose = () => {
      if (this.heartbeat) clearInterval(this.heartbeat);
      this.heartbeat = null;
      if (!this.stopped) this.scheduleReconnect();
    };
  }
  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.setStatus("reconnecting");
    const delay = Math.min(60_000, 2000 * 2 ** Math.min(this.attempts++, 5));
    this.reconnect = setTimeout(() => this.connect(), delay);
  }
}
export class SqueekCooldown {
  private last = -Infinity;
  trigger(now = Date.now()): boolean {
    if (now - this.last < 30_000) return false;
    this.last = now;
    return true;
  }
}
