export const QC_DUE_HOURS = 30;
export const QC_DUE_MS = QC_DUE_HOURS * 60 * 60 * 1000;

export function qcDueThreshold(now = new Date()) {
  return new Date(now.getTime() - QC_DUE_MS);
}

export function isQcFresh(tanggal?: Date | null, now = new Date()) {
  return Boolean(tanggal && tanggal.getTime() >= qcDueThreshold(now).getTime());
}

export function qcAgeHours(tanggal?: Date | null, now = new Date()) {
  if (!tanggal) return null;
  return Math.max(0, Math.floor((now.getTime() - tanggal.getTime()) / (60 * 60 * 1000)));
}
