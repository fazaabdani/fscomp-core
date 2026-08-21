import { PrismaClient } from "@prisma/client";

const requirements = [
  ["DATABASE_URL", 1],
  ["SESSION_SECRET", 32],
  ["CORE_INTEGRATION_TOKEN", 24],
  ["N8N_WEBHOOK_SECRET", 24],
  ["BACKUP_EXPORT_TOKEN", 24]
];

// Bukan hard requirement (deploy tetap boleh jalan tanpanya) karena masing-masing fitur sudah
// punya fallback aman kalau env ini kosong (asisten AI bilang "belum aktif", WA AI skip kirim,
// dll) -- tapi kalau memang harusnya aktif di production, ini sering kelupaan diisi tanpa ada
// yang sadar sampai fiturnya "diam-diam" tidak jalan. Cukup diperingatkan di log deploy.
const optionalButImportant = [
  ["FONNTE_TOKEN", 1, "AI WhatsApp tidak akan bisa mengirim balasan"],
  ["FONNTE_WEBHOOK_SECRET", 24, "webhook langsung Fonnte akan menolak semua pesan masuk"],
  ["WA_CHANNEL_STORE_DEVICE", 1, "toggle nomor WA aktif tidak benar-benar memblokir channel manapun"],
  ["WA_CHANNEL_PERSONAL_DEVICE", 1, "toggle nomor WA aktif tidak benar-benar memblokir channel manapun"],
  ["OPENAI_API_KEY", 1, "Asisten AI staff dan AI WhatsApp akan nonaktif"],
  ["OPENAI_MODEL", 1, "Asisten AI staff dan AI WhatsApp akan nonaktif"]
];

const invalidVariables = requirements
  .filter(([name, minimum]) => (process.env[name] ?? "").length < minimum)
  .map(([name, minimum]) => `${name} (minimal ${minimum} karakter)`);

if (invalidVariables.length > 0) {
  console.error("PREDEPLOY GAGAL: environment variable belum valid:");
  invalidVariables.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

const missingOptional = optionalButImportant.filter(([name, minimum]) => (process.env[name] ?? "").length < minimum);
if (missingOptional.length > 0) {
  console.warn("PREDEPLOY PERINGATAN: env var berikut belum diisi (deploy tetap lanjut):");
  missingOptional.forEach(([name, , impact]) => console.warn(`- ${name}: ${impact}`));
}

const prisma = new PrismaClient();

try {
  const [activeAdmins, activeLoginUsers, users, pcComponents] = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN", active: true, username: { not: null }, password: { not: null } } }),
    prisma.user.count({ where: { active: true, username: { not: null }, password: { not: null } } }),
    prisma.user.findMany({ where: { password: { not: null } }, select: { password: true } }),
    prisma.pcComponent.count()
  ]);

  if (activeAdmins < 1) throw new Error("Tidak ada admin aktif dengan username dan password. Deployment berisiko mengunci semua akses.");
  if (activeLoginUsers < 1) throw new Error("Tidak ada user aktif yang siap login.");

  const legacyPasswords = users.filter((user) => user.password && !/^\$2[aby]\$\d{2}\$/.test(user.password)).length;
  console.log("PREDEPLOY OK");
  console.log(`- Admin aktif siap login: ${activeAdmins}`);
  console.log(`- Total user aktif siap login: ${activeLoginUsers}`);
  console.log(`- Password legacy yang akan di-hash saat login: ${legacyPasswords}`);
  console.log(`- Tabel Rakit PC terbaca: ${pcComponents} komponen`);
} catch (error) {
  console.error(`PREDEPLOY GAGAL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
