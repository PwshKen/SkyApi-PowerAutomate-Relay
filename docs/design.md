# Blackbaud Webhook Relay for Power Automate

## Overview

A reusable, open-source Azure Functions app (TypeScript, Node.js 18+, v4 programming model) that receives CloudEvents webhook notifications from Blackbaud Education Management and forwards them to a Power Automate flow via HTTP trigger.

Any Blackbaud customer can deploy this to their own Azure subscription, configure their secrets, and subscribe to whichever Blackbaud event types they need. The webhook acts as a generic relay — it validates and forwards any CloudEvents payload to Power Automate, where the flow handles the business logic.

## Architecture

```
Blackbaud SKY API
       |
       | CloudEvents POST (HTTPS)
       v
Azure Functions App  (customer deploys their own)
  - single webhook function
  - handles OPTIONS (abuse protection handshake)
  - handles POST (event delivery)
  - validates webhookKey query param
  - forwards full CloudEvents payload to Power Automate
       |
       | HTTP POST
       v
Power Automate Flow (customer's own HTTP trigger)
```

## Event Handling

The webhook is **event-type agnostic**. It forwards any valid Blackbaud CloudEvents payload to Power Automate. Customers subscribe to whichever event types they need via the Blackbaud Webhook API.

Example event types:
- `com.blackbaud.education.user.change.v1` — user biographical info changed
- `com.blackbaud.constituent.delete.v1` — constituent deleted
- `com.blackbaud.utility.testpayload.v1` — test payload (sent during testing)

CloudEvents v1.0 payload shape (all event types follow this):
```json
{
  "type": "<event_type>",
  "specversion": "1.0",
  "source": "<routing_detail>",
  "subject": "/environments/<environment_id>",
  "id": "<unique_event_id>",
  "time": "2024-01-15T12:00:00.0000000Z",
  "data": { ... }
}
```

The `data` field varies by event type. For user change events it contains `{ "id": "<user_record_id>" }`.

## Webhook Endpoint Behavior

### OPTIONS — CloudEvents Abuse Protection Handshake

During subscription provisioning, Blackbaud sends an `OPTIONS` request with:
- Header: `WebHook-Request-Origin: eventgrid.azure.net`

The endpoint must respond with:
- Status: `200`
- Header: `WebHook-Allowed-Origin: eventgrid.azure.net`
- Header: `WebHook-Allowed-Rate: *`
- Header: `Allow: POST`

### POST — Event Delivery

Blackbaud sends a `POST` with:
- `Content-Type: application/cloudevents+json; charset=utf-8`
- `Origin: eventgrid.azure.net`
- Header `aeg-delivery-count` indicating retry count

The endpoint must:
1. Validate the `webhookKey` query string parameter against the stored secret
2. If invalid, return `200` with a random delay (200-500ms) to prevent timing attacks
3. If valid, forward the full CloudEvents payload to the Power Automate HTTP trigger URL
4. Return `200`-`204` within 30 seconds

## Retry & Idempotency

- Blackbaud retries up to 9 times with exponential backoff if the endpoint fails to respond 200-204 within 30 seconds
- The same event can arrive more than once — the Power Automate flow is responsible for idempotency
- Events can arrive out of order

## Security

- HTTPS enforced (Azure Functions provides this by default)
- Secret `webhookKey` query string parameter validated on every request
- Always return 200 even on auth failure to avoid leaking information to attackers

## Configuration (Environment Variables)

| Variable | Description |
|---|---|
| `WEBHOOK_KEY` | Secret key that must match the `webhookKey` query parameter |
| `POWER_AUTOMATE_URL` | HTTP trigger URL for the Power Automate flow |

## Project Structure

```
claude-webhook/
  src/
    functions/
      webhook.ts          # Azure Function: OPTIONS + POST handler
    lib/
      validate.ts         # webhookKey validation
      forward.ts          # Power Automate HTTP forwarding
  tests/
    webhook.test.ts       # Unit/integration tests
  infra/
    main.bicep            # Azure infrastructure template (Function App, etc.)
  host.json               # Azure Functions host config
  local.settings.json     # Local dev settings (gitignored)
  package.json
  tsconfig.json
  .github/
    workflows/
      ci.yml              # GitHub Actions: lint, test, build
      deploy.yml          # GitHub Actions: deploy example (optional)
  azure-pipelines.yml     # Azure DevOps pipeline example (optional)
  README.md               # Setup guide, configuration, usage
```

## Deployment Model

This repo is hosted on GitHub as an open-source project. Each customer deploys their own instance:

1. **Clone/fork** the repo
2. **Provision Azure resources** — use the included Bicep template or create manually
3. **Configure environment variables** — set `WEBHOOK_KEY` and `POWER_AUTOMATE_URL` in Azure Function App settings
4. **Deploy** — via their preferred method (Azure DevOps, GitHub Actions, VS Code, Azure CLI)
5. **Create Blackbaud subscription** — call the Webhook API to subscribe to desired event types, pointing at their deployed Function URL

## CI/CD

- **GitHub Actions** — runs on every push: lint, test, build. An optional deploy workflow is included as a starting point.
- **Azure DevOps** — an example `azure-pipelines.yml` is included for customers who use Azure DevOps for deployment.

Neither pipeline is prescriptive — customers adapt to their own setup.

## Links

### Overview

An overview of how BEM webhooks work:
https://developer.blackbaud.com/skyapi/products/bbem/webhook/overview

### OpenAPI 3.0 JSON Spec

See webhook.json in project root.

### Tutorial

https://developer.blackbaud.com/skyapi/products/bbem/webhook/tutorial

### Events for webhook to subscribe to

Only one so far: the User Change event.

https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types/user

### Troubleshooting

https://developer.blackbaud.com/skyapi/products/bbem/webhook/troubleshooting
