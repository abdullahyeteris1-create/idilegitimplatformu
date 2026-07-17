import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const route = "/egzersizler/goz-egzersizleri-kolonlar";
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

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 10000) {
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
  assert.equal(clicked, true, `Buton bulunamadı: ${textPart}`);
}

async function setSelect(labelText, value) {
  const changed = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const label = [...document.querySelectorAll("label")]
      .find((item) => normalize(item.querySelector("span")?.textContent).includes(${JSON.stringify(labelText)}));
    const select = label?.querySelector("select");
    if (!select || select.disabled) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, ${JSON.stringify(String(value))});
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `Select değiştirilemedi: ${labelText}`);
}

async function readStatus() {
  return evaluate(`(() => {
    const text = document.body.innerText;
    const remaining = [...document.querySelectorAll("p")]
      .map((item) => (item.textContent || "").trim())
      .find((item) => /^\\d{2}:\\d{2}$/.test(item)) || "";
    return {
      remaining,
      progress: Number(text.match(/(\\d+)% tamamlandı/)?.[1] ?? -1),
      transitions: Number(text.match(/(\\d+) geçiş/)?.[1] ?? -1),
      titleVisible: text.includes("Kelime Kolonları"),
    };
  })()`);
}

await send("Page.navigate", { url: `${baseUrl}${route}` });
await waitFor("document.readyState === 'complete' && document.body.innerText.includes('Kelime Kolonları')");
assert.equal((await readStatus()).titleVisible, true);
await clickButton("egitime basla");
await waitFor("document.body.innerText.includes('Egzersizi Başlat')");
await clickButton("egzersizi baslat");

const initial = await readStatus();
assert.equal(initial.remaining, "01:00");
assert.equal(initial.progress, 0);
assert.equal(initial.transitions, 0);

await sleep(1200);
const running = await readStatus();
assert.equal(running.remaining, "00:59");
assert.ok(running.progress > 0);
assert.ok(running.transitions > 0);

await clickButton("duraklat");
const paused = await readStatus();
await sleep(1300);
assert.deepEqual(await readStatus(), paused);

await clickButton("devam");
await sleep(1200);
const resumed = await readStatus();
assert.notEqual(resumed.remaining, paused.remaining);
assert.ok(resumed.transitions > paused.transitions);

await setSelect("akis yonu", "row");
await setSelect("kolon sayisi", "3");
const beforeSettingsTick = await readStatus();
await sleep(1200);
const afterSettingsTick = await readStatus();
assert.notEqual(afterSettingsTick.remaining, beforeSettingsTick.remaining);
assert.ok(afterSettingsTick.transitions > beforeSettingsTick.transitions);

await clickButton("bitir");
await waitFor("document.body.innerText.includes('Kelime Kolonları Sonucu')");
const earlyResultCount = await evaluate(`JSON.parse(localStorage.getItem("idil-exercise-results") || "[]").filter((item) => item.exerciseType === "eye-columns").length`);
assert.equal(earlyResultCount, 1);

await clickButton("tekrar calis");
await setSelect("calisma suresi", "2");
await clickButton("egzersizi baslat");
assert.equal((await readStatus()).remaining, "02:00");
await clickButton("bitir");

await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeSetInterval = window.setInterval.bind(window);
    window.setInterval = (callback, delay, ...args) => nativeSetInterval(callback, delay === 1000 ? 20 : delay, ...args);
  }`,
});
await send("Page.navigate", { url: `${baseUrl}${route}` });
await waitFor("document.readyState === 'complete' && document.body.innerText.includes('Kelime Kolonları')");
await clickButton("egitime basla");
await clickButton("egzersizi baslat");
await waitFor("document.body.innerText.includes('Kelime Kolonları Sonucu')", 5000);
const naturalResults = await evaluate(`JSON.parse(localStorage.getItem("idil-exercise-results") || "[]").filter((item) => item.exerciseType === "eye-columns")`);
assert.equal(naturalResults.length, 3);
assert.equal(naturalResults[0].durationSeconds, 60);

assert.deepEqual(browserErrors, []);
console.log("Kelime Kolonları timer browser test passed.");
process.exit(0);
