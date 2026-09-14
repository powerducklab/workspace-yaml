import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  sourcemap: false,
  clean: true,
  minify: "terser",
  terserOptions: {
    compress: {
      drop_console: false,
      drop_debugger: true,
    },
    mangle: true,
  },
  external: [
    "@powerduck/conf-patch",
    "@powerduck/openapi-parser",
    "yaml",
  ],
  cjsInterop: true,
  banner: {
    js: `/**
 * @powerduck/workspace-yaml
 * Initialize workspace.yaml and OpenAPI 3.2 YAML files with confidence.
 *
 * Copyright (c) 2026 Powerduck limited
 * Licensed under the MIT License.
 */`,
  },
});
