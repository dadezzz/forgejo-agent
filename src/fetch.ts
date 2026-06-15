import Type, { type StaticParse, type TSchema } from "typebox";
import Value from "typebox/value";
import process from "node:process";

const contextApiUrlSchema = Type.String();
const contextApiUrl = Value.Parse(contextApiUrlSchema, process.env.FORGEJO_API_URL);
const contextTokenSchema = Type.String();
const contextToken = Value.Parse(contextTokenSchema, process.env.INPUT_TOKEN);

export async function forgejoFetch<const S extends TSchema>(
  method: string,
  pathname: string,
  body: BodyInit | null,
  responseSchema: S,
): Promise<StaticParse<S>> {
  const headers = new Headers({
    accept: "application/json",
    authorization: `Bearer ${contextToken}`,
  });

  if (body) {
    headers.append("content-type", "application/json");
  }

  const response = await fetch(contextApiUrl + pathname, { method, headers, body });
  if (response.status >= 400) {
    throw new Error(`fetch failed: ${response.statusText}`);
  }

  const responseBody = await response.json();
  return Value.Parse(responseSchema, responseBody);
}
