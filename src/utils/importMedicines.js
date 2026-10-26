import * as XLSX from "xlsx";

// Header ke alag alag naam samajhne ke liye
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
  price: ["price", "rate", "mrp", "sale price", "unit price", "retail price"],
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
};

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[_\-.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (v) => parseFloat(String(v).replace(/[^0-9.]/g, ""));

export async function parseMedicineFile(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", codepage: 65001 });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("File khali hai.");

  const headers = Object.keys(rows[0]);
  const pick = (field) => headers.find((h) => ALIASES[field].includes(norm(h)));
  const cols = {
    name: pick("name"),
    company: pick("company"),
    price: pick("price"),
    stock: pick("stock"),
    formula: pick("formula"),
  };

  if (!cols.name || !cols.price) {
    throw new Error(
      `Header mein "Name" aur "Price" column zaroori hai. Aap ki file ke headers: ${headers.join(", ")}`,
    );
  }

  const medicines = [];
  let skipped = 0;

  rows.forEach((row) => {
    const name = String(row[cols.name]).trim();
    const price = toNumber(row[cols.price]);
    if (!name || !Number.isFinite(price)) {
      skipped++;
      return;
    }

    const rawStock = cols.stock ? row[cols.stock] : "";
    const stockNum = rawStock === "" ? NaN : toNumber(rawStock);

    medicines.push({
      id: medicines.length + 1,
      name,
      company: cols.company ? String(row[cols.company]).trim() : "",
      price,
      formula: cols.formula ? String(row[cols.formula]).trim() : "",
      // stock column na ho ya khali ho to stock track nahi hoga
      stock: Number.isFinite(stockNum)
        ? Math.max(0, Math.round(stockNum))
        : null,
    });
  });

  if (medicines.length === 0) throw new Error("Koi valid row nahi mili.");
  return { medicines, skipped };
}
