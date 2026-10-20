import Link from "next/link";
import { ArrowLeft, Banknote, MessageCircle, Wallet } from "lucide-react";
import { FlashNotice } from "@/app/FlashNotice";
import { SubmitButton } from "@/app/SubmitButton";
import { formatRupiah } from "@/lib/api";
import { jakartaDateKey } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, isLegacyPartial, isReceivable, receivableAgeDays } from "@/lib/sale-payments";
import { requireRole } from "@/lib/session";
import { displayUnitNumber } from "@/lib/unit-number";
import { addSalePaymentAction } from "../actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "jumlah-pembayaran-tidak-valid": "Jumlah pembayaran harus lebih dari nol.",
  "melebihi-sisa": "Jumlah pembayaran melebihi sisa tagihan.",
  "sudah-lunas": "Transaksi itu sudah lunas.",
  "transaksi-dibatalkan": "Transaksi itu sudah dibatalkan.",
  "pembayaran-gagal-coba-lagi": "Pembayaran gagal disimpan. Muat ulang halaman lalu coba lagi."
};

// Daftar semua transaksi aktif yang belum lunas (DP belum dilunasi), khusus admin.
export default async function ReceivablesPage({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  await requireRole(["admin"]);

  // Prisma tidak bisa membandingkan dua kolom, jadi id yang belum lunas diambil lewat SQL langsung.
  const unpaid = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Sale"
    WHERE "voidedAt" IS NULL AND "dpAmount" < "subtotal"
      AND ("paymentMethod" = 'DP' OR "dpAmount" > 0 OR EXISTS (SELECT 1 FROM "SalePayment" WHERE "SalePayment"."saleId" = "Sale"."id"))
  `;
  const sales = unpaid.length === 0 ? [] : await prisma.sale.findMany({
    where: { id: { in: unpaid.map((row) => row.id) } },
    include: { unit: { select: { nomorUnit: true, model: true } }, items: { select: { name: true }, take: 2 }, _count: { select: { payments: true } } },
    orderBy: { soldAt: "asc" }
  });

  const now = new Date();
  // Ratusan transaksi lama Cash/Transfer punya dpAmount 0 padahal lunas: itu BUKAN piutang.
  const facts = (sale: (typeof sales)[number]) => ({ paymentMethod: sale.paymentMethod, subtotal: sale.subtotal, dpAmount: sale.dpAmount, paymentCount: sale._count.payments });
  const allRows = sales.filter((sale) => isReceivable(facts(sale))).map((sale) => ({
    legacy: isLegacyPartial(facts(sale)),
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    soldAt: jakartaDateKey(sale.soldAt),
    ageDays: receivableAgeDays(sale.soldAt, now),
    title: sale.unit ? `Unit ${displayUnitNumber(sale.unit.nomorUnit)} - ${sale.unit.model}` : sale.items.map((item) => item.name).join(" + ").slice(0, 90) || "Non-laptop",
    buyerName: sale.buyerName ?? "-",
    buyerPhone: sale.buyerPhone ?? "",
    location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
    subtotal: sale.subtotal,
    paid: sale.dpAmount,
    remaining: sale.subtotal - sale.dpAmount,
    grossProfit: sale.grossProfit
  }));
  const rows = allRows.filter((row) => !row.legacy);
  const legacyRows = allRows.filter((row) => row.legacy);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const oldest = rows.reduce((max, row) => Math.max(max, row.ageDays), 0);

  const message = searchParams?.success === "payment-added"
    ? "Pembayaran dicatat."
    : searchParams?.error
      ? (errorMessages[searchParams.error] ?? `Gagal: ${searchParams.error}`)
      : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke kasir</Link>
          <p className="eyebrow">Khusus admin</p>
          <h1>Piutang: transaksi belum lunas</h1>
          <p className="bodyText">Semua transaksi aktif yang DP-nya belum dilunasi. Catat pelunasan di sini atau di nota, jangan buat transaksi baru supaya omzet dan laba tidak terhitung dobel.</p>
        </div>
        <Wallet size={34} />
      </div>

      <FlashNotice message={message} tone={searchParams?.error ? "error" : "success"} queryKeys={["success", "error"]} />

      <div className="statsGrid">
        <div className="metric metric-blue"><Wallet size={21} /><span>Transaksi belum lunas</span><strong>{rows.length}</strong></div>
        <div className="metric metric-green"><Banknote size={21} /><span>Total sisa tagihan</span><strong>{formatRupiah(totalRemaining)}</strong></div>
        <div className="metric metric-cyan"><span>Piutang terlama</span><strong>{rows.length === 0 ? "-" : `${oldest} hari`}</strong></div>
      </div>

      <section className="panel">
        {rows.length === 0 ? (
          <div className="emptyState">Tidak ada piutang. Semua transaksi aktif sudah lunas.</div>
        ) : (
          <div className="tableScroll">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Transaksi</th>
                  <th>Pembeli</th>
                  <th>Total</th>
                  <th>Dibayar</th>
                  <th>Sisa</th>
                  <th>Umur</th>
                  <th>Catat pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const wa = row.buyerPhone.replace(/\D/g, "").replace(/^0/, "62");
                  const reminder = `Assalamu'alaikum kak ${row.buyerName}. Mengingatkan dengan sopan, untuk transaksi ${row.invoiceNumber} masih ada sisa pembayaran ${formatRupiah(row.remaining)}. Terima kasih nggih.`;
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/sales/${row.id}/receipt`}><strong>{row.title}</strong></Link><br />
                        <small>{row.invoiceNumber} / {row.soldAt} / {row.location}</small><br />
                        <small>Laba transaksi {formatRupiah(row.grossProfit)}</small>
                      </td>
                      <td>
                        {row.buyerName}
                        {wa.length >= 10 ? (
                          <><br /><a className="secondaryButton compactButton" href={`https://wa.me/${wa}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Ingatkan</a></>
                        ) : null}
                      </td>
                      <td>{formatRupiah(row.subtotal)}</td>
                      <td>{formatRupiah(row.paid)}</td>
                      <td><strong>{formatRupiah(row.remaining)}</strong></td>
                      <td>{row.ageDays} hari</td>
                      <td>
                        <form className="formGrid" action={addSalePaymentAction.bind(null, row.id)}>
                          <input type="hidden" name="returnTo" value="piutang" />
                          <input name="amount" type="number" inputMode="numeric" min="1" max={row.remaining} step="1000" defaultValue={row.remaining} aria-label={`Jumlah bayar ${row.invoiceNumber}`} required />
                          <select name="method" defaultValue="Transfer" aria-label={`Metode bayar ${row.invoiceNumber}`}>
                            {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                          </select>
                          <SubmitButton className="secondaryButton compactButton" pendingLabel="Menyimpan...">Catat</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {legacyRows.length > 0 ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Perlu dicek</p>
              <h2>Transaksi lama yang tercatat dibayar sebagian</h2>
            </div>
          </div>
          <p className="bodyText">
            Dari sebelum ada riwayat pembayaran: metode bukan DP, tapi uang masuk yang tercatat kurang dari total. Bisa jadi sudah lunas dan hanya salah catat, bisa juga memang masih kurang. Buka nota untuk melunasi atau memperbaikinya (Edit Nota).
          </p>
          <div className="tableScroll">
            <table className="dataTable">
              <thead>
                <tr><th>Transaksi</th><th>Pembeli</th><th>Total</th><th>Tercatat dibayar</th><th>Selisih</th></tr>
              </thead>
              <tbody>
                {legacyRows.map((row) => (
                  <tr key={row.id}>
                    <td><Link href={`/sales/${row.id}/receipt`}><strong>{row.title}</strong></Link><br /><small>{row.invoiceNumber} / {row.soldAt}</small></td>
                    <td>{row.buyerName}</td>
                    <td>{formatRupiah(row.subtotal)}</td>
                    <td>{formatRupiah(row.paid)}</td>
                    <td><strong>{formatRupiah(row.remaining)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
