// Data terstruktur untuk mesin pencari. "<" di-escape supaya teks dari database tidak bisa menutup tag script.
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
