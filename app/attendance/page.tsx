import { Clock3, Download, LogIn, LogOut, UsersRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrCreateDbUserForSession } from "@/lib/user-store";
import { AttendanceCapture } from "./AttendanceCapture";
import { checkInAction, checkOutAction } from "./actions";

function formatTime(date?: Date | null) {
  if (!date) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

function todayJakartaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function startOfToday() {
  return new Date(`${todayJakartaDateString()}T00:00:00+07:00`);
}

function endOfToday() {
  return new Date(`${todayJakartaDateString()}T23:59:59.999+07:00`);
}

function exportUrl(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/api/attendance/export?${query}` : "/api/attendance/export";
}

export default async function AttendancePage({ searchParams }: { searchParams?: { error?: string; success?: string; from?: string; to?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales", "magang"]);
  const dbUser = await getOrCreateDbUserForSession(currentUser);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const canSeeAttendanceDetail = currentUser.role === "admin";

  const [myToday, latestRecords, todayAll] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        userId: dbUser.id,
        checkInAt: { gte: todayStart, lte: todayEnd }
      },
      orderBy: { checkInAt: "desc" }
    }),
    prisma.attendance.findMany({
      where: canSeeAttendanceDetail ? {} : { userId: dbUser.id },
      include: { user: true },
      orderBy: { checkInAt: "desc" },
      take: 30
    }),
    canSeeAttendanceDetail
      ? prisma.attendance.findMany({
          where: { checkInAt: { gte: todayStart, lte: todayEnd } },
          include: { user: true },
          orderBy: { checkInAt: "asc" }
        })
      : prisma.attendance.findMany({
          where: { userId: dbUser.id, checkInAt: { gte: todayStart, lte: todayEnd } },
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
        : searchParams?.error === "photo-location-required"
          ? "Foto dan koordinat wajib diambil sebelum absen masuk."
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

      {canSeeAttendanceDetail ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Export admin</p>
              <h2>Tarik rekap absensi CSV</h2>
            </div>
            <Download size={22} />
          </div>
          <form className="formGrid" action="/attendance">
            <div className="numberGrid">
              <label>Dari tanggal
                <input type="date" name="from" defaultValue={searchParams?.from ?? todayJakartaDateString()} />
              </label>
              <label>Sampai tanggal
                <input type="date" name="to" defaultValue={searchParams?.to ?? todayJakartaDateString()} />
              </label>
            </div>
            <div className="buttonRow noMargin">
              <button className="secondaryButton" type="submit">Set tanggal</button>
              <a className="primaryButton" href={exportUrl(searchParams?.from ?? todayJakartaDateString(), searchParams?.to ?? todayJakartaDateString())}>
                <Download size={16} /> Export rentang ini
              </a>
              <a className="secondaryButton" href={exportUrl(todayJakartaDateString(), todayJakartaDateString())}>Export hari ini</a>
              <a className="secondaryButton" href={exportUrl()}>Export semua</a>
            </div>
          </form>
        </section>
      ) : null}

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
          <span>{canSeeAttendanceDetail ? "Hadir hari ini" : "Absensi saya"}</span>
          <strong>{canSeeAttendanceDetail ? todayAll.length : myToday ? "Tercatat" : "Belum"}</strong>
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
          {!isOpen ? <AttendanceCapture /> : null}
          {!isOpen ? <small className="formHint">Wajib ambil foto dan lokasi sebelum klik Masuk Sekarang.</small> : null}
          <label>Catatan opsional
            <textarea name="note" placeholder="Contoh: masuk shift sore, izin keluar beli sparepart, dll." />
          </label>
          <button className="primaryButton" type="submit">{isOpen ? "Pulang Sekarang" : "Masuk Sekarang"}</button>
        </form>

        {canSeeAttendanceDetail ? <section className="panel">
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
                  {record.latitude && record.longitude ? <small>{record.latitude.toFixed(5)}, {record.longitude.toFixed(5)} / akurasi {Math.round(record.accuracy ?? 0)} m</small> : null}
                </div>
                <span className={`statusPill ${record.checkOutAt ? "green" : "yellow"}`}>{record.checkOutAt ? "Selesai" : "Aktif"}</span>
              </div>
            ))}
          </div>
        </section> : (
          <section className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Hari ini</p>
                <h2>Absensi saya</h2>
              </div>
              <UsersRound size={22} />
            </div>
            <div className="emptyState">Detail daftar absensi tim hanya bisa dilihat admin.</div>
          </section>
        )}
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat</p>
              <h2>{canSeeAttendanceDetail ? "Absensi terbaru semua user" : "Absensi terbaru saya"}</h2>
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
                <th>Foto/Lokasi</th>
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
                  <td>
                    {record.photoDataUrl ? <img className="attendanceThumb" src={record.photoDataUrl} alt={`Absensi ${record.user.name}`} /> : null}
                    {record.latitude && record.longitude ? <small>{record.latitude.toFixed(5)}, {record.longitude.toFixed(5)}</small> : "-"}
                  </td>
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
