import * as XLSX from "xlsx";

const ALIASES = {
  name: [
    "name",
    "medicine",
    "medicine name",
    "item",
    "item name",
    "product",
    "product name",
    "drug",
  ],
  company: ["company", "manufacturer", "brand", "mfg", "supplier"],
  price: ["price", "rate", "mrp", "sale price", "retail price"],
  unitPrice: ["unit price", "tablet price", "single price", "per unit price"],
  stock: ["stock", "qty", "quantity", "available", "in stock", "balance"],
  formula: [
    "formula",
    "generic",
    "generic name",
    "salt",
    "composition",
    "ingredient",
    "active ingredient",
  ],
  batch: ["batch", "batch no", "batch number", "lot", "lot number"],
  expiry: [
    "expiry",
    "expiry date",
    "expiration",
    "expiration date",
    "exp date",
  ],
};

const normalizeHeader = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[_\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (!cleaned) return NaN;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
};

const getCell = (row, column) => (column ? (row[column] ?? "") : "");

const getText = (row, column) => String(getCell(row, column)).trim();

const getNumber = (row, column) => {
  const value = getCell(row, column);
  return value === "" || value == null ? NaN : toNumber(value);
};

const getColumn = (headers, field) =>
  headers.find((header) => ALIASES[field].includes(normalizeHeader(header)));

const normalizeExpiry = (value) => {
  if (value === "" || value == null) return "";

  // Excel may store dates as serial numbers.
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = XLSX.SSF.parse_date_code(value);

    if (date?.y && date?.m) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(
        date.d || 1,
      ).padStart(2, "0")}`;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();

  // Preserve ISO dates as entered.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  // Convert DD/MM/YYYY or DD-MM-YYYY.
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  }

  return text;
};

export async function parseMedicineFile(file) {
  if (!file) {
    throw new Error("Pehle medicine file select karein.");
  }

  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("File mein koi worksheet nahi mili.");
  }

  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true,
  });

  if (rows.length === 0) {
    throw new Error("File khali hai.");
  }

  const headers = Object.keys(rows[0]);

  const columns = {
    name: getColumn(headers, "name"),
    company: getColumn(headers, "company"),
    price: getColumn(headers, "price"),
    unitPrice: getColumn(headers, "unitPrice"),
    stock: getColumn(headers, "stock"),
    formula: getColumn(headers, "formula"),
    batch: getColumn(headers, "batch"),
    expiry: getColumn(headers, "expiry"),
  };

  if (!columns.name || !columns.price) {
    throw new Error(
      `File mein "Name" aur "Price" columns zaroori hain. ` +
        `Maujooda headers: ${headers.join(", ")}`,
    );
  }

  const medicines = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const name = getText(row, columns.name);
    const price = getNumber(row, columns.price);

    if (!name || !Number.isFinite(price) || price < 0) {
      skipped += 1;
      return;
    }

    const rawStock = getCell(row, columns.stock);
    const stockValue =
      rawStock === "" || rawStock == null ? NaN : toNumber(rawStock);

    const rawUnitPrice = getNumber(row, columns.unitPrice);

    medicines.push({
      id: `import-${Date.now()}-${index}`,
      name,
      company: getText(row, columns.company),
      price,
      formula: getText(row, columns.formula),
      stock: Number.isFinite(stockValue)
        ? Math.max(0, Math.round(stockValue))
        : null,

      // Optional fields for the next MediPOS features.
      batch: getText(row, columns.batch),
      expiry: normalizeExpiry(getCell(row, columns.expiry)),
      unitPrice:
        Number.isFinite(rawUnitPrice) && rawUnitPrice >= 0
          ? rawUnitPrice
          : null,
    });
  });

  if (medicines.length === 0) {
    throw new Error(
      "Koi valid medicine nahi mili. Name aur Price values check karein.",
    );
  }

  return { medicines, skipped };
}
