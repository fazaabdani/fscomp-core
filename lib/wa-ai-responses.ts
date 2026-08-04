import type { SaleLocation } from "@prisma/client";

export function waAiBridgeMessage(input: { locationQuestion?: boolean } = {}) {
  return [
    "Siap nggih, saya teruskan ke admin untuk cek stok fisik dan proses berikutnya agar tidak salah unit.",
    input.locationQuestion ? "" : null,
    input.locationQuestion ? "Sambil menunggu, Mas/Mbak mau ambil di toko Kajen atau Wiradesa?" : null
  ].filter(Boolean).join("\n");
}

export function waAiBookingBridgeMessage() {
  return "Siap nggih, saya bantu teruskan ke admin untuk cek stok fisiknya. Untuk proses booking/pembayaran nanti admin yang bantu langsung agar lebih aman.";
}

export function waAiOutsideHoursMessage() {
  return "Siap nggih, saya bantu cekkan dari katalog dulu.\n\nUntuk proses ambil, booking, atau validasi stok fisik, admin akan bantu saat jam operasional. Mau saya pilihkan opsi yang paling cocok dulu?";
}

export function waAiCatalogErrorMessage() {
  return "Mohon maaf nggih, data katalog sedang belum bisa saya cek dengan aman. Saya teruskan ke admin supaya tidak salah info stok atau harga.";
}

export function waAiAdminRequiredMessage() {
  return "Siap nggih, untuk bagian ini saya teruskan ke admin agar dibantu langsung dan datanya aman.";
}

export function waAiGeneralServiceBridgeMessage() {
  return "Baik nggih, untuk servis kami cekkan ulang terlebih dahulu ya supaya datanya pasti. Mohon ditunggu sebentar, admin akan bantu langsung.";
}

export function formatWaLocation(location: SaleLocation | string) {
  return location === "KAJEN" ? "Kajen" : "Wiradesa";
}
