"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUDGETS,
  FAQS,
  NEEDS,
  budgetFromText,
  isGreeting,
  matchFaqScored,
  needFromText,
  recommend,
  rupiah,
  waForUnit,
  waGeneral,
  type BudgetId,
  type Faq,
  type FesiUnit,
  type NeedId
} from "@/lib/fesi";
import { deviceOfWidth } from "@/lib/catalog-analytics";
import { identity, send } from "./CatalogAnalyticsClient";
import styles from "./FesiWidget.module.css";

type Pose = "salam" | "tanya" | "mikir" | "oke";
type Item = { id: number; from: "bot" | "user"; text?: string; units?: FesiUnit[]; link?: { href: string; text: string } };
type Chip = { label: string; run?: () => void; href?: string; wa?: boolean };

const SEEN_KEY = "fesi_seen_v1";
const CLOSED_KEY = "fesi_closed_v1";
const pose = (p: Pose) => `/branding/fesi/fesi-${p}.svg`;

function safeGet(kind: "local" | "session", key: string) {
  try {
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function safeSet(kind: "local" | "session", key: string, value: string) {
  try {
    (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* mode privat: tetap jalan tanpa penyimpanan */
  }
}

function track(label: string) {
  send({ type: "FESI", path: window.location.pathname, label });
}

// Kabari admin lewat Telegram bahwa calon pembeli baru klik WhatsApp (tanpa data pribadi; gagal diam-diam).
function sendLead(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ sid: identity().sid, device: deviceOfWidth(window.innerWidth), ...payload });
    if (navigator.sendBeacon?.("/api/katalog/fesi/lead", new Blob([body], { type: "application/json" }))) return;
    fetch("/api/katalog/fesi/lead", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
  } catch {
    /* peringatan tidak boleh mengganggu pengunjung */
  }
}

function specLine(u: FesiUnit) {
  return [u.processor, u.ram, u.ssd].filter(Boolean).join(" · ");
}

export function FesiWidget() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [currentPose, setCurrentPose] = useState<Pose>("salam");
  const [messages, setMessages] = useState<Item[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [entered, setEntered] = useState(false);

  const idRef = useRef(1);
  const timers = useRef<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef<FesiUnit[] | null>(null);
  const needRef = useRef<NeedId | undefined>(undefined);
  const budgetRef = useRef<BudgetId | undefined>(undefined);
  const reduced = useRef(false);
  const shownRef = useRef<string[]>([]);
  const faqRef = useRef<string[]>([]);

  const leadContext = () => ({ need: needRef.current, budget: budgetRef.current, shown: shownRef.current, faq: faqRef.current });

  const push = useCallback((items: Omit<Item, "id">[]) => {
    setMessages((prev) => [...prev, ...items.map((item) => ({ ...item, id: idRef.current++ }))]);
  }, []);

  // Fesi "mengetik" sebentar supaya terasa hidup, lalu membalas.
  const say = useCallback(
    (items: Omit<Item, "id">[], nextChips: Chip[], nextPose: Pose = "tanya", delay = 520) => {
      setChips([]);
      setTyping(true);
      setCurrentPose("mikir");
      const t = window.setTimeout(
        () => {
          setTyping(false);
          push(items);
          setChips(nextChips);
          setCurrentPose(nextPose);
        },
        reduced.current ? 0 : delay
      );
      timers.current.push(t);
    },
    [push]
  );

  const you = useCallback((text: string) => push([{ from: "user", text }]), [push]);

  // ----- alur percakapan -----
  const askAdmin = useCallback(
    (extra?: string): Chip => ({ label: "Chat admin (WhatsApp)", href: waGeneral(needRef.current, budgetRef.current, extra), wa: true }),
    []
  );

  const mainMenu = useCallback(
    (): Chip[] => [
      ...NEEDS.map((n) => ({ label: n.label, run: () => pickNeed(n.id, n.label) })),
      { label: "Tanya-tanya dulu", run: () => faqMenu(true) },
      askAdmin()
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const greet = useCallback(() => {
    say(
      [
        { from: "bot", text: "Halo kak! Aku Fesi, asisten FS Comp 👋" },
        { from: "bot", text: "Mau cari laptop buat apa nih? Pilih saja, nanti Fesi carikan dari stok yang ready." }
      ],
      mainMenu(),
      "salam",
      350
    );
  }, [say, mainMenu]);

  function pickNeed(need: NeedId, label: string) {
    track(`need:${need}`);
    you(label);
    needRef.current = need;
    if (budgetRef.current) return showRecommendation(need, budgetRef.current);
    say(
      [{ from: "bot", text: "Siap! Budget kakak kira-kira berapa?" }],
      [...BUDGETS.map((b) => ({ label: b.label, run: () => pickBudget(b.id, b.label) })), askAdmin()],
      "tanya"
    );
  }

  function pickBudget(budget: BudgetId, label: string) {
    track(`budget:${budget}`);
    you(label);
    budgetRef.current = budget;
    if (!needRef.current) {
      say(
        [{ from: "bot", text: "Oke. Dipakai buat apa nih?" }],
        [...NEEDS.map((n) => ({ label: n.label, run: () => pickNeed(n.id, n.label) })), askAdmin()],
        "tanya"
      );
      return;
    }
    showRecommendation(needRef.current, budget);
  }

  async function loadUnits(): Promise<FesiUnit[] | null> {
    if (unitsRef.current) return unitsRef.current;
    try {
      const res = await fetch("/api/katalog/fesi", { headers: { accept: "application/json" } });
      if (!res.ok) return null;
      const json = (await res.json()) as { connected: boolean; units: FesiUnit[] };
      if (!json.connected) return null;
      unitsRef.current = json.units;
      return json.units;
    } catch {
      return null;
    }
  }

  function showRecommendation(need: NeedId, budget: BudgetId) {
    setChips([]);
    setTyping(true);
    setCurrentPose("mikir");
    void loadUnits().then((all) => {
      const needLabel = NEEDS.find((n) => n.id === need)?.short ?? "";
      const budgetLabel = BUDGETS.find((b) => b.id === budget)?.label ?? "";
      const more: Chip[] = [
        { label: "Ganti budget", run: () => changeBudget() },
        { label: "Ganti kebutuhan", run: () => changeNeed() },
        { label: "Bisa dicicil?", run: () => answerFaq(FAQS.find((f) => f.id === "kredit") as Faq, true) },
        { label: "Lihat semua di katalog", run: () => goCatalog() },
        askAdmin(),
        { label: "Tanya hal lain", run: () => faqMenu(true) }
      ];
      const finish = (items: Omit<Item, "id">[], nextChips: Chip[], nextPose: Pose) => {
        const t = window.setTimeout(
          () => {
            setTyping(false);
            push(items);
            setChips(nextChips);
            setCurrentPose(nextPose);
          },
          reduced.current ? 0 : 700
        );
        timers.current.push(t);
      };

      if (!all) {
        track("rec:error");
        finish(
          [{ from: "bot", text: "Waduh, Fesi lagi gagal ambil data stok 😅 Coba lagi sebentar, atau langsung tanya admin ya." }],
          [{ label: "Coba lagi", run: () => showRecommendation(need, budget) }, askAdmin()],
          "tanya"
        );
        return;
      }
      const rec = recommend(all, need, budget);
      track(`rec:${rec.mode}:${rec.units.length}`);
      shownRef.current = rec.units.map((u) => u.id);
      if (rec.mode === "kosong") {
        finish(
          [
            {
              from: "bot",
              text: `Maaf kak, di budget ${budgetLabel.toLowerCase()} belum ada unit yang tersedia saat ini 🙏 Mau coba budget lain, atau tanya admin siapa tahu ada stok baru masuk?`
            }
          ],
          [{ label: "Ganti budget", run: () => changeBudget() }, askAdmin("Saya cari laptop tapi belum ada yang cocok di katalog.")],
          "tanya"
        );
        return;
      }
      const intro =
        rec.mode === "pas"
          ? `Ini pilihan yang paling pas buat ${needLabel}${budget === "any" ? "" : ` di budget ${budgetLabel.toLowerCase()}`}:`
          : rec.mode === "budget-longgar"
            ? "Di budget segitu belum ada yang pas banget. Ini yang paling mendekati (sedikit di luar budget):"
            : `Di budget itu ada unit, tapi spesifikasinya mungkin belum ideal untuk ${needLabel}. Ini yang tersedia:`;
      finish([{ from: "bot", text: intro, units: rec.units }], more, "oke");
    });
  }

  function changeBudget() {
    track("change:budget");
    you("Ganti budget");
    budgetRef.current = undefined;
    say(
      [{ from: "bot", text: "Boleh! Budget barunya berapa?" }],
      [...BUDGETS.map((b) => ({ label: b.label, run: () => pickBudget(b.id, b.label) })), askAdmin()],
      "tanya"
    );
  }

  function changeNeed() {
    track("change:need");
    you("Ganti kebutuhan");
    needRef.current = undefined;
    say(
      [{ from: "bot", text: "Siap! Sekarang dipakai buat apa?" }],
      [...NEEDS.map((n) => ({ label: n.label, run: () => pickNeed(n.id, n.label) })), askAdmin()],
      "tanya"
    );
  }

  function goCatalog() {
    track("go:catalog");
    const target = document.getElementById("produk-ready");
    if (target) {
      setOpen(false);
      target.scrollIntoView({ behavior: reduced.current ? "auto" : "smooth", block: "start" });
    } else {
      window.location.href = "/katalog#produk-ready";
    }
  }

  function faqMenu(echo = false) {
    track("faq:menu");
    if (echo) you("Tanya-tanya dulu");
    say(
      [{ from: "bot", text: "Boleh banget! Kakak mau tanya soal apa?" }],
      [
        ...FAQS.map((f) => ({ label: f.label, run: () => answerFaq(f, true) })),
        { label: "Cari laptop", run: () => backToMenu() }
      ],
      "tanya"
    );
  }

  function backToMenu() {
    you("Cari laptop");
    say([{ from: "bot", text: "Oke, mau cari laptop buat apa?" }], mainMenu(), "tanya");
  }

  function answerFaq(faq: Faq, echo: boolean) {
    track(`faq:${faq.id}`);
    if (!faqRef.current.includes(faq.id)) faqRef.current = [...faqRef.current, faq.id];
    if (echo) you(faq.label);
    say(
      [{ from: "bot", text: faq.answer, link: faq.link }, { from: "bot", text: "Ada lagi yang mau ditanyakan?" }],
      [
        { label: "Tanya hal lain", run: () => faqMenu(true) },
        { label: "Cari laptop", run: () => backToMenu() },
        askAdmin(faq.waText)
      ],
      "oke"
    );
  }

  function handleText(raw: string) {
    const text = raw.trim().slice(0, 200);
    if (!text) return;
    track("text");
    you(text);
    const faq = matchFaqScored(text);
    const need = needFromText(text);
    const budget = budgetFromText(text);
    if (faq && faq.score >= 2) return answerFaq(faq.faq, false);
    if (need || budget) {
      if (need) needRef.current = need;
      if (budget) budgetRef.current = budget;
      if (needRef.current && budgetRef.current) return showRecommendation(needRef.current, budgetRef.current);
      if (needRef.current) {
        return say(
          [{ from: "bot", text: "Siap! Budget kakak kira-kira berapa?" }],
          [...BUDGETS.map((b) => ({ label: b.label, run: () => pickBudget(b.id, b.label) })), askAdmin()],
          "tanya"
        );
      }
      return say(
        [{ from: "bot", text: "Oke. Dipakai buat apa nih?" }],
        [...NEEDS.map((n) => ({ label: n.label, run: () => pickNeed(n.id, n.label) })), askAdmin()],
        "tanya"
      );
    }
    if (faq) return answerFaq(faq.faq, false);
    if (isGreeting(text)) return greet();
    say(
      [{ from: "bot", text: "Hmm, Fesi belum yakin paham maksud kakak 😅 Biar tepat, tanyakan langsung ke admin ya. Atau pilih salah satu di bawah." }],
      [...mainMenu()],
      "mikir"
    );
  }

  // ----- siklus hidup -----
  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setReady(true);
    const timer = timers.current;
    // Pengunjung baru: Fesi muncul sendiri. Yang pernah menutup di sesi ini tidak diganggu lagi.
    if (!safeGet("local", SEEN_KEY) && !safeGet("session", CLOSED_KEY)) {
      const t = window.setTimeout(() => {
        safeSet("local", SEEN_KEY, String(Date.now()));
        track("open:auto");
        setOpen(true);
      }, 1800);
      timer.push(t);
    }
    return () => timer.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) greet();
    if (open) setEntered(true);
  }, [open, messages.length, greet]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: reduced.current ? "auto" : "smooth" });
  }, [messages, typing, chips]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openByClick() {
    track("open:click");
    safeSet("local", SEEN_KEY, String(Date.now()));
    setOpen(true);
  }
  function close() {
    track("close");
    safeSet("session", CLOSED_KEY, "1");
    setOpen(false);
  }

  if (!ready) return null;

  return (
    <div className={styles.root} data-fesi>
      {!open ? (
        <button type="button" className={`${styles.launcher} ${entered ? "" : styles.launcherIn}`} onClick={openByClick} aria-label="Tanya Fesi, asisten FS Comp">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pose("salam")} alt="" width={96} height={100} className={styles.launcherImg} draggable={false} />
          <span className={styles.tip}>Tanya Fesi</span>
          <span className={styles.ping} aria-hidden="true" />
        </button>
      ) : (
        <section className={styles.panel} role="dialog" aria-label="Fesi, asisten FS Comp">
          <div className={styles.peek} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={currentPose} src={pose(currentPose)} alt="" width={150} height={156} className={styles.peekImg} draggable={false} />
          </div>
          <header className={styles.header}>
            <div className={styles.title}>
              <strong>Fesi</strong>
              <span>Asisten FS Comp · biasanya langsung jawab</span>
            </div>
            <button type="button" className={styles.close} onClick={close} aria-label="Tutup Fesi">
              ×
            </button>
          </header>

          <div className={styles.body} ref={bodyRef} aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={m.from === "bot" ? styles.rowBot : styles.rowUser}>
                {m.text ? <div className={m.from === "bot" ? styles.bubbleBot : styles.bubbleUser}>{m.text}</div> : null}
                {m.link ? (
                  /^https?:/.test(m.link.href) ? (
                    <a href={m.link.href} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                      {m.link.text} →
                    </a>
                  ) : (
                    <Link href={m.link.href} className={styles.inlineLink}>
                      {m.link.text} →
                    </Link>
                  )
                ) : null}
                {m.units?.map((u) => (
                  <article key={u.id} className={styles.card}>
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" className={styles.cardImg} loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : null}
                    <div className={styles.cardInfo}>
                      <strong>{u.model}</strong>
                      <span>{specLine(u)}</span>
                      <b>{rupiah(u.price)}</b>
                      <small>Stok {u.lokasi}</small>
                    </div>
                    <div className={styles.cardActions}>
                      <Link href={`/unit/${u.id}`} onClick={() => track(`unit:${u.nomorUnit}`)}>
                        Lihat
                      </Link>
                      <a href={waForUnit(u)} target="_blank" rel="noopener noreferrer" onClick={() => sendLead({ kind: "unit", unitId: u.id, ...leadContext() })}>
                        Tanya via WA
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ))}
            {typing ? (
              <div className={styles.rowBot}>
                <div className={`${styles.bubbleBot} ${styles.typing}`} aria-label="Fesi sedang mengetik">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ) : null}
          </div>

          {chips.length > 0 ? (
            <div className={styles.chips}>
              {chips.map((c) =>
                c.href ? (
                  <a
                    key={c.label}
                    className={`${styles.chip} ${c.wa ? styles.chipWa : ""}`}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => c.wa && sendLead({ kind: "admin", ...leadContext() })}
                  >
                    {c.label}
                  </a>
                ) : (
                  <button key={c.label} type="button" className={styles.chip} onClick={c.run}>
                    {c.label}
                  </button>
                )
              )}
            </div>
          ) : null}

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              const value = draft;
              setDraft("");
              handleText(value);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ketik pertanyaan, mis. garansi atau laptop 5 juta"
              maxLength={200}
              aria-label="Tulis pesan untuk Fesi"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="Kirim">
              Kirim
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
