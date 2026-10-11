import { FileText } from "lucide-react";
import { parseDescription } from "@/lib/unit-description";

export function UnitDescription({ text }: { text: string }) {
  const blocks = parseDescription(text);
  if (blocks.length === 0) return null;

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Tentang unit ini</p>
          <h2>Deskripsi lengkap</h2>
        </div>
        <FileText size={22} />
      </div>
      <div className="unitDescription">
        {blocks.map((block, index) =>
          block.type === "p" ? (
            <p key={index}>{block.text}</p>
          ) : (
            <ul key={index}>
              {block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
            </ul>
          )
        )}
      </div>
    </section>
  );
}
