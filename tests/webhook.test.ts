import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock @azure/functions
vi.mock("@azure/functions", () => ({
  app: { http: vi.fn() },
}));

// Import after mocks are set up
import { app } from "@azure/functions";

// Extract the handler registered with app.http
function getHandler() {
  const calls = vi.mocked(app.http).mock.calls;
  return calls[calls.length - 1][1].handler;
}

function makeContext() {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as any;
}

function makeRequest(
  method: string,
  headers: Record<string, string> = {},
  body?: unknown,
  query: Record<string, string> = {}
) {
  const url = new URL("https://example.com/api/webhook");
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }

  return {
    method,
    headers: new Headers(headers),
    query: url.searchParams,
    json: body ? async () => body : async () => ({}),
  } as any;
}

describe("webhook handler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.WEBHOOK_KEY = "test-secret";
    process.env.POWER_AUTOMATE_URL = "https://flow.example.com/trigger";
  });

  // Re-import to pick up env vars and register the handler
  async function loadHandler() {
    await import("../src/functions/webhook.js");
    return getHandler();
  }

  describe("OPTIONS - Abuse Protection handshake", () => {
    it("responds with WebHook-Allowed-Origin when origin is eventgrid", async () => {
      const handler = await loadHandler();
      const req = makeRequest("OPTIONS", {
        "webhook-request-origin": "eventgrid.azure.net",
      });
      const res = await handler(req, makeContext());

      expect(res.status).toBe(200);
      expect(res.headers["WebHook-Allowed-Origin"]).toBe(
        "eventgrid.azure.net"
      );
      expect(res.headers["Allow"]).toBe("POST");
    });

    it("responds 200 without headers for unknown origin", async () => {
      const handler = await loadHandler();
      const req = makeRequest("OPTIONS", {
        "webhook-request-origin": "unknown.example.com",
      });
      const res = await handler(req, makeContext());

      expect(res.status).toBe(200);
      expect(res.headers).toBeUndefined();
    });
  });

  describe("POST - Event delivery", () => {
    const sampleEvent = {
      type: "com.blackbaud.education.user.change.v1",
      specversion: "1.0",
      source: "test",
      subject: "/environments/p-test123",
      id: "event-1",
      time: "2024-01-15T12:00:00Z",
      data: { id: "user-42" },
    };

    it("forwards valid event to Power Automate", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const handler = await loadHandler();
      const req = makeRequest(
        "POST",
        { "content-type": "application/cloudevents+json; charset=utf-8" },
        sampleEvent,
        { webhookKey: "test-secret" }
      );
      const res = await handler(req, makeContext());

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://flow.example.com/trigger",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(sampleEvent),
        })
      );
    });

    it("returns 200 without forwarding for invalid webhookKey", async () => {
      const handler = await loadHandler();
      const req = makeRequest("POST", {}, sampleEvent, {
        webhookKey: "wrong",
      });
      const context = makeContext();
      const res = await handler(req, context);

      expect(res.status).toBe(200);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(context.warn).toHaveBeenCalled();
    });

    it("returns 200 without forwarding when webhookKey is missing", async () => {
      const handler = await loadHandler();
      const req = makeRequest("POST", {}, sampleEvent);
      const res = await handler(req, makeContext());

      expect(res.status).toBe(200);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("logs error when Power Automate returns non-OK", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      const handler = await loadHandler();
      const req = makeRequest("POST", {}, sampleEvent, {
        webhookKey: "test-secret",
      });
      const context = makeContext();
      const res = await handler(req, context);

      expect(res.status).toBe(200);
      expect(context.error).toHaveBeenCalledWith(
        expect.stringContaining("500")
      );
    });
  });
});
