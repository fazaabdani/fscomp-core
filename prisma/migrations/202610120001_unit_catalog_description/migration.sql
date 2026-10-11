-- Deskripsi lengkap unit untuk katalog publik (terpisah dari entryNotes yang internal)
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "catalogDescription" TEXT;
