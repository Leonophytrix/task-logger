export async function request<T = unknown>(
  url: string,
  method: string,
  data?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}
