// Penanda "lalu lintas internal": kunjungan tim sendiri (dan lingkungan uji) tidak boleh ikut dihitung di GA4, Meta Pixel,
// maupun analitik katalog first-party. Staf yang SEDANG login sudah otomatis dilewati lewat cookie sesi; penanda ini untuk
// perangkat yang sering membuka katalog TANPA login (HP tim, laptop toko, perangkat uji).
export const INTERNAL_COOKIE = "fscomp_internal";
export const INTERNAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$|\.(local|test|localhost)(:\d+)?$/i;

export function isLocalHost(host: string | null | undefined) {
  return Boolean(host && LOCAL_HOST.test(host.trim()));
}

/** True bila permintaan ini harus dianggap internal: cookie penanda aktif, atau host adalah lingkungan lokal/uji. */
export function isInternalTraffic(cookieValue: string | null | undefined, host: string | null | undefined) {
  return cookieValue === "1" || isLocalHost(host);
}
