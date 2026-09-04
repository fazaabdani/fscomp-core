-- Fitur tambahan unit: keyboard backlight, fingerprint, face recognition, stylus
ALTER TABLE "Unit" ADD COLUMN "hasKeyboardBacklight" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Unit" ADD COLUMN "hasFingerprint" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Unit" ADD COLUMN "hasFaceRecognition" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Unit" ADD COLUMN "hasStylus" BOOLEAN NOT NULL DEFAULT false;
