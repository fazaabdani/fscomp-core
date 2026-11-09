import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updateSupplierAction } from "../../actions";
import { SupplierFields, supplierErrorMessage } from "../../SupplierForm";

export default async function EditSupplierPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string } }) {
  await requireRole(["admin", "teknisi"]);
  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) notFound();
  const message = supplierErrorMessage(searchParams?.error);
  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/supplier"><ArrowLeft size={16} /> Kembali ke Supplier</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Edit supplier</p>
          <h1>{supplier.name}</h1>
        </div>
      </div>
      {message ? <div className="infoBox dangerInfo">{message}</div> : null}
      <form className="panel formGrid" action={updateSupplierAction.bind(null, supplier.id)}>
        <SupplierFields defaults={{
          name: supplier.name,
          recipientName: supplier.recipientName ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address,
          city: supplier.city ?? "",
          postalCode: supplier.postalCode ?? "",
          notes: supplier.notes ?? ""
        }} />
        <button className="primaryButton" type="submit">Simpan Perubahan</button>
      </form>
    </section>
  );
}
