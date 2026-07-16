import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const defaultRoutes = [
  "/egzersizler/blok-okuma",
  "/egzersizler/gruplama-calismasi",
  "/egzersizler/golgeleme",
  "/egzersizler/odakli-okuma",
];
const routes = process.env.TEST_ROUTES?.split(",").filter(Boolean) ?? defaultRoutes;

const testText = {
  id: "exercise-timer-browser-test",
  title: "Timer Test Metni",
  category: "Bilim",
  content: "bir iki üç dört beş altı yedi sekiz",
  wordCount: 8,
  characterCount: 29,
  isActive: true,
  createdAt: "2026-07-16T00:00:00.000Z",
  updatedAt: "2026-07-16T00:00:00.000Z",
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createPage() {
  const response = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
  assert.equal(response.ok, true, `Chrome hedefi oluşturulamadı: ${response.status}`);
  return response.json();
}

function connect(url, onEvent) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let requestId = 0;
  const ready = new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      onEvent(message);
      return;
    }
    if (!pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };

  return async (method, params = {}) => {
    await ready;
    const id = ++requestId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
}

const target = await createPage();
const browserErrors = [];
const send = connect(target.webSocketDebuggerUrl, (message) => {
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    browserErrors.push(message.params.entry.text);
  }
});

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Network.setBlockedURLs", { urls: ["*supabase*"] });
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `localStorage.setItem("idil_text_library", ${JSON.stringify(JSON.stringify([testText]))});`,
});

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text);
  }

  return response.result.value;
}

async function waitFor(expression, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Koşul zaman aşımına uğradı: ${expression}`);
}

const normalizeFunction = `(value) => (value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("tr-TR").replace(/ı/g, "i")`;

async function clickButton(textPart) {
  const clicked = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const button = [...document.querySelectorAll("button")]
      .find((item) => normalize(item.textContent).includes(${JSON.stringify(textPart)}));
    button?.click();
    return Boolean(button);
  })()`);
  if (!clicked) {
    console.error(await evaluate("document.body.innerText"));
  }
  assert.equal(clicked, true, `Buton bulunamadı: ${textPart}`);
}

async function setSelectByOptionText(optionText) {
  const changed = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const select = [...document.querySelectorAll("select")].find((item) =>
      [...item.options].some((option) => normalize(option.textContent).includes(${JSON.stringify(optionText)}))
    );
    if (!select) return false;
    const option = [...select.options].find((item) => normalize(item.textContent).includes(${JSON.stringify(optionText)}));
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  if (!changed) {
    console.error(await evaluate("document.body.innerText"));
  }
  assert.equal(changed, true, `Select seçeneği bulunamadı: ${optionText}`);
}

async function setSpeedValue(value) {
  const changed = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const label = [...document.querySelectorAll("label")].find((item) => {
      const title = normalize(item.querySelector("span")?.textContent);
      return title === "hiz" || title === "milisaniye" || title === "kelime / dakika";
    });
    const control = label?.querySelector("input, select");
    if (!control) return false;
    const prototype = control instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLSelectElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(control, ${JSON.stringify(String(value))});
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `Hız kontrolü bulunamadı: ${value}`);
}

async function clearReadingSpeedInput() {
  const cleared = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const label = [...document.querySelectorAll("label")].find((item) => {
      const title = normalize(item.querySelector("span")?.textContent);
      return title === "hiz" || title === "kelime / dakika";
    });
    const input = label?.querySelector("input");
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(cleared, true, "Okuma hızı alanı temizlenemedi");
  await sleep(100);
}

async function setGroupSize(value) {
  const changed = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const label = [...document.querySelectorAll("label")].find((item) => {
      const title = normalize(item.querySelector("span")?.textContent);
      return title === "grup" || title === "kelime sayisi";
    });
    const select = label?.querySelector("select");
    if (!select) return false;
    select.value = ${JSON.stringify(String(value))};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `Grup boyutu kontrolü bulunamadı: ${value}`);
}

async function activeText(route) {
  const selectors = route.includes("blok-okuma")
    ? [".fx-slide-up.mt-4.font-extrabold"]
    : route.includes("gruplama")
      ? ['[class*="0_0_0_2px"]']
      : [".fx-pulse-soft"];

  return evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selectors[0])})]
    .map((item) => (item.textContent || "").trim()).filter(Boolean).join(" "))()`);
}

for (const route of routes) {
  console.log(`Testing ${route}`);
  await send("Page.navigate", { url: `${baseUrl}${route}` });
  await waitFor("document.readyState === 'complete' && document.body.childElementCount > 0", 10000);
  await clickButton("egitime basla");
  await waitFor(`(() => {
    const normalize = ${normalizeFunction};
    if (normalize(document.body.innerText).includes("yukleniyor")) return false;
    return [...document.querySelectorAll("button")]
      .some((item) => normalize(item.textContent).includes("baslat") && !item.disabled);
  })()`, 20000);

  await setSelectByOptionText(route.includes("gruplama") ? "okuma hizi" : "kelime / dakika");
  await setGroupSize(2);
  await clearReadingSpeedInput();
  await setSpeedValue(50);
  await clickButton("baslat");
  await waitFor("Boolean(document.querySelector('.exercise-stage'))");

  const first = await activeText(route);
  if (!first) {
    console.error(await evaluate("document.body.innerText"));
  }
  assert.ok(first, `${route}: ilk öğe görünmedi`);
  await sleep(2650);
  const second = await activeText(route);
  assert.notEqual(second, first, `${route}: 50 WPM ile index ilerlemedi`);

  await clickButton("duraklat");
  const paused = await activeText(route);
  await sleep(1400);
  assert.equal(await activeText(route), paused, `${route}: duraklatma timer'ı temizlemedi`);

  await clickButton("devam et");
  await setSelectByOptionText("atlama hizi");
  await setSpeedValue(1100);
  await sleep(1300);
  assert.notEqual(await activeText(route), paused, `${route}: 1100 ms ile index ilerlemedi`);

  await sleep(2500);
  const bodyText = await evaluate("document.body.innerText");
  assert.match(bodyText, /Sonucu|sonucu/, `${route}: son öğede tamamlanmadı`);
}

assert.deepEqual(browserErrors, []);
console.log(`Exercise timer browser test passed for ${routes.length} routes.`);
process.exit(0);
