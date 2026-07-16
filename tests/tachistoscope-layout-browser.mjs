import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targetResponse = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
assert.equal(targetResponse.ok, true, `Chrome hedefi oluşturulamadı: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const browserErrors = [];
let id = 0;

const ready = new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) {
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
    return;
  }
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
};

async function send(method, params = {}) {
  await ready;
  const requestId = ++id;
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await sleep(75);
  }
  throw new Error(`Koşul zaman aşımı: ${expression}`);
}

const normalize = `(value) => (value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("tr-TR").replace(/ı/g, "i")`;

async function clickButton(text) {
  const clicked = await evaluate(`(() => {
    const clean = ${normalize};
    const button = [...document.querySelectorAll("button")].find((item) => clean(item.textContent).includes(${JSON.stringify(text)}));
    button?.click();
    return Boolean(button);
  })()`);
  assert.equal(clicked, true, `Buton bulunamadı: ${text}`);
}

async function setSetting(label, value) {
  const changed = await evaluate(`(() => {
    const clean = ${normalize};
    const field = [...document.querySelectorAll('.fixed-exercise-stage__bottom label')]
      .find((item) => clean(item.querySelector("span")?.textContent).includes(${JSON.stringify(label)}));
    const select = field?.querySelector("select");
    if (!select) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, ${JSON.stringify(value)});
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `Ayar bulunamadı: ${label}`);
}

async function answer(value) {
  const submitted = await evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Gordugun kelimeyi yaz"]');
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    return true;
  })()`);
  assert.equal(submitted, true, "Cevap alanı bulunamadı");
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: `${baseUrl}/egzersizler/takistoskop` });
await waitFor("document.readyState === 'complete' && document.body.childElementCount > 0", 10000);
await waitFor("Boolean(document.querySelector('.fixed-exercise-stage'))");

const readyLayout = await evaluate(`(() => {
  const clean = ${normalize};
  const startButtons = [...document.querySelectorAll("button")].filter((item) => clean(item.textContent).includes("calismayi baslat"));
  const main = document.querySelector(".fixed-exercise-stage__area");
  const stage = document.querySelector(".fixed-exercise-stage");
  return {
    selectCount: document.querySelectorAll("select").length,
    footerSelectCount: document.querySelectorAll(".fixed-exercise-stage__bottom select").length,
    startButtonCount: startButtons.length,
    toolbarText: document.querySelector(".fixed-exercise-stage__topbar")?.innerText ?? "",
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    contentOverflow: main ? main.scrollWidth > main.clientWidth + 1 || main.scrollHeight > main.clientHeight + 1 : true,
    contentOverflowY: main ? getComputedStyle(main).overflowY : "missing",
    stageWidth: stage?.getBoundingClientRect().width ?? 0,
    stageHeight: stage?.getBoundingClientRect().height ?? 0,
  };
})()`);

assert.equal(readyLayout.selectCount, 4);
assert.equal(readyLayout.footerSelectCount, 4);
assert.equal(readyLayout.startButtonCount, 1);
assert.match(readyLayout.toolbarText, /Seviye/);
assert.match(readyLayout.toolbarText, /Skor/);
assert.match(readyLayout.toolbarText, /Süre|Sure/);
assert.match(readyLayout.toolbarText, /Doğru|Dogru/);
assert.equal(readyLayout.horizontalOverflow, false);
assert.equal(readyLayout.contentOverflow, false, JSON.stringify(readyLayout));

await clickButton("ayarlar");
assert.equal(await evaluate("document.activeElement?.tagName"), "SELECT");
assert.equal(await evaluate("Boolean(document.querySelector('[role=dialog]'))"), false);
const initialStageSize = await evaluate(`(() => { const rect = document.querySelector('.fixed-exercise-stage').getBoundingClientRect(); return { width: rect.width, height: rect.height }; })()`);
await setSetting("hiz", "1000");
await setSetting("seviye", "5");
await setSetting("calisma sekli", "manual");
await sleep(100);
const changedStageSize = await evaluate(`(() => { const rect = document.querySelector('.fixed-exercise-stage').getBoundingClientRect(); return { width: rect.width, height: rect.height }; })()`);
assert.deepEqual(changedStageSize, initialStageSize);

if (await evaluate("document.fullscreenEnabled")) {
  await clickButton("tam ekran");
  await waitFor("Boolean(document.fullscreenElement)");
  assert.equal(await evaluate("Boolean(document.fullscreenElement.querySelector('.fixed-exercise-stage__topbar') && document.fullscreenElement.querySelector('.fixed-exercise-stage__bottom'))"), true);
  await waitFor(`(() => { const clean = ${normalize}; return [...document.querySelectorAll("button")].some((item) => clean(item.textContent).includes("tam ekrandan cik")); })()`);
  await clickButton("tam ekrandan cik");
  await waitFor("!document.fullscreenElement");
}

await clickButton("calismayi baslat");
await waitFor("Boolean(document.querySelector('[data-testid=tachistoscope-word]'))");
const manualWord = await evaluate("document.querySelector('[data-testid=tachistoscope-word]').textContent.trim()");
await waitFor("Boolean(document.querySelector('input[aria-label=\"Gordugun kelimeyi yaz\"]'))", 2500);
await answer(manualWord);
await waitFor(`(() => { const clean = ${normalize}; return [...document.querySelectorAll("button")].some((item) => clean(item.textContent).includes("sonraki")); })()`);
await clickButton("sonraki");
await waitFor("Boolean(document.querySelector('[data-testid=tachistoscope-word]'))");

await setSetting("calisma sekli", "automatic");
const automaticWord = await evaluate("document.querySelector('[data-testid=tachistoscope-word]').textContent.trim()");
await waitFor("Boolean(document.querySelector('input[aria-label=\"Gordugun kelimeyi yaz\"]'))", 2500);
await answer(automaticWord);
await waitFor("Boolean(document.querySelector('[data-testid=tachistoscope-word]'))", 2500);

assert.equal(await evaluate("document.querySelectorAll('.fixed-exercise-stage__bottom select').length"), 4);
assert.equal(await evaluate("document.documentElement.scrollWidth > window.innerWidth"), false);
assert.deepEqual(browserErrors, []);

await clickButton("bitir");
await waitFor("location.pathname === '/sonuc'");
assert.equal(await evaluate(`(() => {
  const results = JSON.parse(localStorage.getItem("idil-exercise-results") || "[]");
  return results.some((item) => item.exerciseType === "tachistoscope");
})()`), true);

await send("Page.navigate", { url: `${baseUrl}/egzersizler/takistoskop` });
await waitFor("Boolean(document.querySelector('.fixed-exercise-stage'))");
await clickButton("cikis");
await waitFor("location.pathname === '/egzersizler'");
console.log("Tachistoscope layout browser test passed.");
process.exit(0);
