import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const taskId = "11111111-1111-4111-8111-111111111111";
const resultId = "22222222-2222-4222-8222-222222222222";
const route = "/egzersizler/kare-gorme-alani";
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createPage() {
  const response = await fetch(
    `${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  assert.equal(response.ok, true, `Chrome target oluşturulamadı: ${response.status}`);
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
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };

  return {
    socket,
    send: async (method, params = {}) => {
      await ready;
      const id = ++requestId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
  };
}

const target = await createPage();
const browserErrors = [];
const writes = [];
let send;
let pendingStartRequestId = null;
let pendingCompleteRequestId = null;
let startBody = null;
let completionBody = null;

function jsonResponse(body) {
  return {
    responseCode: 200,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  };
}

async function handlePaused(params) {
  const { requestId, request } = params;
  const url = new URL(request.url);

  if (url.pathname === "/api/student/session-status") {
    await send("Fetch.fulfillRequest", {
      requestId,
      ...jsonResponse({ ok: true }),
    });
    return;
  }

  if (url.pathname.endsWith(`/${taskId}`) && request.method === "GET") {
    await send("Fetch.fulfillRequest", {
      requestId,
      ...jsonResponse({
        ok: true,
        task: {
          taskId,
          exerciseSlug: "kare-gorme-alani",
          route,
          title: "Kare Görme Alanı",
          dayNumber: 1,
          taskOrder: 1,
          startingLevel: 1,
          durationSeconds: 2,
          settings: {},
          taskStatus: "available",
          dayStatus: "available",
          canStart: true,
          assignmentV2Enabled: true,
        },
      }),
    });
    return;
  }

  if (url.pathname.endsWith(`/${taskId}/start`)) {
    pendingStartRequestId = requestId;
    startBody = JSON.parse(request.postData ?? "{}");
    return;
  }

  if (url.pathname.endsWith(`/${taskId}/complete-v2`)) {
    pendingCompleteRequestId = requestId;
    completionBody = JSON.parse(request.postData ?? "{}");
    return;
  }

  await send("Fetch.continueRequest", { requestId });
}

const connection = connect(target.webSocketDebuggerUrl, (message) => {
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
  if (
    message.method === "Log.entryAdded" &&
    message.params.entry.level === "error"
  ) {
    browserErrors.push(message.params.entry.text);
  }
  if (message.method === "Network.requestWillBeSent") {
    const { method, url } = message.params.request;
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) writes.push({ method, url });
  }
  if (message.method === "Fetch.requestPaused") {
    void handlePaused(message.params).catch((error) => {
      browserErrors.push(error instanceof Error ? error.message : String(error));
    });
  }
});
send = connection.send;

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Fetch.enable", {
  patterns: [
    {
      urlPattern: "*assignment-program-tasks*",
      requestStage: "Request",
    },
    {
      urlPattern: "*session-status*",
      requestStage: "Request",
    },
  ],
});

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await sleep(50);
  }
  const bodyText = await evaluate("document.body?.innerText ?? ''");
  throw new Error(
    `Browser koşulu zaman aşımına uğradı: ${expression}\nBODY:\n${bodyText.slice(0, 1200)}`,
  );
}

async function waitForNode(predicate, label, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await sleep(25);
  }
  throw new Error(`Node koşulu zaman aşımına uğradı: ${label}`);
}

async function navigate(path) {
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor("document.readyState === 'complete'");
}

async function clickButton(text) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find(
      (item) => item.textContent?.includes(${JSON.stringify(text)})
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  assert.equal(clicked, true, `"${text}" düğmesi bulunamadı`);
}

await navigate(`${route}?programTaskId=${taskId}`);
await waitFor("document.body.innerText.includes('Eğitime Başla')");
await clickButton("Eğitime Başla");
await waitFor("document.body.innerText.includes('Egzersizi Başlat')");
await waitFor(`[...document.querySelectorAll("button")].some(
  (item) => item.textContent?.includes("Egzersizi Başlat") && !item.disabled
)`);
await clickButton("Egzersizi Başlat");
await waitFor("document.body.innerText.includes('Çalışma başlatılıyor')");
assert.equal(
  await evaluate("document.body.innerText.includes('Merkez noktadan bakışını ayırma')"),
  true,
  "start yanıtından önce lokal running başlamamalı",
);
await waitForNode(() => Boolean(pendingStartRequestId), "start request pause");

const now = new Date();
await send("Fetch.fulfillRequest", {
  requestId: pendingStartRequestId,
  ...jsonResponse({
    ok: true,
    taskId,
    attemptId: startBody.attemptId,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 2000).toISOString(),
    serverNow: now.toISOString(),
    durationSeconds: 2,
    taskStatus: "in_progress",
    dayStatus: "in_progress",
    idempotent: false,
  }),
});

await waitFor("document.body.innerText.includes('Aynı Harfler')");
assert.equal(await evaluate("document.body.innerText.includes('Duraklat')"), false);
assert.equal(await evaluate("document.body.innerText.includes('Bitir')"), false);

await waitForNode(() => Boolean(pendingCompleteRequestId), "complete-v2 request pause");
await waitFor("document.body.innerText.includes('Kaydediliyor')");
assert.equal(
  await evaluate("document.body.innerText.includes('Tebrikler, bu çalışmayı tamamladınız')"),
  false,
  "server commit öncesi başarı gösterilmemeli",
);

assert.equal(completionBody.attemptId, startBody.attemptId);
assert.equal(completionBody.exerciseSlug, "kare-gorme-alani");
assert.equal(typeof completionBody.result.score, "number");
assert.equal(typeof completionBody.result.successRate, "number");
assert.equal(typeof completionBody.result.correctCount, "number");
assert.equal(typeof completionBody.result.wrongCount, "number");
assert.equal("durationSeconds" in completionBody.result, false);

await send("Fetch.fulfillRequest", {
  requestId: pendingCompleteRequestId,
  ...jsonResponse({
    ok: true,
    idempotent: false,
    taskId,
    attemptId: startBody.attemptId,
    resultId,
    taskCompleted: true,
    dayCompleted: false,
    completedTasksInDay: 1,
    totalTasksInDay: 5,
    nextDayUnlocked: false,
    programCompleted: false,
    completedDays: 0,
    totalDays: 7,
    serverCompletedAt: new Date().toISOString(),
  }),
});

await waitFor("document.body.innerText.includes('Tebrikler, bu çalışmayı tamamladınız')");
assert.equal(
  await evaluate("document.querySelector('a[href=\"/ogrenci\"]')?.textContent?.includes('Ödevlerime Dön')"),
  true,
);

const v2Writes = writes.filter((entry) => entry.url.includes(taskId));
assert.equal(v2Writes.filter((entry) => entry.url.endsWith("/start")).length, 1);
assert.equal(v2Writes.filter((entry) => entry.url.endsWith("/complete-v2")).length, 1);
assert.equal(v2Writes.filter((entry) => entry.url.endsWith("/complete")).length, 0);
assert.equal(writes.some((entry) => entry.url.includes("/api/student/results")), false);

const writesBeforeFreeMode = writes.length;
await navigate(route);
await waitFor("document.body.innerText.includes('Eğitime Başla')");
await clickButton("Eğitime Başla");
await waitFor("document.body.innerText.includes('Egzersizi Başlat')");
await clickButton("Egzersizi Başlat");
await waitFor("document.body.innerText.includes('Aynı Harfler')");
assert.equal(await evaluate("document.body.innerText.includes('Duraklat')"), true);
assert.equal(await evaluate("document.body.innerText.includes('Bitir')"), true);
assert.equal(writes.length, writesBeforeFreeMode);

assert.deepEqual(browserErrors, []);
connection.socket.close();
await fetch(`${cdpUrl}/json/close/${target.id}`);

console.log("assignment-v2 exercise browser: PASS");
