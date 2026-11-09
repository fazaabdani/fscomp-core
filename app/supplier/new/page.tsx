import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createSupplierAction } from "../actions";
import { SupplierFields, supplierErrorMessage } from "../SupplierForm";

export default async function NewSupplierPage({ searchParams }: { searchParams?: { error?: string; name?: string } }) {
  await requireRole(["admin", "teknisi"]);
  const message = supplierErrorMessage(searchParams?.error);
  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/supplier"><ArrowLeft size={16} /> Kembali ke Supplier</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Supplier</p>
          <h1>Tambah supplier</h1>
        </div>
      </div>
      {message ? <div className="infoBox dangerInfo">{message}</div> : null}
      <form className="panel formGrid" action={createSupplierAction}>
        <SupplierFields defaults={{ name: searchParams?.name }} />
        <button className="primaryButton" type="submit">Simpan Supplier</button>
      </form>
    </section>
  );
}
