import Link from "next/link";
import { ArrowLeft, Laptop } from "lucide-react";
import { batches } from "@/lib/api";

export default function NewUnitPage({ searchParams }: { searchParams?: { batch?: string } }) {
  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Unit</p>
          <h1>Input data laptop dan QC awal</h1>
        </div>
      </div>

      <form className="panel formGrid">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Data utama</p>
            <h2>Unit masuk PSI</h2>
          </div>
          <Laptop size={22} />
        </div>
        <div className="numberGrid">
          <label>Nomor Unit<input placeholder="4 atau 4a" /></label>
          <label>Batch
            <select defaultValue={searchParams?.batch}>
              {batches.map((batch) => <option value={batch.id} key={batch.id}>{batch.nomorBatch}</option>)}
            </select>
          </label>
        </div>
        <div className="numberGrid">
          <label>Model<input placeholder="Lenovo ThinkPad T480" /></label>
          <label>Processor<input placeholder="Intel Core i5 Gen 8" /></label>
        </div>
        <div className="numberGrid">
          <label>RAM<input placeholder="16GB DDR4" /></label>
          <label>SSD<input placeholder="256GB NVMe" /></label>
        </div>
        <div className="numberGrid">
          <label>Seri SSD<input placeholder="Serial SSD" /></label>
          <label>Harga Jual<input type="number" placeholder="3650000" /></label>
        </div>
        <div className="numberGrid">
          <label>Ukuran LCD<input placeholder="14 inch" /></label>
          <label>Resolusi Layar<input placeholder="1920x1080" /></label>
        </div>
        <div className="numberGrid">
          <label>SSD Health (%)<input type="number" min="0" max="100" /></label>
          <label>Battery Health (%)<input type="number" min="0" max="100" /></label>
        </div>
        <label>Touchscreen
          <select defaultValue="Tidak">
            <option>Tidak</option>
            <option>Ya</option>
          </select>
        </label>
        <label>Catatan QC Awal<textarea placeholder="Catatan body, repaint, karet bawah, kamera, USB, speaker, mic, dan lainnya." /></label>
        <button className="primaryButton" type="button">Simpan Unit dan QC Awal</button>
      </form>
    </section>
  );
}
