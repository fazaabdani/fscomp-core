import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserCog } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { roleFromDb } from "@/lib/user-store";
import { updateUserAction } from "../../actions";

export default async function EditUserPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string } }) {
  requireRole(["admin"]);
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  const errorMessage =
    searchParams?.error === "duplicate"
      ? "Username atau email sudah dipakai user lain."
      : searchParams?.error === "required"
        ? "Nama dan username wajib diisi."
        : searchParams?.error === "last-admin"
          ? "Admin aktif terakhir tidak boleh dinonaktifkan."
          : "";

  return (
    <section className="pageStack">
      <Link className="backLink" href="/users"><ArrowLeft size={16} /> Kembali ke User</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Edit User</p>
          <h1>{user.name}</h1>
        </div>
        <UserCog size={28} />
      </div>

      <form className="panel formGrid" action={updateUserAction.bind(null, user.id)}>
        {errorMessage ? <div className="infoBox dangerInfo">{errorMessage}</div> : null}
        <div className="numberGrid">
          <label>Nama<input name="name" defaultValue={user.name} required /></label>
          <label>Username<input name="username" defaultValue={user.username ?? ""} required /></label>
        </div>
        <div className="numberGrid">
          <label>Password baru<input name="password" type="password" placeholder="Kosongkan jika tidak diganti" /></label>
          <label>Email internal<input name="email" defaultValue={user.email} /></label>
        </div>
        <div className="numberGrid">
          <label>Role
            <select name="role" defaultValue={roleFromDb(user.role)}>
              <option value="admin">Admin</option>
              <option value="teknisi">Teknisi</option>
              <option value="magang">PKL / Magang</option>
            </select>
          </label>
          <label className="checkLine">
            <input name="active" type="checkbox" defaultChecked={user.active} />
            User aktif
          </label>
        </div>
        <button className="primaryButton" type="submit">Simpan User</button>
      </form>
    </section>
  );
}
