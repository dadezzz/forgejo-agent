import { IsObject, type StaticParse, type TSchema } from "typebox";
import type { ApiContext } from "../context.ts";
import Value from "typebox/value";

export async function forgejoFetch<const S extends TSchema>(
  apiContext: ApiContext,
  pathname: string,
  responseSchema: S,
  init: RequestInit,
): Promise<StaticParse<S>> {
  const headers = new Headers({
    ...init.headers,
    accept: "application/json",
    authorization: apiContext.getAuthHttpHeader(),
  });
  if (init.body) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(apiContext.url + pathname, { ...init, headers });
  if (response.status >= 400) {
    throw new Error(`api ${init.method ?? "GET"} ${pathname} failed: ${response.status} ${await response.text()}`);
  }

  // Make passing Type.Object({}) ignore the response.
  if (IsObject(responseSchema) && Object.entries(responseSchema.properties).length === 0) {
    // @ts-expect-error
    return {};
  }

  const responseBody = await response.json();
  return Value.Parse(responseSchema, responseBody);
}
