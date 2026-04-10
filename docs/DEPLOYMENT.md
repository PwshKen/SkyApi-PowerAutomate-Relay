# Deployment Guide

This guide covers three ways to deploy the Blackbaud Webhook Relay to Azure. All options start with the same infrastructure provisioning step.

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and authenticated (`az login`)
- An Azure subscription with permission to create resources
- A Power Automate flow with an HTTP trigger (you'll need the trigger URL)
- A secret key for webhook validation (generate one with `openssl rand -base64 32`)

## Step 1: Provision Azure Resources

All deployment options use the same Bicep template to create the required infrastructure.

### 1a. Log in and select your subscription

```bash
az login
az account set --subscription "Your Subscription Name"
```

### 1b. Create a resource group

```bash
az group create \
  --name rg-blackbaud-webhook \
  --location eastus
```

### 1c. Deploy the Bicep template

```bash
az deployment group create \
  --resource-group rg-blackbaud-webhook \
  --template-file infra/main.bicep \
  --parameters \
    functionAppName=your-function-app-name \
    webhookKey='your-secret-key-here' \
    powerAutomateUrl='https://prod-XX.westus.logic.azure.com/...'
```

The template creates:
- **Storage Account** — required by the Azure Functions runtime
- **Application Insights** — monitoring and logging
- **App Service Plan** — Consumption (serverless) tier
- **Function App** — Node.js 22 runtime with your app settings configured

Note the `functionAppUrl` output — you'll need it to register your Blackbaud webhook.

## Step 2: Deploy the Code

Choose one of the three options below.

---

### Option A: Azure CLI (Manual)

Best for initial setup, one-off deployments, or quick testing.

```bash
# Install dependencies and build
npm ci
npm run build

# Deploy to Azure
func azure functionapp publish your-function-app-name
```

To redeploy after changes, just run the build and publish commands again.

---

### Option B: Azure DevOps (CI/CD)

Best for teams already using Azure DevOps. The included `azure-pipelines.yml` builds, tests, and deploys on every push to `main`.

#### Setup

1. **Create a service connection** in Azure DevOps:
   - Project Settings > Service connections > New > Azure Resource Manager
   - Select your subscription and the `rg-blackbaud-webhook` resource group
   - Note the connection name

2. **Create a pipeline** from the repo's `azure-pipelines.yml`

3. **Set pipeline variables:**

   | Variable | Value |
   |---|---|
   | `AZURE_FUNCTIONAPP_NAME` | Your Function App name (e.g., `your-function-app-name`) |
   | `AZURE_SERVICE_CONNECTION` | The service connection name from step 1 |

4. **Run the pipeline** — subsequent pushes to `main` will deploy automatically.

---

### Option C: GitHub Actions (CI/CD)

Best for teams using GitHub. The included `.github/workflows/ci.yml` runs build and tests; you need to add a deploy step.

#### Setup

1. **Get a publish profile** from the Azure portal:
   - Open your Function App > Overview > Get publish profile
   - Copy the XML content

2. **Add a GitHub secret:**
   - Repo > Settings > Secrets and variables > Actions > New repository secret
   - Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - Value: the publish profile XML

3. **Add a deploy job** to `.github/workflows/ci.yml`:

   ```yaml
   deploy:
     needs: build-and-test
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4

       - uses: actions/setup-node@v4
         with:
           node-version: 22
           cache: npm

       - run: npm ci
       - run: npm run build

       - uses: Azure/functions-action@v1
         with:
           app-name: your-function-app-name
           package: .
           publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
   ```

4. **Push to `main`** — the workflow will build, test, and deploy.

---

## Step 3: Register the Blackbaud Webhook

Once deployed, construct your webhook URL:

```
https://your-function-app-name.azurewebsites.net/api/webhook?webhookKey=your-secret-key-here
```

Create a subscription via the [Blackbaud Webhook API](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription):

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

Blackbaud will send a CloudEvents Abuse Protection handshake (OPTIONS request). Once it succeeds, the subscription status changes to `Provisioned` and events will start flowing.

## Updating App Settings After Deployment

To update `WEBHOOK_KEY` or `POWER_AUTOMATE_URL` after initial deployment:

```bash
az functionapp config appsettings set \
  --resource-group rg-blackbaud-webhook \
  --name your-function-app-name \
  --settings "WEBHOOK_KEY=new-secret-key" "POWER_AUTOMATE_URL=https://new-flow-url..."
```

## Troubleshooting

### View function logs

```bash
func azure functionapp logstream your-function-app-name
```

### Verify the function is deployed

```bash
az functionapp function list \
  --resource-group rg-blackbaud-webhook \
  --name your-function-app-name \
  --output table
```

### Test the endpoint

```bash
curl -i https://your-function-app-name.azurewebsites.net/api/webhook \
  -X OPTIONS \
  -H "webhook-request-origin: eventgrid.azure.net"
```

You should get a `200` response with a `WebHook-Allowed-Origin` header.
