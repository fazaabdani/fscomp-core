import { catalogReadyStatuses, type UnitStatus } from "./constants";

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
  hardware: Record<string, "OK" | "NOTES" | "FAIL">;
  software: Record<string, "OK" | "NOTES" | "FAIL">;
  status: UnitStatus;
  reminder: string[];
  catatan: string;
};

export type DailyQC = {
  id: string;
  unitId: string;
  tanggal: string;
  checker: string;
  kondisiHariIni: string;
  masihLolos: "Lolos" | "Lolos dengan catatan" | "Tidak Lolos";
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
        Layar: "OK",
        Keyboard: "OK",
        Touchpad: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Charger: "OK",
        Battery: "OK",
        SSD: "OK"
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
        Layar: "OK",
        Keyboard: "OK",
        Touchpad: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Charger: "OK",
        Battery: "NOTES",
        SSD: "OK"
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
        Layar: "OK",
        Keyboard: "NOTES",
        Touchpad: "OK",
        Port: "OK",
        "Speaker/Mic": "OK",
        Charger: "OK",
        Battery: "NOTES",
        SSD: "NOTES"
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
        Layar: "OK",
        Keyboard: "OK",
        Touchpad: "FAIL",
        Port: "OK",
        "Speaker/Mic": "OK",
        Charger: "OK",
        Battery: "FAIL",
        SSD: "NOTES"
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
    kondisiHariIni: "Nyala normal, booting cepat, WiFi aktif.",
    masihLolos: "Lolos",
    catatan: "Tetap siap katalog."
  },
  {
    id: "daily-002",
    unitId: "unit-001a",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    kondisiHariIni: "Booting normal, battery turun 8 persen dalam 20 menit.",
    masihLolos: "Lolos dengan catatan",
    catatan: "Perlu catatan battery di listing."
  },
  {
    id: "daily-003",
    unitId: "unit-002",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
    kondisiHariIni: "WiFi sempat disconnect saat sleep resume.",
    masihLolos: "Lolos dengan catatan",
    catatan: "Recheck driver WiFi."
  },
  {
    id: "daily-004",
    unitId: "unit-003",
    tanggal: "2026-05-20",
    checker: "Anak Magang",
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
