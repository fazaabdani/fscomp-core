import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Cpu, HardDrive, MessageCircle, QrCode, ShieldCheck, TrendingUp } from "lucide-react";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { getRelatedCatalogUnits } from "@/lib/catalog-page-data";
import { STORE_SOLD_CLAIM } from "@/lib/store-facts";
import { getUnitForDetail } from "@/lib/db-data";
import { statusTone } from "@/lib/constants";
import { slugifyFileName } from "@/lib/file-naming";
import { descriptionSnippet } from "@/lib/unit-description";
import { absoluteUrl, productJsonLd, unitSeoDescription, unitSeoTitle, WARRANTY_SUMMARY, type UnitAvailability } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { JsonLd } from "@/app/components/JsonLd";
import { ShareUnitButton } from "./ShareUnitButton";
import { UnitDescription } from "../UnitDescription";
import { UnitGallery } from "../UnitGallery";

export const dynamic = "force-dynamic";

function distinctResolution(lcdSize: string, lcdResolution: string) {
  if (!lcdResolution) return "";
  return lcdResolution.trim().toLowerCase() === lcdSize.trim().toLowerCase() ? "" : lcdResolution;
}

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

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const unit = await getUnitForDetail(params.id);
  if (!unit) return {};

  const title = unitSeoTitle(unit);
  const description = unitSeoDescription(unit);
  const image = unit.gallery[0]?.url || unit.catalogImageUrl || "/branding/fs-comp-logo.webp";

  return {
    title,
    description,
    // URL kanonik tanpa ?from= / ?view= supaya tautan dari katalog tidak jadi duplikat di Google.
    alternates: { canonical: `/unit/${unit.id}` },
    openGraph: {
      title,
      description,
      url: `/unit/${unit.id}`,
      images: [image],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export default async function UnitDetailPage({ params, searchParams }: { params: { id: string }; searchParams?: { from?: string | string[] } }) {
  const unit = await getUnitForDetail(params.id);
  if (!unit) notFound();

  const currentUser = await getCurrentUser();
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
  const extraFeatures = [
    unit.hasKeyboardBacklight ? "Keyboard Backlight" : null,
    unit.hasFingerprint ? "Fingerprint" : null,
    unit.hasFaceRecognition ? "Face Recognition" : null,
    unit.hasStylus ? "Stylus/Pen" : null
  ].filter((label): label is string => Boolean(label));
  const catalogReturnHref = catalogReturnPath(searchParams?.from);

  if (!isInternalUser) {
    const forSale = !unit.soldAt && /^VERIFIED/.test(unit.statusObservasi) && latestDaily?.masihLolos !== "TIDAK LOLOS";
    const availability: UnitAvailability = unit.soldAt ? "SoldOut" : forSale ? "InStock" : "OutOfStock";
    const photos = (unit.gallery.length ? unit.gallery.map((photo) => photo.url) : [unit.catalogImageUrl])
      .filter((url) => url && !url.includes("drive.google.com"))
      .map(absoluteUrl);

    return (
      <section className="pageStack publicUnitPage">
        <JsonLd data={productJsonLd(unit, { photos, highlight: descriptionSnippet(unit.catalogDescription, 200), availability })} />
        <Link className="backLink" href={catalogReturnHref}>
          <ArrowLeft size={16} /> Kembali ke Katalog Lengkap
        </Link>

        <div className="unitHero">
          <div>
            <p className="eyebrow">Katalog FS Comp</p>
            <h1>{unit.model}</h1>
            <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
            {!isInternalUser ? (
              <span className="catalogHeroPill"><TrendingUp size={16} /> {STORE_SOLD_CLAIM}</span>
            ) : null}
          </div>
          <div className="unitHeroActions">
            <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
            <ShareUnitButton model={unit.model} />
            <a className="greenButton" href={publicWaLink} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
          </div>
        </div>

        <div className="contentGrid">
          <section className="panel wide">
            {unit.gallery.length > 0 ? (
              <UnitGallery photos={unit.gallery} alt={`Foto ${unit.model}`} className="publicUnitPhoto" placeholderClassName="publicUnitPhoto placeholderPhoto" priority />
            ) : (
              <CatalogPhoto
                url={unit.catalogImageUrl}
                className="publicUnitPhoto"
                placeholderClassName="publicUnitPhoto placeholderPhoto"
                alt={`Foto ${unit.model}`}
                priority
                zoomable
                imageWidth={1600}
              />
            )}
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
            {extraFeatures.length > 0 ? (
              <div className="miniMetrics">
                {extraFeatures.map((label) => <span key={label}>{label}</span>)}
              </div>
            ) : null}
            <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
            {distinctResolution(unit.lcdSize, unit.lcdResolution) ? (
              <div className="kv"><span>Resolusi</span><strong>{distinctResolution(unit.lcdSize, unit.lcdResolution)}</strong></div>
            ) : null}
            <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
            <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div>
            <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
            <p className="publicUnitUpdated"><CalendarClock size={15} /> Stok &amp; harga diperbarui {unit.updatedAt} WIB</p>
          </aside>
        </div>

        <UnitDescription text={unit.catalogDescription} />

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Catatan pembeli</p>
              <h2>QC internal sudah dicek FS Comp</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <p className="bodyText">Detail teknis seperti health SSD, health baterai, seri SSD, dan catatan internal disimpan di sistem FS Comp. Untuk kondisi spesifik unit, silakan tanyakan langsung ke admin sebelum transaksi. Toko FS Comp memberi {WARRANTY_SUMMARY}.</p>
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
                  <div className="buttonRow catalogCardActions">
                    <Link className="secondaryButton" href={{ pathname: `/unit/${relatedUnit.id}`, query: { from: catalogReturnHref } }}>Lihat Detail</Link>
                    <a className="greenButton" href={waLink(relatedUnit)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="publicUnitMobileBar printHidden" aria-label="Aksi produk">
          <Link className="secondaryButton" href={catalogReturnHref}><ArrowLeft size={17} /> Katalog</Link>
          <a className="greenButton" href={publicWaLink} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya via WhatsApp</a>
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
          {isInternalUser ? <ShareUnitButton model={unit.model} /> : null}
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
        {unit.gallery.length > 0 ? (
          <UnitGallery
            photos={unit.gallery}
            alt={`Foto ${unit.model}`}
            className="publicUnitPhoto"
            placeholderClassName="publicUnitPhoto placeholderPhoto"
            priority
            downloadNamePrefix={slugifyFileName(unit.model)}
          />
        ) : (
          <CatalogPhoto
            url={unit.catalogImageUrl}
            className="publicUnitPhoto"
            placeholderClassName="publicUnitPhoto placeholderPhoto"
            alt={`Foto ${unit.model}`}
            priority
            zoomable
            imageWidth={1600}
          />
        )}
      </section>

      <UnitDescription text={unit.catalogDescription} />

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
          {extraFeatures.length > 0 ? (
            <div className="miniMetrics">
              {extraFeatures.map((label) => <span key={label}>{label}</span>)}
            </div>
          ) : null}
          {isInternalUser ? <div className="kv"><span>Batch</span><strong>{unit.batch.nomorBatch}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Supplier</span><strong>{unit.supplier}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Seri SSD</span><strong>{unit.ssdSerial}</strong></div> : null}
          <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
          {distinctResolution(unit.lcdSize, unit.lcdResolution) ? (
            <div className="kv"><span>Resolusi</span><strong>{distinctResolution(unit.lcdSize, unit.lcdResolution)}</strong></div>
          ) : null}
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
