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

export function catalogImageCandidates(url?: string | null) {
  if (!url) return [];
  const driveId = getGoogleDriveFileId(url);
  if (!driveId) return [url];

  return [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${driveId}=w1200`,
    `https://drive.google.com/uc?export=view&id=${driveId}`,
    url
  ];
}
