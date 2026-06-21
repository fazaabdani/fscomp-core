import Link from "next/link";
import { UserPlus } from "lucide-react";
import { registerUserAction } from "./actions";

export default function RegisterPage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  const message =
    searchParams?.error === "duplicate"
      ? "Username atau email sudah dipakai. Pilih username lain."
      : searchParams?.error === "required"
        ? "Nama, username, dan password wajib diisi."
        : searchParams?.error === "invalid-input"
          ? "Data akun belum valid. Username minimal 3 karakter dan password minimal 8 karakter."
        : searchParams?.success === "waiting"
          ? "Pengajuan akun berhasil. Tunggu admin mengaktifkan akun ini."
          : "";

  return (
    <section className="pageStack narrowPage loginShell">
      <div className="sectionTitle loginTitle">
        <div>
          <p className="eyebrow">Daftar Akun</p>
          <h1>Ajukan akses Core FS Comp</h1>
          <p className="bodyText">Akun baru masuk sebagai menunggu ACC. Admin akan mengaktifkan dari dashboard User.</p>
        </div>
      </div>

      {message ? <div className={`infoBox ${searchParams?.error ? "dangerInfo" : ""}`}>{message}</div> : null}

      <form className="panel formGrid loginCard" action={registerUserAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Pengajuan akses</p>
            <h2>Data user</h2>
          </div>
          <UserPlus size={22} />
        </div>
        <label>
          Nama lengkap
          <input name="name" placeholder="Contoh: Raka PKL" required />
        </label>
        <label>
          Username
          <input name="username" placeholder="contoh: raka" required />
        </label>
        <label>
          Password
          <input name="password" type="password" placeholder="Password login" required />
        </label>
        <label>
          Email internal
          <input name="email" placeholder="Opsional, otomatis dibuat bila kosong" />
        </label>
        <label>
          Role yang diajukan
          <select name="role" defaultValue="magang">
            <option value="magang">PKL / Magang</option>
            <option value="teknisi">Teknisi</option>
            <option value="sales">Sales</option>
          </select>
        </label>
        <button className="primaryButton" type="submit">Ajukan Akun</button>
        <Link className="secondaryButton" href="/login">Kembali ke login</Link>
      </form>
    </section>
  );
}
