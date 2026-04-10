import { describe, it, expect } from "vitest";
import { validateWebhookKey } from "../src/lib/validate.js";

describe("validateWebhookKey", () => {
  const secret = "my-secret-key";

  it("returns true for matching key", () => {
    expect(validateWebhookKey("my-secret-key", secret)).toBe(true);
  });

  it("returns false for wrong key", () => {
    expect(validateWebhookKey("wrong-key", secret)).toBe(false);
  });

  it("returns false for undefined key", () => {
    expect(validateWebhookKey(undefined, secret)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validateWebhookKey("", secret)).toBe(false);
  });

  it("returns false for key with different length", () => {
    expect(validateWebhookKey("short", secret)).toBe(false);
  });
});
