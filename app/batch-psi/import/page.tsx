import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { requireRole } from "@/lib/session";
import { importSpreadsheetBatchAction } from "./actions";

const sample = `MERK\tSERI\tPROSESSOR\tRAM\tSSD\tLAYAR\tQTY\tproblem
LENOVO\tTHINKPAD X13 1 BACKLITE\tI7 GEN 10\tRAM 16GB\tSSD 256GB\t13,3 INCH FHD\t1\tFRAME LAYAR BUKA
HP\tELITEBOOK 830 G7 2\tI5 GEN 10\tRAM 16GB\tSSD 256GB\t13,3 INCH FHD\t1\t`;

export default function ImportBatchPage({ searchParams }: { searchParams?: { error?: string } }) {
  requireRole(["admin", "teknisi"]);

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Import spreadsheet PSI</p>
          <h1>Paste data PSI untuk membuat batch dan unit otomatis</h1>
        </div>
      </div>

      {searchParams?.error ? <div className="infoBox dangerInfo">Import gagal. Pastikan batch, tanggal, dan tabel sudah diisi.</div> : null}

      <form className="panel formGrid" action={importSpreadsheetBatchAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Data batch</p>
            <h2>Identitas kiriman</h2>
          </div>
          <FileSpreadsheet size={22} />
        </div>
        <div className="numberGrid">
          <label>Nomor Batch<input name="nomorBatch" placeholder="PSI-2026-05-C" required /></label>
          <label>Supplier<input name="supplier" placeholder="PSI Jakarta / Distributor" required /></label>
        </div>
        <div className="numberGrid">
          <label>Tanggal Masuk<input name="tanggalMasuk" type="date" required /></label>
          <label>Tanggal Tempo<input name="tanggalTempo" type="date" required /></label>
        </div>
        <label>
          Paste tabel dari spreadsheet
          <textarea className="spreadsheetPaste" name="rows" defaultValue={sample} required />
        </label>
        <div className="infoBox">
          Kolom yang dibaca: MERK, SERI, PROSESSOR, RAM, SSD, LAYAR, QTY, problem. Unit hasil import masuk status RECHECK sampai QC lengkap.
        </div>
        <button className="primaryButton" type="submit">Import Batch dan Unit</button>
      </form>
    </section>
  );
}
