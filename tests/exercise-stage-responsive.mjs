const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const allRoutes = [
  "/egzersizler/takistoskop",
  "/egzersizler/parcali-resim-kelime",
  "/egzersizler/goz-kaslari",
  "/egzersizler/kare-gorme-alani",
  "/egzersizler/cift-tarafli-odak",
  "/egzersizler/kart-hafiza",
  "/egzersizler/blok-okuma",
  "/egzersizler/harf-rakam-sayma",
];
const routes = process.env.TEST_ROUTES
  ? process.env.TEST_ROUTES.split(",").filter(Boolean)
  : allRoutes;

const viewports = [
  [360, 640], [375, 667], [390, 844], [412, 915],
  [768, 1024], [820, 1180], [1366, 768], [1440, 900], [1920, 1080],
  [667, 375], [844, 390],
];

async function createPage() {
  const response = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Chrome target oluşturulamadı: ${response.status}`);
  return response.json();
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  return async (method, params = {}) => {
    await ready;
    const requestId = ++id;
    socket.send(JSON.stringify({ id: requestId, method, params }));
    return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return true;
    await sleep(100);
  }
  return false;
}

const target = await createPage();
const send = connect(target.webSocketDebuggerUrl);
await send("Page.enable");
await send("Runtime.enable");

const failures = [];
for (const route of routes) {
  console.log(`Testing ${route}`);
  for (const [width, height] of viewports) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 900 });
    await send("Page.navigate", { url: `${baseUrl}${route}` });
    await waitFor("document.readyState === 'complete' && document.body.childElementCount > 0");
    await send("Runtime.evaluate", {
      expression: `(() => {
        const buttons = [...document.querySelectorAll('button')];
        const start = buttons.find((button) => /başla|basla|eğitime|egitime|çalışmayı|calismayi/i.test(button.textContent || ''));
        start?.click();
      })()`,
    });
    await waitFor("Boolean(document.querySelector('.exercise-stage'))", 2500);
    const hasQuickSettings = await evaluate("Boolean(document.querySelector('.exercise-stage__quick-settings'))");
    await evaluate(`(() => {
      const settings = [...document.querySelectorAll('button')].find((button) => /ayarlar/i.test(button.textContent || ''));
      settings?.click();
    })()`);
    await waitFor("Boolean(document.querySelector('[role=\"dialog\"]'))", 1000);
    const result = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const stage = document.querySelector('.exercise-stage');
        return {
          pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          hasStage: Boolean(stage),
          stageOverflow: stage ? stage.scrollWidth > stage.clientWidth : null,
          stageWidth: stage?.scrollWidth ?? null,
          stageClientWidth: stage?.clientWidth ?? null,
          hasToolbar: Boolean(stage?.querySelector('.exercise-stage__toolbar')),
          hasExit: Boolean([...document.querySelectorAll('button')].find((button) => /çıkış|cikis/i.test(button.textContent || ''))),
          hasSettingsDialog: Boolean(document.querySelector('[role="dialog"]')),
          title: document.title,
          bodyText: (document.body.innerText || '').slice(0, 120),
        };
      })()`,
    });
    const data = result.result.value;
    data.hasQuickSettings = hasQuickSettings;
    if (data.pageOverflow || data.stageOverflow || !data.hasStage || !data.hasToolbar || !data.hasExit || !data.hasSettingsDialog || !data.hasQuickSettings) {
      failures.push({ route, viewport: `${width}x${height}`, ...data });
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
} else {
  console.log(`PASS: ${routes.length} egzersiz × ${viewports.length} viewport = ${routes.length * viewports.length} taşma kontrolü`);
  process.exit(0);
}
