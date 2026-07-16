const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";

const allRoutes = [
  "/egzersizler/adam-asmaca",
  "/egzersizler/anlama-testi",
  "/egzersizler/ayni-olani-yakala",
  "/egzersizler/benzer-kelimeler",
  "/egzersizler/blok-okuma",
  "/egzersizler/cift-tarafli-odak",
  "/egzersizler/dikkat-labirenti",
  "/egzersizler/golgeleme",
  "/egzersizler/gorsel-puzzle",
  "/egzersizler/goz-beyin",
  "/egzersizler/goz-calismasi",
  "/egzersizler/goz-egzersizleri-kolonlar",
  "/egzersizler/goz-kaslari",
  "/egzersizler/gruplama-calismasi",
  "/egzersizler/hafiza-gelistirme",
  "/egzersizler/harf-rakam-sayma",
  "/egzersizler/kare-gorme-alani",
  "/egzersizler/kart-eslestirme",
  "/egzersizler/kart-hafiza",
  "/egzersizler/kelime-bulma",
  "/egzersizler/kelime-tahmin",
  "/egzersizler/odakli-okuma",
  "/egzersizler/parcali-resim-kelime",
  "/egzersizler/takistoskop",
];
const routes = process.env.TEST_ROUTES
  ? process.env.TEST_ROUTES.split(",").filter(Boolean)
  : allRoutes;

const viewports = [
  [1366, 768], [1440, 900], [1920, 1080],
  [768, 1024], [390, 844], [844, 390],
];

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timer } = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(timer);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  return async (method, params = {}, sessionId) => {
    await ready;
    const requestId = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`CDP komutu zaman aşımına uğradı: ${method}`));
      }, 10000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
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

async function clickVisibleButton(pattern) {
  const rect = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => {
      const style = getComputedStyle(item);
      return ${pattern}.test(item.textContent || '') && style.display !== 'none' && style.visibility !== 'hidden' && item.getBoundingClientRect().width > 0;
    });
    if (!button) return null;
    const box = button.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  })()`);
  if (!rect) return false;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  return true;
}

const versionResponse = await fetch(`${cdpUrl}/json/version`);
if (!versionResponse.ok) throw new Error(`Chrome bağlantısı kurulamadı: ${versionResponse.status}`);
const version = await versionResponse.json();
const rawSend = connect(version.webSocketDebuggerUrl);
const { targetId } = await rawSend("Target.createTarget", { url: "about:blank" });
const { sessionId } = await rawSend("Target.attachToTarget", { targetId, flatten: true });
const send = (method, params = {}) => rawSend(method, params, sessionId);
await send("Page.enable");
await send("Runtime.enable");

const failures = [];
for (const route of routes) {
  console.log(`Testing ${route}`);
  for (const [viewportIndex, [width, height]] of viewports.entries()) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 900 });
    await send("Page.navigate", { url: `${baseUrl}${route}` });
    await waitFor("document.readyState === 'complete' && document.body.childElementCount > 0");
    await waitFor("Boolean(document.querySelector('.fixed-exercise-stage'))", 4000);
    const result = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const stage = document.querySelector('.fixed-exercise-stage');
        return {
          pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          hasStage: Boolean(stage),
          stageOverflow: stage ? stage.scrollWidth > stage.clientWidth : null,
          stageWidth: stage?.scrollWidth ?? null,
          stageClientWidth: stage?.clientWidth ?? null,
          hasToolbar: Boolean(stage?.querySelector('.exercise-stage__toolbar, .fixed-exercise-stage__topbar')),
          hasArea: Boolean(stage?.querySelector('.fixed-exercise-stage__area')),
          hasBottom: Boolean(stage?.querySelector('.fixed-exercise-stage__bottom')),
          hasFullscreen: Boolean([...stage?.querySelectorAll('button') ?? []].find((button) => /tam ekran/i.test(button.textContent || ''))),
          hasExit: Boolean([...document.querySelectorAll('button')].find((button) => /çıkış|cikis/i.test(button.textContent || ''))),
          hasSettingsDialog: Boolean(document.querySelector('[role="dialog"]')),
          title: document.title,
          bodyText: (document.body.innerText || '').slice(0, 120),
        };
      })()`,
    });
    const data = result.result.value;
    if (data.pageOverflow || data.stageOverflow || !data.hasStage || !data.hasToolbar || !data.hasArea || !data.hasBottom || !data.hasFullscreen || !data.hasExit || data.hasSettingsDialog) {
      failures.push({ route, viewport: `${width}x${height}`, ...data });
    }

    if (viewportIndex === 0 && data.hasFullscreen) {
      const stageBeforeSetting = await evaluate(`(() => {
        const rect = document.querySelector('.fixed-exercise-stage')?.getBoundingClientRect();
        const select = [...document.querySelectorAll('.fixed-exercise-stage__bottom select')].find((item) => !item.disabled && item.options.length > 1 && getComputedStyle(item).display !== 'none');
        if (!rect || !select) return { rect: rect ? { width: rect.width, height: rect.height } : null, changed: false };
        const next = [...select.options].find((option) => option.value !== select.value);
        if (!next) return { rect: { width: rect.width, height: rect.height }, changed: false };
        select.value = next.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return { rect: { width: rect.width, height: rect.height }, changed: true };
      })()`);
      if (stageBeforeSetting.changed) {
        await sleep(150);
        const stageAfterSetting = await evaluate(`(() => { const rect = document.querySelector('.fixed-exercise-stage')?.getBoundingClientRect(); return rect ? { width: rect.width, height: rect.height } : null; })()`);
        if (!stageAfterSetting || Math.abs(stageBeforeSetting.rect.width - stageAfterSetting.width) > 1 || Math.abs(stageBeforeSetting.rect.height - stageAfterSetting.height) > 1) {
          failures.push({ route, viewport: `${width}x${height}`, stageChangedAfterSetting: true, before: stageBeforeSetting.rect, after: stageAfterSetting });
        }
      }

      const clicked = await clickVisibleButton("/tam ekran$/i");
      const entered = clicked && await waitFor("Boolean(document.fullscreenElement)", 2500);
      const fullscreenChrome = entered && await evaluate("Boolean(document.fullscreenElement?.querySelector('.fixed-exercise-stage__topbar') && document.fullscreenElement?.querySelector('.fixed-exercise-stage__bottom'))");
      if (!entered || !fullscreenChrome) failures.push({ route, viewport: `${width}x${height}`, fullscreen: false });
      if (entered) {
        await clickVisibleButton("/tam ekrandan çık/i");
        await waitFor("!document.fullscreenElement", 2500);
      }
    }
  }

  const exitClicked = await clickVisibleButton("/çıkış|cikis/i");
  const exited = exitClicked && await waitFor("location.pathname === '/egzersizler'", 3000);
  if (!exited) failures.push({ route, exitNavigation: false, pathname: await evaluate("location.pathname") });
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
} else {
  console.log(`PASS: ${routes.length} egzersiz × ${viewports.length} viewport = ${routes.length * viewports.length} taşma kontrolü`);
  process.exit(0);
}
