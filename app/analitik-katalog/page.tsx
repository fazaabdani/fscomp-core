import Link from "next/link";
import { ArrowLeft, BarChart3, Eye, Lightbulb, MessageCircle, Search, Users } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getCatalogAnalytics, parsePeriod, PERIOD_OPTIONS } from "@/lib/catalog-analytics-data";
import { requireRole } from "@/lib/session";
import "./analitik.css";

export const dynamic = "force-dynamic";

const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "-");
const width = (value: number, max: number) => `${max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0}%`;
const wib = (date: Date) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date);
const FILTER_LABELS: Record<string, string> = { lokasi: "Lokasi", merek: "Merek", processor: "Processor", ram: "RAM", storage: "SSD", windows: "Windows", touchscreen: "Touchscreen", harga: "Rentang harga" };

function describeFilters(raw: string | null) {
  if (!raw) return "-";
  try {
    return Object.entries(JSON.parse(raw) as Record<string, string>).map(([key, value]) => `${FILTER_LABELS[key] ?? key}: ${value}`).join(", ") || "-";
  } catch {
    return "-";
  }
}

// Dashboard analitik katalog publik (khusus admin). Data first-party, tanpa data pribadi; bot, staf login, dan
// pengunjung dengan Do-Not-Track tidak dihitung.
export default async function CatalogAnalyticsPage({ searchParams }: { searchParams?: { hari?: string } }) {
  await requireRole(["admin"]);
  const days = parsePeriod(searchParams?.hari);
  const data = await getCatalogAnalytics(days);
  const t = data.totals;
  const hasData = data.eventCount > 0 && t.sessions > 0;

  const maxVisitors = Math.max(1, ...data.daily.map((row) => row.visitors));
  const maxHour = Math.max(1, ...data.hours.map((row) => row.sessions));
  const bestHour = data.hours.length ? [...data.hours].sort((a, b) => b.sessions - a.sessions)[0] : null;
  const readyTopUnits = data.topUnits.filter((row) => row.unit && !row.unit.soldAt);
  const interestedNoChat = readyTopUnits.filter((row) => row.views >= 8 && row.wa === 0).slice(0, 4);
  const hot = readyTopUnits.filter((row) => row.wa >= 2).slice(0, 4);
  const soldWithViews = data.sold.filter((row) => row.views > 0);
  const soldNoViews = data.sold.length - soldWithViews.length;
  const avgViewsBeforeSale = soldWithViews.length ? soldWithViews.reduce((sum, row) => sum + row.views, 0) / soldWithViews.length : 0;
  const unserved = data.zeroResults.slice(0, 3);

  const insights: string[] = [];
  if (hasData) {
    if (t.sessions_unit > 0) insights.push(`Dari ${t.sessions} sesi, ${t.sessions_unit} (${pct(t.sessions_unit, t.sessions)}) membuka detail unit dan ${t.sessions_wa} (${pct(t.sessions_wa, t.sessions)}) mengklik WhatsApp.`);
    if (t.sessions_unit >= 20 && t.sessions_wa / Math.max(1, t.sessions_unit) < 0.1) insights.push("Banyak yang membuka detail unit tapi sedikit yang chat. Cek kejelasan harga, foto, dan garansi di halaman detail, atau tombol WhatsApp yang kurang menonjol.");
    if (bestHour) insights.push(`Jam paling ramai pengunjung: sekitar ${String(bestHour.h).padStart(2, "0")}.00 WIB. Pastikan admin siap membalas chat pada jam itu.`);
    for (const row of interestedNoChat) insights.push(`Unit ${row.unit?.nomorUnit} ${row.unit?.model} dilihat ${row.views} sesi tapi belum ada yang chat. Coba tinjau harga (${formatRupiah(row.unit?.hargaJualRekomendasi ?? 0)}), foto, atau deskripsinya.`);
    for (const row of hot) insights.push(`Unit ${row.unit?.nomorUnit} ${row.unit?.model} sudah ${row.wa}x ditanyakan lewat WhatsApp. Peminatnya banyak, pertimbangkan harga tidak diturunkan.`);
    for (const row of unserved) insights.push(`Pengunjung mencari "${row.q}"${row.filters ? ` (${describeFilters(row.filters)})` : ""} sebanyak ${row.c}x dan tidak menemukan hasil. Ini permintaan yang belum terlayani, dan bahan pertimbangan saat belanja stok.`);
    if (soldNoViews > 0 && data.sold.length >= 5) insights.push(`${soldNoViews} dari ${data.sold.length} unit yang terjual belum tercatat pernah dilihat di katalog online (data baru mulai ${data.dataSince ? wib(data.dataSince) : "-"}, atau pembeli datang langsung dan lewat chat).`);
  }

  return (
    <section className="pageStack analitikPage">
      <div className="sectionTitle">
        <div>
          <Link className="backLink" href="/"><ArrowLeft size={16} /> Kembali</Link>
          <p className="eyebrow">Khusus admin</p>
          <h1>Analitik Katalog</h1>
          <p className="bodyText">Perilaku pengunjung publik di katalog dan halaman detail unit. Tidak menyimpan IP, nama, atau nomor HP; bot, staf yang login, dan pengunjung dengan Do-Not-Track tidak dihitung.</p>
        </div>
        <BarChart3 size={34} />
      </div>

      <div className="analitikPeriods">
        {PERIOD_OPTIONS.map((option) => (
          <Link key={option} className={`sortPill ${option === days ? "active" : ""}`} href={`/analitik-katalog?hari=${option}`}>{option} hari</Link>
        ))}
        <small>{data.dataSince ? `Data tercatat sejak ${wib(data.dataSince)}` : "Belum ada data tercatat"}</small>
      </div>

      {!hasData ? (
        <div className="infoBox">Belum ada kunjungan publik tercatat pada periode ini. Pencatatan baru berjalan setelah fitur ini di-deploy; kunjungan Anda sendiri saat login tidak dihitung, jadi uji dengan jendela incognito.</div>
      ) : (
        <>
          <div className="statsGrid">
            <div className="metric metric-blue"><Users size={21} /><span>Pengunjung unik</span><strong>{t.visitors}</strong></div>
            <div className="metric metric-cyan"><Eye size={21} /><span>Halaman dilihat</span><strong>{t.pageviews}</strong></div>
            <div className="metric metric-green"><MessageCircle size={21} /><span>Klik WhatsApp</span><strong>{t.wa_clicks}</strong></div>
            <div className="metric metric-blue"><span>Sesi yang chat</span><strong>{pct(t.sessions_wa, t.sessions)}</strong></div>
          </div>

          <section className="panel">
            <div className="panelHeader"><div><p className="eyebrow">Corong</p><h2>Dari kunjungan sampai chat</h2></div></div>
            <div className="analitikFunnel">
              {[
                ["Sesi kunjungan", t.sessions],
                ["Membuka detail unit", t.sessions_unit],
                ["Klik WhatsApp", t.sessions_wa]
              ].map(([label, value]) => (
                <div key={String(label)} className="analitikBarRow">
                  <span>{label}</span>
                  <div className="analitikBar"><i style={{ width: width(Number(value), Number(t.sessions)) }} /></div>
                  <strong>{value} <small>({pct(Number(value), Number(t.sessions))})</small></strong>
                </div>
              ))}
            </div>
            <small className="formHint">Pengunjung kembali (datang di lebih dari satu sesi): {t.returning_visitors}.</small>
          </section>

          {insights.length > 0 ? (
            <section className="panel">
              <div className="panelHeader"><div><p className="eyebrow">Insight otomatis</p><h2>Yang perlu ditindaklanjuti</h2></div><Lightbulb size={22} /></div>
              <ul className="analitikInsights">{insights.map((text) => <li key={text}>{text}</li>)}</ul>
            </section>
          ) : null}

          <section className="panel">
            <div className="panelHeader"><div><p className="eyebrow">Unit</p><h2>Unit paling diminati</h2></div></div>
            <div className="tableScroll">
              <table className="dataTable">
                <thead><tr><th>Unit</th><th>Dilihat (sesi)</th><th>Klik WA</th><th>Dilihat → WA</th><th>Status</th></tr></thead>
                <tbody>
                  {data.topUnits.map((row) => (
                    <tr key={row.unitId}>
                      <td>{row.unit ? <Link href={`/unit/${row.unit.id}`}><strong>{row.unit.nomorUnit} - {row.unit.model}</strong></Link> : <small>(unit dihapus)</small>}{row.unit ? <><br /><small>{formatRupiah(row.unit.hargaJualRekomendasi)} / {row.unit.stockLocation === "KAJEN" ? "Kajen" : "Wiradesa"}</small></> : null}</td>
                      <td>{row.views}</td>
                      <td>{row.wa}</td>
                      <td>{pct(row.wa, row.views)}</td>
                      <td>{row.unit?.soldAt ? <span className="statusPill yellow">Terjual</span> : <span className="statusPill green">Ready</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="analitikTwoCol">
            <section className="panel">
              <div className="panelHeader"><div><p className="eyebrow">Permintaan</p><h2>Apa yang dicari pengunjung</h2></div><Search size={22} /></div>
              {data.queries.length === 0 ? <div className="emptyState">Belum ada pencarian teks.</div> : (
                <table className="dataTable">
                  <thead><tr><th>Kata kunci</th><th>Dicari</th><th>Rata-rata hasil</th></tr></thead>
                  <tbody>{data.queries.map((row) => <tr key={row.query}><td>{row.query}</td><td>{row.c}</td><td>{row.avg_results ?? "-"}{row.zero > 0 ? <> <span className="statusPill red">{row.zero}x kosong</span></> : null}</td></tr>)}</tbody>
                </table>
              )}
              <h3 className="analitikSubhead">Dicari tapi tidak ada hasilnya</h3>
              {data.zeroResults.length === 0 ? <small className="formHint">Belum ada pencarian yang berakhir kosong.</small> : (
                <table className="dataTable">
                  <thead><tr><th>Pencarian</th><th>Filter</th><th>Kali</th></tr></thead>
                  <tbody>{data.zeroResults.map((row) => <tr key={`${row.q}-${row.filters}`}><td>{row.q}</td><td><small>{describeFilters(row.filters)}</small></td><td>{row.c}</td></tr>)}</tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <div className="panelHeader"><div><p className="eyebrow">Filter</p><h2>Spesifikasi yang sering dipilih</h2></div></div>
              <div className="analitikFilters">
                {Object.entries(data.filterPopularity).map(([key, rows]) => rows.length === 0 ? null : (
                  <div key={key}>
                    <strong>{FILTER_LABELS[key] ?? key}</strong>
                    <ul>{rows.map((row) => <li key={row.value}><span>{row.value}</span><b>{row.c}</b></li>)}</ul>
                  </div>
                ))}
              </div>
              {Object.values(data.filterPopularity).every((rows) => rows.length === 0) ? <div className="emptyState">Belum ada filter yang dipakai.</div> : null}
            </section>
          </div>

          <div className="analitikTwoCol">
            <section className="panel">
              <div className="panelHeader"><div><p className="eyebrow">Sumber</p><h2>Dari mana pengunjung datang</h2></div></div>
              <table className="dataTable">
                <thead><tr><th>Sumber / medium</th><th>Sesi</th><th>Chat WA</th></tr></thead>
                <tbody>{data.sources.map((row) => <tr key={`${row.source}-${row.medium}`}><td>{row.source} <small>/ {row.medium}</small></td><td>{row.sessions}</td><td>{row.wa} <small>({pct(row.wa, row.sessions)})</small></td></tr>)}</tbody>
              </table>
              <small className="formHint">Beri tautan di Instagram, TikTok, dan WhatsApp parameter UTM (mis. ?utm_source=instagram&amp;utm_medium=bio) supaya sumbernya terpisah dari "(direct)".</small>
              <h3 className="analitikSubhead">Perangkat</h3>
              <table className="dataTable">
                <thead><tr><th>Perangkat</th><th>Sesi</th><th>Chat WA</th></tr></thead>
                <tbody>{data.devices.map((row) => <tr key={row.device}><td>{row.device}</td><td>{row.sessions}</td><td>{row.wa} <small>({pct(row.wa, row.sessions)})</small></td></tr>)}</tbody>
              </table>
            </section>

            <section className="panel">
              <div className="panelHeader"><div><p className="eyebrow">Waktu</p><h2>Jam paling ramai (WIB)</h2></div></div>
              <div className="analitikHours">
                {data.hours.map((row) => (
                  <div key={row.h} className="analitikBarRow compact">
                    <span>{String(row.h).padStart(2, "0")}.00</span>
                    <div className="analitikBar"><i style={{ width: width(row.sessions, maxHour) }} /></div>
                    <strong>{row.sessions}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panelHeader"><div><p className="eyebrow">Harian</p><h2>Pengunjung dan klik WhatsApp per hari</h2></div></div>
            <div className="analitikHours">
              {data.daily.map((row) => (
                <div key={row.d} className="analitikBarRow compact">
                  <span>{row.d.slice(5)}</span>
                  <div className="analitikBar"><i style={{ width: width(row.visitors, maxVisitors) }} /></div>
                  <strong>{row.visitors} <small>/ {row.wa} WA</small></strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panelHeader"><div><p className="eyebrow">Penjualan</p><h2>Unit terjual pada periode ini</h2></div></div>
            <p className="bodyText">
              {data.sold.length} unit terjual. Rata-rata dilihat {avgViewsBeforeSale ? avgViewsBeforeSale.toFixed(1).replace(".", ",") : "-"} sesi sebelum terjual (hanya unit yang tercatat dilihat). Angka lebih rendah dari kenyataan sebelum {data.dataSince ? wib(data.dataSince) : "pencatatan dimulai"}.
            </p>
            <div className="tableScroll">
              <table className="dataTable">
                <thead><tr><th>Unit</th><th>Terjual</th><th>Lama di stok</th><th>Dilihat</th><th>Klik WA</th></tr></thead>
                <tbody>
                  {data.sold.slice(0, 25).map((row) => (
                    <tr key={row.id}>
                      <td><Link href={`/unit/${row.id}`}>{row.nomorUnit} - {row.model}</Link></td>
                      <td>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" }).format(row.soldAt)}</td>
                      <td>{row.daysListed === null ? "-" : `${row.daysListed} hari`}</td>
                      <td>{row.views}</td>
                      <td>{row.wa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
