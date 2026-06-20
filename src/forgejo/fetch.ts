import { Type, type StaticParse, type TSchema } from "typebox";
import { getAuthContext } from "../context.ts";
import Value from "typebox/value";

export const apiUrl = Value.Parse(Type.String(), process.env.FORGEJO_API_URL);
const authContext = getAuthContext();

export async function forgejoFetch<const S extends TSchema>(
  method: string,
  pathname: string,
  body: BodyInit | null,
  responseSchema: S,
): Promise<StaticParse<S>> {
  const headers = new Headers({
    accept: "application/json",
    authorization: `Bearer ${authContext.token}`,
  });

  if (body) {
    headers.append("content-type", "application/json");
  }

  const response = await fetch(apiUrl + pathname, { method, headers, body });
  if (response.status >= 400) {
    throw new Error(`fetch failed: ${await response.text()}`);
  }

  const responseBody = await response.json();
  return Value.Parse(responseSchema, responseBody);
}
