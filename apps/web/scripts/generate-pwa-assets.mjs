// Renders the Groundplan app mark into every PWA asset: app icons, the maskable icon, the Apple touch icon,
// the favicon and iOS launch screens (light + dark). Run from apps/web: `node scripts/generate-pwa-assets.mjs`.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PALETTE = {
  light: {
    page: "#f4f3ee",
    tile: "#dfe8d6",
    house: "#fbfaf6",
    line: "#1f2622",
    garage: "#ecdccd",
    garageLine: "#7a3f22",
    door: "#b0643f",
    tree: "#7fa572",
    bed: "#c9d9bd",
    bedLine: "#9fb894",
    room: "#f2c66d",
    roomDim: "#f6e3b4",
    ink: "#1f2622",
    sub: "#5f6a62",
  },
  dark: {
    page: "#161b18",
    tile: "#223026",
    house: "#171d19",
    line: "#ecebe4",
    garage: "#35261d",
    garageLine: "#e7a582",
    door: "#e08a5f",
    tree: "#7fa572",
    bed: "#2e4632",
    bedLine: "#3b5a40",
    room: "#f2c66d",
    roomDim: "#6b5a2f",
    ink: "#ecebe4",
    sub: "#8b958e",
  },
};

/** The J4/J7 plan mark: garden tile, tree, house with lit rooms, garage with its door, a raised bed. */
function mark(theme, { radius = "22%", shadow = true } = {}) {
  const c = PALETTE[theme];
  const a = (style) => `<div style="position:absolute;${style}"></div>`;
  return `<div style="position:relative;width:100%;height:100%;border-radius:${radius};background:${c.tile};overflow:hidden;${shadow ? "box-shadow:0 6% 14% -6% rgba(31,38,34,.4);" : ""}">
    ${a(`left:58%;top:8%;width:30%;height:30%;border-radius:50%;background:${c.tree}`)}
    ${a(`left:12%;top:12%;width:16%;height:16%;border-radius:12%;background:${c.bed};border:1px solid ${c.bedLine};box-sizing:border-box`)}
    ${a(`left:10%;top:40%;width:52%;height:48%;background:${c.house};border:max(1.5px,2.5cqw) solid ${c.line};border-radius:4%;box-sizing:border-box`)}
    ${a(`left:14%;top:44%;width:20%;height:18%;background:${c.room}`)}
    ${a(`left:37%;top:44%;width:21%;height:18%;background:${c.roomDim}`)}
    ${a(`left:14%;top:65%;width:44%;height:19%;background:${c.room}`)}
    ${a(`left:35.5%;top:42%;width:1.5%;height:44%;background:${c.line};opacity:.5`)}
    ${a(`left:66%;top:48%;width:26%;height:40%;background:${c.garage};border:max(1.5px,2.5cqw) solid ${c.garageLine};border-radius:4%;box-sizing:border-box`)}
    ${a(`left:70%;top:74%;width:18%;height:14%;background:${c.door}`)}
  </div>`;
}

const page = (body, bg = "transparent") => `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Red+Hat+Mono:wght@400&display=block" rel="stylesheet">
<style>html,body{margin:0;width:100%;height:100%;background:${bg}}*{box-sizing:border-box}.box{container-type:inline-size;position:absolute}</style>
</head><body>${body}</body></html>`;

// [file, size, html]
const icons = [
  [
    "public/icons/icon-192.png",
    192,
    page(`<div class="box" style="inset:4%">${mark("light", { shadow: false })}</div>`),
  ],
  [
    "public/icons/icon-512.png",
    512,
    page(`<div class="box" style="inset:4%">${mark("light", { shadow: false })}</div>`),
  ],
  // Maskable: full-bleed tile, artwork inside the central 80% safe zone.
  [
    "public/icons/maskable-512.png",
    512,
    page(
      `<div class="box" style="inset:10%">${mark("light", { radius: "0", shadow: false })}</div>`,
      PALETTE.light.tile,
    ),
  ],
  // iOS rounds the corners itself and needs an opaque square.
  [
    "app/apple-icon.png",
    180,
    page(`<div class="box" style="inset:0">${mark("light", { radius: "0", shadow: false })}</div>`, PALETTE.light.tile),
  ],
  [
    "app/icon.png",
    64,
    page(`<div class="box" style="inset:2px">${mark("light", { radius: "20%", shadow: false })}</div>`),
  ],
];

// iOS launch screens: [cssWidth, cssHeight, pixelRatio], shared with app/layout.tsx's startup-image links.
const SPLASH_DEVICES = JSON.parse(await readFile(path.join(root, "lib/splash-devices.json"), "utf8"));

function splash(theme, w) {
  const c = PALETTE[theme];
  const size = Math.round(Math.min(w * 0.3, 200));
  return page(
    `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(size * 0.18)}px">
      <div class="box" style="position:relative;width:${size}px;height:${size}px">${mark(theme)}</div>
      <div style="font-family:'Young Serif',Georgia,serif;font-size:${Math.round(size * 0.24)}px;color:${c.ink}">Homebox</div>
    </div>`,
    c.page,
  );
}

const browser = await chromium.launch();
await mkdir(path.join(root, "public/icons"), { recursive: true });
await mkdir(path.join(root, "public/splash"), { recursive: true });
for (const [file, size, html] of icons) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.screenshot({ path: path.join(root, file), omitBackground: true });
  await p.close();
  console.log(file);
}
for (const [w, h, dpr] of SPLASH_DEVICES) {
  for (const theme of ["light", "dark"]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await p.setContent(splash(theme, w), { waitUntil: "networkidle" });
    const file = `public/splash/${theme}-${w * dpr}x${h * dpr}.png`;
    await p.screenshot({ path: path.join(root, file) });
    await p.close();
    console.log(file);
  }
}
await browser.close();
