/**
 * @powerduck/workspace-yaml
 *
 * Initialize workspace.yaml and OpenAPI 3.2 YAML files with confidence.
 *
 * Two-layer architecture:
 * 1. Core layer (browser-safe): Pure functions that generate YAML content strings.
 *    No filesystem access. Works in browsers, Node.js, and Electron.
 *    - createWorkspaceYaml, createOpenApiYaml, createWorkspaceWithApi, parseWorkspaceYaml
 *
 * 2. File layer (Node.js / Electron only): Wraps the core layer with filesystem IO.
 *    Reuses @powerduck/conf-patch for atomic writes, file locking, and path normalization.
 *    - initializeWorkspace, initializeOpenApi, createWorkspaceApi
 *
 * Design philosophy:
 * - This library ONLY initializes files (the "new file" / "manual creation" scenario).
 * - It does NOT reimplement reading, patching, or updating YAML files.
 * - For those operations, use @powerduck/conf-patch directly.
 * - OpenAPI validation is delegated to @powerduck/openapi-parser.
 *
 * @example
 * ```typescript
 * // Node.js / Electron usage
 * import { initializeWorkspace, createWorkspaceApi } from "@powerduck/workspace-yaml";
 *
 * // Create a workspace with an API file
 * const { workspaceFilePath, openApiFilePath } = await createWorkspaceApi({
 *   workspaceDirectory: "./my-project",
 *   oasId: "my-api",
 *   name: "My API",
 *   title: "My API Documentation",
 *   version: "1.0.0",
 * });
 *
 * // Browser usage (no filesystem)
 * import { createWorkspaceYaml, createOpenApiYaml } from "@powerduck/workspace-yaml/core";
 *
 * const workspaceContent = createWorkspaceYaml();
 * const openApiContent = createOpenApiYaml({ title: "My API" });
 * // Save to IndexedDB, localStorage, or any storage layer
 * ```
 */

// ─── Core layer (browser-safe, re-exported for convenience) ───────────────

export {
  createWorkspaceYaml,
  createOpenApiYaml,
  createWorkspaceWithApi,
  parseWorkspaceYaml,
} from "./core/index";

// ─── File layer (Node.js / Electron only) ───────────────────────────────────

export {
  initializeWorkspace,
  initializeOpenApi,
  createWorkspaceApi,
} from "./file/index";

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  WorkspaceConfig,
  OasFileEntry,
  CreateWorkspaceOptions,
  CreateOpenApiOptions,
  CreateWorkspaceWithApiOptions,
  WorkspaceWithApiResult,
  InitializeWorkspaceOptions,
  InitializeOpenApiOptions,
  CreateWorkspaceApiOptions,
  InitializeWorkspaceResult,
  InitializeOpenApiResult,
  CreateWorkspaceApiResult,
  WorkspaceYamlErrorCode,
} from "./types";

export { WorkspaceYamlError } from "./types";
