import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { listSuppliers } from "@/lib/supplier-data";
import { FlashNotice } from "../FlashNotice";
import { deleteSupplierAction } from "./actions";

export default async function SupplierPage({ searchParams }: { searchParams?: { saved?: string; deleted?: string; error?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi"]);
  const suppliers = await listSuppliers();
  const missing = suppliers.filter((item) => !item.id).length;
  const flash = searchParams?.saved ? "Supplier tersimpan." : searchParams?.deleted ? "Supplier dihapus." : searchParams?.error ? "Terjadi kesalahan. Coba lagi." : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Supplier</p>
          <h1>Alamat supplier untuk retur unit</h1>
        </div>
        <div className="buttonRow noMargin">
          <Link className="secondaryButton" href="/retur"><Truck size={17} /> Retur ke Supplier</Link>
          <Link className="primaryButton" href="/supplier/new"><Plus size={17} /> Tambah Supplier</Link>
        </div>
      </div>

      <FlashNotice message={flash} tone={searchParams?.error ? "error" : "success"} queryKeys={["saved", "deleted", "error"]} />

      {missing > 0 ? (
        <div className="infoBox dangerInfo">{missing} supplier dari batch belum punya alamat retur. Lengkapi dulu supaya resi retur bisa dicetak.</div>
      ) : null}

      <div className="batchManagement">
        {suppliers.map((supplier) => (
          <article className="panel" key={supplier.name}>
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{supplier.batchCount} batch{supplier.returnCount > 0 ? ` / ${supplier.returnCount} unit retur` : ""}</p>
                <h2>{supplier.name}</h2>
              </div>
              <span className={`statusPill ${supplier.id ? "green" : "red"}`}>{supplier.id ? "Alamat lengkap" : "Belum ada alamat"}</span>
            </div>
            {supplier.id ? (
              <p className="bodyText">
                {supplier.recipientName ? <strong>{supplier.recipientName}<br /></strong> : null}
                {supplier.address}
                {supplier.city || supplier.postalCode ? <><br />{[supplier.city, supplier.postalCode].filter(Boolean).join(" ")}</> : null}
                {supplier.phone ? <><br />Telp {supplier.phone}</> : null}
                {supplier.notes ? <><br /><small>{supplier.notes}</small></> : null}
              </p>
            ) : null}
            <div className="buttonRow">
              {supplier.id ? (
                <>
                  <Link className="secondaryButton" href={`/supplier/${supplier.id}/edit`}>Edit</Link>
                  <Link className="secondaryButton" href={`/retur?supplier=${encodeURIComponent(supplier.name)}`}>Buat Resi Retur</Link>
                  {currentUser.role === "admin" ? (
                    <form action={deleteSupplierAction.bind(null, supplier.id)}>
                      <button className="secondaryButton dangerButton" type="submit">Hapus</button>
                    </form>
                  ) : null}
                </>
              ) : (
                <Link className="primaryButton" href={`/supplier/new?name=${encodeURIComponent(supplier.name)}`}>Isi Alamat</Link>
              )}
            </div>
          </article>
        ))}
        {suppliers.length === 0 ? <div className="emptyState">Belum ada supplier.</div> : null}
      </div>
    </section>
  );
}
