// Rebuild the original share artwork. Normal site builds use the committed PNG.
import { pathToFileURL } from "node:url";
import { hamsterLogo, wheelArt } from "../src/art.ts";
const { chromium } = await import(
  process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.argv[3] ? { executablePath: process.argv[3] } : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><html lang="en"><head><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#1A1A20;color:#F3EEE5;font-family:Arial,sans-serif}.brand{display:flex;align-items:center;gap:14px;font-size:26px;font-weight:bold;position:absolute;left:64px;top:52px}.brand svg{width:48px;height:48px}.brand span span{color:#F5BA69}.copy{position:absolute;left:68px;top:172px;max-width:650px}h1{font-size:66px;line-height:1.12;margin:0;letter-spacing:-2px}h1 span{color:#F5BA69}p{font-size:23px;line-height:1.6;margin-top:24px;color:#B5B3BD}.note{font-size:18px;margin-top:40px;color:#A4D9BD}.wheel{position:absolute;right:55px;top:128px;width:340px}.wheel-art{width:100%;height:auto}.eye-sleep,.sleep-z{display:none}.bottom{position:absolute;bottom:50px;left:68px;right:68px;height:2px;background:#41414C}.square{width:7px;height:7px;background:#A4D9BD;position:absolute}.s1{right:98px;top:111px}.s2{right:395px;top:193px;background:#F5BA69}.s3{right:90px;top:472px;background:#BCADF0}</style></head><body><div class="brand">${hamsterLogo()}<span>Wheel<span>Cheer</span></span></div><div class="copy"><h1>Your stream’s<br><span>little sidekick.</span></h1><p>A free live hamster overlay<br>for OBS and Streamlabs.</p><div class="note">Live wheel. Chat predictions. Big cheers.</div></div><div class="wheel">${wheelArt()}</div><i class="square s1"></i><i class="square s2"></i><i class="square s3"></i><div class="bottom"></div></body></html>`,
  );
  await page.screenshot({ path: "public/share-card.png", type: "png" });
  console.log("Generated original 1200 × 630 share card.");
} finally {
  await browser.close();
}
