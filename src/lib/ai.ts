import OpenAI from "openai";

export const aiClient = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY ?? "",
  },
});

export async function getStructuredAiJson<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const completion = await aiClient.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
