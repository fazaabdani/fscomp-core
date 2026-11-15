// Kirim pesan ke Telegram lewat Bot API. Tidak pernah melempar error (notifikasi tidak boleh mengganggu alur utama).
// Konfigurasi lewat environment: TELEGRAM_BOT_TOKEN dan TELEGRAM_LEAD_CHAT_ID. Kalau belum diisi, fungsi ini tidak melakukan apa-apa.
export function telegramLeadConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_LEAD_CHAT_ID);
}

export async function sendTelegramLead(html: string, silent = false): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LEAD_CHAT_ID;
  if (!token || !chatId) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: html.slice(0, 3500), parse_mode: "HTML", disable_web_page_preview: true, disable_notification: silent }),
      signal: controller.signal
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
