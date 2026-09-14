/**
 * @powerduck/workspace-yaml
 *
 * Type definitions for workspace and OpenAPI YAML initialization.
 * This module is browser-safe and contains no filesystem access.
 */

/**
 * A single OpenAPI file entry in a workspace configuration.
 */
export interface OasFileEntry {
  /** Unique identifier for the API within the workspace. */
  id: string;
  /** Human-readable display name of the API. */
  name: string;
  /** Workspace-relative path to the OpenAPI YAML file (POSIX separators). */
  file: string;
}

/**
 * The workspace.yaml document structure.
 */
export interface WorkspaceConfig {
  /** Schema version, currently always 1. */
  version: 1;
  /** The currently active API file id, or null if none is active. */
  activeOasFileId: string | null;
  /** All registered OpenAPI files in this workspace. */
  oasFiles: OasFileEntry[];
}

/**
 * Options for creating a workspace.yaml content string.
 */
export interface CreateWorkspaceOptions {
  /** Optional initial active API file id. Defaults to null. */
  activeOasFileId?: string | null;
  /** Optional initial list of API file entries. Defaults to empty array. */
  oasFiles?: OasFileEntry[];
}

/**
 * Options for creating an OpenAPI 3.2 YAML content string.
 */
export interface CreateOpenApiOptions {
  /** API title. Required, must be non-empty after trimming. */
  title: string;
  /** API version. Defaults to "1.0.0". */
  version?: string;
  /** Optional API description. */
  description?: string;
  /** Optional contact information. */
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  /** Optional license information. */
  license?: {
    name: string;
    url?: string;
  };
  /** Optional servers list. */
  servers?: Array<{ url: string; description?: string }>;
}

/**
 * Options for creating both a workspace and an OpenAPI file together.
 */
export interface CreateWorkspaceWithApiOptions {
  /** Unique identifier for the API. Required. */
  oasId: string;
  /** Display name of the API. Required. */
  name: string;
  /** Workspace-relative path for the OpenAPI file. Defaults to `oasFiles/${oasId}.openapi.yaml`. */
  file?: string;
  /** API title. Defaults to the name. */
  title?: string;
  /** API version. Defaults to "1.0.0". */
  version?: string;
  /** Optional API description. */
  description?: string;
}

/**
 * Result of creating a workspace with an API.
 */
export interface WorkspaceWithApiResult {
  /** The generated workspace.yaml content. */
  workspaceYaml: string;
  /** The generated OpenAPI YAML content. */
  openApiYaml: string;
  /** The workspace-relative path of the OpenAPI file. */
  openApiRelativePath: string;
  /** The resolved workspace configuration. */
  workspace: WorkspaceConfig;
}

/**
 * Options for initializing a workspace file on disk.
 */
export interface InitializeWorkspaceOptions {
  /** Absolute or relative directory path where workspace.yaml will be created. */
  directory: string;
  /** Optional custom workspace file name. Defaults to "workspace.yaml". */
  workspaceFileName?: string;
  /** Whether to overwrite an existing file. Defaults to false. */
  overwrite?: boolean;
  /** Optional initial active API file id. */
  activeOasFileId?: string | null;
  /** Optional initial list of API file entries. */
  oasFiles?: OasFileEntry[];
}

/**
 * Options for initializing an OpenAPI file on disk.
 */
export interface InitializeOpenApiOptions {
  /** Absolute or relative path for the OpenAPI YAML file. */
  filePath: string;
  /** API title. Required. */
  title: string;
  /** API version. Defaults to "1.0.0". */
  version?: string;
  /** Optional API description. */
  description?: string;
  /** Whether to overwrite an existing file. Defaults to false. */
  overwrite?: boolean;
}

/**
 * Options for creating a workspace with an API file on disk.
 */
export interface CreateWorkspaceApiOptions {
  /** Absolute or relative path to the workspace directory. */
  workspaceDirectory: string;
  /** Unique identifier for the API. Required. */
  oasId: string;
  /** Display name of the API. Required. */
  name: string;
  /** Workspace-relative path for the OpenAPI file. Defaults to `oasFiles/${oasId}.openapi.yaml`. */
  file?: string;
  /** API title. Defaults to the name. */
  title?: string;
  /** API version. Defaults to "1.0.0". */
  version?: string;
  /** Optional API description. */
  description?: string;
  /** Whether to overwrite an existing OpenAPI file. Defaults to false. */
  overwriteOpenApi?: boolean;
}

/**
 * Result of initializing a workspace file.
 */
export interface InitializeWorkspaceResult {
  /** Absolute path to the created workspace.yaml file. */
  filePath: string;
  /** The workspace configuration that was written. */
  workspace: WorkspaceConfig;
}

/**
 * Result of initializing an OpenAPI file.
 */
export interface InitializeOpenApiResult {
  /** Absolute path to the created OpenAPI YAML file. */
  filePath: string;
  /** The OpenAPI document title. */
  title: string;
  /** The OpenAPI document version. */
  version: string;
}

/**
 * Result of creating a workspace with an API file on disk.
 */
export interface CreateWorkspaceApiResult {
  /** Absolute path to the workspace.yaml file. */
  workspaceFilePath: string;
  /** Absolute path to the OpenAPI YAML file. */
  openApiFilePath: string;
  /** The workspace configuration that was written. */
  workspace: WorkspaceConfig;
}

/**
 * Error codes for workspace-yaml operations.
 */
export type WorkspaceYamlErrorCode =
  | "INVALID_ARGUMENT"
  | "ALREADY_EXISTS"
  | "NOT_FOUND"
  | "IO_ERROR"
  | "INVALID_WORKSPACE"
  | "INVALID_OPENAPI"
  | "ROLLBACK_FAILED";

/**
 * Custom error class for workspace-yaml operations.
 */
export class WorkspaceYamlError extends Error {
  public readonly code: WorkspaceYamlErrorCode;
  public readonly filePath?: string;
  public override readonly cause?: unknown;

  public constructor(
    code: WorkspaceYamlErrorCode,
    message: string,
    filePath?: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "WorkspaceYamlError";
    this.code = code;
    this.filePath = filePath;
    this.cause = cause;
  }
}
