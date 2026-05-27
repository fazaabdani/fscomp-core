import { Clock3, LogIn, LogOut, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrCreateDbUserForSession } from "@/lib/user-store";
import { checkInAction, checkOutAction } from "./actions";

function formatTime(date?: Date | null) {
  if (!date) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export default async function AttendancePage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  const currentUser = requireRole(["admin", "teknisi", "magang"]);
  const dbUser = await getOrCreateDbUserForSession(currentUser);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const [myToday, latestRecords, todayAll] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        userId: dbUser.id,
        checkInAt: { gte: todayStart, lte: todayEnd }
      },
      orderBy: { checkInAt: "desc" }
    }),
    prisma.attendance.findMany({
      where: currentUser.role === "admin" ? {} : { userId: dbUser.id },
      include: { user: true },
      orderBy: { checkInAt: "desc" },
      take: 30
    }),
    prisma.attendance.findMany({
      where: { checkInAt: { gte: todayStart, lte: todayEnd } },
      include: { user: true },
      orderBy: { checkInAt: "asc" }
    })
  ]);

  const isOpen = Boolean(myToday && !myToday.checkOutAt);
  const message =
    searchParams?.error === "already-in"
      ? "Absensi masuk hari ini masih aktif. Pulang dulu kalau shift sudah selesai."
      : searchParams?.error === "no-open-attendance"
        ? "Belum ada absensi masuk aktif untuk hari ini."
        : searchParams?.success === "check-in"
          ? "Absensi masuk berhasil dicatat."
          : searchParams?.success === "check-out"
            ? "Absensi pulang berhasil dicatat."
            : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Absensi</p>
          <h1>Catat kehadiran tim FS Comp</h1>
          <p className="bodyText">User cukup klik masuk dan pulang. Admin bisa melihat rekap semua user.</p>
        </div>
        <Clock3 size={28} />
      </div>

      {message ? <div className={`infoBox ${searchParams?.error ? "dangerInfo" : ""}`}>{message}</div> : null}

      <section className="statsGrid">
        <article className="statCard">
          <Clock3 size={17} />
          <span>Status saya</span>
          <strong>{isOpen ? "Sedang masuk" : myToday ? "Sudah pulang" : "Belum absen"}</strong>
        </article>
        <article className="statCard">
          <LogIn size={17} />
          <span>Jam masuk</span>
          <strong>{formatTime(myToday?.checkInAt)}</strong>
        </article>
        <article className="statCard">
          <LogOut size={17} />
          <span>Jam pulang</span>
          <strong>{formatTime(myToday?.checkOutAt)}</strong>
        </article>
        <article className="statCard">
          <UsersRound size={17} />
          <span>Hadir hari ini</span>
          <strong>{todayAll.length}</strong>
        </article>
      </section>

      <div className="twoColumn">
        <form className="panel formGrid" action={isOpen ? checkOutAction : checkInAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{isOpen ? "Check out" : "Check in"}</p>
              <h2>{isOpen ? "Catat pulang" : "Catat masuk"}</h2>
            </div>
            {isOpen ? <LogOut size={22} /> : <LogIn size={22} />}
          </div>
          <label>Catatan opsional
            <textarea name="note" placeholder="Contoh: masuk shift sore, izin keluar beli sparepart, dll." />
          </label>
          <button className="primaryButton" type="submit">{isOpen ? "Pulang Sekarang" : "Masuk Sekarang"}</button>
        </form>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Hari ini</p>
              <h2>Tim yang sudah absen</h2>
            </div>
            <UsersRound size={22} />
          </div>
          <div className="listStack">
            {todayAll.length === 0 ? <div className="emptyState">Belum ada absensi hari ini.</div> : todayAll.map((record) => (
              <div className="unitListItem" key={record.id}>
                <div>
                  <strong>{record.user.name}</strong>
                  <small>{formatTime(record.checkInAt)} - {formatTime(record.checkOutAt)}</small>
                </div>
                <span className={`statusPill ${record.checkOutAt ? "green" : "yellow"}`}>{record.checkOutAt ? "Selesai" : "Aktif"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat</p>
            <h2>{currentUser.role === "admin" ? "Absensi terbaru semua user" : "Absensi terbaru saya"}</h2>
          </div>
          <Clock3 size={22} />
        </div>
        <div className="tableScroll">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {latestRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.checkInAt)}</td>
                  <td>{record.user.name}</td>
                  <td>{formatTime(record.checkInAt)}</td>
                  <td>{formatTime(record.checkOutAt)}</td>
                  <td>{record.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
