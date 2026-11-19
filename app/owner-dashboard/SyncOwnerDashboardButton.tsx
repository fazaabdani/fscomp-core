"use client";

import { RefreshCcw } from "lucide-react";
import { useState } from "react";

type SyncResult = {
  status: string;
  sent?: number;
  accepted?: number;
  failed?: { type: string; id: string; status: number; error?: string }[];
  message?: string;
};

export function SyncOwnerDashboardButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function runSync() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/integrations/owner-dashboard/sync", { method: "POST" });
      const data = (await response.json()) as SyncResult;
      setResult(data);
    } catch (error) {
      setResult({ status: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="listStack">
      <div className="buttonCluster">
        <button className="primaryButton" type="button" onClick={runSync} disabled={loading}>
          <RefreshCcw size={15} /> {loading ? "Mengirim..." : "Sync ke Owner Dashboard"}
        </button>
      </div>
      {result ? (
        result.status === "synced" ? (
          <div className="infoBox">
            Terkirim {result.sent} data, diterima {result.accepted}.
            {result.failed && result.failed.length > 0 ? ` ${result.failed.length} gagal.` : ""}
          </div>
        ) : (
          <div className="infoBox dangerInfo">{result.message ?? "Sync gagal."}</div>
        )
      ) : null}
    </div>
  );
}
