import { AlertTriangle, Bell, Bot, MessageCircle } from "lucide-react";
import type { WaConversationStatus, WaCustomerAiPolicy, WaLeadScore, WaRiskLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatDateWib } from "@/lib/inventory";
import { defaultWaAiPersonaPrompt } from "@/lib/wa-ai-catalog-reply";
import { waChannelIds, waChannelLabels, type WaChannelId } from "@/lib/wa-ai-channels";
import { defaultWaFollowUpHours, isConversationDueForFollowUp, type WaFollowUpMode } from "@/lib/wa-ai-followup";
import { FlashNotice } from "../FlashNotice";
import {
  releaseWaConversationToAiAction,
  sendManualFollowUpAction,
  takeoverWaConversationAction,
  updateWaAiChannelsAction,
  updateWaAiEnabledAction,
  updateWaAiPersonaAction,
  updateWaConversationAction,
  updateWaCustomerPolicyAction,
  updateWaFollowUpSettingsAction
} from "./actions";

const followUpModes: WaFollowUpMode[] = ["OFF", "SEMI", "AUTO"];
const followUpModeLabels: Record<WaFollowUpMode, string> = {
  OFF: "Mati",
  SEMI: "Semi (admin klik kirim)",
  AUTO: "Full otomatis"
};

const statusLabels: Record<WaConversationStatus, string> = {
  OPEN: "Open",
  PENDING_ADMIN: "Pending admin",
  WAITING_ADMIN: "Waiting admin",
  CLOSED: "Closed",
  DEAL: "Deal",
  LOST: "Lost",
  ARCHIVED: "Archived"
};

const policyLabels: Record<WaCustomerAiPolicy, string> = {
  AUTO_SAFE: "Auto safe",
  ADMIN_ONLY: "Admin only",
  VIP_ADMIN_ONLY: "VIP admin",
  BLOCKED_AI: "AI diblokir"
};

const intentLabels: Record<string, string> = {
  GREETING: "Sapaan",
  CATALOG: "Tanya katalog",
  ADDRESS: "Tanya alamat",
  HOURS: "Tanya jam buka",
  GENERAL_SERVICE: "Tanya servis",
  STOCK_SIMPLE: "Tanya stok",
  HOT_LEAD: "Mau ambil/deal",
  PAYMENT: "Bahas pembayaran",
  NEGOTIATION: "Nego harga",
  COMPLAINT: "Komplain",
  WARRANTY: "Klaim garansi",
  REFUND: "Minta refund",
  ADMIN_REQUEST: "Minta admin",
  UNKNOWN: "Belum jelas arahnya"
};

const statuses: WaConversationStatus[] = ["OPEN", "PENDING_ADMIN", "WAITING_ADMIN", "CLOSED", "DEAL", "LOST", "ARCHIVED"];
const policies: WaCustomerAiPolicy[] = ["AUTO_SAFE", "ADMIN_ONLY", "VIP_ADMIN_ONLY", "BLOCKED_AI"];

function statusTone(status: WaConversationStatus) {
  if (status === "OPEN") return "green";
  if (status === "PENDING_ADMIN" || status === "WAITING_ADMIN") return "yellow";
  if (status === "LOST" || status === "ARCHIVED") return "red";
  return "green";
}

function leadTone(lead: WaLeadScore, risk: WaRiskLevel) {
  if (risk === "RISK") return "red";
  if (lead === "HOT" || risk === "WATCH") return "yellow";
  return "green";
}

export default async function WaAiPage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  await requireRole(["admin", "sales"]);

  const [conversations, settings, totalCustomers, waitingAdmin, hotLead, riskCount, queuedTelegram] = await Promise.all([
    prisma.waConversation.findMany({
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 2
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 2
        },
        telegramNotifications: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 50
    }),
    prisma.waAiSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.waCustomer.count(),
    prisma.waConversation.count({ where: { status: "WAITING_ADMIN" } }),
    prisma.waConversation.count({ where: { leadScore: "HOT" } }),
    prisma.waConversation.count({ where: { riskLevel: "RISK" } }),
    prisma.waTelegramNotificationLog.count({ where: { status: "QUEUED" } })
  ]);

  const message =
    searchParams?.error === "invalid-input"
      ? "Input WA AI belum valid."
      : searchParams?.error === "not-found"
        ? "Percakapan atau pelanggan tidak ditemukan."
        : searchParams?.success === "conversation-updated"
          ? "Status percakapan berhasil diperbarui."
          : searchParams?.success === "policy-updated"
            ? "Policy pelanggan berhasil diperbarui."
            : searchParams?.success === "persona-updated"
              ? "Gaya bicara AI berhasil disimpan."
              : searchParams?.success === "channels-updated"
                ? "Nomor WA aktif berhasil diperbarui."
                : searchParams?.success === "ai-enabled"
                  ? "AI diaktifkan kembali."
                  : searchParams?.success === "ai-disabled"
                    ? "AI dimatikan — semua pesan masuk tidak diproses sampai dinyalakan lagi."
                    : searchParams?.success === "conversation-taken-over"
                      ? "Percakapan diambil alih — AI berhenti membalas otomatis untuk pelanggan ini."
                      : searchParams?.success === "conversation-released"
                        ? "Percakapan dikembalikan ke AI."
                        : searchParams?.success === "followup-settings-updated"
                          ? "Pengaturan follow-up berhasil disimpan."
                          : searchParams?.success === "followup-sent"
                            ? "Follow-up berhasil dikirim."
                            : searchParams?.success === "followup-send-failed"
                              ? "Follow-up dibuat tapi gagal terkirim ke Fonnte — cek koneksi/token."
                              : searchParams?.error === "followup-failed"
                                ? "Gagal membuat pesan follow-up (cek OPENAI_API_KEY/OPENAI_MODEL)."
                                : "";

  const aiEnabledSetting = settings.find((setting) => setting.key === "ai_enabled");
  const isAiEnabled = aiEnabledSetting ? aiEnabledSetting.value !== false : true;

  const personaSetting = settings.find((setting) => setting.key === "ai_sales_persona_prompt");
  const currentPersona = typeof personaSetting?.value === "string" ? personaSetting.value : defaultWaAiPersonaPrompt;

  const channelsSetting = settings.find((setting) => setting.key === "active_wa_channels");
  const activeChannels = new Set(
    Array.isArray(channelsSetting?.value)
      ? channelsSetting.value.filter((value): value is WaChannelId => (waChannelIds as string[]).includes(value as string))
      : ["PERSONAL"]
  );

  const followUpModeSetting = settings.find((setting) => setting.key === "follow_up_mode");
  const followUpMode: WaFollowUpMode =
    followUpModeSetting?.value === "AUTO" || followUpModeSetting?.value === "SEMI" ? followUpModeSetting.value : "OFF";

  const followUpHoursSetting = settings.find((setting) => setting.key === "follow_up_hours");
  const followUpHoursValue = (followUpHoursSetting?.value ?? {}) as Partial<typeof defaultWaFollowUpHours>;
  const followUpHours = {
    hot: typeof followUpHoursValue.hot === "number" ? followUpHoursValue.hot : defaultWaFollowUpHours.hot,
    warm: typeof followUpHoursValue.warm === "number" ? followUpHoursValue.warm : defaultWaFollowUpHours.warm,
    cold: typeof followUpHoursValue.cold === "number" ? followUpHoursValue.cold : defaultWaFollowUpHours.cold
  };

  return (
    <section className="pageStack waAiPage">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">AI WhatsApp</p>
          <h1>Sales admin dan handover pelanggan</h1>
          <p className="bodyText">Pantau percakapan yang masuk, dan atur gaya bicara/nomor aktif AI langsung dari sini.</p>
        </div>
        <span className="waAiIconBadge"><Bot size={18} /></span>
      </div>

      <section className="statGrid">
        <article className="statCard"><MessageCircle size={19} /><span>Pelanggan WA</span><strong>{totalCustomers}</strong></article>
        <article className="statCard"><Bell size={19} /><span>Waiting admin</span><strong>{waitingAdmin}</strong></article>
        <article className="statCard"><AlertTriangle size={19} /><span>HOT lead</span><strong>{hotLead}</strong></article>
        <article className="statCard"><AlertTriangle size={19} /><span>Risk / Telegram</span><strong>{riskCount} / {queuedTelegram}</strong></article>
      </section>

      <FlashNotice message={message} tone={searchParams?.error ? "error" : "success"} queryKeys={["error", "success"]} />

      <section className="panel waAiControlPanel">
        <div className="waAiKillSwitchRow">
          <div className="waAiKillSwitchLabel">
            <span className={`statusPill ${isAiEnabled ? "green" : "red"}`}>{isAiEnabled ? "AI ON" : "AI OFF"}</span>
            <span>Matikan kalau mau berhenti total sementara — semua pesan diabaikan, dari channel mana pun.</span>
          </div>
          <form action={updateWaAiEnabledAction} className="buttonRow noMargin">
            <label className="inlineCheck">
              <input key={String(isAiEnabled)} name="aiEnabled" type="checkbox" defaultChecked={isAiEnabled} />
              AI aktif
            </label>
            <button className="secondaryButton compactButton" type="submit">Simpan</button>
          </form>
        </div>

        <div className="waAiControlGrid">
          <form action={updateWaAiPersonaAction} className="formGrid panelSubsection">
            <label htmlFor="persona">Persona AI Sales</label>
            <textarea
              key={currentPersona}
              id="persona"
              name="persona"
              defaultValue={currentPersona}
              rows={16}
              maxLength={20000}
              className="waAiPersonaTextarea"
            />
            <p className="waAiHint">Aturan wajib (dilarang mengarang harga/stok/garansi) tetap terkunci di kode, tidak ikut berubah dari sini.</p>
            <div className="buttonRow noMargin">
              <button className="secondaryButton compactButton" type="submit">Simpan persona</button>
            </div>
          </form>

          <form action={updateWaAiChannelsAction} className="formGrid panelSubsection">
            <span>Nomor WA yang aktif untuk AI</span>
            <div className="buttonRow noMargin">
              {waChannelIds.map((channel) => (
                <label className="inlineCheck" key={channel}>
                  <input
                    key={`${channel}-${activeChannels.has(channel)}`}
                    name="channels"
                    type="checkbox"
                    value={channel}
                    defaultChecked={activeChannels.has(channel)}
                  />
                  {waChannelLabels[channel]}
                </label>
              ))}
            </div>
            <div className="buttonRow noMargin">
              <button className="secondaryButton compactButton" type="submit">Simpan nomor aktif</button>
            </div>
            {!process.env.WA_CHANNEL_STORE_DEVICE || !process.env.WA_CHANNEL_PERSONAL_DEVICE ? (
              <div className="infoBox dangerInfo">
                Peringatan: <code>WA_CHANNEL_STORE_DEVICE</code>/<code>WA_CHANNEL_PERSONAL_DEVICE</code> belum diisi di server. Selama belum diisi, toggle nomor aktif di atas <strong>tidak benar-benar memblokir</strong> pesan masuk lewat webhook Fonnte langsung (semua nomor tetap diproses).
              </div>
            ) : null}
          </form>
        </div>

        <form action={updateWaFollowUpSettingsAction} className="formGrid panelSubsection">
          <span>Follow-up otomatis untuk pelanggan yang belum balas</span>
          <div className="buttonRow noMargin">
            <select key={followUpMode} name="mode" defaultValue={followUpMode} aria-label="Mode follow-up">
              {followUpModes.map((mode) => <option value={mode} key={mode}>{followUpModeLabels[mode]}</option>)}
            </select>
          </div>
          <div className="buttonRow noMargin">
            <label className="inlineCheck">
              HOT
              <input key={followUpHours.hot} name="hoursHot" type="number" min={0} max={240} defaultValue={followUpHours.hot} style={{ width: "64px" }} />
              jam
            </label>
            <label className="inlineCheck">
              WARM
              <input key={followUpHours.warm} name="hoursWarm" type="number" min={0} max={240} defaultValue={followUpHours.warm} style={{ width: "64px" }} />
              jam
            </label>
            <label className="inlineCheck">
              COLD
              <input key={followUpHours.cold} name="hoursCold" type="number" min={0} max={240} defaultValue={followUpHours.cold} style={{ width: "64px" }} />
              jam
            </label>
          </div>
          <p className="waAiHint">Berapa jam pelanggan diam sebelum dianggap perlu di-follow-up, beda-beda per lead score. Tombol &quot;Kirim Follow-up&quot; manual di tabel bawah selalu aktif apa pun mode-nya.</p>
          <div className="buttonRow noMargin">
            <button className="secondaryButton compactButton" type="submit">Simpan pengaturan follow-up</button>
          </div>
        </form>

        <details className="waAiRawSettings">
          <summary>Lihat semua setting mentah</summary>
          {settings.length === 0 ? (
            <div className="emptyState">Setting belum tersedia.</div>
          ) : (
            <div className="tableScroll">
              <table className="dataTable">
                <thead>
                  <tr><th>Key</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {settings.map((setting) => (
                    <tr key={setting.id}>
                      <td><strong>{setting.key}</strong></td>
                      <td><small>{JSON.stringify(setting.value)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>Percakapan terbaru</h2>
            <p>Prioritaskan status waiting admin, HOT, dan risk.</p>
          </div>
          <span className="waAiIconBadge"><MessageCircle size={18} /></span>
        </div>

        {conversations.length === 0 ? (
          <div className="emptyState">Belum ada percakapan WA AI yang masuk.</div>
        ) : (
          <div className="tableScroll">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Status</th>
                  <th>Lead / Risk</th>
                  <th>Pesan terakhir</th>
                  <th>Event</th>
                  <th>Update</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => {
                  const latestMessage = conversation.messages[0];
                  const latestEvent = conversation.events[0];
                  const latestTelegram = conversation.telegramNotifications[0];
                  const needsFollowUp = isConversationDueForFollowUp({
                    status: conversation.status,
                    leadScore: conversation.leadScore,
                    lastMessageAt: conversation.lastMessageAt,
                    lastMessageDirection: latestMessage?.direction ?? null,
                    followupPassiveSentAt: conversation.followupPassiveSentAt,
                    hours: followUpHours
                  });
                  return (
                    <tr key={conversation.id}>
                      <td>
                        <strong>{conversation.customer.name || "Tanpa nama"}</strong><br />
                        <small>{conversation.phone}</small><br />
                        <small>{policyLabels[conversation.customer.customerAiPolicy]}</small>
                      </td>
                      <td>
                        <span className={`statusPill ${statusTone(conversation.status)}`}>{statusLabels[conversation.status]}</span><br />
                        <small>{conversation.intent ? intentLabels[conversation.intent] ?? conversation.intent : "Belum ada pesan"}</small>
                      </td>
                      <td>
                        <span className={`statusPill ${leadTone(conversation.leadScore, conversation.riskLevel)}`}>{conversation.leadScore} / {conversation.riskLevel}</span><br />
                        <small>{conversation.aiTakeoverAllowed ? "AI boleh takeover" : "AI tahan dulu"}</small>
                      </td>
                      <td>
                        <strong>{latestMessage?.senderName || "Customer"}</strong><br />
                        <small>{latestMessage?.body || "Belum ada pesan"}</small>
                      </td>
                      <td>
                        <strong>{latestEvent?.reason || "-"}</strong><br />
                        <small>{latestEvent?.eventType || "Belum ada event"}</small><br />
                        {latestTelegram ? <small>Telegram: {latestTelegram.status}</small> : null}
                      </td>
                      <td>
                        <small>{formatDateWib(conversation.updatedAt)}</small><br />
                        {conversation.lastAdminResponseAt ? <small>Admin: {formatDateWib(conversation.lastAdminResponseAt)}</small> : <small>Admin belum respons</small>}
                        {needsFollowUp ? <><br /><span className="statusPill yellow">Perlu Follow-up</span></> : null}
                      </td>
                      <td className="waAiActionsCell">
                        <div className="waAiPrimaryActions">
                          <form action={takeoverWaConversationAction.bind(null, conversation.id)}>
                            <button className="secondaryButton compactButton" type="submit">Ambil Alih</button>
                          </form>
                          <form action={releaseWaConversationToAiAction.bind(null, conversation.id)}>
                            <button className="secondaryButton compactButton" type="submit">Kembalikan ke AI</button>
                          </form>
                          <form action={sendManualFollowUpAction.bind(null, conversation.id)}>
                            <button className="secondaryButton compactButton" type="submit">Kirim Follow-up</button>
                          </form>
                        </div>

                        <details className="waAiRowAdvanced">
                          <summary>Kontrol lanjutan</summary>
                          <form action={updateWaConversationAction.bind(null, conversation.id)} className="buttonRow noMargin">
                            <select name="status" defaultValue={conversation.status} aria-label="Status percakapan">
                              {statuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
                            </select>
                            <label className="inlineCheck">
                              <input name="aiTakeoverAllowed" type="checkbox" defaultChecked={conversation.aiTakeoverAllowed} />
                              AI takeover
                            </label>
                            <button className="secondaryButton compactButton" type="submit">Simpan</button>
                          </form>
                          <form action={updateWaCustomerPolicyAction.bind(null, conversation.customer.id)} className="buttonRow noMargin">
                            <select name="customerAiPolicy" defaultValue={conversation.customer.customerAiPolicy} aria-label="Policy AI pelanggan">
                              {policies.map((policy) => <option value={policy} key={policy}>{policyLabels[policy]}</option>)}
                            </select>
                            <button className="secondaryButton compactButton" type="submit">Policy</button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
