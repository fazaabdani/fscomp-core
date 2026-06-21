"use client";

import { TriangleAlert } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="pageStack narrowPage">
      <div className="panel formGrid">
        <TriangleAlert size={30} />
        <h1>Halaman belum dapat dimuat</h1>
        <p className="bodyText">Data Anda tidak diubah. Coba muat ulang halaman ini; jika tetap gagal, periksa koneksi database di Coolify.</p>
        <button className="primaryButton" onClick={reset} type="button">Coba Lagi</button>
      </div>
    </section>
  );
}
