import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const LOGIN_FORM_URL = new URL("../src/components/auth/LoginForm.tsx", import.meta.url);
const loginFormSource = await readFile(LOGIN_FORM_URL, "utf8");

function compileLoginForm() {
  return ts.transpileModule(loginFormSource, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createLoginFormHarness() {
  const slots = [];
  const routerReplaceCalls = [];
  const locationReplaceCalls = [];
  const sessionStorage = new Map();
  const windowListeners = new Map();
  let cursor = 0;
  let fetchImplementation = () => Promise.reject(new Error("fetch mock tanimlanmadi"));

  const jsxRuntime = {
    Fragment: Symbol("Fragment"),
    jsx: (type, props, key) => ({ type, props: props ?? {}, key }),
    jsxs: (type, props, key) => ({ type, props: props ?? {}, key }),
  };

  const react = {
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = true;
        effect();
      }
    },
    useRef(initialValue) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initialValue };
      return slots[index];
    },
    useState(initialValue) {
      const index = cursor++;
      if (!(index in slots)) {
        slots[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      }
      const setValue = (nextValue) => {
        slots[index] = typeof nextValue === "function" ? nextValue(slots[index]) : nextValue;
      };
      return [slots[index], setValue];
    },
  };

  const compiledModule = { exports: {} };
  const context = vm.createContext({
    Date,
    JSON,
    String,
    console: { info() {} },
    exports: compiledModule.exports,
    fetch: (...args) => fetchImplementation(...args),
    module: compiledModule,
    require(specifier) {
      if (specifier === "react") return react;
      if (specifier === "react/jsx-runtime") return jsxRuntime;
      if (specifier === "next/navigation") {
        return {
          useRouter: () => ({ replace: (href) => routerReplaceCalls.push(href) }),
          useSearchParams: () => ({ get: () => null }),
        };
      }
      if (specifier === "@/lib/auth/auth") {
        return { setCurrentStudent() {}, setCurrentUser() {} };
      }
      throw new Error(`Beklenmeyen import: ${specifier}`);
    },
    window: {
      addEventListener(type, listener) {
        windowListeners.set(type, listener);
      },
      clearTimeout() {},
      location: {
        pathname: "/giris",
        replace: (href) => locationReplaceCalls.push(href),
      },
      removeEventListener(type, listener) {
        if (windowListeners.get(type) === listener) windowListeners.delete(type);
      },
      sessionStorage: {
        getItem: (key) => sessionStorage.get(key) ?? null,
        setItem: (key, value) => sessionStorage.set(key, value),
      },
      setTimeout(callback) {
        callback();
        return 1;
      },
    },
  });

  new vm.Script(compileLoginForm(), { filename: "LoginForm.compiled.cjs" }).runInContext(context);
  const { LoginForm } = compiledModule.exports;

  function render() {
    cursor = 0;
    return LoginForm();
  }

  return {
    render,
    emitPageShow() {
      windowListeners.get("pageshow")?.();
    },
    locationReplaceCalls,
    routerReplaceCalls,
    setFetchImplementation(nextImplementation) {
      fetchImplementation = nextImplementation;
    },
  };
}

function findAll(node, predicate, matches = []) {
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, matches);
    return matches;
  }
  if (!node || typeof node !== "object") return matches;
  if (predicate(node)) matches.push(node);
  findAll(node.props?.children, predicate, matches);
  return matches;
}

function prepareStudentForm(harness) {
  harness.render();
  let tree = harness.render();
  const inputs = findAll(tree, (node) => node.type === "input" && node.props.type !== "checkbox");
  assert.equal(inputs.length, 2);
  inputs[0].props.onChange({ target: { value: "ogrenci" } });
  inputs[1].props.onChange({ target: { value: "parola" } });
  tree = harness.render();
  return findAll(tree, (node) => node.type === "form")[0];
}

function submitEvent() {
  return { preventDefault() {} };
}

function successfulLoginResponse() {
  return {
    ok: true,
    json: async () => ({
      ok: true,
      student: { id: "student-1", name: "Test Ogrenci", username: "ogrenci" },
    }),
  };
}

test("deferred login surerken hizli cift ve uclu submit yalnizca bir POST gonderir", async () => {
  const harness = createLoginFormHarness();
  const pendingResponse = createDeferred();
  let fetchCallCount = 0;
  harness.setFetchImplementation((url) => {
    assert.equal(url, "/api/student-session");
    fetchCallCount += 1;
    return pendingResponse.promise;
  });
  const form = prepareStudentForm(harness);

  const firstSubmit = form.props.onSubmit(submitEvent());
  const secondSubmit = form.props.onSubmit(submitEvent());
  const thirdSubmit = form.props.onSubmit(submitEvent());

  assert.equal(fetchCallCount, 1);
  const pendingTree = harness.render();
  const submitButton = findAll(pendingTree, (node) => node.type === "button" && node.props.type === "submit")[0];
  assert.equal(submitButton.props.disabled, true);
  assert.equal(submitButton.props.children[0], "Giriş yapılıyor...");

  pendingResponse.resolve(successfulLoginResponse());
  await Promise.all([firstSubmit, secondSubmit, thirdSubmit]);
  assert.deepEqual(harness.locationReplaceCalls, ["/ogrenci"]);

  const formBeforeUnmount = findAll(harness.render(), (node) => node.type === "form")[0];
  await formBeforeUnmount.props.onSubmit(submitEvent());
  assert.equal(fetchCallCount, 1);
  assert.deepEqual(harness.locationReplaceCalls, ["/ogrenci"]);
});

test("basarisiz login kilidi acar ve sonraki submit yeni POST gonderebilir", async () => {
  const harness = createLoginFormHarness();
  let fetchCallCount = 0;
  harness.setFetchImplementation(async () => {
    fetchCallCount += 1;
    if (fetchCallCount === 1) {
      return { ok: false, json: async () => ({ ok: false, message: "Kullanici adi veya sifre hatali." }) };
    }
    return successfulLoginResponse();
  });

  let form = prepareStudentForm(harness);
  await form.props.onSubmit(submitEvent());
  let tree = harness.render();
  let submitButton = findAll(tree, (node) => node.type === "button" && node.props.type === "submit")[0];
  assert.equal(submitButton.props.disabled, false);
  assert.equal(findAll(tree, (node) => node.props?.role === "alert")[0].props.children, "Kullanici adi veya sifre hatali.");

  form = findAll(tree, (node) => node.type === "form")[0];
  await form.props.onSubmit(submitEvent());
  assert.equal(fetchCallCount, 2);
  assert.deepEqual(harness.locationReplaceCalls, ["/ogrenci"]);
});

test("network hatasi kilidi acar ve tekrar girise izin verir", async () => {
  const harness = createLoginFormHarness();
  let fetchCallCount = 0;
  harness.setFetchImplementation(async () => {
    fetchCallCount += 1;
    if (fetchCallCount === 1) throw new Error("network error");
    return successfulLoginResponse();
  });

  let form = prepareStudentForm(harness);
  await form.props.onSubmit(submitEvent());
  let tree = harness.render();
  const submitButton = findAll(tree, (node) => node.type === "button" && node.props.type === "submit")[0];
  assert.equal(submitButton.props.disabled, false);
  assert.equal(findAll(tree, (node) => node.props?.role === "alert")[0].props.children, "Giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.");

  form = findAll(tree, (node) => node.type === "form")[0];
  await form.props.onSubmit(submitEvent());
  assert.equal(fetchCallCount, 2);
  assert.deepEqual(harness.locationReplaceCalls, ["/ogrenci"]);
});

test("login route'una geri donuldugunde navigation kilidi acilir", async () => {
  const harness = createLoginFormHarness();
  let fetchCallCount = 0;
  harness.setFetchImplementation(async () => {
    fetchCallCount += 1;
    return successfulLoginResponse();
  });

  const form = prepareStudentForm(harness);
  await form.props.onSubmit(submitEvent());

  let tree = harness.render();
  let submitButton = findAll(tree, (node) => node.type === "button" && node.props.type === "submit")[0];
  assert.equal(submitButton.props.disabled, true);
  assert.equal(fetchCallCount, 1);

  harness.emitPageShow();
  tree = harness.render();
  submitButton = findAll(tree, (node) => node.type === "button" && node.props.type === "submit")[0];
  assert.equal(submitButton.props.disabled, false);

  const returnedForm = findAll(tree, (node) => node.type === "form")[0];
  await returnedForm.props.onSubmit(submitEvent());
  assert.equal(fetchCallCount, 2);
});

test("single-flight kaynak kurallari ref kilidi ve basari kilidini korur", () => {
  assert.match(loginFormSource, /const submittingRef = useRef\(false\)/);
  assert.match(loginFormSource, /if \(submittingRef\.current\) \{\s*return;\s*\}/);
  assert.match(loginFormSource, /submittingRef\.current = true;\s*setIsSubmitting\(true\)/);
  assert.match(loginFormSource, /window\.location\.replace\("\/ogrenci"\)/);
  assert.match(loginFormSource, /window\.addEventListener\("pageshow", releaseReturnedNavigationLock\)/);
  assert.match(loginFormSource, /if \(!keepLockedForNavigation\) \{\s*navigationLockRef\.current = false;\s*submittingRef\.current = false;\s*setIsSubmitting\(false\)/);
  assert.match(loginFormSource, /navigationLockRef\.current = true;\s*keepLockedForNavigation = true/);
  assert.match(loginFormSource, /disabled=\{!isMounted \|\| isSubmitting\}/);
});
