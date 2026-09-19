import { MessageSquareQuote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FlashNotice } from "../FlashNotice";
import { createTestimonialAction, deleteTestimonialAction, togglePublishedAction } from "./actions";
import { DeleteTestimonialButton } from "./DeleteTestimonialButton";

export default async function TestimoniPage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  await requireRole(["admin"]);
  const testimonials = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });

  const message =
    searchParams?.success === "testimonial-added"
      ? "Testimoni berhasil ditambahkan."
      : searchParams?.success === "testimonial-updated"
        ? "Status testimoni berhasil diperbarui."
        : searchParams?.success === "testimonial-deleted"
          ? "Testimoni berhasil dihapus."
          : "";
  const errorMessage = searchParams?.error === "invalid-input" ? "Data belum valid. Isi nama, rating, dan testimoni dengan benar." : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Katalog</p>
          <h1>Testimoni pembeli</h1>
          <p className="bodyText">Testimoni yang aktif akan tampil di katalog publik untuk membangun kepercayaan calon pembeli. Isi dengan testimoni nyata dari pembeli, bukan karangan.</p>
        </div>
        <MessageSquareQuote size={30} />
      </div>

      <FlashNotice message={message} tone="success" queryKeys={["success"]} />
      <FlashNotice message={errorMessage} tone="error" queryKeys={["error"]} />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Tambah</p>
            <h2>Testimoni baru</h2>
          </div>
        </div>
        <form className="formGrid" action={createTestimonialAction}>
          <div className="numberGrid">
            <label>Nama pembeli
              <input name="buyerName" placeholder="Contoh: Budi, Wiradesa" required maxLength={150} />
            </label>
            <label>Rating
              <select name="rating" defaultValue="5">
                <option value="5">5 - Sangat puas</option>
                <option value="4">4 - Puas</option>
                <option value="3">3 - Cukup</option>
                <option value="2">2 - Kurang</option>
                <option value="1">1 - Tidak puas</option>
              </select>
            </label>
          </div>
          <label>Isi testimoni
            <textarea name="quote" placeholder="Contoh: Laptopnya masih bagus, sesuai deskripsi, admin fast response." required maxLength={600} />
          </label>
          <button className="primaryButton" type="submit">Tambah Testimoni</button>
        </form>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Daftar</p>
            <h2>{testimonials.length} testimoni tersimpan</h2>
          </div>
        </div>
        {testimonials.length === 0 ? (
          <div className="emptyState">Belum ada testimoni. Tambahkan lewat form di atas.</div>
        ) : (
          <div className="listStack">
            {testimonials.map((testimonial) => (
              <div className="note" key={testimonial.id}>
                <strong>{testimonial.buyerName}</strong>
                <div className="miniMetrics">
                  <span>{"★".repeat(testimonial.rating)}{"☆".repeat(5 - testimonial.rating)}</span>
                  <span className={`statusPill ${testimonial.published ? "green" : "yellow"}`}>{testimonial.published ? "Tampil di katalog" : "Disembunyikan"}</span>
                </div>
                <p>{testimonial.quote}</p>
                <div className="buttonRow noMargin">
                  <form action={togglePublishedAction.bind(null, testimonial.id)}>
                    <input type="hidden" name="published" value={(!testimonial.published).toString()} />
                    <button className="secondaryButton compactButton" type="submit">
                      {testimonial.published ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </form>
                  <form action={deleteTestimonialAction.bind(null, testimonial.id)}>
                    <DeleteTestimonialButton buyerName={testimonial.buyerName} />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
