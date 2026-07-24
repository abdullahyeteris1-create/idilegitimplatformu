import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3100";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const route = "/egzersizler/kare-gorme-alani";
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function createPage() {
  const response = await fetch(
    `${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  assert.equal(
    response.ok,
    true,
    `Chrome target could not be created: ${response.status}`,
  );
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

    if (message.error) {
      request.reject(new Error(message.error.message));
    } else {
      request.resolve(message.result);
    }
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
const networkWrites = [];
const { send } = connect(target.webSocketDebuggerUrl, (message) => {
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
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      networkWrites.push({ method, url });
    }
  }
});

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Network.setBlockedURLs", { urls: ["*supabase*"] });
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    (() => {
      const originalFetch = window.fetch.bind(window);
      const originalSetInterval = window.setInterval.bind(window);
      const originalClearInterval = window.clearInterval.bind(window);
      const originalStorageGetItem = Storage.prototype.getItem;
      const originalSetAttribute = Element.prototype.setAttribute;
      const trackedExerciseIntervals = new Set();

      localStorage.removeItem("idil-theme");
      localStorage.removeItem("idil-accent");
      Storage.prototype.getItem = function (key) {
        if (key === "idil-theme" || key === "idil-accent") {
          return null;
        }
        return originalStorageGetItem.call(this, key);
      };
      Element.prototype.setAttribute = function (name, value) {
        if (
          this === document.documentElement &&
          (name === "data-idil-theme" || name === "data-idil-accent")
        ) {
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
      window.__squareVisionTimerAudit = [];
      window.__squareVisionResultWrites = [];
      window.__squareVisionUnexpectedWrites = [];
      window.__squareVisionActiveIntervals = 0;
      window.__squareVisionMaxActiveIntervals = 0;
      window.__squareVisionIntervalDelayOverride = null;

      window.fetch = (input, init = {}) => {
        const url = typeof input === "string" ? input : input?.url || "";
        const method = String(init.method || (typeof input === "object" ? input?.method : "") || "GET").toUpperCase();

        if (url.includes("/api/student/session-status")) {
          return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }));
        }

        if (url.includes("/api/student/results") && method === "POST") {
          const payload = JSON.parse(String(init.body || "{}"));
          window.__squareVisionResultWrites.push(payload);
          const index = window.__squareVisionResultWrites.length;

          return Promise.resolve(new Response(JSON.stringify({
            result: {
              id: "square-vision-timer-test-" + index,
              studentId: "square-vision-timer-student",
              exerciseType: payload.exerciseType,
              exerciseTitle: payload.exerciseTitle,
              score: payload.score,
              successRate: payload.successRate,
              correctCount: payload.correctCount,
              wrongCount: payload.wrongCount,
              durationSeconds: payload.durationSeconds,
              date: payload.completedAt,
              details: payload.details,
            },
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }));
        }

        if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
          window.__squareVisionUnexpectedWrites.push({ method, url });
          return Promise.reject(new Error("Unexpected write blocked by square vision timer test"));
        }

        return originalFetch(input, init);
      };

      window.setInterval = (callback, delay, ...args) => {
        const requestedDelay = Number(delay);
        const override = Number(window.__squareVisionIntervalDelayOverride);
        const effectiveDelay =
          requestedDelay === 1000 && Number.isFinite(override) && override > 0
            ? override
            : requestedDelay;
        let intervalId;

        const wrappedCallback = (...callbackArgs) => {
          if (requestedDelay === 1000) {
            window.__squareVisionTimerAudit.push({
              type: "fire",
              id: Number(intervalId),
              requestedDelay,
              effectiveDelay,
              at: Math.round(performance.now()),
            });
          }
          return callback(...callbackArgs);
        };

        intervalId = originalSetInterval(
          wrappedCallback,
          effectiveDelay,
          ...args
        );

        if (requestedDelay === 1000) {
          trackedExerciseIntervals.add(intervalId);
          window.__squareVisionActiveIntervals += 1;
          window.__squareVisionMaxActiveIntervals = Math.max(
            window.__squareVisionMaxActiveIntervals,
            window.__squareVisionActiveIntervals,
          );
          window.__squareVisionTimerAudit.push({
            type: "set",
            id: Number(intervalId),
            requestedDelay,
            effectiveDelay,
            at: Math.round(performance.now()),
          });
        }

        return intervalId;
      };

      window.clearInterval = (intervalId) => {
        if (trackedExerciseIntervals.delete(intervalId)) {
          window.__squareVisionActiveIntervals -= 1;
          window.__squareVisionTimerAudit.push({
            type: "clear",
            id: Number(intervalId),
            at: Math.round(performance.now()),
          });
        }
        return originalClearInterval(intervalId);
      };
    })();
  `,
});

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text,
    );
  }

  return response.result.value;
}

async function waitFor(expression, timeoutMs = 10_000, pollMs = 50) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(expression)) return;
    await sleep(pollMs);
  }
  throw new Error(`Condition timed out: ${expression}`);
}

const normalizeFunction =
  `(value) => (value || "").normalize("NFD")` +
  `.replace(/[\\u0300-\\u036f]/g, "")` +
  `.replace(/\\u0131/g, "i").toLowerCase()`;

async function navigateToExercise() {
  await send("Page.navigate", { url: `${baseUrl}${route}` });
  await waitFor(
    "document.readyState === 'complete' && document.querySelectorAll('button').length > 0",
    15_000,
  );
}

async function clickButton(textPart) {
  const result = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const button = [...document.querySelectorAll("button")]
      .find((item) => normalize(item.textContent).includes(${JSON.stringify(textPart)}));
    if (!button) {
      return {
        clicked: false,
        buttons: [...document.querySelectorAll("button")].map((item) => item.textContent),
      };
    }
    button.click();
    return { clicked: true, text: button.textContent };
  })()`);

  assert.equal(
    result.clicked,
    true,
    `Button not found: ${textPart}; buttons=${JSON.stringify(result.buttons)}`,
  );
}

async function setSelect(labelText, value) {
  const changed = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const label = [...document.querySelectorAll("label")]
      .find((item) => normalize(item.textContent).includes(${JSON.stringify(labelText)}));
    const select = label?.querySelector("select");
    if (!select) return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")
      .set.call(select, ${JSON.stringify(value)});
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);

  assert.equal(changed, true, `Select not found: ${labelText}`);
}

async function timerText() {
  return evaluate(`(() => {
    return [...document.querySelectorAll("p")]
      .map((item) => (item.textContent || "").trim())
      .find((text) => /^\\d{2}:\\d{2}$/.test(text)) || null;
  })()`);
}

function timerToSeconds(value) {
  assert.match(value, /^\d{2}:\d{2}$/);
  const [minutes, seconds] = value.split(":").map(Number);
  return minutes * 60 + seconds;
}

async function answer(wantCorrect) {
  const result = await evaluate(`(() => {
    const normalize = ${normalizeFunction};
    const marked = [...document.querySelectorAll(".ring-red-500")]
      .map((item) => (item.textContent || "").trim());
    if (marked.length !== 2) return { clicked: false, marked };

    const correctSame = marked[0] === marked[1];
    const chooseSame = ${wantCorrect ? "correctSame" : "!correctSame"};
    const textPart = chooseSame ? "ayni harfler" : "farkli harfler";
    const button = [...document.querySelectorAll("button")]
      .find((item) => normalize(item.textContent).includes(textPart));
    button?.click();
    return { clicked: Boolean(button), marked, chooseSame };
  })()`);

  assert.equal(
    result.clicked,
    true,
    `Answer button could not be clicked: ${JSON.stringify(result)}`,
  );
}

async function timerAuditState() {
  return evaluate(`({
    events: window.__squareVisionTimerAudit.slice(),
    active: window.__squareVisionActiveIntervals,
    maxActive: window.__squareVisionMaxActiveIntervals,
  })`);
}

async function prepareAndStart({ acceleratedDelay = null } = {}) {
  await clickButton("egitime basla");
  await waitFor(`(() => {
    const normalize = ${normalizeFunction};
    return [...document.querySelectorAll("button")]
      .some((item) => normalize(item.textContent).includes("egzersizi baslat"));
  })()`);
  await setSelect("sesler", "off");

  if (acceleratedDelay !== null) {
    await evaluate(
      `window.__squareVisionIntervalDelayOverride = ${Number(acceleratedDelay)}`,
    );
  }

  await clickButton("egzersizi baslat");
  await waitFor("Boolean(document.querySelector('.ring-red-500'))");
}

await navigateToExercise();
await prepareAndStart();

assert.equal(await timerText(), "01:00", "Timer did not start at 01:00");
const idleStart = timerToSeconds(await timerText());
await sleep(2200);
const idleEnd = timerToSeconds(await timerText());
assert.ok(
  idleStart - idleEnd >= 2,
  `Timer did not advance while idle: ${idleStart} -> ${idleEnd}`,
);

let audit = await timerAuditState();
assert.equal(audit.active, 1, "Exactly one interval should be active");
assert.equal(audit.maxActive, 1, "More than one interval became active");
assert.equal(
  audit.events.filter((event) => event.type === "set").length,
  1,
  "Idle ticks restarted the interval",
);

const correctStart = timerToSeconds(await timerText());
for (let index = 0; index < 12; index += 1) {
  await answer(true);
  await sleep(175);
}
const correctEnd = timerToSeconds(await timerText());
assert.ok(
  correctStart - correctEnd >= 2,
  `Correct-answer burst stopped the timer: ${correctStart} -> ${correctEnd}`,
);

audit = await timerAuditState();
assert.equal(
  audit.events.filter((event) => event.type === "set").length,
  1,
  "Correct answers restarted the interval",
);
assert.equal(audit.active, 1);
assert.equal(audit.maxActive, 1);

const wrongStart = timerToSeconds(await timerText());
for (let index = 0; index < 12; index += 1) {
  await answer(false);
  await sleep(175);
}
const wrongEnd = timerToSeconds(await timerText());
assert.ok(
  wrongStart - wrongEnd >= 2,
  `Wrong-answer burst stopped the timer: ${wrongStart} -> ${wrongEnd}`,
);

audit = await timerAuditState();
assert.equal(
  audit.events.filter((event) => event.type === "set").length,
  1,
  "Wrong answers restarted the interval",
);
assert.equal(audit.active, 1);
assert.equal(audit.maxActive, 1);

const keyboardStart = timerToSeconds(await timerText());
for (let index = 0; index < 14; index += 1) {
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", {
    key: ${index % 2 === 0 ? '"ArrowLeft"' : '"ArrowRight"'},
    bubbles: true,
  }))`);
  await sleep(150);
}
const keyboardEnd = timerToSeconds(await timerText());
assert.ok(
  keyboardStart - keyboardEnd >= 2,
  `Keyboard-answer burst stopped the timer: ${keyboardStart} -> ${keyboardEnd}`,
);

audit = await timerAuditState();
assert.equal(
  audit.events.filter((event) => event.type === "set").length,
  1,
  "Keyboard answers restarted the interval",
);
assert.equal(audit.active, 1);
assert.equal(audit.maxActive, 1);

await clickButton("duraklat");
await waitFor(`(() => {
  const normalize = ${normalizeFunction};
  return normalize(document.body.innerText).includes("egzersiz duraklatildi");
})()`);
const pausedTimer = await timerText();
await sleep(1300);
assert.equal(await timerText(), pausedTimer, "Timer advanced while paused");

audit = await timerAuditState();
assert.equal(audit.active, 0, "Pause did not clear the interval");
assert.equal(
  audit.events.filter((event) => event.type === "clear").length,
  1,
  "Pause should clear the running interval once",
);

await clickButton("devam");
await sleep(1200);
assert.ok(
  timerToSeconds(pausedTimer) - timerToSeconds(await timerText()) >= 1,
  "Timer did not continue after resume",
);

audit = await timerAuditState();
assert.equal(audit.active, 1, "Resume did not create one interval");
assert.equal(audit.maxActive, 1, "Resume created overlapping intervals");
assert.equal(
  audit.events.filter((event) => event.type === "set").length,
  2,
  "Resume should create exactly one replacement interval",
);

await setSelect("egzersiz suresi", "2");
await waitFor(`(() => {
  const normalize = ${normalizeFunction};
  return [...document.querySelectorAll("button")]
    .some((item) => normalize(item.textContent).includes("egzersizi baslat"));
})()`);
assert.equal(await timerText(), null, "Running timer remained visible after reset");
const readyTimer = await evaluate(
  `document.body.innerText.match(/\\b02:00\\b/)?.[0] || null`,
);
assert.equal(readyTimer, "02:00", "Duration reset did not select 02:00");

audit = await timerAuditState();
assert.equal(audit.active, 0, "Reset did not clear the running interval");

await clickButton("egzersizi baslat");
await waitFor("window.__squareVisionActiveIntervals === 1");
await clickButton("cikis");
await waitFor(`location.pathname === "/egzersizler"`);
await waitFor("window.__squareVisionActiveIntervals === 0");

audit = await timerAuditState();
assert.equal(audit.maxActive, 1, "Unmount test observed overlapping intervals");

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await navigateToExercise();
await prepareAndStart({ acceleratedDelay: 100 });
await waitFor(`(() => {
  return [...document.querySelectorAll("p")]
    .map((item) => (item.textContent || "").trim())
    .some((text) => text === "00:01");
})()`, 10_000, 5);
await answer(true);
await waitFor(`(() => {
  const normalize = ${normalizeFunction};
  return normalize(document.body.innerText).includes("kare gorme calismasi sonucu");
})()`, 3000, 10);
await waitFor("window.__squareVisionResultWrites.length === 1", 3000, 10);

const automaticResult = await evaluate(`(() => {
  const normalize = ${normalizeFunction};
  const correctArticle = [...document.querySelectorAll("article")].find((article) =>
    normalize(article.querySelector("p")?.textContent) === "dogru"
  );
  const correctValue = Number(correctArticle?.querySelectorAll("p")?.[1]?.textContent);
  const answerMatch = document.body.innerText.match(/Cevap:\\s*(\\d+)/);
  return {
    correctValue,
    answeredCount: Number(answerMatch?.[1]),
    writes: window.__squareVisionResultWrites.slice(),
    unexpectedWrites: window.__squareVisionUnexpectedWrites.slice(),
  };
})()`);

assert.equal(
  automaticResult.correctValue,
  1,
  "The final-second correct answer was missing from the result",
);
assert.equal(
  automaticResult.answeredCount,
  1,
  "The final-second answer was missing from answeredCount",
);
assert.equal(
  automaticResult.writes[0].correctCount,
  1,
  "The mocked save payload missed the final-second correct answer",
);
assert.equal(
  automaticResult.writes[0].details.answeredCount,
  1,
  "The mocked save payload missed the final-second answeredCount",
);
assert.deepEqual(
  automaticResult.unexpectedWrites,
  [],
  "An unexpected write escaped the test mocks",
);

audit = await timerAuditState();
assert.equal(audit.active, 0, "Automatic finish did not clear the interval");
assert.equal(audit.maxActive, 1, "Automatic finish created overlapping intervals");
assert.equal(
  audit.events.filter((event) => event.type === "clear").length,
  1,
  "Automatic finish should clear its interval once",
);

assert.deepEqual(networkWrites, [], "A real network write was attempted");
assert.deepEqual(browserErrors, [], "Browser errors were reported");

console.log(
  JSON.stringify(
    {
      idle: [idleStart, idleEnd],
      correctBurst: [correctStart, correctEnd],
      wrongBurst: [wrongStart, wrongEnd],
      keyboardBurst: [keyboardStart, keyboardEnd],
      pause: pausedTimer,
      finalSecondResult: {
        correctCount: automaticResult.correctValue,
        answeredCount: automaticResult.answeredCount,
      },
      resultWritesMocked: automaticResult.writes.length,
      realNetworkWrites: networkWrites.length,
      maxActiveIntervals: audit.maxActive,
    },
    null,
    2,
  ),
);
console.log("Square vision timer browser test passed.");

await fetch(`${cdpUrl}/json/close/${target.id}`);
await sleep(50);
