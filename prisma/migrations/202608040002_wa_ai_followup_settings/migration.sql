-- Follow-up otomatis untuk percakapan yang tidak dibalas pelanggan.
-- Idempotent: aman dijalankan ulang, tidak menimpa value yang sudah diubah admin dari dashboard.

INSERT INTO "WaAiSetting" ("id", "key", "value", "updatedAt")
VALUES
  (
    'wa_ai_setting_follow_up_mode',
    'follow_up_mode',
    '"OFF"'::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'wa_ai_setting_follow_up_hours',
    'follow_up_hours',
    '{"hot": 2, "warm": 6, "cold": 24}'::jsonb,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;
