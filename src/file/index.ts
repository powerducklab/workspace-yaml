/**
 * File layer — Node.js / Electron only.
 *
 * This module wraps the core layer's pure functions with filesystem IO.
 * It reuses @powerduck/conf-patch for atomic writes, file locking,
 * and path normalization — no redundant IO implementations.
 *
 * Do not import this module in browser environments.
 * Use `@powerduck/workspace-yaml/core` instead.
 */

import { lstat, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import {
  normalizeFilePath,
  readConfigFile,
  writeConfigFile,
  withFileLock,
} from "@powerduck/conf-patch";

import {
  createOpenApiYaml,
  createWorkspaceWithApi,
  createWorkspaceYaml,
  parseWorkspaceYaml,
} from "../core/index";

import type {
  CreateWorkspaceApiOptions,
  CreateWorkspaceApiResult,
  InitializeOpenApiOptions,
  InitializeOpenApiResult,
  InitializeWorkspaceOptions,
  InitializeWorkspaceResult,
  WorkspaceConfig,
} from "../types";
import { WorkspaceYamlError } from "../types";

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
async function ensureDirectory(directoryPath: string): Promise<void> {
  try {
    await mkdir(directoryPath, { recursive: true });
  } catch (error) {
    throw new WorkspaceYamlError(
      "IO_ERROR",
      `Failed to create directory: ${directoryPath}`,
      directoryPath,
      error,
    );
  }
}

/** Never interpret unreadable or malformed existing data as a missing file. */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new WorkspaceYamlError("IO_ERROR", `Failed to inspect file: ${filePath}`, filePath, error);
  }
}

/**
 * Initializes a workspace.yaml file on disk.
 *
 * Generates the workspace content using the core layer, then writes it
 * atomically using conf-patch's writeConfigFile (which handles locking
 * and crash-safe temp-file+rename).
 *
 * This function only works in Node.js / Electron environments.
 * For browser usage, use `createWorkspaceYaml` from the core layer.
 *
 * @param options - Workspace initialization options
 * @returns The absolute file path and the workspace config that was written
 * @throws WorkspaceYamlError if the file already exists and overwrite is false
 *
 * @example
 * ```typescript
 * import { initializeWorkspace } from "@powerduck/workspace-yaml";
 *
 * const { filePath, workspace } = await initializeWorkspace({
 *   directory: "./my-project",
 *   overwrite: false,
 * });
 * console.log("Created workspace at:", filePath);
 * ```
 */
export async function initializeWorkspace(
  options: InitializeWorkspaceOptions,
): Promise<InitializeWorkspaceResult> {
  if (options === null || typeof options !== "object") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "initializeWorkspace requires an options object.",
    );
  }

  if (typeof options.directory !== "string" || options.directory.trim().length === 0) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "directory must be a non-empty string.",
    );
  }

  const directory = normalizeFilePath(options.directory);
  const fileName = options.workspaceFileName ?? "workspace.yaml";

  // Validate file name (no path separators, no traversal)
  if (fileName !== path.basename(fileName) || fileName === "." || fileName === "..") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "workspaceFileName must be a file name only, not a path.",
    );
  }

  const filePath = path.join(directory, fileName);
  const overwrite = options.overwrite ?? false;

  // Generate content using the core layer (pure function)
  const workspaceYaml = createWorkspaceYaml({
    activeOasFileId: options.activeOasFileId,
    oasFiles: options.oasFiles,
  });

  await ensureDirectory(directory);

  // Use conf-patch's atomic write with file lock
  await withFileLock(filePath, async () => {
    if (!overwrite && (await fileExists(filePath))) {
      throw new WorkspaceYamlError(
        "ALREADY_EXISTS",
        `Workspace file already exists: ${filePath}. Set overwrite: true to replace it.`,
        filePath,
      );
    }

    try {
      await writeConfigFile(filePath, workspaceYaml, { lock: false });
    } catch (error) {
      throw new WorkspaceYamlError(
        "IO_ERROR",
        `Failed to write workspace file: ${filePath}`,
        filePath,
        error,
      );
    }
  });

  const workspace: WorkspaceConfig = {
    version: 1,
    activeOasFileId: options.activeOasFileId ?? null,
    oasFiles: options.oasFiles ? [...options.oasFiles] : [],
  };

  return { filePath, workspace };
}

/**
 * Initializes an OpenAPI 3.2 YAML file on disk.
 *
 * Generates the OpenAPI content using the core layer, then writes it
 * atomically using conf-patch's writeConfigFile.
 *
 * This function only works in Node.js / Electron environments.
 * For browser usage, use `createOpenApiYaml` from the core layer.
 *
 * @param options - OpenAPI initialization options
 * @returns The absolute file path, title, and version
 * @throws WorkspaceYamlError if the file already exists and overwrite is false
 *
 * @example
 * ```typescript
 * import { initializeOpenApi } from "@powerduck/workspace-yaml";
 *
 * const { filePath } = await initializeOpenApi({
 *   filePath: "./my-project/oasFiles/my-api.openapi.yaml",
 *   title: "My API",
 *   version: "1.0.0",
 * });
 * ```
 */
export async function initializeOpenApi(
  options: InitializeOpenApiOptions,
): Promise<InitializeOpenApiResult> {
  if (options === null || typeof options !== "object") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "initializeOpenApi requires an options object.",
    );
  }

  if (typeof options.filePath !== "string" || options.filePath.trim().length === 0) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "filePath must be a non-empty string.",
    );
  }

  const filePath = normalizeFilePath(options.filePath);
  const overwrite = options.overwrite ?? false;

  // Ensure YAML extension
  if (!/\.ya?ml$/i.test(filePath)) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      `OpenAPI file must have a .yaml or .yml extension: ${filePath}`,
      filePath,
    );
  }

  // Generate content using the core layer (pure function)
  const openApiYaml = createOpenApiYaml({
    title: options.title,
    version: options.version,
    description: options.description,
  });

  const directory = path.dirname(filePath);
  await ensureDirectory(directory);

  // Use conf-patch's atomic write with file lock
  await withFileLock(filePath, async () => {
    if (!overwrite && (await fileExists(filePath))) {
      throw new WorkspaceYamlError(
        "ALREADY_EXISTS",
        `OpenAPI file already exists: ${filePath}. Set overwrite: true to replace it.`,
        filePath,
      );
    }

    try {
      await writeConfigFile(filePath, openApiYaml, { lock: false });
    } catch (error) {
      throw new WorkspaceYamlError(
        "IO_ERROR",
        `Failed to write OpenAPI file: ${filePath}`,
        filePath,
        error,
      );
    }
  });

  return {
    filePath,
    title: options.title.trim(),
    version: options.version ?? "1.0.0",
  };
}

/**
 * Creates a workspace with an API file on disk, atomically.
 *
 * This is a transactional operation:
 * 1. Generate both workspace.yaml and OpenAPI YAML content (core layer)
 * 2. Acquire locks on both files
 * 3. Write OpenAPI file first
 * 4. Write workspace file (referencing the OpenAPI file)
 * 5. If workspace write fails, roll back the OpenAPI file
 *
 * Reuses conf-patch's withFileLock for multi-file locking and
 * writeConfigFile for atomic writes.
 *
 * This function only works in Node.js / Electron environments.
 *
 * @param options - Options for creating workspace + API
 * @returns Paths to both files and the workspace config
 * @throws WorkspaceYamlError if either file already exists (unless overwriteOpenApi is true)
 *
 * @example
 * ```typescript
 * import { createWorkspaceApi } from "@powerduck/workspace-yaml";
 *
 * const { workspaceFilePath, openApiFilePath } = await createWorkspaceApi({
 *   workspaceDirectory: "./my-project",
 *   oasId: "my-api",
 *   name: "My API",
 *   title: "My API Documentation",
 *   version: "1.0.0",
 * });
 * ```
 */
export async function createWorkspaceApi(
  options: CreateWorkspaceApiOptions,
): Promise<CreateWorkspaceApiResult> {
  if (options === null || typeof options !== "object") {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "createWorkspaceApi requires an options object.",
    );
  }

  if (
    typeof options.workspaceDirectory !== "string" ||
    options.workspaceDirectory.trim().length === 0
  ) {
    throw new WorkspaceYamlError(
      "INVALID_ARGUMENT",
      "workspaceDirectory must be a non-empty string.",
    );
  }

  if (typeof options.oasId !== "string" || options.oasId.trim().length === 0) {
    throw new WorkspaceYamlError("INVALID_ARGUMENT", "oasId must be a non-empty string.");
  }

  if (typeof options.name !== "string" || options.name.trim().length === 0) {
    throw new WorkspaceYamlError("INVALID_ARGUMENT", "name must be a non-empty string.");
  }

  const workspaceDirectory = normalizeFilePath(options.workspaceDirectory);
  const workspaceFilePath = path.join(workspaceDirectory, "workspace.yaml");
  const overwriteOpenApi = options.overwriteOpenApi ?? false;

  // Generate both contents using the core layer (pure functions)
  const { openApiYaml, openApiRelativePath, workspace } = createWorkspaceWithApi({
    oasId: options.oasId,
    name: options.name,
    file: options.file,
    title: options.title,
    version: options.version,
    description: options.description,
  });

  const openApiFilePath = path.join(workspaceDirectory, openApiRelativePath);

  await ensureDirectory(workspaceDirectory);
  await ensureDirectory(path.dirname(openApiFilePath));

  // Acquire locks on both files (sorted to prevent deadlocks)
  const lockPaths = [workspaceFilePath, openApiFilePath].sort();

  // We need to acquire both locks. conf-patch's withFileLock handles
  // single-file locking. For multi-file, we nest them in sorted order.
  const result = await withFileLock(lockPaths[0], async () => {
    return await withFileLock(lockPaths[1], async () => {
      // Check workspace exists (it must, we're creating it fresh)
      // If workspace exists, we need to read it and add the API entry
      let existingWorkspace: WorkspaceConfig | null = null;

      if (await fileExists(workspaceFilePath)) {
        const existingContent = await readConfigFile(workspaceFilePath);
        existingWorkspace = parseWorkspaceYaml(existingContent);
      }

      if (existingWorkspace !== null) {
        // Check if API id already exists
        if (existingWorkspace.oasFiles.some((oas) => oas.id === options.oasId)) {
          throw new WorkspaceYamlError(
            "INVALID_WORKSPACE",
            `An API with id "${options.oasId}" already exists in workspace.yaml.`,
            workspaceFilePath,
          );
        }
      }

      // Check OpenAPI file existence
      if (!overwriteOpenApi && (await fileExists(openApiFilePath))) {
        throw new WorkspaceYamlError(
          "ALREADY_EXISTS",
          `OpenAPI file already exists: ${openApiFilePath}. Set overwriteOpenApi: true to replace it.`,
          openApiFilePath,
        );
      }

      // Save original OpenAPI content for rollback
      const originalOpenApiContent = await fileExists(openApiFilePath)
        ? await readConfigFile(openApiFilePath)
        : undefined;

      // Step 1: Write OpenAPI file
      try {
        await writeConfigFile(openApiFilePath, openApiYaml, { lock: false });
      } catch (error) {
        throw new WorkspaceYamlError(
          "IO_ERROR",
          `Failed to write OpenAPI file: ${openApiFilePath}`,
          openApiFilePath,
          error,
        );
      }

      // Step 2: Write workspace file (with rollback on failure)
      let finalWorkspace: WorkspaceConfig;

      if (existingWorkspace !== null) {
        // Add new API entry to existing workspace
        finalWorkspace = {
          ...existingWorkspace,
          activeOasFileId: existingWorkspace.activeOasFileId ?? options.oasId,
          oasFiles: [
            ...existingWorkspace.oasFiles,
            { id: options.oasId, name: options.name.trim(), file: openApiRelativePath },
          ],
        };
      } else {
        finalWorkspace = workspace;
      }

      const finalWorkspaceYaml = createWorkspaceYaml({
        activeOasFileId: finalWorkspace.activeOasFileId,
        oasFiles: finalWorkspace.oasFiles,
      });

      try {
        await writeConfigFile(workspaceFilePath, finalWorkspaceYaml, { lock: false });
      } catch (workspaceWriteError) {
        // Rollback: restore original OpenAPI file or remove it
        try {
          if (originalOpenApiContent !== undefined) {
            await writeConfigFile(openApiFilePath, originalOpenApiContent, { lock: false });
          } else {
            await rm(openApiFilePath, { force: true });
          }
        } catch (rollbackError) {
          throw new WorkspaceYamlError(
            "ROLLBACK_FAILED",
            `Failed to update workspace and failed to roll back OpenAPI file: ${openApiFilePath}`,
            workspaceFilePath,
            { workspaceWriteError, rollbackError },
          );
        }

        throw workspaceWriteError;
      }

      return {
        workspaceFilePath,
        openApiFilePath,
        workspace: finalWorkspace,
      };
    });
  });

  return result;
}
