import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Browser safety tests — verify that the core layer does not import
 * any Node.js-specific modules (fs, path, os, etc.).
 *
 * This ensures the core layer can be safely bundled for browser usage.
 */
describe("core layer browser safety", () => {
  const coreSource = readFileSync(
    path.resolve(__dirname, "../src/core/index.ts"),
    "utf8",
  );
  const typesSource = readFileSync(
    path.resolve(__dirname, "../src/types.ts"),
    "utf8",
  );
  const coreEntrySource = readFileSync(
    path.resolve(__dirname, "../src/core.ts"),
    "utf8",
  );

  const forbiddenImports = [
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:os",
    "node:crypto",
    "node:process",
    "node:stream",
    "node:buffer",
    "node:net",
    "node:http",
    "node:https",
    "node:url",
    "node:util",
    "require(",
  ];

  for (const forbidden of forbiddenImports) {
    it(`core/index.ts does not import "${forbidden}"`, () => {
      expect(coreSource).not.toContain(forbidden);
    });

    it(`types.ts does not import "${forbidden}"`, () => {
      expect(typesSource).not.toContain(forbidden);
    });

    it(`core.ts entry does not import "${forbidden}"`, () => {
      expect(coreEntrySource).not.toContain(forbidden);
    });
  }

  it("core/index.ts only imports from yaml and relative paths", () => {
    const importLines = coreSource
      .split("\n")
      .filter((line) => line.trim().startsWith("import "));

    for (const line of importLines) {
      const match = line.match(/from\s+["']([^"']+)["']/);
      if (match) {
        const source = match[1];
        expect(
          source === "yaml" || source.startsWith("./") || source.startsWith("../"),
        ).toBe(true);
      }
    }
  });

  it("core/index.ts does not use process object", () => {
    expect(coreSource).not.toContain("process.");
  });

  it("core/index.ts does not use __dirname or __filename", () => {
    expect(coreSource).not.toContain("__dirname");
    expect(coreSource).not.toContain("__filename");
  });

  it("core/index.ts does not use Buffer", () => {
    expect(coreSource).not.toContain("Buffer.");
  });
});

describe("file layer Node.js dependencies", () => {
  const fileSource = readFileSync(
    path.resolve(__dirname, "../src/file/index.ts"),
    "utf8",
  );

  it("file/index.ts imports from node:fs/promises", () => {
    expect(fileSource).toContain("node:fs/promises");
  });

  it("file/index.ts imports from node:path", () => {
    expect(fileSource).toContain("node:path");
  });

  it("file/index.ts imports from @powerduck/conf-patch", () => {
    expect(fileSource).toContain("@powerduck/conf-patch");
  });

  it("file/index.ts reuses conf-patch functions (not reimplementing)", () => {
    // Should import these from conf-patch, not define them locally
    expect(fileSource).toContain("normalizeFilePath");
    expect(fileSource).toContain("readConfigFile");
    expect(fileSource).toContain("writeConfigFile");
    expect(fileSource).toContain("withFileLock");
  });

  it("file/index.ts does not define its own atomic write function", () => {
    expect(fileSource).not.toContain("writeYamlTextAtomic");
    expect(fileSource).not.toContain("atomicWrite");
  });

  it("file/index.ts does not define its own file lock acquisition", () => {
    expect(fileSource).not.toContain("acquireFileLock");
    expect(fileSource).not.toContain("withFileLocks");
  });
});
