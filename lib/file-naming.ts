export function slugifyFileName(text: string) {
  return (
    text
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "FOTO"
  );
}
