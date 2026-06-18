import Link from "next/link";
import { BadgeCheck, CreditCard, FileDown, KeyRound, PlusCircle } from "lucide-react";
import type { LicenseDurationType, LicenseStatus, LicenseType } from "@prisma/client";
import { formatDateInput, formatDateWib } from "@/lib/inventory";
import { licenseDurationLabel, licenseStatusLabel, licenseStatusTone, licenseTypeLabel, maskProductKey } from "@/lib/licenses";
import { formatRupiah } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createLicenseRecordAction } from "./actions";

const licenseTypes: LicenseType[] = ["OFFICE", "WINDOWS", "ANTIVIRUS", "OTHER"];
const durationTypes: LicenseDurationType[] = ["LIFETIME", "YEARLY", "CUSTOM"];
const statuses: LicenseStatus[] = ["AVAILABLE", "ASSIGNED", "SENT", "PROBLEM", "REPLACED"];

function durationTypeLabel(type: LicenseDurationType) {
  if (type === "YEARLY") return "Tahunan";
  if (type === "CUSTOM") return "Custom";
  return "Lifetime";
}

export default async function LicensesPage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  requireRole(["admin", "sales"]);

  const [licenses, units] = await Promise.all([
    prisma.licenseRecord.findMany({
      include: {
        unit: { select: { nomorUnit: true, model: true } },
        sale: { select: { invoiceNumber: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: [{ createdAt: "desc" }]
    }),
    prisma.unit.findMany({
      select: { id: true, nomorUnit: true, model: true },
      orderBy: [{ nomorUnit: "asc" }]
    })
  ]);

  const lifetimeCount = licenses.filter((license) => license.durationType === "LIFETIME").length;
  const yearlyCount = licenses.filter((license) => license.durationType !== "LIFETIME").length;
  const sentCount = licenses.filter((license) => license.status === "SENT").length;
  const problemCount = licenses.filter((license) => license.status === "PROBLEM" || license.status === "REPLACED").length;
  const message =
    searchParams?.error === "required"
      ? "Versi lisensi dan tanggal pembelian wajib diisi."
      : searchParams?.success === "created"
        ? "Lisensi berhasil direkap."
        : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Lisensi</p>
          <h1>Rekap lisensi dan kartu pembeli</h1>
          <p className="bodyText">Lisensi dari nota akan otomatis masuk ke sini dan tertaut ke unit laptop yang dijual.</p>
        </div>
        <KeyRound size={31} />
      </div>

      {message ? <div className={`infoBox ${searchParams?.error ? "dangerInfo" : ""}`}>{message}</div> : null}

      <section className="statGrid">
        <article className="statCard"><BadgeCheck size={19} /><span>Lifetime</span><strong>{lifetimeCount}</strong></article>
        <article className="statCard"><CreditCard size={19} /><span>Tahunan/custom</span><strong>{yearlyCount}</strong></article>
        <article className="statCard"><FileDown size={19} /><span>Terkirim</span><strong>{sentCount}</strong></article>
        <article className="statCard"><KeyRound size={19} /><span>Problem</span><strong>{problemCount}</strong></article>
      </section>

      <form className="panel formGrid" action={createLicenseRecordAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Input manual</p>
            <h2>Lisensi baru</h2>
          </div>
          <PlusCircle size={22} />
        </div>
        <div className="numberGrid">
          <label>Jenis lisensi
            <select name="licenseType" defaultValue="OFFICE">
              {licenseTypes.map((type) => <option value={type} key={type}>{licenseTypeLabel(type)}</option>)}
            </select>
          </label>
          <label>Versi / tipe<input name="version" placeholder="2021 / 11 Pro / 10 Home Single Language" required /></label>
        </div>
        <div className="numberGrid">
          <label>Nama lisensi<input name="name" placeholder="Kosongkan untuk otomatis" /></label>
          <label>Edition tambahan<input name="edition" placeholder="Pro Plus / Home / Business" /></label>
        </div>
        <div className="numberGrid">
          <label>Tanggal pembelian<input name="purchaseDate" type="date" defaultValue={formatDateInput(new Date())} required /></label>
          <label>Supplier<input name="supplier" placeholder="Supplier/tempat beli lisensi" /></label>
        </div>
        <div className="numberGrid">
          <label>Durasi
            <select name="durationType" defaultValue="LIFETIME">
              {durationTypes.map((type) => <option value={type} key={type}>{durationTypeLabel(type)}</option>)}
            </select>
          </label>
          <label>Berlaku sampai<input name="validUntil" type="date" /></label>
        </div>
        <div className="numberGrid">
          <label>Nama pembeli<input name="buyerName" placeholder="Nama customer" /></label>
          <label>No. WA pembeli<input name="buyerPhone" placeholder="08xxxx" /></label>
        </div>
        <div className="numberGrid">
          <label>Tautkan ke unit
            <select name="unitId" defaultValue="">
              <option value="">Belum ditautkan</option>
              {units.map((unit) => <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>)}
            </select>
          </label>
          <label>Seri laptop manual<input name="laptopSeries" placeholder="Isi kalau unit belum ada di sistem" /></label>
        </div>
        <div className="numberGrid">
          <label>Status
            <select name="status" defaultValue="ASSIGNED">
              {statuses.map((status) => <option value={status} key={status}>{licenseStatusLabel(status)}</option>)}
            </select>
          </label>
          <label>Product key<input name="productKey" placeholder="Opsional, disimpan untuk kartu lisensi" /></label>
        </div>
        <div className="numberGrid">
          <label>Harga jual<input name="salePrice" inputMode="numeric" type="number" min="0" step="1000" /></label>
          <label>Modal<input name="costPrice" inputMode="numeric" type="number" min="0" step="1000" /></label>
        </div>
        <label>Catatan<textarea name="notes" placeholder="Catatan aktivasi, akun, atau kendala lisensi." /></label>
        <button className="primaryButton" type="submit"><PlusCircle size={16} /> Simpan Lisensi</button>
      </form>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Daftar lisensi</p>
            <h2>Office, Windows, dan software</h2>
          </div>
          <KeyRound size={22} />
        </div>
        {licenses.length === 0 ? (
          <div className="emptyState">Belum ada lisensi. Lisensi dari kasir akan otomatis muncul setelah nota tersimpan.</div>
        ) : (
          <div className="tableScroll">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Lisensi</th>
                  <th>Pembeli</th>
                  <th>Unit / nota</th>
                  <th>Durasi</th>
                  <th>Status</th>
                  <th>Kartu</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.id}>
                    <td>
                      <strong>{license.name}</strong><br />
                      <small>{licenseTypeLabel(license.licenseType)} / {license.version}</small><br />
                      <small>Key: {maskProductKey(license.productKey)}</small>
                    </td>
                    <td>
                      <strong>{license.buyerName || "-"}</strong><br />
                      <small>{license.buyerPhone || "-"}</small>
                    </td>
                    <td>
                      {license.unit ? <><strong>Unit {license.unit.nomorUnit}</strong><br /><small>{license.unit.model}</small></> : <strong>{license.laptopSeries || "-"}</strong>}<br />
                      <small>{license.sale?.invoiceNumber ? `Nota ${license.sale.invoiceNumber}` : "Input manual"}</small>
                    </td>
                    <td>
                      <span className="statusPill green">{licenseDurationLabel(license.durationType, license.validUntil)}</span><br />
                      <small>Beli {formatDateWib(license.purchaseDate)}</small>
                    </td>
                    <td>
                      <span className={`statusPill ${licenseStatusTone(license.status)}`}>{licenseStatusLabel(license.status)}</span><br />
                      <small>{formatRupiah(license.salePrice)}</small>
                    </td>
                    <td>
                      <Link className="secondaryButton compactButton" href={`/licenses/${license.id}/card`}><FileDown size={15} /> Kartu/PDF</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
