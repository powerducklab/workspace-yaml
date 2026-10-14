import { describe, it, expect } from "vitest";
import { parseDocument } from "yaml";
import {
  createWorkspaceYaml,
  createOpenApiYaml,
  createWorkspaceWithApi,
  parseWorkspaceYaml,
} from "../src/core/index";
import { WorkspaceYamlError } from "../src/types";

describe("createWorkspaceYaml", () => {
  it("creates a default workspace with empty oasFiles", () => {
    const yaml = createWorkspaceYaml();
    const doc = parseDocument(yaml);
    const parsed = doc.toJS();

    expect(parsed.version).toBe(1);
    expect(parsed.activeOasFileId).toBeNull();
    expect(parsed.oasFiles).toEqual([]);
  });

  it("creates a workspace with custom activeOasFileId", () => {
    const yaml = createWorkspaceYaml({
      activeOasFileId: "api-v1",
      oasFiles: [{ id: "api-v1", name: "API v1", file: "oasFiles/api-v1.yaml" }],
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.activeOasFileId).toBe("api-v1");
  });

  it("creates a workspace with oasFiles entries", () => {
    const yaml = createWorkspaceYaml({
      oasFiles: [
        { id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" },
        { id: "api-v2", name: "API v2", file: "oasFiles/api-v2.openapi.yaml" },
      ],
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.oasFiles).toHaveLength(2);
    expect(parsed.oasFiles[0].id).toBe("api-v1");
    expect(parsed.oasFiles[1].file).toBe("oasFiles/api-v2.openapi.yaml");
  });

  it("throws on duplicate oasFiles ids", () => {
    expect(() =>
      createWorkspaceYaml({
        oasFiles: [
          { id: "dup", name: "First", file: "oasFiles/first.yaml" },
          { id: "dup", name: "Second", file: "oasFiles/second.yaml" },
        ],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws when activeOasFileId references a non-existent id", () => {
    expect(() =>
      createWorkspaceYaml({
        activeOasFileId: "nonexistent",
        oasFiles: [{ id: "real", name: "Real", file: "oasFiles/real.yaml" }],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws on oasFile with backslash paths", () => {
    expect(() =>
      createWorkspaceYaml({
        oasFiles: [{ id: "bad", name: "Bad", file: "oasFiles\\bad.yaml" }],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws on oasFile with absolute path", () => {
    expect(() =>
      createWorkspaceYaml({
        oasFiles: [{ id: "bad", name: "Bad", file: "/absolute/path.yaml" }],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws on unsupported OpenAPI file extension", () => {
    expect(() =>
      createWorkspaceYaml({
        oasFiles: [{ id: "bad", name: "Bad", file: "oasFiles/bad.txt" }],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws on empty oasFile id", () => {
    expect(() =>
      createWorkspaceYaml({
        oasFiles: [{ id: "  ", name: "Bad", file: "oasFiles/bad.yaml" }],
      }),
    ).toThrow(WorkspaceYamlError);
  });

  it("produces valid YAML that can be round-tripped", () => {
    const original = {
      activeOasFileId: "api-v1",
      oasFiles: [{ id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" }],
    };
    const yaml = createWorkspaceYaml(original);
    const reparsed = parseWorkspaceYaml(yaml);

    expect(reparsed.activeOasFileId).toBe(original.activeOasFileId);
    expect(reparsed.oasFiles).toEqual(original.oasFiles);
  });
});

describe("createOpenApiYaml", () => {
  it("creates a minimal OpenAPI 3.2 document", () => {
    const yaml = createOpenApiYaml({ title: "Test API" });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.openapi).toBe("3.2.0");
    expect(parsed.info.title).toBe("Test API");
    expect(parsed.info.version).toBe("1.0.0");
    expect(parsed.paths).toEqual({});
  });

  it("uses custom version when provided", () => {
    const yaml = createOpenApiYaml({ title: "Test API", version: "2.5.0" });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.info.version).toBe("2.5.0");
  });

  it("includes description when provided", () => {
    const yaml = createOpenApiYaml({
      title: "Test API",
      description: "A test API description",
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.info.description).toBe("A test API description");
  });

  it("includes contact info when provided", () => {
    const yaml = createOpenApiYaml({
      title: "Test API",
      contact: { name: "API Team", email: "api@example.com", url: "https://example.com" },
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.info.contact.name).toBe("API Team");
    expect(parsed.info.contact.email).toBe("api@example.com");
  });

  it("includes license info when provided", () => {
    const yaml = createOpenApiYaml({
      title: "Test API",
      license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.info.license.name).toBe("MIT");
  });

  it("includes servers when provided", () => {
    const yaml = createOpenApiYaml({
      title: "Test API",
      servers: [
        { url: "https://api.example.com", description: "Production" },
        { url: "https://staging.example.com", description: "Staging" },
      ],
    });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.servers).toHaveLength(2);
    expect(parsed.servers[0].url).toBe("https://api.example.com");
  });

  it("does not include optional fields when not provided", () => {
    const yaml = createOpenApiYaml({ title: "Minimal" });
    const parsed = parseDocument(yaml).toJS();

    expect(parsed.info.description).toBeUndefined();
    expect(parsed.info.contact).toBeUndefined();
    expect(parsed.info.license).toBeUndefined();
    expect(parsed.servers).toBeUndefined();
  });

  it("throws on empty title", () => {
    expect(() => createOpenApiYaml({ title: "   " })).toThrow(WorkspaceYamlError);
  });

  it("throws on non-string title", () => {
    expect(() => createOpenApiYaml({ title: 123 as unknown as string })).toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on empty version", () => {
    expect(() => createOpenApiYaml({ title: "Test", version: "" })).toThrow(
      WorkspaceYamlError,
    );
  });

  it("produces valid YAML", () => {
    const yaml = createOpenApiYaml({ title: "Valid API", version: "1.0.0" });
    const doc = parseDocument(yaml);
    expect(doc.errors).toHaveLength(0);
  });
});

describe("createWorkspaceWithApi", () => {
  it("creates both workspace and OpenAPI content", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API",
      title: "My API Documentation",
      version: "1.0.0",
    });

    expect(result.workspaceYaml).toBeTruthy();
    expect(result.openApiYaml).toBeTruthy();
    expect(result.openApiRelativePath).toBe("oasFiles/my-api.openapi.yaml");
    expect(result.workspace.activeOasFileId).toBe("my-api");
    expect(result.workspace.oasFiles).toHaveLength(1);
    expect(result.workspace.oasFiles[0].id).toBe("my-api");
  });

  it("uses custom file path when provided", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API",
      file: "custom/path/api.yaml",
    });

    expect(result.openApiRelativePath).toBe("custom/path/api.yaml");
    expect(result.workspace.oasFiles[0].file).toBe("custom/path/api.yaml");
  });

  it("normalizes backslashes in file path", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API",
      file: "custom\\path\\api.yaml",
    });

    expect(result.openApiRelativePath).toBe("custom/path/api.yaml");
  });

  it("adds .yaml extension when missing", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API",
      file: "custom/path/api",
    });

    expect(result.openApiRelativePath).toBe("custom/path/api.yaml");
  });

  it("defaults title to name when not provided", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API Name",
    });

    const parsed = parseDocument(result.openApiYaml).toJS();
    expect(parsed.info.title).toBe("My API Name");
  });

  it("includes description in OpenAPI when provided", () => {
    const result = createWorkspaceWithApi({
      oasId: "my-api",
      name: "My API",
      description: "A detailed description",
    });

    const parsed = parseDocument(result.openApiYaml).toJS();
    expect(parsed.info.description).toBe("A detailed description");
  });

  it("sets the new API as active", () => {
    const result = createWorkspaceWithApi({
      oasId: "first-api",
      name: "First API",
    });

    expect(result.workspace.activeOasFileId).toBe("first-api");
  });

  it("throws on empty oasId", () => {
    expect(() =>
      createWorkspaceWithApi({ oasId: "  ", name: "My API" }),
    ).toThrow(WorkspaceYamlError);
  });

  it("throws on empty name", () => {
    expect(() =>
      createWorkspaceWithApi({ oasId: "my-api", name: "" }),
    ).toThrow(WorkspaceYamlError);
  });

  it("produces valid workspace YAML", () => {
    const result = createWorkspaceWithApi({ oasId: "my-api", name: "My API" });
    const workspace = parseWorkspaceYaml(result.workspaceYaml);
    expect(workspace.oasFiles[0].id).toBe("my-api");
  });

  it("produces valid OpenAPI YAML", () => {
    const result = createWorkspaceWithApi({ oasId: "my-api", name: "My API" });
    const doc = parseDocument(result.openApiYaml);
    expect(doc.errors).toHaveLength(0);
    expect(doc.toJS().openapi).toBe("3.2.0");
  });
});

describe("parseWorkspaceYaml", () => {
  it("parses a valid workspace", () => {
    const yaml = `
version: 1
activeOasFileId: api-v1
oasFiles:
  - id: api-v1
    name: API v1
    file: oasFiles/api-v1.openapi.yaml
`;
    const result = parseWorkspaceYaml(yaml);

    expect(result.version).toBe(1);
    expect(result.activeOasFileId).toBe("api-v1");
    expect(result.oasFiles).toHaveLength(1);
  });

  it("parses a workspace with null activeOasFileId", () => {
    const yaml = `
version: 1
activeOasFileId: null
oasFiles: []
`;
    const result = parseWorkspaceYaml(yaml);
    expect(result.activeOasFileId).toBeNull();
  });

  it("throws on empty content", () => {
    expect(() => parseWorkspaceYaml("")).toThrow(WorkspaceYamlError);
    expect(() => parseWorkspaceYaml("   ")).toThrow(WorkspaceYamlError);
  });

  it("throws on non-string content", () => {
    expect(() => parseWorkspaceYaml(123 as unknown as string)).toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on invalid YAML", () => {
    expect(() => parseWorkspaceYaml("version: 1\noasFiles: [invalid")).toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws when root is not a mapping", () => {
    expect(() => parseWorkspaceYaml("- item1\n- item2")).toThrow(WorkspaceYamlError);
  });

  it("throws on wrong version", () => {
    expect(() => parseWorkspaceYaml("version: 2\noasFiles: []")).toThrow(
      WorkspaceYamlError,
    );
  });

  it("throws on duplicate oasFiles ids", () => {
    const yaml = `
version: 1
activeOasFileId: null
oasFiles:
  - id: dup
    name: First
    file: oasFiles/first.yaml
  - id: dup
    name: Second
    file: oasFiles/second.yaml
`;
    expect(() => parseWorkspaceYaml(yaml)).toThrow(WorkspaceYamlError);
  });

  it("throws when activeOasFileId not in oasFiles", () => {
    const yaml = `
version: 1
activeOasFileId: missing
oasFiles:
  - id: real
    name: Real
    file: oasFiles/real.yaml
`;
    expect(() => parseWorkspaceYaml(yaml)).toThrow(WorkspaceYamlError);
  });

  it("throws on oasFile with backslash path", () => {
    const yaml = `
version: 1
activeOasFileId: null
oasFiles:
  - id: bad
    name: Bad
    file: oasFiles\\bad.yaml
`;
    expect(() => parseWorkspaceYaml(yaml)).toThrow(WorkspaceYamlError);
  });

  it("round-trips with createWorkspaceYaml", () => {
    const original = createWorkspaceYaml({
      activeOasFileId: "api-v1",
      oasFiles: [{ id: "api-v1", name: "API v1", file: "oasFiles/api-v1.openapi.yaml" }],
    });
    const parsed = parseWorkspaceYaml(original);

    expect(parsed.version).toBe(1);
    expect(parsed.activeOasFileId).toBe("api-v1");
    expect(parsed.oasFiles[0].name).toBe("API v1");
  });
});

it("round-trips existing JSON OpenAPI workspace paths",()=>{
 const config={oasFiles:[{id:"json",name:"JSON API",file:"oasFiles/api.json"}],activeOasFileId:"json"};
 expect(parseWorkspaceYaml(createWorkspaceYaml(config)).oasFiles).toEqual(config.oasFiles);
});

it.each(['../secret.yaml', 'nested/../../secret.yaml', 'C:/secret.yaml', 'C:secret.yaml', '//server/a.yaml', 'a\u0000.yaml'])("rejects escaping registry path %s", file => {
  expect(() => createWorkspaceYaml({oasFiles:[{id:'unsafe',name:'unsafe',file}]})).toThrow();
});

it("round-trips explicitly external documents and their active id", () => {
  for (const file of ["/Users/me/API.yaml", "C:/Users/me/API.json", "//server/share/API.yml"]) {
    const yaml = createWorkspaceYaml({activeOasFileId:"external",oasFiles:[{id:"external",name:"API",file,location:"external"}]});
    expect(parseWorkspaceYaml(yaml).oasFiles[0]).toMatchObject({file,location:"external"});
    expect(parseWorkspaceYaml(yaml).activeOasFileId).toBe("external");
  }
});
it("does not allow external paths to bypass entry validation", () => {
  for (const file of ["../api.yaml", "api.yaml", "/a/../api.yaml", "C:api.yaml", "/a/api.txt"]) {
    expect(()=>createWorkspaceYaml({oasFiles:[{id:"e",name:"API",file,location:"external"}]})).toThrow();
  }
  expect(()=>createWorkspaceYaml({oasFiles:[{id:"e",name:"API",file:"/tmp/api.yaml"}]})).toThrow();
});
