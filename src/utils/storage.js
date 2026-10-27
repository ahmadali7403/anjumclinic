import { useEffect, useState } from "react";

export const DEFAULT_PHARMACY_SETTINGS = {
  pharmacyName: "MediPOS Pharmacy",
  address: "",
  phone: "",
  logo: "",
};

// Save React state in browser storage
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch (error) {
      console.error(`MediPOS: ${key} load nahi ho saka.`, error);
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`MediPOS: ${key} save nahi ho saka.`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

// Generate bill numbers such as B-0001, B-0002
export const formatBillNo = (n) => `B-${String(n).padStart(4, "0")}`;

// Download text or JSON files
export function downloadTextFile(fileName, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Create a complete MediPOS backup
export function createBackup({
  medicines,
  sales,
  billCounter,
  settings = DEFAULT_PHARMACY_SETTINGS,
}) {
  const backup = {
    app: "MediPOS",
    version: 2,
    exportedAt: new Date().toISOString(),

    medicines: Array.isArray(medicines) ? medicines : [],
    sales: Array.isArray(sales) ? sales : [],
    billCounter: Math.max(0, Number(billCounter) || 0),

    settings: {
      ...DEFAULT_PHARMACY_SETTINGS,
      ...(settings || {}),
    },
  };

  return JSON.stringify(backup, null, 2);
}

// Read and validate a MediPOS backup.
// Supports older backups that do not contain pharmacy settings.
export function parseBackup(text) {
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "Backup file valid JSON nahi hai. Sahi MediPOS backup select karein.",
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Backup file ka format sahi nahi hai.");
  }

  if (data.app !== "MediPOS") {
    throw new Error("Ye MediPOS backup file nahi hai.");
  }

  if (!Array.isArray(data.medicines) || !Array.isArray(data.sales)) {
    throw new Error("Backup mein medicines ya sales ka data missing hai.");
  }

  // Find the largest existing bill number so new bills
  // do not accidentally reuse an old bill number.
  const maxBillNo = data.sales.reduce((max, sale) => {
    const digits = String(sale?.billNo || "").match(/\d+/g);
    const number = digits ? Number(digits.join("")) : 0;

    return Math.max(max, Number.isFinite(number) ? number : 0);
  }, 0);

  const existingCounter = Number(data.billCounter) || 0;

  const settings =
    data.settings &&
    typeof data.settings === "object" &&
    !Array.isArray(data.settings)
      ? data.settings
      : {};

  return {
    medicines: data.medicines,
    sales: data.sales,

    billCounter: Math.max(0, existingCounter, maxBillNo),

    settings: {
      ...DEFAULT_PHARMACY_SETTINGS,
      pharmacyName:
        typeof settings.pharmacyName === "string"
          ? settings.pharmacyName
          : DEFAULT_PHARMACY_SETTINGS.pharmacyName,
      address: typeof settings.address === "string" ? settings.address : "",
      phone: typeof settings.phone === "string" ? settings.phone : "",
      logo: typeof settings.logo === "string" ? settings.logo : "",
    },
  };
}
