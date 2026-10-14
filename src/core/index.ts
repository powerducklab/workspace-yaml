/**
 * Core layer — browser-safe pure functions for generating YAML content.
 *
 * This module has zero filesystem dependencies and works in browsers,
 * Node.js, Electron, and any JavaScript environment.
 *
 * It generates:
 * - workspace.yaml content
 * - OpenAPI 3.2 YAML content
 * - Both together (workspace + API)
 */

import { parseDocument, stringify } from "yaml";
import type {
  CreateOpenApiOptions,
  CreateWorkspaceOptions,
  CreateWorkspaceWithApiOptions,
  OasFileEntry,
  WorkspaceConfig,
  WorkspaceWithApiResult,
} from "../types";
import { WorkspaceYamlError } from "../types";

/**
 * Default YAML formatting options.
 */
const YAML_FORMAT = {
  indent: 2,
  lineWidth: 0,
  sortKeys: false,
} as const;

/**
 * Validates that a string is non-empty after trimming.
 */
function requireNonEmpty(value: string, name: string): string {
  if (typeof value !== "string") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `${name} must be a string.`,
    );
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `${name} must not be empty.`,
    );
  }

  return trimmed;
}

/**
 * Validates an OAS file entry.
 */
function validateOasFileEntry(entry: OasFileEntry, index: number): void {
  if (entry === null || typeof entry !== "object") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `oasFiles[${index}] must be an object.`,
    );
  }

  requireNonEmpty(entry.id, `oasFiles[${index}].id`);
  requireNonEmpty(entry.name, `oasFiles[${index}].name`);
  requireNonEmpty(entry.file, `oasFiles[${index}].file`);

  // Ensure POSIX path separators
  if (entry.file.includes("\\")) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `oasFiles[${index}].file must use POSIX path separators ("/"), not backslashes.`,
    );
  }

  if (entry.location !== undefined && entry.location !== "workspace" && entry.location !== "external") {
    throw new WorkspaceYamlError("INVALID_ARGUMENT", `oasFiles[${index}].location must be workspace or external.`);
  }
  const absolute = entry.file.startsWith("/") || /^[a-zA-Z]:\//.test(entry.file);
  const traversal = entry.file.split("/").some(segment => segment === ".." || segment === ".");
  if (entry.file.includes("\0") || traversal || (entry.location === "external" ? !absolute : absolute || /^[a-zA-Z]:/.test(entry.file))) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `oasFiles[${index}].file must be ${entry.location === "external" ? "an absolute external" : "a workspace-relative"} path without traversal.`,
    );
  }

  // Workspace entries may reference YAML or JSON OpenAPI documents.
  if (!/\.(ya?ml|json)$/i.test(entry.file)) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `oasFiles[${index}].file must have a .yaml, .yml or .json extension.`,
    );
  }
}

/**
 * Validates a workspace configuration object.
 */
function validateWorkspaceConfig(config: WorkspaceConfig): void {
  if (config.version !== 1) {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      `workspace version must be 1, got: ${String(config.version)}.`,
    );
  }

  if (config.activeOasFileId !== null && typeof config.activeOasFileId !== "string") {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      "activeOasFileId must be a string or null.",
    );
  }

  if (!Array.isArray(config.oasFiles)) {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      "oasFiles must be an array.",
    );
  }

  const ids = new Set<string>();

  for (let i = 0; i < config.oasFiles.length; i++) {
    const entry = config.oasFiles[i];
    validateOasFileEntry(entry, i);

    if (ids.has(entry.id)) {
      throw new WorkspaceYamlError(
        "INVALID_WORKSPACE",
        `Duplicate oasFiles id: "${entry.id}".`,
      );
    }
    ids.add(entry.id);
  }

  if (config.activeOasFileId !== null && !ids.has(config.activeOasFileId)) {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      `activeOasFileId "${config.activeOasFileId}" does not exist in oasFiles.`,
    );
  }
}

/**
 * Creates a workspace configuration object.
 */
function buildWorkspaceConfig(options: CreateWorkspaceOptions): WorkspaceConfig {
  const config: WorkspaceConfig = {
    version: 1,
    activeOasFileId: options.activeOasFileId ?? null,
    oasFiles: options.oasFiles ? [...options.oasFiles] : [],
  };

  validateWorkspaceConfig(config);
  return config;
}

/**
 * Creates a workspace.yaml content string.
 *
 * This is a pure function with no filesystem access.
 * Works in browsers, Node.js, and Electron.
 *
 * @param options - Workspace creation options
 * @returns The workspace.yaml content as a YAML string
 *
 * @example
 * ```typescript
 * import { createWorkspaceYaml } from "@powerduck/workspace-yaml/core";
 *
 * const yaml = createWorkspaceYaml({
 *   activeOasFileId: "api-v1",
 *   oasFiles: [
 *     { id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" },
 *   ],
 * });
 * // => "version: 1\nactiveOasFileId: api-v1\noasFiles:\n  - ..."
 * ```
 */
export function createWorkspaceYaml(options: CreateWorkspaceOptions = {}): string {
  const config = buildWorkspaceConfig(options);
  return stringify(config, YAML_FORMAT);
}

/**
 * Creates an OpenAPI 3.2 document object.
 */
function buildOpenApiDocument(options: CreateOpenApiOptions): Record<string, unknown> {
  const title = requireNonEmpty(options.title, "title");
  const version = requireNonEmpty(options.version ?? "1.0.0", "version");

  const doc: Record<string, unknown> = {
    openapi: "3.2.0",
    info: {
      title,
      version,
    },
    paths: {},
  };

  if (options.description !== undefined) {
    (doc.info as Record<string, unknown>).description = options.description;
  }

  if (options.contact !== undefined) {
    (doc.info as Record<string, unknown>).contact = options.contact;
  }

  if (options.license !== undefined) {
    (doc.info as Record<string, unknown>).license = options.license;
  }

  if (options.servers !== undefined && options.servers.length > 0) {
    doc.servers = options.servers;
  }

  return doc;
}

/**
 * Creates an OpenAPI 3.2 YAML content string.
 *
 * This is a pure function with no filesystem access.
 * Works in browsers, Node.js, and Electron.
 *
 * The generated document is a minimal but valid OpenAPI 3.2 spec
 * with empty paths, ready for the user to add endpoints.
 *
 * @param options - OpenAPI creation options
 * @returns The OpenAPI 3.2 YAML content as a string
 *
 * @example
 * ```typescript
 * import { createOpenApiYaml } from "@powerduck/workspace-yaml/core";
 *
 * const yaml = createOpenApiYaml({
 *   title: "My API",
 *   version: "2.0.0",
 *   description: "A sample API",
 * });
 * // => "openapi: 3.2.0\ninfo:\n  title: My API\n  version: 2.0.0\npaths: {}"
 * ```
 */
export function createOpenApiYaml(options: CreateOpenApiOptions): string {
  const doc = buildOpenApiDocument(options);
  return stringify(doc, YAML_FORMAT);
}

/**
 * Normalizes a workspace-relative file path.
 * Ensures POSIX separators and .yaml extension.
 */
function normalizeOpenApiRelativePath(oasId: string, file?: string): string {
  let relativePath = file ?? `oasFiles/${oasId}.openapi.yaml`;

  // Normalize backslashes to forward slashes
  relativePath = relativePath.replace(/\\/g, "/");

  // Remove leading slashes (must be relative)
  while (relativePath.startsWith("/")) {
    relativePath = relativePath.slice(1);
  }

  // Ensure .yaml extension
  if (!/\.ya?ml$/i.test(relativePath)) {
    relativePath = `${relativePath}.yaml`;
  }

  return relativePath;
}

/**
 * Creates both a workspace.yaml and an OpenAPI 3.2 YAML content string.
 *
 * This is a pure function with no filesystem access.
 * Works in browsers, Node.js, and Electron.
 *
 * The workspace will contain a single API entry pointing to the
 * generated OpenAPI file, and that API will be set as active.
 *
 * @param options - Options for creating workspace + API
 * @returns Object containing both YAML strings and metadata
 *
 * @example
 * ```typescript
 * import { createWorkspaceWithApi } from "@powerduck/workspace-yaml/core";
 *
 * const { workspaceYaml, openApiYaml, openApiRelativePath } = createWorkspaceWithApi({
 *   oasId: "my-api",
 *   name: "My API",
 *   title: "My API Documentation",
 *   version: "1.0.0",
 * });
 *
 * // Save workspaceYaml to workspace.yaml
 * // Save openApiYaml to oasFiles/my-api.openapi.yaml
 * ```
 */
export function createWorkspaceWithApi(
  options: CreateWorkspaceWithApiOptions,
): WorkspaceWithApiResult {
  const oasId = requireNonEmpty(options.oasId, "oasId");
  const name = requireNonEmpty(options.name, "name");
  const openApiRelativePath = normalizeOpenApiRelativePath(oasId, options.file);

  const oasEntry: OasFileEntry = {
    id: oasId,
    name,
    file: openApiRelativePath,
  };

  const workspace: WorkspaceConfig = {
    version: 1,
    activeOasFileId: oasId,
    oasFiles: [oasEntry],
  };

  validateWorkspaceConfig(workspace);

  const openApiYaml = createOpenApiYaml({
    title: options.title ?? name,
    version: options.version ?? "1.0.0",
    description: options.description,
  });

  const workspaceYaml = stringify(workspace, YAML_FORMAT);

  return {
    workspaceYaml,
    openApiYaml,
    openApiRelativePath,
    workspace,
  };
}

/**
 * Validates a workspace.yaml content string.
 *
 * This is a pure function with no filesystem access.
 * Works in browsers, Node.js, and Electron.
 *
 * @param content - The raw YAML content to validate
 * @returns The parsed and validated workspace config
 * @throws WorkspaceYamlError if the content is invalid
 */
export function parseWorkspaceYaml(content: string): WorkspaceConfig {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      "Workspace content must be a non-empty string.",
    );
  }

  let parsed: unknown;

  try {
    const doc = parseDocument(content, { prettyErrors: true, strict: true });
    if (doc.errors.length > 0) {
      throw new WorkspaceYamlError(
        "INVALID_WORKSPACE",
        `Invalid YAML: ${doc.errors.map((e: Error) => e.message).join("; ")}`,
      );
    }
    parsed = doc.toJS({ mapAsMap: false });
  } catch (error) {
    if (error instanceof WorkspaceYamlError) {
      throw error;
    }
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      `Failed to parse workspace YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      "Workspace must be a YAML mapping (object).",
    );
  }

  const config = parsed as WorkspaceConfig;
  validateWorkspaceConfig(config);
  return config;
}
