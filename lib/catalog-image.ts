export function getGoogleDriveFileId(url?: string | null) {
  if (!url) return "";
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (url.includes("drive.google.com") && idMatch) return idMatch[1];
  return "";
}

export function displayCatalogImageUrl(url?: string | null) {
  if (!url) return "";
  const driveId = getGoogleDriveFileId(url);
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}=w1000`;
  return url;
}

export function catalogImageCandidates(url?: string | null, requestedWidth = 1200) {
  if (!url) return [];
  const driveId = getGoogleDriveFileId(url);
  if (!driveId) return [url];
  const width = Math.min(1600, Math.max(320, Math.round(requestedWidth)));

  return [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${driveId}=w${width}`,
    `https://drive.google.com/uc?export=view&id=${driveId}`,
    url
  ];
}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}:/i,
  /^\[?fe80:/i
];

export function isSafeExternalImageUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return !PRIVATE_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname));
}

export function brandOf(model: string) {
  const normalized = model.trim().toUpperCase();
  if (normalized.startsWith("LENOVO")) return "Lenovo";
  if (normalized.startsWith("HP")) return "HP";
  if (normalized.startsWith("DELL")) return "Dell";
  if (normalized.startsWith("ASUS")) return "Asus";
  if (normalized.startsWith("ACER")) return "Acer";
  if (normalized.startsWith("TOSHIBA")) return "Toshiba";
  if (normalized.startsWith("ADVAN")) return "Advan";
  return model.trim().split(/\s+/)[0] || "Lainnya";
}

export const genericCatalogImageCandidates = [
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=1000&q=80"
];
