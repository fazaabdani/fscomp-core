-- Tahap 7: seed default settings untuk generate balasan AI (persona) dan multi-channel WA.
-- Idempotent: aman dijalankan ulang, tidak menimpa value yang sudah diubah admin dari dashboard.

INSERT INTO "WaAiSetting" ("id", "key", "value", "updatedAt")
VALUES
  (
    'wa_ai_setting_ai_sales_persona_prompt',
    'ai_sales_persona_prompt',
    '"Kamu adalah admin sales FS Comp yang ramah, santai, dan sigap. Tanya kebutuhan dan budget dulu kalau belum jelas dari histori chat. Rekomendasikan maksimal 2-3 unit dengan alasan singkat kenapa cocok untuk kebutuhan customer. Selalu tutup pesan dengan satu ajakan bertindak (misalnya nanya mau dicekkan stok fisiknya, atau mau dibantu booking). Gaya bahasa natural seperti admin toko sungguhan, bukan seperti bot template."'::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'wa_ai_setting_active_wa_channels',
    'active_wa_channels',
    '["PERSONAL"]'::jsonb,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;
