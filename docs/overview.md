---
title: "Overview - SKY API"
source: "https://developer.blackbaud.com/skyapi/products/bbem/webhook/overview#cloudevents"
author:
published:
created: 2026-04-09
description:
tags:
  - "clippings"
---
<iframe title="Navigation" src="https://host.nxt.blackbaud.com/omnibar/?hostid=omnibar"></iframe>

You are viewing all pages in modern visual theme, regardless of their configuration.

When specific events happen in Blackbaud environments, the Webhook API enables your application to be notified. When an event happens, we send a request via `HTTPS` to an endpoint that you provide. Your application then inspects the request payload to determine if it should take an action in response.

We adhere to the [CloudEvents](https://cloudevents.io/) [specification](https://github.com/cloudevents/spec). The intent of this specification is to be a vendor-neutral and open standard. For event messaging, it describes the data and event delivery mechanisms. While we provide some documentation and code samples, we also recommend you review the CloudEvents.io documentation, such as the [C#](https://github.com/cloudevents/sdk-csharp) and [Java](https://github.com/cloudevents/sdk-java) SDKs.

To send you events, your application's webhook must be a publicly accessible endpoint. However, to ensure that your application isn't receiving and reacting to events from unauthorized sources, we recommend you take precautions. While the impact of spoofed events can vary, at a minimum they result in your application doing more work than necessary. You can protect your service by immediately rejecting these requests.

To secure your public endpoint, your webhook subscription should include a detail that only your application would know. The most popular method is a query string parameter whose value is sufficiently difficult to guess or brute force attack. For example, if the webhook URL is `https://example.org/bb/handler`, you can secure it by adding a query string parameter that only your application understands. With each request, your application verifies the parameter. In this example, we add a `webhookKey` query string parameter: `https://example.org/bb/handler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb`.

When creating your event subscription, we use your full webhook URL. However, your webhook's query string is **not** be returned by our `GET` endpoints. To see a demonstration, review our [tutorial](https://developer.blackbaud.com/skyapi/products/bbem/webhook/tutorial).

Webhook subscriptions are associated with the application that created them. Anyone with an access token assigned to that application can manage the webhook subscriptions in that environment.

For example, you can test creating webhook subscriptions with the [SKY API console application](https://developer.blackbaud.com/skyapi/docs/basics#activating-the-sky-api-console). However, you should know that if you do this in a shared environment with other developers, they have access to manage and delete your webhook subscriptions.

Also, when an application is disconnected from an environment, any webhook subscriptions associated with the application are also deleted. If someone in your organization's environment or a shared environment disconnects the app associated with your webhook subscriptions, then your subscriptions will be deleted (see [subscription deleted event](https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types/special#subscription-deleted) in the event types documentation).

For more information on how webhook subscriptions are associated with applications, review the [Subscriptions](https://developer.blackbaud.com/skyapi/products/bbem/webhook/overview#subscriptions) section below.

Your application is only notified to the events you subscribe to. To subscribe, your application needs to make a request to the Webhook API [create subscription](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription) endpoint. Like all SKY APIs, a user must [authorize](https://developer.blackbaud.com/skyapi/docs/authorization) your application's access to their Blackbaud environment. With that authorization, your application can create a webhook subscription for an event scoped to that particular environment. Once subscribed, your application receives a `POST` request to your endpoint any time that event takes place in that environment. It also does not matter which user or application triggered the event (including your own application).

### Event types

As an example, if your application subscribes to the `com.blackbaud.constituent.delete.v1` event, you can receive a `POST` request when a constituent record is deleted in the authorized Blackbaud environment. When you call the [create subscription](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription) Webhook API endpoint, you provide this event type and your webhook URL.

To review the full list of supported event types, see our [Event types](https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types) page.

### Environment scope

Subscriptions are provisioned for your application and scoped to an event type **and Blackbaud environment**. This means that a user must authorize your application for their environment before your application can create a subscription. Once created, your subscription only receives events for that environment. Your application must individually subscribe to each event type + environment for which it is interested in receiving events.

### Creating your subscription

To verify that your webhook can properly receive events, we perform the CloudEvents's [Abuse Protection](https://github.com/cloudevents/spec/blob/master/http-webhook.md#4-abuse-protection) validation against your endpoint. While we recommend you review the full [Abuse Protection](https://github.com/cloudevents/spec/blob/master/http-webhook.md#4-abuse-protection) specification, at a minimum the following must occur to provision your subscription.

- A user provides consent for your application to access their Blackbaud environment's data via [OAuth 2.0](https://developer.blackbaud.com/skyapi/docs/authorization).
- Your application makes a request with your subscription details to the [create subscription](https://developer.sky.blackbaud.com/api#api=webhook&operation=CreateSubscription) endpoint.
- If your request passes initial validation, we start to provision your subscription. At this time, your subscription is in a `Provisioning` state.
- Within a few minutes, your endpoint should receive an `OPTIONS` request with the header `WebHook-Request-Origin: eventgrid.azure.net`.
- Your endpoint needs to evaluate this header's value (\`eventgrid.azure.net\`) and respond with a successful response (e.g. 200 HTTP Status Code) and the header `WebHook-Allowed-Origin: eventgrid.azure.net`. If successful, we update the subscription status to `Provisioned`.
- If your endpoint does not respond within 5 minutes or returns some other response, we place your subscription into an `Error` state. Before you try the request again, you may want to test your endpoint again or check your logs for an error.
- Once `Provisioned`, your endpoint receives events when the event type occurs.

To see a demonstration, review our [tutorial](https://developer.blackbaud.com/skyapi/products/bbem/webhook/tutorial).

Although the details vary by event type, in general event payloads will only provide your application with enough context for it to determine...

- the type of event that has taken place.
- the record affected by the event.

For example, with that context your application can choose to ignore or acknowledge the event by calling SKY API to fetch the current state of that record. This event data approach enables us to ensure that only applications with ongoing SKY API access can retrieve details about Blackbaud environments and its records.

### CloudEvents schema

Our event payloads adhere to the [CloudEvents](https://cloudevents.io/) schema and have a JSON payload of `Content-Type: application/cloudevents+json; charset=utf-8` with the following properties.

| Property | Type | Description |
| --- | --- | --- |
| [type](https://github.com/cloudevents/spec/blob/v1.0/spec.md#type) | string | The event type. Review the [full list of supported event types](https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types). |
| [specversion](https://github.com/cloudevents/spec/blob/v1.0/spec.md#specversion) | string | The CloudEvents specification version the event uses. This is version `1.0` until Webhooks supports other versions. |
| [source](https://github.com/cloudevents/spec/blob/v1.0/spec.md#source-1) | string | An implementation detail used by Blackbaud to route the event to your subscription. |
| [subject](https://github.com/cloudevents/spec/blob/v1.0/spec.md#subject) | URI-reference | Identifies the changed record within the Blackbaud environment. The format is a relative URI where the first segment of the route represents the environment (e.g. `/environments/environment_id`). Events may contain other path segments in addition to the environment (e.g. `/environments/environment_id/[additional record context type]/context_record_id`). To support this, your endpoint should locate the `environment_id` within the `subject` rather than matching exactly on the `/environments/environment_id` string. |
| [id](https://github.com/cloudevents/spec/blob/v1.0/spec.md#id) | string | The identifier for a particular event. This identifier is unique within a Blackbaud environment. |
| [time](https://github.com/cloudevents/spec/blob/v1.0/spec.md#time) | timestamp (ISO 8601) | `DateTime` in UTC for when the event occurred. The event date and time does not match the `date_modified` or `last_modified` dates for the record in the database. |
| [data](https://github.com/cloudevents/spec/blob/v1.0/spec.md#event-data) | object (application/json) | Includes event-specific details about the context that triggered the event. To review a list of supported event types, see the [Event types](https://developer.blackbaud.com/skyapi/products/bbem/webhook/event-types) page. |

```
POST /bb/handler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
  accept-encoding: gzip, deflate
  connection: Keep-Alive
  content-length: 250
  content-type: application/cloudevents+json; charset=utf-8
  host: example.org
  origin: eventgrid.azure.net
  aeg-delivery-count: 0
  {
    "type": "com.blackbaud.constituent.delete.v1",
    "specversion": "1.0",
    "source": "OAWVIVCLINWGMTCQJN",
    "subject": "/environments/p-TTKClfLPKk2a_nZYGhwHdA",
    "id": "575bca1a-7250-418e-a6ee-2472be4fd06c",
    "time": "2020-04-22T23:39:33.6337487Z",
    "data": {
      "id": "7203"
    }
  }
```

```json
POST /bb/handler?webhookKey=cILU*(em43sP%$(9d(8PX@^M3j7st$6ch*fPWdKb HTTP/1.1
accept-encoding: gzip, deflate
connection: Keep-Alive
content-length: 250
content-type: application/cloudevents+json; charset=utf-8
host: example.org
origin: eventgrid.azure.net
aeg-delivery-count: 0
{
  "type": "com.blackbaud.constituent.delete.v1",
  "specversion": "1.0",
  "source": "OAWVIVCLINWGMTCQJN",
  "subject": "/environments/p-TTKClfLPKk2a_nZYGhwHdA",
  "id": "575bca1a-7250-418e-a6ee-2472be4fd06c",
  "time": "2020-04-22T23:39:33.6337487Z",
  "data": {
    "id": "7203"
  }
}
```

### Code sample explanation

Using the request example above, your application can determine:

- `type` – A constituent was deleted (`com.blackbaud.constituent.delete.v1`).
- `subject` – The constituent was removed from Blackbaud environment `p-TTKClfLPKk2a_nZYGhwHdA`.
- `time` – The event took place on April, 22, 2020 at 23:39 (11:39pm) UTC.
- `data` – The constituent with record ID `7203` was deleted.

Your webhook handler must respond to the event request within 30 seconds with a response code of 200, 201, 202, 203, or 204. If your application fails to respond or returns a different response code, we will try up to 9 more attempts to deliver the event to your webhook.

We recommend you consider this retry mechanism when determining what response to send. If your application encounters an error (malformed message, invalid query string param, etc.), it may be better to return a 200 and log the error if you don't want to see the event 9 more times.

### Out-of-order messaging

Events aren't guaranteed to arrive to your webhook endpoint in a sequential or "logical" order.

For example, if your application subscribes to `Constituent added` and `Email address added` events, your webhook may receive the `Email address added` event first when a Constituent is added.

Another example. If your webhook is momentarily unavailable to receive an event, we will retry the event delivery again (again, up to 10 attempts total). If another event occurs for the same record before our retry, your webhook will receive both events, and it's possible you'll receive the second event first.

In either case, it is up to your webhook to not assume anything about the events it has seen. In some cases, like the first example, that may mean sanity checking that the parent record (in this case, the constituent) has already been seen by your webhook. And if your application shouldn't respond to old events, we recommend you consider the `time` within the event payload to see if you've already responded to a "newer" event.

### Event replays

Similarly, because of retries it is possible for your application to receive the same message more than once. If your application doesn't respond within 30 seconds, we will retry the event regardless of what partial event processing you've already completed. Therefore, your application needs to track whether it has already processed an event.

Ideally, your endpoint should handle an event in such a way that receiving and processing the same event more than once doesn't result in errors or data issues for your application.

### Latency

There is a period of time between when the event happens and when the request is sent to your endpoint. On average, the delay is under 5 minutes.

<iframe src="https://host.nxt.blackbaud.com/omnibar/toast" title="Toast container"></iframe>