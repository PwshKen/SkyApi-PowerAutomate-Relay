import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { validateWebhookKey } from "../lib/validate.js";
import { forwardToPowerAutomate } from "../lib/forward.js";

const WEBHOOK_KEY = process.env.WEBHOOK_KEY ?? "";
const POWER_AUTOMATE_URL = process.env.POWER_AUTOMATE_URL ?? "";

async function webhookHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // OPTIONS — CloudEvents Abuse Protection handshake
  if (request.method === "OPTIONS") {
    const requestOrigin = request.headers.get("webhook-request-origin");

    if (requestOrigin === "eventgrid.azure.net") {
      return {
        status: 200,
        headers: {
          "WebHook-Allowed-Origin": "eventgrid.azure.net",
          "WebHook-Allowed-Rate": "*",
          Allow: "POST",
        },
      };
    }

    return { status: 200 };
  }

  // POST — Event delivery
  const webhookKey = request.query.get("webhookKey");

  if (!validateWebhookKey(webhookKey, WEBHOOK_KEY)) {
    // Random delay to prevent timing attacks, then return 200 to avoid
    // leaking info and to prevent Blackbaud from retrying
    const delay = 200 + Math.floor(Math.random() * 300);
    await new Promise((resolve) => setTimeout(resolve, delay));
    context.warn("Invalid webhookKey received");
    return { status: 200 };
  }

  try {
    const payload = await request.json();
    context.log("Received event:", JSON.stringify(payload));

    if (!POWER_AUTOMATE_URL) {
      context.error("POWER_AUTOMATE_URL is not configured");
      return { status: 200 };
    }

    await forwardToPowerAutomate(payload, POWER_AUTOMATE_URL, context);
  } catch (err) {
    context.error("Error processing webhook event:", err);
  }

  return { status: 200 };
}

app.http("webhook", {
  methods: ["OPTIONS", "POST"],
  authLevel: "anonymous",
  handler: webhookHandler,
});
