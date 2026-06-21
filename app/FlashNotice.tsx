"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function FlashNotice({ message, tone = "success", queryKeys }: { message: string; tone?: "success" | "error"; queryKeys: string[] }) {
  const [visible, setVisible] = useState(Boolean(message));
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => setVisible(Boolean(message)), [message]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(searchParams.toString());
      queryKeys.forEach((key) => params.delete(key));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [message, pathname, queryKeys, router, searchParams]);

  if (!visible || !message) return null;
  return (
    <div className={`flashNotice ${tone === "error" ? "dangerInfo" : "successBox"}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      <button aria-label="Tutup notifikasi" onClick={() => setVisible(false)} type="button">x</button>
    </div>
  );
}
