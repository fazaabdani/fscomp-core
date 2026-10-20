import { Banknote, Wallet } from "lucide-react";
import { SubmitButton } from "@/app/SubmitButton";
import { formatRupiah } from "@/lib/api";
import { jakartaDateKey } from "@/lib/inventory";
import { PAYMENT_METHODS, netReceived, paymentStatus } from "@/lib/sale-payments";
import { addSalePaymentAction, deleteSalePaymentAction } from "../../actions";

type PaymentPanelSale = {
  id: string;
  paymentMethod: string;
  subtotal: number;
  dpAmount: number;
  costPrice: number;
  grossProfit: number;
  marketplaceName: string;
  marketplaceFee: number;
  voidedAt: string;
  payments: { id: string; amount: number; method: string; paidAt: string; note: string; byName: string }[];
};

// Panel di halaman nota (tidak ikut tercetak): riwayat pembayaran, form pelunasan, dan ringkasan
// laba khusus admin. Pelunasan dicatat DI SINI -- bukan dengan membuat transaksi baru.
export function PaymentPanel({ sale, isAdmin }: { sale: PaymentPanelSale; isAdmin: boolean }) {
  const status = paymentStatus({ paymentMethod: sale.paymentMethod, subtotal: sale.subtotal, dpAmount: sale.dpAmount, paymentCount: sale.payments.length });
  const hasHistory = sale.payments.length > 0;
  const canAdd = !sale.voidedAt && !status.settled;
  const today = jakartaDateKey(new Date());

  return (
    <section className="panel printHidden" id="pembayaran">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Pembayaran</p>
          <h2>{status.settled ? "Lunas" : `Belum lunas, sisa ${formatRupiah(status.remaining)}`}</h2>
        </div>
        <Wallet size={22} />
      </div>

      <div className="numberGrid">
        <div className="infoBox"><small>Total transaksi</small><br /><strong>{formatRupiah(sale.subtotal)}</strong></div>
        <div className="infoBox"><small>Sudah dibayar</small><br /><strong>{formatRupiah(status.paid)}</strong></div>
      </div>

      {hasHistory ? (
        <div className="tableScroll">
          <table className="dataTable">
            <thead>
              <tr><th>Tanggal</th><th>Metode</th><th>Jumlah</th><th>Catatan</th>{isAdmin ? <th /> : null}</tr>
            </thead>
            <tbody>
              {sale.payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paidAt}</td>
                  <td>{payment.method}</td>
                  <td><strong>{formatRupiah(payment.amount)}</strong></td>
                  <td><small>{[payment.note, payment.byName ? `oleh ${payment.byName}` : ""].filter(Boolean).join(" / ") || "-"}</small></td>
                  {isAdmin && !sale.voidedAt ? (
                    <td>
                      <details>
                        <summary>Hapus</summary>
                        <form action={deleteSalePaymentAction.bind(null, payment.id)}>
                          <input type="hidden" name="returnTo" value="receipt" />
                          <button className="secondaryButton compactButton" type="submit">Ya, hapus pembayaran ini</button>
                        </form>
                      </details>
                    </td>
                  ) : isAdmin ? <td /> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <small className="formHint">
          {status.settled
            ? "Transaksi lama dari sebelum ada riwayat pembayaran: dianggap lunas saat transaksi."
            : `Transaksi lama: tercatat sudah dibayar ${formatRupiah(status.paid)} tanpa riwayat rinci. Pembayaran berikutnya akan dicatat di sini.`}
        </small>
      )}

      {canAdd ? (
        <form className="formGrid" action={addSalePaymentAction.bind(null, sale.id)}>
          <input type="hidden" name="returnTo" value="receipt" />
          <div className="panelSubsection formGrid">
            <div><p className="eyebrow">Tambah pembayaran</p><h3>Pelunasan atau cicilan berikutnya</h3></div>
            <div className="numberGrid">
              <label>Jumlah (Rp)
                <input name="amount" type="number" inputMode="numeric" min="1" max={status.remaining} step="1000" defaultValue={status.remaining} required />
              </label>
              <label>Metode
                <select name="method" defaultValue="Transfer">
                  {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                </select>
              </label>
            </div>
            <div className="numberGrid">
              <label>Tanggal bayar<input name="paidAt" type="date" defaultValue={today} /></label>
              <label>Catatan<input name="note" maxLength={300} placeholder="Contoh: pelunasan, transfer BCA" /></label>
            </div>
            <small className="formHint">Jangan buat transaksi baru untuk pelunasan: cukup catat di sini supaya omzet dan laba tidak terhitung dobel. Sisa saat ini {formatRupiah(status.remaining)}.</small>
            <SubmitButton icon={<Banknote size={16} />} pendingLabel="Menyimpan pembayaran...">Simpan Pembayaran</SubmitButton>
          </div>
        </form>
      ) : null}

      {isAdmin ? (
        <div className="panelSubsection">
          <div><p className="eyebrow">Khusus admin</p><h3>Ringkasan laba transaksi</h3></div>
          <div className="detailList">
            <div><span>Harga jual</span><strong>{formatRupiah(sale.subtotal)}</strong></div>
            {sale.marketplaceFee > 0 ? (
              <div><span>Potongan admin {sale.marketplaceName || "marketplace"}</span><strong>-{formatRupiah(sale.marketplaceFee)}</strong></div>
            ) : null}
            {sale.marketplaceFee > 0 ? (
              <div><span>Diterima bersih</span><strong>{formatRupiah(netReceived(sale.subtotal, sale.marketplaceFee))}</strong></div>
            ) : null}
            <div><span>Total modal{sale.marketplaceFee > 0 ? " + potongan" : ""}</span><strong>{formatRupiah(sale.costPrice)}</strong></div>
            <div><span>Laba kotor</span><strong>{formatRupiah(sale.grossProfit)}</strong></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
