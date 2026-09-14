/**
 * Node.js / Electron demo — uses the file layer.
 *
 * Run with: npm run demo
 *
 * This demo shows how to initialize workspace.yaml and OpenAPI files
 * on disk. The file layer reuses @powerduck/conf-patch for atomic writes,
 * file locking, and path normalization.
 */

import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  initializeWorkspace,
  initializeOpenApi,
  createWorkspaceApi,
} from "../src/file";
import { parseWorkspaceYaml } from "../src/core";

async function main(): Promise<void> {
  // Create a temporary directory for the demo
  const demoDir = await mkdtemp(path.join(tmpdir(), "workspace-yaml-demo-"));
  console.log(`Demo directory: ${demoDir}\n`);

  try {
    // ─── 1. Initialize a workspace ───────────────────────────────────────

    console.log("1. Initializing workspace...");
    const workspaceResult = await initializeWorkspace({
      directory: demoDir,
      overwrite: true,
    });
    console.log(`   Created: ${workspaceResult.filePath}`);
    console.log(`   Version: ${workspaceResult.workspace.version}`);
    console.log(`   APIs: ${workspaceResult.workspace.oasFiles.length}\n`);

    // ─── 2. Initialize a standalone OpenAPI file ─────────────────────────

    console.log("2. Initializing standalone OpenAPI file...");
    const openApiPath = path.join(demoDir, "standalone-api.openapi.yaml");
    const openApiResult = await initializeOpenApi({
      filePath: openApiPath,
      title: "Standalone API",
      version: "1.0.0",
      description: "A standalone OpenAPI document.",
      overwrite: true,
    });
    console.log(`   Created: ${openApiResult.filePath}`);
    console.log(`   Title: ${openApiResult.title}`);
    console.log(`   Version: ${openApiResult.version}\n`);

    // ─── 3. Create workspace + API together (most common pattern) ─────────

    console.log("3. Creating workspace with API...");
    const apiResult = await createWorkspaceApi({
      workspaceDirectory: demoDir,
      oasId: "users-api",
      name: "Users API",
      title: "Users API Documentation",
      version: "2.0.0",
      description: "API for managing user accounts.",
      overwriteOpenApi: true,
    });
    console.log(`   Workspace: ${apiResult.workspaceFilePath}`);
    console.log(`   OpenAPI: ${apiResult.openApiFilePath}`);
    console.log(`   Active API: ${apiResult.workspace.activeOasFileId}`);
    console.log(`   Total APIs: ${apiResult.workspace.oasFiles.length}\n`);

    // ─── 4. Add a second API to the existing workspace ───────────────────

    console.log("4. Adding second API to workspace...");
    const secondApiResult = await createWorkspaceApi({
      workspaceDirectory: demoDir,
      oasId: "orders-api",
      name: "Orders API",
      title: "Orders API Documentation",
      version: "1.0.0",
      overwriteOpenApi: true,
    });
    console.log(`   Total APIs now: ${secondApiResult.workspace.oasFiles.length}`);
    console.log(
      `   APIs: ${secondApiResult.workspace.oasFiles.map((o) => o.id).join(", ")}\n`,
    );

    // ─── 5. Read and verify the workspace ─────────────────────────────────

    console.log("5. Reading and verifying workspace...");
    const workspaceContent = await readFile(apiResult.workspaceFilePath, "utf8");
    const workspace = parseWorkspaceYaml(workspaceContent);
    console.log(`   Version: ${workspace.version}`);
    console.log(`   Active API: ${workspace.activeOasFileId}`);
    console.log(`   API count: ${workspace.oasFiles.length}`);
    for (const oas of workspace.oasFiles) {
      console.log(`     - ${oas.id}: ${oas.name} -> ${oas.file}`);
    }
    console.log();

    // ─── 6. Error handling: duplicate API id ──────────────────────────────

    console.log("6. Error handling: duplicate API id...");
    try {
      await createWorkspaceApi({
        workspaceDirectory: demoDir,
        oasId: "users-api",
        name: "Duplicate API",
      });
    } catch (error) {
      if (error instanceof Error) {
        console.log(`   Caught expected error: ${error.message}\n`);
      }
    }

    // ─── 7. Error handling: file exists without overwrite ─────────────────

    console.log("7. Error handling: file exists without overwrite...");
    try {
      await initializeWorkspace({ directory: demoDir });
    } catch (error) {
      if (error instanceof Error) {
        console.log(`   Caught expected error: ${error.message}\n`);
      }
    }

    console.log("=".repeat(60));
    console.log("  Demo complete. All files created atomically with locks.");
    console.log("=".repeat(60));
  } finally {
    // Clean up
    await rm(demoDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
