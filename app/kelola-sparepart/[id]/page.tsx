import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canViewPrice } from "@/lib/auth";
import { requireRole } from "@/lib/session";
import { formatDateWib } from "@/lib/inventory";
import { deleteSparepartAction, updateSparepartAction } from "../actions";
import { SparepartFields } from "../SparepartForm";
import "../sparepart.css";

export const dynamic = "force-dynamic";

export default async function UbahSparepartPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string } }) {
  const user = await requireRole(["admin", "teknisi", "sales"]);
  const item = await prisma.sparepartItem.findUnique({
    where: { id: params.id },
    include: { moves: { orderBy: { createdAt: "desc" }, take: 40 } }
  });
  if (!item) notFound();

  return (
    <section className="pageStack spPage">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Stok Sparepart</p>
          <h1>{item.name}</h1>
          <p className="bodyText">Stok sekarang <strong>{item.qty}</strong> pcs. Mengubah jumlah di bawah dicatat sebagai koreksi stok.</p>
        </div>
      </div>
      {searchParams?.error === "nama" ? <div className="infoBox dangerInfo">Nama barang wajib diisi.</div> : null}

      <form className="panel spForm" action={updateSparepartAction.bind(null, item.id)}>
        <SparepartFields v={item} showCost={canViewPrice(user)} isEdit />
        <div className="buttonRow">
          <button className="primaryButton" type="submit">Simpan perubahan</button>
          <Link className="secondaryButton" href={`/kelola-sparepart?k=${item.category}`}>Kembali</Link>
        </div>
      </form>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Riwayat stok</h2>
        {item.moves.length === 0 ? (
          <div className="spEmpty">Belum ada riwayat.</div>
        ) : (
          <div className="spHistory">
            {item.moves.map((m) => (
              <div key={m.id}>
                <span className={m.delta > 0 ? "plus" : "minus"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                <span>jadi {m.qtyAfter}</span>
                <span>{m.reason || "-"}</span>
                <small style={{ color: "var(--muted)" }}>{formatDateWib(m.createdAt)}{m.byName ? ` · ${m.byName}` : ""}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {user.role === "admin" ? (
        <details className="spFold">
          <summary>Hapus barang</summary>
          <div className="spFoldBody">
            <p>Barang dan seluruh riwayat stoknya dihapus permanen. Bila hanya habis, cukup biarkan stok 0.</p>
            <form action={deleteSparepartAction.bind(null, item.id)}>
              <button className="secondaryButton" type="submit" style={{ color: "var(--red)" }}>Ya, hapus permanen</button>
            </form>
          </div>
        </details>
      ) : null}
    </section>
  );
}
