export type PcCompatibilityComponent = {
  id: string;
  category: string;
  socket: string | null;
  supportedSockets: string[];
  memoryType: string | null;
  formFactor: string | null;
  supportedFormFactors: string[];
  storageInterface: string | null;
  supportedStorageInterfaces: string[];
  powerDraw: number | null;
  psuCapacity: number | null;
  gpuLengthMm: number | null;
  maxGpuLengthMm: number | null;
  coolerHeightMm: number | null;
  maxCoolerHeightMm: number | null;
  radiatorSizeMm: number | null;
  supportedRadiatorSizes: number[];
};

export type PcCompatibilityIssue = { key: string; level: "bad" | "warn"; message: string };

function normalized(value?: string | null) { return value?.trim().toUpperCase().replace(/MICRO[- ]?ATX/, "MATX") ?? ""; }
function includesNormalized(values: string[], value: string | null) { const target = normalized(value); return !target || values.map(normalized).includes(target); }

export function pcPowerLoad(components: PcCompatibilityComponent[]) {
  return components.reduce((sum, component) => sum + Math.max(0, component.powerDraw ?? 0), 0);
}

export function getPcCompatibilityIssues(components: PcCompatibilityComponent[]): PcCompatibilityIssue[] {
  const part = (category: string) => components.find((item) => item.category === category);
  const cpu = part("CPU"), motherboard = part("MOTHERBOARD"), ram = part("RAM"), storage = part("STORAGE"), gpu = part("GPU"), psu = part("PSU"), casing = part("CASING"), cooler = part("COOLER");
  const issues: PcCompatibilityIssue[] = [];
  if (cpu?.socket && motherboard?.socket && normalized(cpu.socket) !== normalized(motherboard.socket)) issues.push({ key:"socket",level:"bad",message:`Socket CPU ${cpu.socket} tidak cocok dengan motherboard ${motherboard.socket}.` });
  if (ram?.memoryType && motherboard?.memoryType && normalized(ram.memoryType) !== normalized(motherboard.memoryType)) issues.push({ key:"memory",level:"bad",message:`RAM ${ram.memoryType} tidak cocok dengan motherboard ${motherboard.memoryType}.` });
  if (cpu?.memoryType && motherboard?.memoryType && normalized(cpu.memoryType) !== normalized(motherboard.memoryType)) issues.push({ key:"cpu-memory",level:"bad",message:`Kontroler memori CPU ${cpu.memoryType} tidak cocok dengan motherboard ${motherboard.memoryType}.` });
  if (motherboard?.formFactor && casing?.supportedFormFactors.length && !includesNormalized(casing.supportedFormFactors,motherboard.formFactor)) issues.push({ key:"case-form",level:"bad",message:`Casing tidak mendukung motherboard ${motherboard.formFactor}.` });
  if (storage?.storageInterface && motherboard?.supportedStorageInterfaces.length && !includesNormalized(motherboard.supportedStorageInterfaces,storage.storageInterface)) issues.push({ key:"storage",level:"bad",message:`Motherboard tidak menyediakan interface ${storage.storageInterface}.` });
  if (gpu?.gpuLengthMm && casing?.maxGpuLengthMm && gpu.gpuLengthMm > casing.maxGpuLengthMm) issues.push({ key:"gpu-length",level:"bad",message:`GPU ${gpu.gpuLengthMm} mm melebihi ruang casing ${casing.maxGpuLengthMm} mm.` });
  if (cooler?.supportedSockets.length && cpu?.socket && !includesNormalized(cooler.supportedSockets,cpu.socket)) issues.push({ key:"cooler-socket",level:"bad",message:`Cooler tidak mendukung socket ${cpu.socket}.` });
  if (cooler?.coolerHeightMm && casing?.maxCoolerHeightMm && cooler.coolerHeightMm > casing.maxCoolerHeightMm) issues.push({ key:"cooler-height",level:"bad",message:`Cooler ${cooler.coolerHeightMm} mm terlalu tinggi untuk casing ${casing.maxCoolerHeightMm} mm.` });
  if (cooler?.radiatorSizeMm && casing?.supportedRadiatorSizes.length && !casing.supportedRadiatorSizes.includes(cooler.radiatorSizeMm)) issues.push({ key:"radiator",level:"bad",message:`Casing tidak mendukung radiator ${cooler.radiatorSizeMm} mm.` });
  const load = pcPowerLoad(components);
  if (psu?.psuCapacity && load) {
    if (psu.psuCapacity < load) issues.push({ key:"psu",level:"bad",message:`PSU ${psu.psuCapacity}W di bawah beban estimasi ${load}W.` });
    else if (psu.psuCapacity < Math.ceil(load * 1.25)) issues.push({ key:"psu",level:"warn",message:`PSU ${psu.psuCapacity}W terlalu mepet. Disarankan minimal ${Math.ceil(load * 1.25)}W.` });
  }
  return issues;
}

export function candidateCompatibility(selected: PcCompatibilityComponent[], candidate: PcCompatibilityComponent) {
  const withoutSameCategory = selected.filter((item) => item.category !== candidate.category);
  const relevantKeys: Record<string,string[]> = {
    CPU:["socket","cpu-memory","cooler-socket","psu"], MOTHERBOARD:["socket","memory","cpu-memory","case-form","storage","psu"],
    RAM:["memory","psu"], GPU:["gpu-length","psu"], STORAGE:["storage","psu"], PSU:["psu"],
    CASING:["case-form","gpu-length","cooler-height","radiator","psu"], COOLER:["cooler-socket","cooler-height","radiator","psu"]
  };
  const keys = relevantKeys[candidate.category] ?? ["psu"];
  return getPcCompatibilityIssues([...withoutSameCategory,candidate]).filter((issue) => keys.includes(issue.key));
}
