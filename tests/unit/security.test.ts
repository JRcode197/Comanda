import { describe, it, expect } from "vitest";
import { safeRedirect } from "../../src/lib/auth/redirect";
describe("auth redirect allowlist", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/login?next=https://evil.test",
    null,
  ])("rejects %s", (value) => expect(safeRedirect(value)).toBe("/"));
  it("allows local workspace path", () =>
    expect(safeRedirect("/officina/admin/dashboard")).toBe(
      "/officina/admin/dashboard",
    ));
});
