---
title: "Tutorial - SKY API"
source: "https://developer.blackbaud.com/skyapi/products/bbem/webhook/tutorial"
author:
published:
created: 2026-04-09
description:
tags:
  - "clippings"
---
<iframe title="Navigation" src="https://host.nxt.blackbaud.com/omnibar/?hostid=omnibar"></iframe>

You are viewing all pages in modern visual theme, regardless of their configuration.

## Webhook tutorial

In this guide, learn how to use the Webhook API to subscribe to and receive an event request when a constituent email address is changed.

To get a basic understanding of the Webhook API and the choices made in this tutorial, we recommend you first read our [overview](https://developer.blackbaud.com/skyapi/products/bbem/webhook/overview) documentation. The code snippets below are written in C# and demonstrate code that you might use with an existing web service.

The complete, working version of this tutorial can be found on [GitHub](https://github.com/blackbaud/sky-webhooks-csharp-tutorial). Concise, code-only NodeJS/JavaScript and PHP examples are also available in the [App Showcase](https://developer.blackbaud.com/skyapi/docs/app-showcase).

Before you subscribe to a webhook event, you need to create a webhook event handler in your web service. This handler performs the CloudEvents's [Abuse Protection handshake](https://github.com/cloudevents/spec/blob/master/http-webhook.md#4-abuse-protection) (an `OPTIONS` request) for subscription provisioning and handles subsequent requests for event payloads (`POST` requests).

### Abuse protection

Our subscription provisioning process performs the CloudEvents's [Abuse Protection handshake](https://github.com/cloudevents/spec/blob/master/http-webhook.md#4-abuse-protection) when we validate your endpoint.

To perform this handshake, your endpoint needs to support the `OPTIONS` HTTP method, verify the `WebHook-Request-Origin: eventgrid.azure.net` header on the request, and return a 200-level response that includes the header `WebHook-Allowed-Origin` with a value of `eventgrid.azure.net`.

```
using System;
using Microsoft.AspNetCore.Mvc;

...

// Securely store your secret with your service from an application setting.
private readonly string SECRET_KEY = "secret";

...

[Route("eventhandler")]
[HttpOptions]
public OkResult WebhookHandshake([FromQuery] string webhookKey)
{
    if (this.Request.Headers.TryGetValue("WebHook-Request-Origin", out Microsoft.Extensions.Primitives.StringValues requestOriginValue) &&
        requestOriginValue.Equals("eventgrid.azure.net"))
    {
        this.Response.Headers.Add("WebHook-Allowed-Origin", "eventgrid.azure.net");
        this.Response.Headers.Add("WebHook-Allowed-Rate", "100");
        this.Response.Headers.Add("Allow", "POST");

        if (!string.Equals(SECRET_KEY, webhookKey))
        {
            // Return an OK response, so you're not helping attackers try to brute force your webhookKey
            // For your application to know about any errors, log it here.
            // This could help show that you've configured your subscription incorrectly.
            // If you have configured incorrectly, you'll need to delete this subscription.
       }
    }

    return Ok();
}
```

```csharp
using System;
using Microsoft.AspNetCore.Mvc;

...

// Securely store your secret with your service from an application setting.
private readonly string SECRET_KEY = "secret";

...

[Route("eventhandler")]
[HttpOptions]
public OkResult WebhookHandshake([FromQuery] string webhookKey)
{
    if (this.Request.Headers.TryGetValue("WebHook-Request-Origin", out Microsoft.Extensions.Primitives.StringValues requestOriginValue) &&
        requestOriginValue.Equals("eventgrid.azure.net"))
    {
        this.Response.Headers.Add("WebHook-Allowed-Origin", "eventgrid.azure.net");
        this.Response.Headers.Add("WebHook-Allowed-Rate", "100");
        this.Response.Headers.Add("Allow", "POST");

        if (!string.Equals(SECRET_KEY, webhookKey))
        {
            // Return an OK response, so you're not helping attackers try to brute force your webhookKey
            // For your application to know about any errors, log it here.
            // This could help show that you've configured your subscription incorrectly.
            // If you have configured incorrectly, you'll need to delete this subscription.
       }
    }

    return Ok();
}
```

### Handle the published event

Once subscribed, your webhook endpoint needs to handle `POST` requests with the event payloads.

```
using System;
    using System.Threading.Tasks;
    using Microsoft.AspNetCore.Mvc;

    ...

    // This secret should be set from an application setting that is securely stored with your service
    private readonly string SECRET_KEY = "secret";

    ...

    [Route("eventhandler")]
    [HttpPost]
    public async Task<OkResult> WebhookEventHandler(
      [FromBody] CloudEventsV10Event eventBody,
      [FromQuery] string webhookKey)
    {
        if (!string.Equals(SECRET_KEY, webhookKey))
        {
            // Return an OK response so this unauthorized request is not retried
            // Return an OK response, so you're not helping attackers try to brute force your webhookKey
            // For your application to know about any errors, log it here.
            // This could help show that you've configured your subscription incorrectly.
            // If you have configured incorrectly, you'll need to delete this subscription.
            // Add a delay to "simulate" the work we would have done so attackers can't use the
            // abbreviated processing time as a clue that their webhookKey value is wrong
            await Task.Delay(new Random().Next(200, 500));
            return Ok();
        }

        if (string.Equals("com.blackbaud.constituent.emailaddress.change.v1", eventBody?.Type, StringComparison.OrdinalIgnoreCase))
        {
            // handle email change
        }

        return Ok();
    }
```

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

...

// This secret should be set from an application setting that is securely stored with your service
private readonly string SECRET_KEY = "secret";

...

[Route("eventhandler")]
[HttpPost]
public async Task<OkResult> WebhookEventHandler(
  [FromBody] CloudEventsV10Event eventBody,
  [FromQuery] string webhookKey)
{
    if (!string.Equals(SECRET_KEY, webhookKey))
    {
        // Return an OK response so this unauthorized request is not retried
        // Return an OK response, so you're not helping attackers try to brute force your webhookKey
        // For your application to know about any errors, log it here.
        // This could help show that you've configured your subscription incorrectly.
        // If you have configured incorrectly, you'll need to delete this subscription.
        // Add a delay to "simulate" the work we would have done so attackers can't use the
        // abbreviated processing time as a clue that their webhookKey value is wrong
        await Task.Delay(new Random().Next(200, 500));
        return Ok();
    }

    if (string.Equals("com.blackbaud.constituent.emailaddress.change.v1", eventBody?.Type, StringComparison.OrdinalIgnoreCase))
    {
        // handle email change
    }

    return Ok();
}
```

The code sample below is the `CloudEventsV10Event` class used in the handler code sample above.

However, you can also use the `CloudEvent` class from the [CloudNative.CloudEvents](https://www.nuget.org/packages/CloudNative.CloudEvents/) NuGet package (the official CloudEvents C# SDK), but make sure you read the [SDK notes](https://github.com/cloudevents/sdk-csharp#http---aspnet-core-mvc) if you intend to deserialize from this SDK class.

```
// CloudEvents V1.0 Schema Events
    public class CloudEventsV10Event
    {
        // Event type
        [JsonProperty(PropertyName = "type")]
        public string Type { get; set; }

        // CloudEvents Spec Type (1.0)
        [JsonProperty(PropertyName = "specversion")]
        public string SpecVersion { get; set; }

        // Event source
        [JsonProperty(PropertyName = "source")]
        public Uri Source { get; set; }

        // Event subject
        [JsonProperty(PropertyName = "subject")]
        public string Subject { get; set; }

        // Event ID
        [JsonProperty(PropertyName = "id")]
        public string Id { get; set; }

        // Event date time
        [JsonProperty(PropertyName = "time", NullValueHandling = NullValueHandling.Ignore)]
        public DateTime? Time { get; set; }

        //  Event data
        [JsonProperty(PropertyName = "data")]
        public virtual object Data { get; set; }
    }
```

```csharp
// CloudEvents V1.0 Schema Events
public class CloudEventsV10Event
{
    // Event type
    [JsonProperty(PropertyName = "type")]
    public string Type { get; set; }

    // CloudEvents Spec Type (1.0)
    [JsonProperty(PropertyName = "specversion")]
    public string SpecVersion { get; set; }

    // Event source
    [JsonProperty(PropertyName = "source")]
    public Uri Source { get; set; }

    // Event subject
    [JsonProperty(PropertyName = "subject")]
    public string Subject { get; set; }

    // Event ID
    [JsonProperty(PropertyName = "id")]
    public string Id { get; set; }

    // Event date time
    [JsonProperty(PropertyName = "time", NullValueHandling = NullValueHandling.Ignore)]
    public DateTime? Time { get; set; }

    //  Event data
    [JsonProperty(PropertyName = "data")]
    public virtual object Data { get; set; }
}
```

Rather than use trial and error against the SKY API `Create Subscription` endpoint, we recommend you test your endpoint with how it handles new events sent to it and with the Abuse Protection handshake.

### Test the handshake

Let's assume your webhook endpoint lives at `https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb`. Test your endpoint's `OPTIONS` handling by making the following request using a client, such as Postman or curl.

```
OPTIONS https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
    WebHook-Request-Origin: eventgrid.azure.net
```

```markup
OPTIONS https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
WebHook-Request-Origin: eventgrid.azure.net
```

To make sure that your response behavior and logging is working appropriately, play around with your endpoint's `webhookKey` handling (such as returning a `Forbidden` response rather than `OK`). Also, in your test request make sure that your endpoint doesn't set the `WebHook-Allowed-Origin` response header when you change the `WebHook-Request-Origin` header value.

### Test the event handler

If your webhook endpoint lives at `https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb`, test your `POST` request event handling by making the following request.

```
POST https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
    content-type: application/cloudevents+json; charset=utf-8
    origin: eventgrid.azure.net
    {
      "type": "com.blackbaud.constituent.emailaddress.change.v1",
      "specversion": "1.0",
      "source": "ignore",
      "subject": "/environments/p-environment_id",
      "id": "575bca1a-7250-418e-a6ee-2472be4fd06c",
      "time": "2020-04-22T23:39:33.6337487Z",
      "data": {
        "id": "7203"
      }
    }
```

```json
POST https://localhost:5300/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
content-type: application/cloudevents+json; charset=utf-8
origin: eventgrid.azure.net
{
  "type": "com.blackbaud.constituent.emailaddress.change.v1",
  "specversion": "1.0",
  "source": "ignore",
  "subject": "/environments/p-environment_id",
  "id": "575bca1a-7250-418e-a6ee-2472be4fd06c",
  "time": "2020-04-22T23:39:33.6337487Z",
  "data": {
    "id": "7203"
  }
}
```

Same as the `OPTIONS` request, to make sure that your endpoint performs the custom event logic as you'd expect, play around with the `webhookKey` query string parameter and the event `type` in the request body.

Now that your endpoint is ready, subscribe to the `com.blackbaud.constituent.emailaddress.change.v1` event. To subscribe, use the Webhook API's [Create Subscription](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription) endpoint.

### SKY API OAuth 2.0 Authorization

Like any SKY API, you first need users to authorize your application to their Blackbaud environment's data via OAuth 2.0. To learn how users provide consent, review our [Authorization](https://developer.blackbaud.com/skyapi/docs/authorization) documentation, including the [OAuth 2.0 Authorization Code Flow tutorial](https://developer.blackbaud.com/skyapi/docs/authorization/auth-code-flow/confidential-application/tutorial) and [Code Samples](https://developer.blackbaud.com/skyapi/docs/authorization/auth-code-flow/confidential-application/code-samples).

### Call the Create Subscription endpoint

Once your application is authorized and you have a SKY API access token, call the [Create Subscription endpoint](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription). In our example, our live production endpoint lives at `https://example.org/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb`, so here's our sample request.

```
POST https://api.sky.blackbaud.com/webhook/v1/subscriptions HTTP/1.1
    Host: api.sky.blackbaud.com
    Content-Type: application/json
    Bb-Api-Subscription-Key: fake....key
    Authorization: Bearer eyJ0eXAiOi....3okupQ-mgQAw
    {
      "webhook_url": "https://example.org/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb",
      "event_type": "com.blackbaud.constituent.emailaddress.change.v1"
    }
```

```json
POST https://api.sky.blackbaud.com/webhook/v1/subscriptions HTTP/1.1
Host: api.sky.blackbaud.com
Content-Type: application/json
Bb-Api-Subscription-Key: fake....key
Authorization: Bearer eyJ0eXAiOi....3okupQ-mgQAw
{
  "webhook_url": "https://example.org/bb/eventhandler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb",
  "event_type": "com.blackbaud.constituent.emailaddress.change.v1"
}
```

The response includes the `id` of the new subscription. For example, the subscription ID in the following response is `f45fb280-6051-4c2c-994f-0ab574f8e203`. At this point, your subscription is in a "Provisioning" state.

```
Date: Fri, 24 Apr 2020 06:13:36 GMT
    Location: https://api.sky.blackbaud.com/webhook/v1/subscriptions/f45fb280-6051-4c2c-994f-0ab574f8e203
    Content-Length: 84
    Content-Type: application/json; charset=utf-8
    {
      "id": "f45fb280-6051-4c2c-994f-0ab574f8e203",
      "provisioning_status": "Provisioning"
    }
```

```json
Date: Fri, 24 Apr 2020 06:13:36 GMT
Location: https://api.sky.blackbaud.com/webhook/v1/subscriptions/f45fb280-6051-4c2c-994f-0ab574f8e203
Content-Length: 84
Content-Type: application/json; charset=utf-8
{
  "id": "f45fb280-6051-4c2c-994f-0ab574f8e203",
  "provisioning_status": "Provisioning"
}
```

Now that the subscription is in a `Provisioning` state, it will remain here until the Abuse Protection handshake is performed against the webhook endpoint. After the endpoint performs a successful handshake, the subscription is updated to a `Provisioned` state. If there is an error with the handshake, the subscription is updated to an `Error` state.

Verify the provisioning state of your subscription by calling the [Get Subscription](https://developer.sky.blackbaud.com/api#api=webhook&operation=GetSubscription/) endpoint.

```
GET https://api.sky.blackbaud.com/webhook/v1/subscriptions/f45fb280-6051-4c2c-994f-0ab574f8e203 HTTP/1.1
  Host: api.sky.blackbaud.com
  Bb-Api-Subscription-Key: fake....key
  Authorization: Bearer eyJ0eXAiO....u3jQIB7_bCg
```

```json
GET https://api.sky.blackbaud.com/webhook/v1/subscriptions/f45fb280-6051-4c2c-994f-0ab574f8e203 HTTP/1.1
Host: api.sky.blackbaud.com
Bb-Api-Subscription-Key: fake....key
Authorization: Bearer eyJ0eXAiO....u3jQIB7_bCg
```

And the response...

```
Date: Fri, 24 Apr 2020 06:34:47 GMT
  Content-Length: 345
  Content-Type: application/json; charset=utf-8

  {
    "id": "f45fb280-6051-4c2c-994f-0ab574f8e203",
    "environment_id": "p-environment_id",
    "webhook_url": "https://example.org/bb/eventhandler",
    "application_id": "a056ca6b-a3a8-4ac7-b325-997666306e52",
    "event_type": "com.blackbaud.constituent.emailaddress.change.v1",
    "provisioning_status": "Provisioned"
  }
```

```json
Date: Fri, 24 Apr 2020 06:34:47 GMT
Content-Length: 345
Content-Type: application/json; charset=utf-8

{
  "id": "f45fb280-6051-4c2c-994f-0ab574f8e203",
  "environment_id": "p-environment_id",
  "webhook_url": "https://example.org/bb/eventhandler",
  "application_id": "a056ca6b-a3a8-4ac7-b325-997666306e52",
  "event_type": "com.blackbaud.constituent.emailaddress.change.v1",
  "provisioning_status": "Provisioned"
}
```

Typically, subscription provisioning only takes a few minutes. If you see a `Provisioning` state for more than 30 minutes, contact the [Blackbaud SKY Developer team](mailto:skyapi@blackbaud.com). If your subscription is in an `Error` state, check your application's logging to see if an error ocurred. Once your subscription successfully provisions, you will start to receive events for the Blackbaud environment indicated in the response above (`environment_id`).

Once your subscription successfully provisions, you will start to receive requests when changes happen in Education Management. Wait for an event to happen or sign in to the Education Management environment defined in your subscription and edit a record to see the change. Then, wait a few minutes for the event to reach your endpoint.

If you have issues subscribing to and receiving an event request in this tutorial, we recommend you review the [Webhook troubleshooting](https://developer.blackbaud.com/skyapi/products/bbem/webhook/troubleshooting) page.

<iframe src="https://host.nxt.blackbaud.com/omnibar/toast" title="Toast container"></iframe>