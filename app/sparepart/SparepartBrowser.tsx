"use client";

import { useMemo, useState } from "react";

export type PublicSparepart = {
  id: string;
  category: string;
  categoryLabel: string;
  name: string;
  tags: string[];
  compat: string | null;
  qty: number;
  state: "habis" | "menipis" | "ada";
  salePrice: number | null;
};

const WA = "https://wa.me/62816660056";
const rupiah = (v: number) => `Rp${new Intl.NumberFormat("id-ID").format(v)}`;

export function SparepartBrowser({ items, categories }: { items: PublicSparepart[]; categories: { id: string; label: string; count: number }[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [onlyReady, setOnlyReady] = useState(true);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (cat && i.category !== cat) return false;
      if (onlyReady && i.state === "habis") return false;
      if (words.length === 0) return true;
      const hay = `${i.name} ${i.tags.join(" ")} ${i.compat ?? ""} ${i.categoryLabel}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [items, q, cat, onlyReady]);

  return (
    <>
      <div className="spSearch">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari: 14 slim 30 pin, acer aspire 3, baterai..." aria-label="Cari sparepart" />
      </div>
      <div className="spChips">
        <button type="button" className={`spChip ${!cat ? "on" : ""}`} onClick={() => setCat("")}>Semua <small>{items.length}</small></button>
        {categories.map((c) => (
          <button type="button" key={c.id} className={`spChip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>{c.label} <small>{c.count}</small></button>
        ))}
        <button type="button" className={`spChip ${onlyReady ? "on" : ""}`} onClick={() => setOnlyReady((v) => !v)}>{onlyReady ? "Hanya yang ready" : "Termasuk yang habis"}</button>
      </div>

      {shown.length === 0 ? (
        <div className="spEmpty">Tidak ada yang cocok. Coba kata lain, atau tanyakan langsung ke admin lewat WhatsApp.</div>
      ) : (
        <div className="spPubGrid">
          {shown.map((i) => {
            const msg = encodeURIComponent(`Halo FS Comp, saya mau tanya sparepart: ${i.name}`);
            return (
              <article key={i.id} className={`spCard ${i.state === "habis" ? "out" : ""}`}>
                <h3>{i.name}</h3>
                <div className="spMeta">
                  <span className="spTag">{i.categoryLabel}</span>
                  {i.tags.map((t) => <span className="spTag" key={t}>{t}</span>)}
                </div>
                {i.compat ? <div className="spCompat">Cocok: {i.compat}</div> : null}
                <div className="spCardFoot">
                  <span className="spPrice">{i.salePrice ? rupiah(i.salePrice) : "Tanya harga"}</span>
                  <span className={`spBadge ${i.state}`}>{i.state === "habis" ? "Habis" : i.state === "menipis" ? `Sisa ${i.qty}` : "Ready"}</span>
                </div>
                <a className="spWa" href={`${WA}?text=${msg}`} target="_blank" rel="noreferrer">Tanya via WhatsApp</a>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
