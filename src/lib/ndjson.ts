import "server-only";

// Stream an NDJSON response body and group rows by `item_id` without ever
// holding the whole payload in memory. The old approach
// (`text -> split -> map -> group`) kept ~4 full-size copies of the export
// live at once, which OOM-killed the prices cron once the dataset grew past
// the 2 GB function limit. Here only one chunk's worth of lines plus the
// output map are resident; the map is the unavoidable result we need anyway.
export async function groupNdjsonByItemId<T extends { item_id: number }>(
  response: Response,
): Promise<{ byItemId: Record<number, T[]>; count: number }> {
  const byItemId: Record<number, T[]> = {};
  let count = 0;

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (line: string) => {
    if (!line) return;
    const item = JSON.parse(line) as T;
    (byItemId[item.item_id] ??= []).push(item);
    count++;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // last element is an incomplete trailing line
    for (const line of lines) consume(line);
  }
  buffer += decoder.decode(); // flush any multi-byte remainder
  consume(buffer.trim());

  return { byItemId, count };
}
