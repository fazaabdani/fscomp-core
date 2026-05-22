import { catalogReadyStatuses, type DailyStatus, type QcResult, type UnitStatus } from "./constants";

export type BatchPSI = {
  id: string;
  nomorBatch: string;
  supplier: string;
  tanggalMasuk: string;
  tanggalTempo: string;
  statusPembayaran: "Belum jatuh tempo" | "Mendekati tempo" | "Butuh follow up" | "Lunas";
  catatan: string;
};

export type InitialQC = {
  checker: string;
  tanggal: string;
  hardware: Record<string, QcResult>;
  software: Record<string, QcResult>;
  status: UnitStatus;
  reminder: string[];
  catatan: string;
};

export type DailyQC = {
  id: string;
  unitId: string;
  tanggal: string;
  checker: string;
  ssdHealth: number;
  batteryHealth: number;
  ssdSerial: string;
  screenCondition: string;
  windowsVersion: string;
  driverStatus: string;
  clockStatus: string;
  appStatus: string;
  officeStatus: string;
  partitionCount: number;
  kondisiHariIni: string;
  masihLolos: DailyStatus;
  catatan: string;
};

export type Unit = {
  id: string;
  nomorUnit: string;
  batchId: string;
  supplier: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  ssdSerial: string;
  lcdSize: string;
  lcdResolution: string;
  isTouchscreen: boolean;
  hargaModal: number;
  hargaJualRekomendasi: number;
  batteryHealth: number;
  ssdHealth: number;
  statusObservasi: UnitStatus;
  tanggalMasuk: string;
  tempo: string;
  qcAwal: InitialQC;
};

export type AILog = {
  id: string;
  unitId: string;
  tanggal: string;
  rekomendasi: string;
  status: "open" | "done";
};

export const batches: BatchPSI[] = [
  {
    id: "psi-2026-05-a",
    nomorBatch: "PSI-2026-05-A",
    supplier: "PSI Jakarta",
    tanggalMasuk: "2026-05-15",
    tanggalTempo: "2026-05-29",
    statusPembayaran: "Mendekati tempo",
    catatan: "Batch Lenovo/HP campur, fokus cek battery dan engsel."
  },
  {
    id: "psi-2026-05-b",
    nomorBatch: "PSI-2026-05-B",
    supplier: "PSI Bandung",
    tanggalMasuk: "2026-05-18",
    tanggalTempo: "2026-06-02",
    statusPembayaran: "Belum jatuh tempo",
    catatan: "Unit tipis bisnis, prioritas katalog minggu ini."
  }
];

export const units: Unit[] = [
  {
    id: "unit-001",
    nomorUnit: "1",
    batchId: "psi-2026-05-a",
    supplier: "PSI Jakarta",
    model: "Lenovo ThinkPad T480",
    processor: "Intel Core i5 Gen 8",
    ram: "16GB DDR4",
    ssd: "256GB NVMe",
    ssdSerial: "SN-T480-256-8F2A",
    lcdSize: "14 inch",
    lcdResolution: "1920x1080",
    isTouchscreen: false,
    hargaModal: 2850000,
    hargaJualRekomendasi: 3650000,
    batteryHealth: 84,
    ssdHealth: 98,
    statusObservasi: "VERIFIED",
    tanggalMasuk: "2026-05-15",
    tempo: "2026-05-29",
    qcAwal: {
      checker: "Ludfy",
      tanggal: "2026-05-16",
      hardware: {
        Body: "OK",
        "Body Broken": "OK",
        "Karet Bawah": "OK",
        Repaint: "OK",
        Layar: "OK",
        "Ukuran LCD": "OK",
        "Resolusi Layar": "OK",
        Touchscreen: "OK",
        Keyboard: "OK",
        Touchpad: "OK",
        Trackpoint: "OK",
        USB: "OK",
        Kamera: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Speaker: "OK",
        Mic: "OK",
        Charger: "OK",
        Battery: "OK",
        SSD: "OK",
        "Seri SSD": "OK"
      },
      software: {
        OS: "OK",
        "Update OS": "OK",
        Driver: "OK",
        "Security Patch": "OK",
        "Aplikasi Default": "OK"
      },
      status: "VERIFIED",
      reminder: ["Update Chrome saat masuk katalog"],
      catatan: "Siap masuk katalog, kondisi keyboard masih bersih."
    }
  },
  {
    id: "unit-001a",
    nomorUnit: "1a",
    batchId: "psi-2026-05-a",
    supplier: "PSI Jakarta",
    model: "HP EliteBook 840 G5",
    processor: "Intel Core i5 Gen 8",
    ram: "8GB DDR4",
    ssd: "256GB SATA",
    ssdSerial: "HP840G5-SATA-731Q",
    lcdSize: "14 inch",
    lcdResolution: "1920x1080",
    isTouchscreen: false,
    hargaModal: 2550000,
    hargaJualRekomendasi: 3350000,
    batteryHealth: 71,
    ssdHealth: 94,
    statusObservasi: "VERIFIED WITH NOTES",
    tanggalMasuk: "2026-05-15",
    tempo: "2026-05-29",
    qcAwal: {
      checker: "Rosyadi",
      tanggal: "2026-05-16",
      hardware: {
        Body: "NOTES",
        "Body Broken": "OK",
        "Karet Bawah": "NOTES",
        Repaint: "OK",
        Layar: "OK",
        "Ukuran LCD": "OK",
        "Resolusi Layar": "OK",
        Touchscreen: "OK",
        Keyboard: "OK",
        Touchpad: "OK",
        Trackpoint: "OK",
        USB: "OK",
        Kamera: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Speaker: "OK",
        Mic: "OK",
        Charger: "OK",
        Battery: "NOTES",
        SSD: "OK",
        "Seri SSD": "OK"
      },
      software: {
        OS: "OK",
        "Update OS": "NOTES",
        Driver: "OK",
        "Security Patch": "NOTES",
        "Aplikasi Default": "OK"
      },
      status: "VERIFIED WITH NOTES",
      reminder: ["Cek update Windows", "Tulis catatan battery di katalog"],
      catatan: "Body ada baret tipis, battery masih layak tapi jangan klaim premium."
    }
  },
  {
    id: "unit-002",
    nomorUnit: "2",
    batchId: "psi-2026-05-b",
    supplier: "PSI Bandung",
    model: "Dell Latitude 5490",
    processor: "Intel Core i5 Gen 8",
    ram: "8GB DDR4",
    ssd: "512GB NVMe",
    ssdSerial: "DL5490-NVME-52CZ",
    lcdSize: "14 inch",
    lcdResolution: "1366x768",
    isTouchscreen: false,
    hargaModal: 2750000,
    hargaJualRekomendasi: 3550000,
    batteryHealth: 62,
    ssdHealth: 88,
    statusObservasi: "RECHECK",
    tanggalMasuk: "2026-05-18",
    tempo: "2026-06-02",
    qcAwal: {
      checker: "Ludfy",
      tanggal: "2026-05-19",
      hardware: {
        Body: "OK",
        "Body Broken": "OK",
        "Karet Bawah": "OK",
        Repaint: "NOTES",
        Layar: "OK",
        "Ukuran LCD": "OK",
        "Resolusi Layar": "NOTES",
        Touchscreen: "OK",
        Keyboard: "NOTES",
        Touchpad: "OK",
        Trackpoint: "OK",
        USB: "OK",
        Kamera: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Speaker: "OK",
        Mic: "OK",
        Charger: "OK",
        Battery: "NOTES",
        SSD: "NOTES",
        "Seri SSD": "OK"
      },
      software: {
        OS: "OK",
        "Update OS": "OK",
        Driver: "NOTES",
        "Security Patch": "OK",
        "Aplikasi Default": "OK"
      },
      status: "RECHECK",
      reminder: ["Recheck SSD health", "Install ulang driver WiFi"],
      catatan: "Keyboard tombol panah bawah terasa keras, perlu cek ulang sebelum katalog."
    }
  },
  {
    id: "unit-003",
    nomorUnit: "3",
    batchId: "psi-2026-05-b",
    supplier: "PSI Bandung",
    model: "Acer TravelMate P249",
    processor: "Intel Core i5 Gen 7",
    ram: "8GB DDR4",
    ssd: "128GB SATA",
    ssdSerial: "ACERP249-128-19ZX",
    lcdSize: "14 inch",
    lcdResolution: "1366x768",
    isTouchscreen: false,
    hargaModal: 1850000,
    hargaJualRekomendasi: 2550000,
    batteryHealth: 39,
    ssdHealth: 76,
    statusObservasi: "CANDIDATE RETUR",
    tanggalMasuk: "2026-05-18",
    tempo: "2026-06-02",
    qcAwal: {
      checker: "Rosyadi",
      tanggal: "2026-05-19",
      hardware: {
        Body: "NOTES",
        "Body Broken": "NOTES",
        "Karet Bawah": "FAIL",
        Repaint: "NOTES",
        Layar: "OK",
        "Ukuran LCD": "OK",
        "Resolusi Layar": "OK",
        Touchscreen: "OK",
        Keyboard: "OK",
        Touchpad: "FAIL",
        Trackpoint: "OK",
        USB: "NOTES",
        Kamera: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Speaker: "OK",
        Mic: "OK",
        Charger: "OK",
        Battery: "FAIL",
        SSD: "NOTES",
        "Seri SSD": "OK"
      },
      software: {
        OS: "OK",
        "Update OS": "NOTES",
        Driver: "FAIL",
        "Security Patch": "OK",
        "Aplikasi Default": "OK"
      },
      status: "CANDIDATE RETUR",
      reminder: ["Ajukan retur atau minta potongan besar"],
      catatan: "Touchpad sering loncat dan battery drop cepat. Jangan masuk katalog."
    }
  }
];

export const dailyQcs: DailyQC[] = [
  {
    id: "daily-001",
    unitId: "unit-001",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    ssdHealth: 98,
    batteryHealth: 84,
    ssdSerial: "SN-T480-256-8F2A",
    screenCondition: "Normal",
    windowsVersion: "Windows 11",
    driverStatus: "OK",
    clockStatus: "Sesuai",
    appStatus: "Lengkap",
    officeStatus: "Original / resmi",
    partitionCount: 2,
    kondisiHariIni: "Nyala normal, booting cepat, WiFi aktif.",
    masihLolos: "Lolos",
    catatan: "Tetap siap katalog."
  },
  {
    id: "daily-002",
    unitId: "unit-001a",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    ssdHealth: 94,
    batteryHealth: 71,
    ssdSerial: "HP840G5-SATA-731Q",
    screenCondition: "Normal",
    windowsVersion: "Windows 11",
    driverStatus: "OK",
    clockStatus: "Sesuai",
    appStatus: "Lengkap",
    officeStatus: "Original / resmi",
    partitionCount: 2,
    kondisiHariIni: "Booting normal, battery turun 8 persen dalam 20 menit.",
    masihLolos: "Lolos dengan catatan",
    catatan: "Perlu catatan battery di listing."
  },
  {
    id: "daily-003",
    unitId: "unit-002",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    ssdHealth: 88,
    batteryHealth: 62,
    ssdSerial: "DL5490-NVME-52CZ",
    screenCondition: "White spot",
    windowsVersion: "Windows 10",
    driverStatus: "Perlu update",
    clockStatus: "Sesuai",
    appStatus: "Belum lengkap",
    officeStatus: "Tidak dicek",
    partitionCount: 1,
    kondisiHariIni: "WiFi sempat disconnect saat sleep resume.",
    masihLolos: "Lolos dengan catatan",
    catatan: "Recheck driver WiFi."
  },
  {
    id: "daily-004",
    unitId: "unit-003",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    ssdHealth: 76,
    batteryHealth: 39,
    ssdSerial: "ACERP249-128-19ZX",
    screenCondition: "Normal",
    windowsVersion: "Windows 10",
    driverStatus: "Bermasalah",
    clockStatus: "Perlu setting",
    appStatus: "Belum lengkap",
    officeStatus: "Tidak dicek",
    partitionCount: 1,
    kondisiHariIni: "Touchpad masih bermasalah, battery drop.",
    masihLolos: "Tidak Lolos",
    catatan: "Tahan, jangan katalog."
  }
];

export const aiLogs: AILog[] = [
  {
    id: "ai-001",
    unitId: "unit-003",
    tanggal: "2026-05-20",
    rekomendasi: "Prioritaskan retur untuk unit 3 karena battery dan touchpad gagal.",
    status: "open"
  },
  {
    id: "ai-002",
    unitId: "unit-001a",
    tanggal: "2026-05-20",
    rekomendasi: "Unit 1a boleh katalog dengan catatan battery dan update OS.",
    status: "open"
  }
];

export function getBatch(id: string) {
  return batches.find((batch) => batch.id === id);
}

export function getUnit(id: string) {
  return units.find((unit) => unit.id === id);
}

export function getUnitsByBatch(batchId: string) {
  return units.filter((unit) => unit.batchId === batchId);
}

export function getDailyQcByUnit(unitId: string) {
  return dailyQcs.filter((qc) => qc.unitId === unitId);
}

export function getCatalogReadyUnits() {
  return units.filter((unit) => catalogReadyStatuses.includes(unit.statusObservasi));
}

export function getProblemUnits() {
  return units.filter((unit) => unit.statusObservasi === "RECHECK" || unit.statusObservasi === "CANDIDATE RETUR");
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}
