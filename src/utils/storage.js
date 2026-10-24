import { useEffect, useState } from "react";

// useState jaisa hook, jo value localStorage mein bhi save karta hai
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full ya blocked */
    }
  }, [key, value]);

  return [value, setValue];
}

export const formatBillNo = (n) => `B-${String(n).padStart(4, "0")}`;

export function downloadTextFile(fileName, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createBackup({ medicines, sales, billCounter }) {
  return JSON.stringify(
    {
      app: "MediPOS",
      version: 1,
      exportedAt: new Date().toISOString(),
      medicines,
      sales,
      billCounter,
    },
    null,
    2,
  );
}

export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Ye valid backup file nahi hai.");
  }
  if (
    data?.app !== "MediPOS" ||
    !Array.isArray(data.medicines) ||
    !Array.isArray(data.sales)
  ) {
    throw new Error("Ye MediPOS ki backup file nahi hai.");
  }
  const maxBillNo = data.sales.reduce(
    (max, s) =>
      Math.max(max, parseInt(String(s.billNo).replace(/\D/g, ""), 10) || 0),
    0,
  );
  return {
    medicines: data.medicines,
    sales: data.sales,
    billCounter: Math.max(Number(data.billCounter) || 0, maxBillNo),
  };
}
