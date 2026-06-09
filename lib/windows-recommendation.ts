function intelGeneration(processor: string) {
  const normalized = processor.toLowerCase();
  const genMatch = normalized.match(/\bgen\s*(\d{1,2})\b/);
  if (genMatch) return Number(genMatch[1]);

  const intelCodeMatch = normalized.match(/\b[ui][3579][- ]?(\d{4,5})[a-z]{0,2}\b/);
  if (!intelCodeMatch) return null;

  const code = intelCodeMatch[1];
  return code.length === 5 ? Number(code.slice(0, 2)) : Number(code.slice(0, 1));
}

function ryzenSeries(processor: string) {
  const normalized = processor.toLowerCase();
  const ryzenMatch = normalized.match(/\bryzen\s*[3579]?\s*(\d{4})[a-z]{0,2}\b/);
  if (ryzenMatch) return Number(ryzenMatch[1]);

  const amdMatch = normalized.match(/\b(\d{4})[a-z]{0,2}\b/);
  if (normalized.includes("ryzen") && amdMatch) return Number(amdMatch[1]);

  return null;
}

export function recommendedWindowsVersion(processor: string) {
  const normalized = processor.toLowerCase();
  const amdSeries = ryzenSeries(processor);
  if (normalized.includes("ryzen") || normalized.includes("amd")) {
    return amdSeries !== null && amdSeries >= 3000 ? "Windows 11" : "Windows 10";
  }

  const gen = intelGeneration(processor);
  return gen !== null && gen >= 8 ? "Windows 11" : "Windows 10";
}

export function windowsVersionReminder(processor: string, actualWindowsVersion: string) {
  const recommended = recommendedWindowsVersion(processor);
  return actualWindowsVersion === recommended ? "" : `OS belum sesuai: ${actualWindowsVersion}, rekomendasi ${recommended}`;
}
