import { notFound } from "next/navigation";
import { ReceiptDocument } from "@/app/ReceiptDocument";
import { getSaleReceipt } from "@/lib/sale-receipt-data";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({ params }: { params: { id: string } }) {
  const sale = await getSaleReceipt(params.id);
  if (!sale || sale.voidedAt) notFound();
  const publicReceiptUrl = `${process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id"}/nota/${sale.id}`;

  return (
    <section className="pageStack notaPageWrap">
      <ReceiptDocument sale={sale} publicReceiptUrl={publicReceiptUrl} />
    </section>
  );
}
