import { InvocationContext } from "@azure/functions";

export async function forwardToPowerAutomate(
  payload: unknown,
  powerAutomateUrl: string,
  context: InvocationContext
): Promise<void> {
  const response = await fetch(powerAutomateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    context.error(
      `Power Automate responded with ${response.status}: ${response.statusText}`
    );
  }
}
