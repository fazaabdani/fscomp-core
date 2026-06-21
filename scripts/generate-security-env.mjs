import { randomBytes } from "node:crypto";

function secret() {
  return randomBytes(32).toString("hex");
}

console.log("Simpan hasil ini langsung ke Environment Variables Coolify. Jangan kirim screenshot nilainya.\n");
console.log(`SESSION_SECRET=${secret()}`);
console.log(`CORE_INTEGRATION_TOKEN=${secret()}`);
console.log(`N8N_WEBHOOK_SECRET=${secret()}`);
console.log(`BACKUP_EXPORT_TOKEN=${secret()}`);
