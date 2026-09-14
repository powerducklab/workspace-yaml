/**
 * Browser-safe demo — uses only the core layer.
 *
 * Run with: npm run demo:browser
 *
 * This demo shows how to generate workspace.yaml and OpenAPI YAML content
 * without any filesystem access. The generated strings can be saved to
 * IndexedDB, localStorage, sent to an API, or used in any browser context.
 */

import {
  createWorkspaceYaml,
  createOpenApiYaml,
  createWorkspaceWithApi,
  parseWorkspaceYaml,
} from "../src/core";

function section(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60) + "\n");
}

// ─── 1. Create a default workspace ─────────────────────────────────────────

section("1. Create a default workspace.yaml");

const defaultWorkspace = createWorkspaceYaml();
console.log(defaultWorkspace);

// ─── 2. Create a workspace with initial APIs ───────────────────────────────

section("2. Create a workspace with initial APIs");

const workspaceWithApis = createWorkspaceYaml({
  activeOasFileId: "public-api",
  oasFiles: [
    { id: "public-api", name: "Public API", file: "oasFiles/public.openapi.yaml" },
    { id: "internal-api", name: "Internal API", file: "oasFiles/internal.openapi.yaml" },
  ],
});
console.log(workspaceWithApis);

// ─── 3. Create an OpenAPI 3.2 document ─────────────────────────────────────

section("3. Create an OpenAPI 3.2 YAML document");

const openApiYaml = createOpenApiYaml({
  title: "My Awesome API",
  version: "2.0.0",
  description: "A production-ready API for managing resources.",
  contact: {
    name: "API Team",
    email: "api@example.com",
  },
  license: {
    name: "MIT",
    url: "https://opensource.org/licenses/MIT",
  },
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "https://staging.example.com", description: "Staging" },
  ],
});
console.log(openApiYaml);

// ─── 4. Create workspace + API together ─────────────────────────────────────

section("4. Create workspace + OpenAPI together (common pattern)");

const { workspaceYaml, openApiYaml: apiYaml, openApiRelativePath, workspace } =
  createWorkspaceWithApi({
    oasId: "users-api",
    name: "Users API",
    title: "Users API Documentation",
    version: "1.0.0",
    description: "API for managing user accounts and profiles.",
  });

console.log(`OpenAPI relative path: ${openApiRelativePath}`);
console.log(`Active API ID: ${workspace.activeOasFileId}`);
console.log("\n--- workspace.yaml ---");
console.log(workspaceYaml);
console.log("\n--- OpenAPI YAML ---");
console.log(apiYaml);

// ─── 5. Parse and validate a workspace ─────────────────────────────────────

section("5. Parse and validate workspace content");

const parsed = parseWorkspaceYaml(workspaceYaml);
console.log("Parsed workspace:", JSON.stringify(parsed, null, 2));

// ─── 6. Error handling ──────────────────────────────────────────────────────

section("6. Error handling examples");

try {
  createWorkspaceYaml({
    activeOasFileId: "nonexistent",
    oasFiles: [{ id: "real", name: "Real", file: "oasFiles/real.yaml" }],
  });
} catch (error) {
  if (error instanceof Error) {
    console.log(`Caught expected error: ${error.message}`);
  }
}

try {
  createOpenApiYaml({ title: "   " });
} catch (error) {
  if (error instanceof Error) {
    console.log(`Caught expected error: ${error.message}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log("  Demo complete. All content generated without filesystem access.");
console.log("=".repeat(60) + "\n");
