import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { loginAction, logoutAction } from "./actions";

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  const currentUser = getCurrentUser();

  return (
    <section className="pageStack narrowPage loginShell">
      <div className="sectionTitle loginTitle">
        <div>
          <p className="eyebrow">Login User</p>
          <h1>Masuk sesuai role kerja</h1>
          <p className="bodyText">Akses internal FS Comp Core untuk operasional unit, batch, dan QC.</p>
        </div>
      </div>

      {currentUser ? (
        <form className="panel formGrid loginCard" action={logoutAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Sedang login</p>
              <h2>{currentUser.name}</h2>
            </div>
            <LockKeyhole size={22} />
          </div>
          <p className="bodyText">Role aktif: {currentUser.role}. Logout kalau mau ganti user.</p>
          <button className="secondaryButton" type="submit">Logout</button>
        </form>
      ) : (
      <form className="panel formGrid loginCard" action={loginAction}>
        {searchParams?.error === "login" ? <div className="infoBox dangerInfo">Username atau password salah, atau user sedang nonaktif.</div> : null}
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Akses internal</p>
            <h2>Admin, teknisi, sales, atau magang</h2>
          </div>
          <LockKeyhole size={22} />
        </div>
        <label>
          Username
          <input name="username" placeholder="faza / zume / ludfy / rosyadi / sales" required />
        </label>
        <label>
          Password
          <input name="password" type="password" placeholder="Masukkan password" required />
        </label>
        <button className="primaryButton" type="submit">Login</button>
        <Link className="secondaryButton" href="/register">Daftar akun baru</Link>
      </form>
      )}
    </section>
  );
}
