export type DescriptionBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

const BULLET = /^(?:[-*•])\s+(.*)$/;

export function parseDescription(raw: string): DescriptionBlock[] {
  const blocks: DescriptionBlock[] = [];
  for (const line of raw.replace(/\r\n/g, "\n").split("\n").map((item) => item.trim())) {
    if (!line) continue;
    const bullet = line.match(BULLET);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return blocks;
}

export function descriptionSnippet(raw: string, max = 160) {
  const firstLine = parseDescription(raw).map((block) => (block.type === "p" ? block.text : block.items[0])).find(Boolean) ?? "";
  return firstLine.length > max ? `${firstLine.slice(0, max - 1).trimEnd()}…` : firstLine;
}
