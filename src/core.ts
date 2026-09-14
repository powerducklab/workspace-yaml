/**
 * @powerduck/workspace-yaml/core
 *
 * Browser-safe core entry point. Contains only pure functions for
 * generating YAML content strings. No filesystem access.
 *
 * Use this entry point in browsers, Edge Functions, or any environment
 * where Node.js filesystem APIs are not available.
 */

export {
  createWorkspaceYaml,
  createOpenApiYaml,
  createWorkspaceWithApi,
  parseWorkspaceYaml,
} from "./core/index";

export type {
  WorkspaceConfig,
  OasFileEntry,
  CreateWorkspaceOptions,
  CreateOpenApiOptions,
  CreateWorkspaceWithApiOptions,
  WorkspaceWithApiResult,
  WorkspaceYamlErrorCode,
} from "./types";

export { WorkspaceYamlError } from "./types";
