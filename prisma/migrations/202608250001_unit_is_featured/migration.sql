-- Tandai unit sebagai "unit rekomendasi" untuk hero katalog publik
ALTER TABLE "Unit" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
