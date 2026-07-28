import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Cpu, HardDrive, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { getRelatedCatalogUnits } from "@/lib/catalog-page-data";
import { getUnitForDetail } from "@/lib/db-data";
import { statusTone } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";
import { ShareUnitButton } from "./ShareUnitButton";

export const dynamic = "force-dynamic";

function waLink(unit: { nomorUnit: string; model: string; hargaJualRekomendasi: number }) {
  const text = [
    "Assalamu'alaikum FS Comp.",
    `Saya tertarik dengan Unit ${unit.nomorUnit} - ${unit.model}.`,
    `Harga di katalog: ${formatRupiah(unit.hargaJualRekomendasi)}.`,
    "Apakah unitnya masih ready?"
  ].join("\n");
  return `https://wa.me/62816660056?text=${encodeURIComponent(text)}`;
}

function catalogReturnPath(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/katalog";

  try {
    const parsed = new URL(raw, "https://core.fscomp.id");
    if (parsed.origin !== "https://core.fscomp.id" || parsed.pathname !== "/katalog") return "/katalog";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/katalog";
  }
}

export default async function UnitDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { from?: string | string[] } }) {
  const unit = await getUnitForDetail(params.id);
  if (!unit) notFound();

  const currentUser = getCurrentUser();
  const isInternalUser = Boolean(currentUser);
  const relatedUnits = isInternalUser ? [] : await getRelatedCatalogUnits(unit.id);
  const dailyHistory = unit.dailyHistory;
  const qcAwal = unit.qcAwal;
  const visibleHardware = qcAwal
    ? Object.entries(qcAwal.hardware).filter(([key]) => isInternalUser || key !== "Seri SSD")
    : [];
  const latestDaily = dailyHistory[0];
  const publicWindows = latestDaily?.windowsVersion ?? qcAwal?.software.Windows ?? "-";
  const publicWaLink = waLink(unit);
  const catalogReturnHref = catalogReturnPath(searchParams?.from);

  if (!isInternalUser) {
    return (
      <section className="pageStack publicUnitPage">
        <Link className="backLink" href={catalogReturnHref}>
          <ArrowLeft size={16} /> Kembali ke Katalog Lengkap
        </Link>

        <div className="unitHero">
          <div>
            <p className="eyebrow">Katalog FS Comp</p>
            <h1>{unit.model}</h1>
            <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
          </div>
          <div className="unitHeroActions">
            <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
            <ShareUnitButton model={unit.model} />
            <a className="primaryButton" href={publicWaLink} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
          </div>
        </div>

        <div className="contentGrid">
          <section className="panel wide">
            <CatalogPhoto
              url={unit.catalogImageUrl}
              className="publicUnitPhoto"
              placeholderClassName="publicUnitPhoto placeholderPhoto"
              alt={`Foto ${unit.model}`}
              priority
              zoomable
              imageWidth={1600}
            />
            {unit.gallery.length > 1 ? (
              <div className="mediaGrid">
                {unit.gallery.map((url) => (
                  <div className="mediaThumb" key={url}>
                    <img src={url} alt={`Foto ${unit.model}`} loading="lazy" />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <aside className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Spek umum</p>
                <h2>Unit siap jual</h2>
              </div>
            </div>
            <div className="detailList">
              <div><Cpu size={16} /> {unit.processor}</div>
              <div><HardDrive size={16} /> {unit.ram} / {unit.ssd}</div>
              <div><CalendarClock size={16} /> {publicWindows}</div>
            </div>
            <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
            <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
            <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
            <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div>
            <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
            <p className="publicUnitUpdated"><CalendarClock size={15} /> Stok &amp; harga diperbarui {unit.updatedAt} WIB</p>
          </aside>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Catatan pembeli</p>
              <h2>QC internal sudah dicek FS Comp</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <p className="bodyText">Detail teknis seperti health SSD, health baterai, seri SSD, dan catatan internal disimpan di sistem FS Comp. Untuk kondisi spesifik unit, silakan tanyakan langsung ke admin sebelum transaksi.</p>
        </section>

        {relatedUnits.length > 0 ? (
          <section className="panel publicRelatedProducts">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Pilihan lainnya</p>
                <h2>Produk serupa yang masih tersedia</h2>
              </div>
            </div>
            <div className="catalogPublicGrid">
              {relatedUnits.map((relatedUnit) => (
                <article className="catalogPublicCard" key={relatedUnit.id}>
                  <CatalogPhoto url={relatedUnit.catalogImageUrl} className="catalogImage" alt={`Foto ${relatedUnit.model}`} imageWidth={720} />
                  <div className="catalogCardTop">
                    <span className="unitNumber">{relatedUnit.nomorUnit}</span>
                    <span className="statusPill green">{relatedUnit.stockLocation}</span>
                  </div>
                  <h3>{relatedUnit.model}</h3>
                  <p>{relatedUnit.processor}</p>
                  <div className="miniMetrics">
                    <span>{relatedUnit.ram}</span>
                    <span>{relatedUnit.ssd}</span>
                  </div>
                  <strong className="catalogPrice">{formatRupiah(relatedUnit.hargaJualRekomendasi)}</strong>
                  <Link className="secondaryButton" href={{ pathname: `/unit/${relatedUnit.id}`, query: { from: catalogReturnHref } }}>Lihat Detail</Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="publicUnitMobileBar printHidden" aria-label="Aksi produk">
          <Link className="secondaryButton" href={catalogReturnHref}><ArrowLeft size={17} /> Katalog</Link>
          <a className="primaryButton" href={publicWaLink} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya via WhatsApp</a>
        </div>
      </section>
    );
  }

  return (
    <section className="pageStack">
      {isInternalUser ? <Link className="backLink" href="/"><ArrowLeft size={16} /> Kembali</Link> : null}

      <div className="unitHero">
        <div>
          <p className="eyebrow">{isInternalUser ? `Unit ${unit.nomorUnit}` : "Hasil pengecekan FS Comp"}</p>
          <h1>{unit.model}</h1>
          <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
        </div>
        <div className="unitHeroActions">
          <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
          {isInternalUser ? <Link className="primaryButton" href={`/label?unit=${unit.id}`}><QrCode size={17} /> Generate Label</Link> : null}
        </div>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Foto produk</p>
            <h2>Tampilan unit untuk katalog</h2>
          </div>
          {isInternalUser ? <Link className="secondaryButton" href={`/unit/${unit.id}/edit`}>Edit Foto</Link> : null}
        </div>
        <CatalogPhoto
          url={unit.catalogImageUrl}
          className="publicUnitPhoto"
          placeholderClassName="publicUnitPhoto placeholderPhoto"
          alt={`Foto ${unit.model}`}
          priority
          zoomable
          imageWidth={1600}
        />
        {unit.gallery.length > 1 ? (
          <div className="mediaGrid">
            {unit.gallery.map((url) => (
              <div className="mediaThumb" key={url}>
                <img src={url} alt={`Foto ${unit.model}`} loading="lazy" />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="contentGrid">
        <section className="panel wide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Data masuk batch</p>
              <h2>Spek inti dari input awal</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="qcColumns">
            <div>
              <h3>Spek dan minus</h3>
              {qcAwal ? visibleHardware.map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">{unit.entryNotes}</p>}
            </div>
            <div>
              <h3>Catatan Windows awal</h3>
              {qcAwal ? Object.entries(qcAwal.software).map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">Keputusan siap jual mengikuti QC harian lengkap terbaru.</p>}
            </div>
          </div>
          <div className="infoBox">
            <strong>Catatan input batch</strong>
            <p>{qcAwal?.catatan ?? unit.entryNotes}</p>
          </div>
        </section>

        <aside className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Data Unit</p>
              <h2>Ringkasan</h2>
            </div>
          </div>
          <div className="detailList">
            <div><Cpu size={16} /> {unit.processor}</div>
            <div><HardDrive size={16} /> SSD health {unit.ssdHealth}%</div>
            <div><CalendarClock size={16} /> Tempo {unit.tempo}</div>
          </div>
          {isInternalUser ? <div className="kv"><span>Batch</span><strong>{unit.batch.nomorBatch}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Supplier</span><strong>{unit.supplier}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Seri SSD</span><strong>{unit.ssdSerial}</strong></div> : null}
          <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
          <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
          <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
          <div className="kv"><span>Battery</span><strong>{unit.batteryHealth}%</strong></div>
          <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
        </aside>
      </div>

      {isInternalUser && qcAwal ? <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Reminder OS & aplikasi</p>
            <h2>Yang perlu dicek sebelum jual</h2>
          </div>
        </div>
        <div className="reminderGrid">
          {(qcAwal?.reminder ?? []).map((item) => <span key={item}>{item}</span>)}
        </div>
      </section> : null}

      {isInternalUser ? <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Audit log</p>
            <h2>Riwayat perubahan unit</h2>
          </div>
        </div>
        <div className="noteList">
          {unit.auditLogs.length === 0 ? <div className="emptyState">Belum ada perubahan unit yang tercatat.</div> : unit.auditLogs.map((log) => (
            <div className="note" key={log.id}>
              <strong>{log.createdAt} - {log.actorName}</strong>
              <small>{log.action.replaceAll("_", " ")} {log.actorUsername ? `/ ${log.actorUsername}` : ""}</small>
              <div className="miniMetrics">
                {log.changes.slice(0, 8).map((change) => (
                  <span key={change.field}>{change.field}: {String(change.before ?? "-")} ke {String(change.after ?? "-")}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section> : null}

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat harian</p>
            <h2>QC Harian</h2>
          </div>
        </div>
        <div className="noteList">
          {dailyHistory.map((qc) => (
            <div className="note" key={qc.id}>
              <strong>{qc.tanggal} - {qc.masihLolos}</strong>
              <p>{qc.kondisiHariIni}</p>
              <div className="miniMetrics">
                <span>SSD {qc.ssdHealth}%</span>
                <span>Battery {qc.batteryHealth}%</span>
                <span>{qc.screenCondition}</span>
              </div>
              <div className="miniMetrics">
                <span>{qc.windowsVersion}</span>
                <span>Office {qc.officeStatus}</span>
                <span>{qc.partitionCount} partisi</span>
              </div>
              <div className="qcColumns">
                <div>
                  <div className="kv"><span>Seri SSD</span><strong>{qc.ssdSerial}</strong></div>
                  <div className="kv"><span>Keyboard</span><strong>{qc.keyboard ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>WiFi</span><strong>{qc.wifi ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>USB</span><strong>{qc.usb ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Camera</span><strong>{qc.camera ? "OK" : "Perlu cek"}</strong></div>
                </div>
                <div>
                  <div className="kv"><span>Touchpad</span><strong>{qc.touchpad ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Trackpoint</span><strong>{qc.trackpoint ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Bluetooth</span><strong>{qc.bluetooth ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Speaker/Mic</span><strong>{qc.speaker && qc.mic ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Body/Karet</span><strong>{!qc.bodyBroken && qc.karetBawah ? "OK" : "Perlu cek"}</strong></div>
                </div>
              </div>
              {isInternalUser ? <div className="kv"><span>Kondisi cat internal</span><strong>{qc.paintCondition}</strong></div> : null}
              <small>{qc.catatan} / {qc.checker}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
