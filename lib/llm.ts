import OpenAI from "openai";

export const openai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio", // required but can be anything
});
export async function callLLM(prompt: string) {
  const strictUserPrompt = `
You are a strict JSON API.
Always return valid JSON only.
No explanation.
No markdown.
No backticks.

${prompt}
`;

  const response = await openai.chat.completions.create({
    model: "mistral-7b-instruct-v0.3",
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: strictUserPrompt,
      },
    ],
  });

  const content = response.choices[0].message.content ?? "";

  return cleanJSON(content);
}

function cleanJSON(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}


