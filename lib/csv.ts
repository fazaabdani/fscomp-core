const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
