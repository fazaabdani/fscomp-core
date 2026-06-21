import Link from "next/link";
import { Download, Edit3, ShieldCheck, Upload, UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ensureDefaultLoginUsers, roleFromDb } from "@/lib/user-store";
import { activateUserAction, createUserAction, deactivateUserAction, importUsersCsvAction } from "./actions";

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "teknisi") return "Teknisi";
  if (role === "sales") return "Sales";
  return "PKL / Magang";
}

export default async function UsersPage({ searchParams }: { searchParams?: { error?: string; success?: string; count?: string } }) {
  requireRole(["admin"]);
  await ensureDefaultLoginUsers();
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] });

  const message =
    searchParams?.error === "duplicate"
      ? "Username atau email sudah dipakai user lain."
        : searchParams?.error === "required"
          ? "Nama, username, dan password wajib diisi."
        : searchParams?.error === "invalid-input"
          ? "Data user belum valid. Periksa username, password, email, dan role."
        : searchParams?.error === "last-admin"
          ? "Admin aktif terakhir tidak boleh dinonaktifkan."
          : searchParams?.error === "password-required"
            ? "User aktif wajib punya username dan password. Edit user lalu isi password."
            : searchParams?.error === "csv-required"
              ? "Pilih file CSV user terlebih dahulu."
              : searchParams?.error === "csv-empty"
                ? "CSV kosong atau tidak ada data user."
                : searchParams?.success
                  ? searchParams.success === "activated"
                    ? "Akun sudah diaktifkan dan bisa login."
                    : searchParams.success === "imported"
                      ? `${searchParams.count ?? "0"} baris user berhasil diproses dari CSV.`
                      : "Data user berhasil disimpan."
                  : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Manajemen User</p>
          <h1>Kelola akses Core FS Comp</h1>
          <p className="bodyText">Admin bisa menambahkan, mengedit, dan menonaktifkan user tanpa menghapus riwayat kerja.</p>
        </div>
        <div className="buttonRow noMargin">
          <a className="secondaryButton" href="/api/users/export"><Download size={16} /> Export User</a>
          <ShieldCheck size={28} />
        </div>
      </div>

      {message ? <div className={`infoBox ${searchParams?.error ? "dangerInfo" : ""}`}>{message}</div> : null}

      <form className="panel formGrid" action={createUserAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Tambah akses</p>
            <h2>User baru</h2>
          </div>
          <UserPlus size={22} />
        </div>
        <div className="numberGrid">
          <label>Nama<input name="name" placeholder="Nama user" required /></label>
          <label>Username<input name="username" placeholder="contoh: zume / pkl2" required /></label>
        </div>
        <div className="numberGrid">
          <label>Password<input name="password" type="password" placeholder="Password login" required /></label>
          <label>Email internal<input name="email" placeholder="Opsional, otomatis dibuat bila kosong" /></label>
        </div>
        <label>Role
          <select name="role" defaultValue="magang">
            <option value="admin">Admin</option>
            <option value="teknisi">Teknisi</option>
            <option value="sales">Sales</option>
            <option value="magang">PKL / Magang</option>
          </select>
        </label>
        <button className="primaryButton" type="submit">Tambah User</button>
      </form>

      <form className="panel formGrid" action={importUsersCsvAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Import CSV</p>
            <h2>Update username dan password</h2>
          </div>
          <Upload size={22} />
        </div>
        <div className="infoBox">
          Upload CSV dari tombol Export User. Password kosong tidak akan menghapus password lama, dan baris user baru tanpa password akan dilewati.
        </div>
        <div className="buttonRow">
          <input name="csvFile" type="file" accept=".csv,text/csv" required />
          <button className="primaryButton" type="submit"><Upload size={16} /> Import CSV</button>
        </div>
      </form>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Daftar user</p>
            <h2>Akun aktif dan nonaktif</h2>
          </div>
          <Users size={22} />
        </div>
        <div className="tableScroll">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const role = roleFromDb(user.role);
                return (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong><br /><small>{user.email}</small></td>
                    <td>{user.username ?? "-"}</td>
                    <td>{roleLabel(role)}</td>
                    <td><span className={`statusPill ${user.active ? "green" : "red"}`}>{user.active ? "Aktif" : "Menunggu ACC"}</span></td>
                    <td>
                      <div className="buttonRow">
                        <Link className="secondaryButton" href={`/users/${user.id}/edit`}><Edit3 size={15} /> Edit</Link>
                        {user.active ? (
                          <form action={deactivateUserAction.bind(null, user.id)}>
                            <button className="secondaryButton dangerButton" type="submit">Nonaktifkan</button>
                          </form>
                        ) : (
                          <form action={activateUserAction.bind(null, user.id)}>
                            <button className="primaryButton" type="submit">ACC / Aktifkan</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
