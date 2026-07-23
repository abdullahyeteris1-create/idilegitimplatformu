// Node's native ESM resolver does not understand the project's "@/*" ->
// "./src/*" path alias (tsconfig.json "paths") - that mapping is only
// understood by the Next.js/TypeScript build pipeline, not by plain
// `node --test`. This tiny, dependency-free loader hook lets test files
// import production modules exactly as they are written (with "@/..."
// imports) without rewriting any source file's import style. It adds no
// npm dependency and only affects test invocations that explicitly load it.
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC_ROOT = pathToFileURL(`${path.resolve(process.cwd(), "src")}/`).href;
const HAS_EXTENSION = /\.[a-zA-Z]+$/;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const withoutAlias = specifier.slice(2);
    const rewritten = HAS_EXTENSION.test(withoutAlias) ? withoutAlias : `${withoutAlias}.ts`;
    return nextResolve(new URL(rewritten, SRC_ROOT).href, context);
  }
  return nextResolve(specifier, context);
}
