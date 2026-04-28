import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, writeFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const fnDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(fnDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(fnDir, "src/index.ts")],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "firebase-functions",
      "firebase-functions/*",
      "firebase-admin",
      "firebase-admin/*",
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
    ],
    banner: {
      js: [
        "import { createRequire as __createRequire } from 'node:module';",
        "const require = __createRequire(import.meta.url);",
      ].join("\n"),
    },
    plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  });

  // Write a CommonJS shim so Firebase can find `exports.api`. Cloud Functions
  // for Node 20 supports ESM via `"type": "module"` in package.json, so we
  // also write a minimal package.json into dist.
  await writeFile(
    path.resolve(distDir, "package.json"),
    JSON.stringify(
      {
        name: "uaids-functions-bundle",
        type: "module",
        main: "index.mjs",
      },
      null,
      2,
    ),
  );

  console.log("✓ functions build complete");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
