import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseDocument } from "yaml";

import {
  initializeWorkspace,
  initializeOpenApi,
  createWorkspaceApi,
} from "../src/file/index";
import { parseWorkspaceYaml } from "../src/core/index";
import { WorkspaceYamlError } from "../src/types";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "workspace-yaml-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("initializeWorkspace", () => {
  it("creates a workspace.yaml file with default content", async () => {
    const result = await initializeWorkspace({ directory: tempDir });

    expect(result.filePath).toBe(path.join(tempDir, "workspace.yaml"));
    expect(result.workspace.version).toBe(1);
    expect(result.workspace.activeOasFileId).toBeNull();
    expect(result.workspace.oasFiles).toEqual([]);

    const content = await readFile(result.filePath, "utf8");
    const parsed = parseWorkspaceYaml(content);
    expect(parsed.version).toBe(1);
  });

  it("creates a workspace with custom file name", async () => {
    const result = await initializeWorkspace({
      directory: tempDir,
      workspaceFileName: "custom-workspace.yaml",
    });

    expect(result.filePath).toBe(path.join(tempDir, "custom-workspace.yaml"));
    const fileStat = await stat(result.filePath);
    expect(fileStat.isFile()).toBe(true);
  });

  it("creates a workspace with initial oasFiles", async () => {
    const result = await initializeWorkspace({
      directory: tempDir,
      activeOasFileId: "api-v1",
      oasFiles: [
        { id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" },
      ],
    });

    expect(result.workspace.oasFiles).toHaveLength(1);
    const content = await readFile(result.filePath, "utf8");
    const parsed = parseWorkspaceYaml(content);
    expect(parsed.oasFiles[0].id).toBe("api-v1");
  });

  it("throws when file already exists and overwrite is false", async () => {
    await initializeWorkspace({ directory: tempDir });

    await expect(initializeWorkspace({ directory: tempDir })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("overwrites when overwrite is true", async () => {
    await initializeWorkspace({ directory: tempDir });

    const result = await initializeWorkspace({
      directory: tempDir,
      overwrite: true,
      activeOasFileId: "new-api",
      oasFiles: [{ id: "new-api", name: "New API", file: "oasFiles/new.yaml" }],
    });

    const content = await readFile(result.filePath, "utf8");
    const parsed = parseWorkspaceYaml(content);
    expect(parsed.activeOasFileId).toBe("new-api");
  });

  it("creates nested directories", async () => {
    const nestedDir = path.join(tempDir, "a", "b", "c");
    const result = await initializeWorkspace({ directory: nestedDir });

    expect(result.filePath).toBe(path.join(nestedDir, "workspace.yaml"));
    const fileStat = await stat(result.filePath);
    expect(fileStat.isFile()).toBe(true);
  });

  it("throws on invalid options object", async () => {
    await expect(initializeWorkspace(null as unknown as { directory: string })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on empty directory", async () => {
    await expect(initializeWorkspace({ directory: "  " })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on workspaceFileName with path separators", async () => {
    await expect(
      initializeWorkspace({ directory: tempDir, workspaceFileName: "../escape.yaml" }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("writes valid YAML that can be parsed", async () => {
    const result = await initializeWorkspace({ directory: tempDir });
    const content = await readFile(result.filePath, "utf8");
    const doc = parseDocument(content);
    expect(doc.errors).toHaveLength(0);
  });
});

describe("initializeOpenApi", () => {
  it("creates an OpenAPI 3.2 YAML file", async () => {
    const filePath = path.join(tempDir, "api.openapi.yaml");
    const result = await initializeOpenApi({
      filePath,
      title: "Test API",
      version: "1.0.0",
    });

    expect(result.filePath).toBe(filePath);
    expect(result.title).toBe("Test API");
    expect(result.version).toBe("1.0.0");

    const content = await readFile(filePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.openapi).toBe("3.2.0");
    expect(parsed.info.title).toBe("Test API");
    expect(parsed.paths).toEqual({});
  });

  it("defaults version to 1.0.0", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    const result = await initializeOpenApi({ filePath, title: "Default Version" });

    expect(result.version).toBe("1.0.0");
  });

  it("includes description when provided", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    await initializeOpenApi({
      filePath,
      title: "Described API",
      description: "This is a description",
    });

    const content = await readFile(filePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.info.description).toBe("This is a description");
  });

  it("throws when file already exists and overwrite is false", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    await initializeOpenApi({ filePath, title: "First" });

    await expect(initializeOpenApi({ filePath, title: "Second" })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("overwrites when overwrite is true", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    await initializeOpenApi({ filePath, title: "First" });

    await initializeOpenApi({ filePath, title: "Second", overwrite: true });

    const content = await readFile(filePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.info.title).toBe("Second");
  });

  it("creates nested directories", async () => {
    const filePath = path.join(tempDir, "deep", "nested", "api.yaml");
    const result = await initializeOpenApi({ filePath, title: "Nested API" });

    expect(result.filePath).toBe(filePath);
    const fileStat = await stat(filePath);
    expect(fileStat.isFile()).toBe(true);
  });

  it("throws on non-yaml extension", async () => {
    const filePath = path.join(tempDir, "api.json");
    await expect(initializeOpenApi({ filePath, title: "Bad" })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on empty title", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    await expect(initializeOpenApi({ filePath, title: "  " })).rejects.toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on invalid options", async () => {
    await expect(
      initializeOpenApi(null as unknown as { filePath: string; title: string }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("writes valid YAML", async () => {
    const filePath = path.join(tempDir, "api.yaml");
    await initializeOpenApi({ filePath, title: "Valid API" });

    const content = await readFile(filePath, "utf8");
    const doc = parseDocument(content);
    expect(doc.errors).toHaveLength(0);
  });
});

describe("createWorkspaceApi", () => {
  it("creates both workspace and OpenAPI files", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
      title: "My API Documentation",
      version: "1.0.0",
    });

    expect(result.workspaceFilePath).toBe(path.join(tempDir, "workspace.yaml"));
    expect(result.openApiFilePath).toBe(path.join(tempDir, "oasFiles", "my-api.openapi.yaml"));
    expect(result.workspace.activeOasFileId).toBe("my-api");
    expect(result.workspace.oasFiles).toHaveLength(1);

    // Verify workspace file
    const workspaceContent = await readFile(result.workspaceFilePath, "utf8");
    const workspace = parseWorkspaceYaml(workspaceContent);
    expect(workspace.oasFiles[0].id).toBe("my-api");

    // Verify OpenAPI file
    const openApiContent = await readFile(result.openApiFilePath, "utf8");
    const openApi = parseDocument(openApiContent).toJS();
    expect(openApi.openapi).toBe("3.2.0");
    expect(openApi.info.title).toBe("My API Documentation");
  });

  it("uses custom file path", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
      file: "custom/my-api.yaml",
    });

    expect(result.openApiFilePath).toBe(path.join(tempDir, "custom", "my-api.yaml"));
  });

  it("adds API to existing workspace", async () => {
    // Create initial workspace
    await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "first-api",
      name: "First API",
    });

    // Add second API
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "second-api",
      name: "Second API",
    });

    expect(result.workspace.oasFiles).toHaveLength(2);
    expect(result.workspace.oasFiles[0].id).toBe("first-api");
    expect(result.workspace.oasFiles[1].id).toBe("second-api");
    // First API remains active
    expect(result.workspace.activeOasFileId).toBe("first-api");
  });

  it("throws when API id already exists in workspace", async () => {
    await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "existing-api",
      name: "Existing API",
    });

    await expect(
      createWorkspaceApi({
        workspaceDirectory: tempDir,
        oasId: "existing-api",
        name: "Duplicate API",
      }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("throws when OpenAPI file already exists and overwriteOpenApi is false", async () => {
    // Create the OpenAPI file first
    const openApiPath = path.join(tempDir, "oasFiles", "my-api.openapi.yaml");
    await initializeOpenApi({ filePath: openApiPath, title: "Pre-existing" });

    await expect(
      createWorkspaceApi({
        workspaceDirectory: tempDir,
        oasId: "my-api",
        name: "My API",
      }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("overwrites OpenAPI file when overwriteOpenApi is true", async () => {
    const openApiPath = path.join(tempDir, "oasFiles", "my-api.openapi.yaml");
    await initializeOpenApi({ filePath: openApiPath, title: "Old Title" });

    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
      title: "New Title",
      overwriteOpenApi: true,
    });

    const content = await readFile(result.openApiFilePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.info.title).toBe("New Title");
  });

  it("defaults title to name", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API Name",
    });

    const content = await readFile(result.openApiFilePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.info.title).toBe("My API Name");
  });

  it("includes description in OpenAPI", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
      description: "Detailed description here",
    });

    const content = await readFile(result.openApiFilePath, "utf8");
    const parsed = parseDocument(content).toJS();
    expect(parsed.info.description).toBe("Detailed description here");
  });

  it("throws on empty oasId", async () => {
    await expect(
      createWorkspaceApi({
        workspaceDirectory: tempDir,
        oasId: "  ",
        name: "My API",
      }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("throws on empty name", async () => {
    await expect(
      createWorkspaceApi({
        workspaceDirectory: tempDir,
        oasId: "my-api",
        name: "",
      }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("throws on invalid options", async () => {
    await expect(
      createWorkspaceApi(null as unknown as { workspaceDirectory: string; oasId: string; name: string }),
    ).rejects.toThrow(WorkspaceYamlError);
  });

  it("creates oasFiles directory", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
    });

    const dirStat = await stat(path.dirname(result.openApiFilePath));
    expect(dirStat.isDirectory()).toBe(true);
  });

  it("writes workspace with POSIX path separators", async () => {
    const result = await createWorkspaceApi({
      workspaceDirectory: tempDir,
      oasId: "my-api",
      name: "My API",
    });

    const content = await readFile(result.workspaceFilePath, "utf8");
    expect(content).toContain("oasFiles/my-api.openapi.yaml");
    expect(content).not.toContain("\\\\");
  });
});
