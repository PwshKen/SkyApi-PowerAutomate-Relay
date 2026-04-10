# Blackbaud Webhook Relay for Power Automate

An Azure Functions app that receives [CloudEvents](https://cloudevents.io/) webhook notifications from [Blackbaud Education Management](https://www.blackbaud.com/products/blackbaud-education-management) and forwards them to a [Power Automate](https://powerautomate.microsoft.com/) flow via HTTP trigger.

Deploy your own instance, configure two environment variables, and subscribe to any Blackbaud webhook event type. The function acts as a generic relay — your Power Automate flow handles the business logic.

## How it works

```
Blackbaud SKY API  →  Azure Functions (this app)  →  Power Automate Flow
```

1. Blackbaud sends a CloudEvents `POST` to your Azure Function when a subscribed event occurs
2. The function validates the request using a secret query parameter
3. The full event payload is forwarded to your Power Automate HTTP trigger
4. Your flow processes the event however you need

## Prerequisites

- An Azure subscription
- A [Blackbaud SKY API developer account](https://developer.blackbaud.com/) with a registered application
- A Power Automate flow with an HTTP trigger (you'll need the trigger URL)

## Setup

### 1. Provision Azure resources

Using the included Bicep template:

```bash
az group create --name rg-blackbaud-webhook --location eastus

az deployment group create \
  --resource-group rg-blackbaud-webhook \
  --template-file infra/main.bicep \
  --parameters \
    functionAppName=your-function-app-name \
    webhookKey='your-secret-key-here' \
    powerAutomateUrl='https://prod-XX.westus.logic.azure.com/...'
```

Or create the resources manually:
- Azure Function App (Node.js 20, Consumption plan)
- Set app settings: `WEBHOOK_KEY` and `POWER_AUTOMATE_URL`

### 2. Deploy the function

**Option A: Azure CLI**

```bash
npm ci
npm run build
func azure functionapp publish your-function-app-name
```

**Option B: Azure DevOps**

Use the included `azure-pipelines.yml` as a starting point. Set the pipeline variables `AZURE_FUNCTIONAPP_NAME` and `AZURE_SERVICE_CONNECTION`.

**Option C: GitHub Actions**

Adapt the `.github/workflows/ci.yml` workflow to include a deploy step for your Azure subscription.

### 3. Create a Blackbaud webhook subscription

Generate your webhook URL by combining your Function App URL with the secret key:

```
https://your-function-app-name.azurewebsites.net/api/webhook?webhookKey=your-secret-key-here
```

Then create a subscription via the [Blackbaud Webhook API](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription):

```bash
curl -X POST https://api.sky.blackbaud.com/webhook/v1/subscriptions \
  -H "Content-Type: application/json" \
  -H "Bb-Api-Subscription-Key: YOUR_SKY_API_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "webhook_url": "https://your-function-app-name.azurewebsites.net/api/webhook?webhookKey=your-secret-key-here",
    "event_type": "com.blackbaud.education.user.change.v1"
  }'
```

Blackbaud will perform a CloudEvents Abuse Protection handshake (OPTIONS request) against your endpoint. Once successful, the subscription status changes to `Provisioned` and you'll start receiving events.

### 4. Test

Use the Blackbaud Webhook API's [test payload endpoint](https://developer.sky.blackbaud.com/api#api=webhook&operation=SendTestPayloadToSubscription) to send a test event to your webhook.

## Configuration

| Environment Variable | Description |
|---|---|
| `WEBHOOK_KEY` | Secret key that must match the `webhookKey` query parameter on incoming requests |
| `POWER_AUTOMATE_URL` | Your Power Automate flow's HTTP trigger URL |

## Local development

This project includes a devcontainer with Node.js 20 and Azure Functions Core Tools pre-installed.

1. Open in VS Code with the Dev Containers extension
2. Copy `local.settings.example.json` to `local.settings.json` and fill in your values
3. `npm run start` to run the function locally on port 7071

## Event payload format

All Blackbaud webhook events follow the [CloudEvents v1.0](https://cloudevents.io/) schema:

```json
{
  "type": "com.blackbaud.education.user.change.v1",
  "specversion": "1.0",
  "source": "<routing_detail>",
  "subject": "/environments/<environment_id>",
  "id": "<unique_event_id>",
  "time": "2024-01-15T12:00:00.0000000Z",
  "data": {
    "id": "<record_id>"
  }
}
```

The `data` field varies by event type. See the [Blackbaud webhook event types documentation](https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types) for details.

## License

MIT
