export function parseModelJson<T>(text: string): T {
  const fenced = text
    .trim()
    .replace(/^```json\s*|\s*```$/gm, "")
    .trim();

  const first = fenced.indexOf("{");
  const last = fenced.lastIndexOf("}");
  if (first === -1 || last === -1) {
    throw new Error(`Model returned no JSON object: ${fenced.slice(0, 200)}`);
  }

  return JSON.parse(fenced.slice(first, last + 1)) as T;
}
