"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Globe, HelpCircle, Instagram, Loader2, MessageCircle, Share2, ShoppingBag, Store, Users } from "lucide-react";

// Asal pembeli WAJIB dipilih lewat popup sebelum transaksi disimpan, supaya laporan "dari mana pembeli datang" selalu terisi.
// Nilainya dikirim lewat input tersembunyi `leadSource`; server menolak transaksi tanpa nilai yang sah.
export const LEAD_SOURCE_OPTIONS = [
  { id: "KATALOG", label: "Katalog online", hint: "Dari website katalog", icon: Globe },
  { id: "WHATSAPP", label: "WhatsApp", hint: "Chat langsung / link dari WA", icon: MessageCircle },
  { id: "INSTAGRAM", label: "Instagram", hint: "Dari akun fscomp.id", icon: Instagram },
  { id: "TIKTOK_FB", label: "TikTok / Facebook", hint: "Dari konten atau iklan", icon: Share2 },
  { id: "TOKO", label: "Datang ke toko", hint: "Walk-in, tanpa chat dulu", icon: Store },
  { id: "MARKETPLACE", label: "Marketplace", hint: "Shopee, TikTok Shop, dll.", icon: ShoppingBag },
  { id: "REFERRAL", label: "Teman / referral", hint: "Direkomendasikan orang", icon: Users },
  { id: "LAINNYA", label: "Lainnya / tidak tahu", hint: "Tanyakan dulu bila bisa", icon: HelpCircle }
] as const;

export function LeadSourceSubmit({ label, pendingLabel, icon }: { label: string; pendingLabel: string; icon?: ReactNode }) {
  const { pending } = useFormStatus();
  const anchor = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function formOf() {
    return anchor.current?.closest("form") ?? null;
  }

  // Cek isian wajib lebih dulu; popup hanya muncul bila formulir sudah valid.
  function ask() {
    const form = formOf();
    if (form && !form.reportValidity()) return;
    setOpen(true);
  }

  function choose(id: string) {
    setValue(id);
    setOpen(false);
    const form = formOf();
    // Tunggu input tersembunyi menerima nilai baru sebelum dikirim.
    window.setTimeout(() => form?.requestSubmit(), 0);
  }

  return (
    <>
      <span ref={anchor} />
      <input type="hidden" name="leadSource" value={value} />
      <button className="primaryButton" type="button" onClick={ask} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 size={16} className="spinIcon" /> : icon}
        {pending ? pendingLabel : label}
      </button>

      {open ? (
        <div className="leadModalBackdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="leadModal" role="dialog" aria-modal="true" aria-labelledby="lead-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="lead-title">Pembeli ini tahu FS Comp dari mana?</h2>
            <p>Wajib dipilih supaya laporan asal pembeli akurat. Pilih satu, transaksi langsung disimpan.</p>
            <div className="leadGrid">
              {LEAD_SOURCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button type="button" key={option.id} className="leadOption" onClick={() => choose(option.id)}>
                    <Icon size={22} aria-hidden="true" />
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </button>
                );
              })}
            </div>
            <button type="button" className="secondaryButton leadCancel" onClick={() => setOpen(false)}>Batal, kembali ke nota</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
