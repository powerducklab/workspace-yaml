# @powerduck/workspace-yaml

[![npm version](https://img.shields.io/npm/v/@powerduck/workspace-yaml)](https://www.npmjs.com/package/@powerduck/workspace-yaml)
[![license](https://img.shields.io/npm/l/@powerduck/workspace-yaml)](https://github.com/powerducklab/workspace-yaml/blob/main/LICENSE)
[![website](https://img.shields.io/badge/website-powerduck.com-blue)](https://www.powerduck.com/)

> Initialize workspace.yaml and OpenAPI 3.2 YAML files with confidence.

Production-grade YAML workspace initializer with a two-layer architecture:
- **Core layer** (browser-safe): Pure functions that generate YAML content strings. No filesystem access.
- **File layer** (Node.js / Electron): Wraps the core layer with atomic writes, file locking, and path normalization — all reused from [`@powerduck/conf-patch`](https://github.com/powerducklab/conf-patch).

## Why this library?

This library **only initializes files** — the "new file" / "manual creation" scenario. It does **not** reimplement reading, patching, or updating YAML files. For those operations, use `@powerduck/conf-patch` directly.

- **No redundant IO**: Atomic writes, file locks, and path handling are delegated to `@powerduck/conf-patch`.
- **No redundant validation**: OpenAPI validation is delegated to `@powerduck/openapi-parser`.
- **Browser-safe core**: Generate YAML content in any JavaScript environment.
- **Transaction-safe**: `createWorkspaceApi` writes both files atomically with rollback on failure.

## Installation

```bash
npm install @powerduck/workspace-yaml
```

Peer dependencies (automatically installed):
- `@powerduck/conf-patch` — atomic writes, file locking, path normalization
- `@powerduck/openapi-parser` — OpenAPI validation and upgrade
- `yaml` — YAML parsing and serialization

## Quick Start

### Node.js / Electron

```typescript
import { createWorkspaceApi } from "@powerduck/workspace-yaml";

const { workspaceFilePath, openApiFilePath } = await createWorkspaceApi({
  workspaceDirectory: "./my-project",
  oasId: "users-api",
  name: "Users API",
  title: "Users API Documentation",
  version: "1.0.0",
});

console.log("Workspace:", workspaceFilePath);
console.log("OpenAPI:", openApiFilePath);
```

### Browser (no filesystem)

```typescript
import { createWorkspaceYaml, createOpenApiYaml } from "@powerduck/workspace-yaml/core";

// Generate YAML content strings — save to IndexedDB, localStorage, or send to an API
const workspaceContent = createWorkspaceYaml();
const openApiContent = createOpenApiYaml({ title: "My API" });
```

## Two-Layer Architecture

### Core Layer (`@powerduck/workspace-yaml/core`)

Browser-safe pure functions. Zero filesystem dependencies.

| Function | Description |
|---|---|
| `createWorkspaceYaml(options?)` | Generate a workspace.yaml content string |
| `createOpenApiYaml(options)` | Generate an OpenAPI 3.2 YAML content string |
| `createWorkspaceWithApi(options)` | Generate both workspace and OpenAPI content together |
| `parseWorkspaceYaml(content)` | Parse and validate a workspace.yaml content string |

### File Layer (`@powerduck/workspace-yaml`)

Node.js / Electron only. Reuses `@powerduck/conf-patch` for IO.

| Function | Description |
|---|---|
| `initializeWorkspace(options)` | Create a workspace.yaml file on disk |
| `initializeOpenApi(options)` | Create an OpenAPI 3.2 YAML file on disk |
| `createWorkspaceApi(options)` | Create both workspace and OpenAPI files atomically |

## API Reference

### Core Layer

#### `createWorkspaceYaml(options?)`

Generates a workspace.yaml content string.

```typescript
import { createWorkspaceYaml } from "@powerduck/workspace-yaml/core";

const yaml = createWorkspaceYaml({
  activeOasFileId: "api-v1",
  oasFiles: [
    { id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" },
  ],
});
```

**Options:**
- `activeOasFileId?: string | null` — Initial active API file id (default: `null`)
- `oasFiles?: OasFileEntry[]` — Initial API file entries (default: `[]`)

**Returns:** `string` — YAML content

**Throws:** `WorkspaceYamlError` on invalid input (duplicate ids, activeOasFileId not in oasFiles, invalid paths, etc.)

---

#### `createOpenApiYaml(options)`

Generates an OpenAPI 3.2 YAML content string.

```typescript
import { createOpenApiYaml } from "@powerduck/workspace-yaml/core";

const yaml = createOpenApiYaml({
  title: "My API",
  version: "2.0.0",
  description: "A production-ready API.",
  contact: { name: "API Team", email: "api@example.com" },
  license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  servers: [{ url: "https://api.example.com", description: "Production" }],
});
```

**Options:**
- `title: string` — API title (required)
- `version?: string` — API version (default: `"1.0.0"`)
- `description?: string` — API description
- `contact?: { name?, url?, email? }` — Contact information
- `license?: { name, url? }` — License information
- `servers?: Array<{ url, description? }>` — Server list

**Returns:** `string` — YAML content

**Throws:** `WorkspaceYamlError` on empty title or version

---

#### `createWorkspaceWithApi(options)`

Generates both workspace and OpenAPI content together. The workspace will contain a single API entry and set it as active.

```typescript
import { createWorkspaceWithApi } from "@powerduck/workspace-yaml/core";

const { workspaceYaml, openApiYaml, openApiRelativePath, workspace } =
  createWorkspaceWithApi({
    oasId: "my-api",
    name: "My API",
    title: "My API Documentation",
    version: "1.0.0",
    description: "Detailed description.",
  });
```

**Options:**
- `oasId: string` — Unique API identifier (required)
- `name: string` — Display name (required)
- `file?: string` — Workspace-relative path (default: `oasFiles/${oasId}.openapi.yaml`)
- `title?: string` — API title (default: `name`)
- `version?: string` — API version (default: `"1.0.0"`)
- `description?: string` — API description

**Returns:** `WorkspaceWithApiResult`
- `workspaceYaml: string`
- `openApiYaml: string`
- `openApiRelativePath: string`
- `workspace: WorkspaceConfig`

---

#### `parseWorkspaceYaml(content)`

Parses and validates a workspace.yaml content string.

```typescript
import { parseWorkspaceYaml } from "@powerduck/workspace-yaml/core";

const workspace = parseWorkspaceYaml(yamlContent);
console.log(workspace.oasFiles);
```

**Returns:** `WorkspaceConfig`

**Throws:** `WorkspaceYamlError` on invalid YAML, wrong version, duplicate ids, etc.

---

### File Layer

#### `initializeWorkspace(options)`

Creates a workspace.yaml file on disk. Uses `@powerduck/conf-patch` for atomic writes and file locking.

```typescript
import { initializeWorkspace } from "@powerduck/workspace-yaml";

const { filePath, workspace } = await initializeWorkspace({
  directory: "./my-project",
  workspaceFileName: "workspace.yaml", // optional
  overwrite: false, // optional, default: false
  activeOasFileId: null, // optional
  oasFiles: [], // optional
});
```

---

#### `initializeOpenApi(options)`

Creates an OpenAPI 3.2 YAML file on disk.

```typescript
import { initializeOpenApi } from "@powerduck/workspace-yaml";

const { filePath, title, version } = await initializeOpenApi({
  filePath: "./my-project/oasFiles/my-api.openapi.yaml",
  title: "My API",
  version: "1.0.0",
  description: "Optional description.",
  overwrite: false, // optional, default: false
});
```

---

#### `createWorkspaceApi(options)`

Creates both workspace and OpenAPI files atomically. If the workspace write fails, the OpenAPI file is rolled back.

If a workspace already exists, the new API is added to it.

```typescript
import { createWorkspaceApi } from "@powerduck/workspace-yaml";

const { workspaceFilePath, openApiFilePath, workspace } = await createWorkspaceApi({
  workspaceDirectory: "./my-project",
  oasId: "my-api",
  name: "My API",
  file: "custom/path/api.yaml", // optional
  title: "My API Documentation", // optional, defaults to name
  version: "1.0.0", // optional
  description: "Optional.", // optional
  overwriteOpenApi: false, // optional, default: false
});
```

## Error Handling

All errors are instances of `WorkspaceYamlError` with a machine-readable `code`:

```typescript
import { WorkspaceYamlError } from "@powerduck/workspace-yaml";

try {
  await createWorkspaceApi({ /* ... */ });
} catch (error) {
  if (error instanceof WorkspaceYamlError) {
    console.error(`Error [${error.code}]: ${error.message}`);
    console.error(`File: ${error.filePath}`);
  }
}
```

**Error codes:**
- `INVALID_ARGUMENT` — Invalid input parameter
- `ALREADY_EXISTS` — File already exists (and overwrite is false)
- `NOT_FOUND` — File not found
- `IO_ERROR` — Filesystem operation failed
- `INVALID_WORKSPACE` — Invalid workspace configuration
- `INVALID_OPENAPI` — Invalid OpenAPI document
- `ROLLBACK_FAILED` — Transaction rollback failed

## Reading and Updating Files

This library only **initializes** files. To read, patch, or update existing files, use `@powerduck/conf-patch`:

```typescript
import { readConfigFile, setConfigValue, patchConfigFile } from "@powerduck/conf-patch";

// Read
const workspace = await readConfigFile("./my-project/workspace.yaml");

// Update a single value
await setConfigValue("./my-project/workspace.yaml", ["activeOasFileId"], "new-api");

// Batch patch (RFC 6902)
await patchConfigFile("./my-project/workspace.yaml", [
  { op: "add", path: ["oasFiles", "-"], value: { id: "new-api", name: "New API", file: "..." } },
]);
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Demos

```bash
# Node.js / Electron demo (file layer)
npm run demo

# Browser-safe demo (core layer only)
npm run demo:browser
```

## Building

```bash
npm run build
```

Outputs:
- `dist/index.js` — ESM build (file layer + core layer)
- `dist/index.cjs` — CJS build
- `dist/core.js` — ESM build (core layer only, browser-safe)
- `dist/core.cjs` — CJS build
- TypeScript declarations (`.d.ts`)

## License

MIT © Powerduck limited

## Related Packages

- [`@powerduck/conf-patch`](https://github.com/powerducklab/conf-patch) — Two-layer configuration editor with atomic writes and locking
- [`@powerduck/openapi-parser`](https://github.com/powerducklab/openapi-parser) — Upgrade and validate OpenAPI documents to 3.2
