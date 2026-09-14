import { describe, it, expect } from "vitest";
import { WorkspaceYamlError } from "../src/types";
import type { WorkspaceYamlErrorCode } from "../src/types";

describe("WorkspaceYamlError", () => {
  it("creates an error with code and message", () => {
    const error = new WorkspaceYamlError("INVALID_ARGUMENT", "Bad argument");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WorkspaceYamlError);
    expect(error.name).toBe("WorkspaceYamlError");
    expect(error.code).toBe("INVALID_ARGUMENT");
    expect(error.message).toBe("Bad argument");
    expect(error.filePath).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it("creates an error with filePath", () => {
    const error = new WorkspaceYamlError(
      "NOT_FOUND",
      "File not found",
      "/path/to/file.yaml",
    );

    expect(error.filePath).toBe("/path/to/file.yaml");
  });

  it("creates an error with cause", () => {
    const cause = new Error("Original error");
    const error = new WorkspaceYamlError("IO_ERROR", "Write failed", undefined, cause);

    expect(error.cause).toBe(cause);
  });

  it("creates an error with all properties", () => {
    const cause = { reason: "disk full" };
    const error = new WorkspaceYamlError(
      "IO_ERROR",
      "Write failed",
      "/path/to/file.yaml",
      cause,
    );

    expect(error.code).toBe("IO_ERROR");
    expect(error.message).toBe("Write failed");
    expect(error.filePath).toBe("/path/to/file.yaml");
    expect(error.cause).toEqual({ reason: "disk full" });
  });

  it("supports all error codes", () => {
    const codes: WorkspaceYamlErrorCode[] = [
      "INVALID_ARGUMENT",
      "ALREADY_EXISTS",
      "NOT_FOUND",
      "IO_ERROR",
      "INVALID_WORKSPACE",
      "INVALID_OPENAPI",
      "ROLLBACK_FAILED",
    ];

    for (const code of codes) {
      const error = new WorkspaceYamlError(code, `Test ${code}`);
      expect(error.code).toBe(code);
    }
  });

  it("is serializable to JSON", () => {
    const error = new WorkspaceYamlError(
      "INVALID_WORKSPACE",
      "Invalid workspace",
      "/path/workspace.yaml",
    );

    const json = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe("WorkspaceYamlError");
    expect(parsed.code).toBe("INVALID_WORKSPACE");
    expect(parsed.message).toBe("Invalid workspace");
    expect(parsed.filePath).toBe("/path/workspace.yaml");
  });

  it("can be caught and identified by code", () => {
    try {
      throw new WorkspaceYamlError("ALREADY_EXISTS", "File exists");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkspaceYamlError);
      if (error instanceof WorkspaceYamlError) {
        expect(error.code).toBe("ALREADY_EXISTS");
      }
    }
  });
});
