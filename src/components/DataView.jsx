import { useRef, useState } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { parseMedicineFile } from "../utils/importMedicines";
import { createBackup, parseBackup, downloadTextFile } from "../utils/storage";

const card = "rounded-lg border border-stone-300 bg-white p-5";

const primaryBtn =
  "flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800";

const outlineBtn =
  "flex items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100";

const keyOf = (m) =>
  `${m.name}|${m.company}`.toLowerCase().replace(/\s+/g, " ").trim();

// Mode 1: Purani list safe, nayi medicines add aur existing update.
function addOrUpdate(incoming, existing) {
  const list = existing.map((m) => ({ ...m }));
  const index = new Map(list.map((m, i) => [keyOf(m), i]));

  let nextId = list.reduce((mx, m) => Math.max(mx, Number(m.id) || 0), 0) + 1;

  let added = 0;
  let updated = 0;

  incoming.forEach((m) => {
    const k = keyOf(m);

    if (index.has(k)) {
      const i = index.get(k);
      const cur = list[i];

      const changed =
        cur.price !== m.price || (m.formula && m.formula !== cur.formula);

      list[i] = {
        ...cur,
        price: m.price,
        formula: m.formula || cur.formula || "",
        stock: m.stock ?? cur.stock ?? null,
      };

      if (changed) updated++;
    } else {
      index.set(k, list.length);

      list.push({
        ...m,
        id: nextId++,
        formula: m.formula || "",
        stock: m.stock ?? null,
      });

      added++;
    }
  });

  return { merged: list, added, updated };
}

// Mode 2: Puri list replace, matching medicines ka stock/formula safe.
function replaceKeepingData(incoming, existing) {
  const old = new Map(existing.map((m) => [keyOf(m), m]));
  let keptStock = 0;

  const merged = incoming.map((m, i) => {
    const prev = old.get(keyOf(m));

    let stock = m.stock;
    let formula = m.formula || "";

    if (prev) {
      if (stock == null && prev.stock != null) {
        stock = prev.stock;
        keptStock++;
      }

      if (!formula && prev.formula) {
        formula = prev.formula;
      }
    }

    return {
      ...m,
      id: i + 1,
      stock: stock ?? null,
      formula,
    };
  });

  return { merged, keptStock };
}

export default function DataView({
  medicines,
  sales,
  billCounter,
  settings,
  onReplaceMedicines,
  onRestore,
  notify,
}) {
  const importRef = useRef(null);
  const restoreRef = useRef(null);

  const [mode, setMode] = useState("add");

  const trackedCount = medicines.filter((m) => m.stock != null).length;
  const formulaCount = medicines.filter((m) => m.formula).length;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    try {
      const { medicines: list, skipped } = await parseMedicineFile(file);
      const skipNote = skipped ? ` (${skipped} rows skip hui)` : "";

      if (mode === "add") {
        const { merged, added, updated } = addOrUpdate(list, medicines);

        const msg =
          `File mein ${list.length} medicines mili${skipNote}.\n` +
          `${added} nayi add hongi, ${updated} ki price ya formula update hogi.\n` +
          `Baaqi list aur stock jyun ka tyun rahe ga.\nContinue?`;

        if (!window.confirm(msg)) return;

        onReplaceMedicines(merged);
        notify(`${added} nayi medicines add, ${updated} update hui`);
      } else {
        const { merged, keptStock } = replaceKeepingData(list, medicines);

        const msg =
          `${merged.length} medicines mili${skipNote}.\n` +
          `Purani list (${medicines.length}) poori replace ho jaye gi. ` +
          `File mein jo medicines nahi hain wo hat jayengi.` +
          (keptStock
            ? `\n${keptStock} medicines ka purana stock barqarar rahe ga.`
            : "") +
          `\nSales history safe rahegi.\nContinue?`;

        if (!window.confirm(msg)) return;

        onReplaceMedicines(merged);
        notify(`List replace ho gayi: ${merged.length} medicines`);
      }
    } catch (err) {
      notify(err.message || "Import fail ho gaya", "error");
    }
  };

  const handleTemplate = () =>
    downloadTextFile(
      "medicines_template.csv",
      "Name,Company,Price,Formula,Stock\nPanadol 500mg,GSK,25,Paracetamol,1000\nCalpol 500mg,GSK,22,Paracetamol,1000\n",
      "text/csv",
    );

  // Medicine list CSV export
  const handleExportCSV = () => {
    if (medicines.length === 0) {
      notify("Export karne ke liye koi medicine nahi hai", "error");
      return;
    }

    const headers = ["Name", "Company", "Price", "Formula", "Stock"];

    const escapeCSV = (value) => {
      const text = String(value ?? "");
      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = medicines.map((m) =>
      [m.name, m.company, m.price, m.formula, m.stock ?? ""]
        .map(escapeCSV)
        .join(","),
    );

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const day = new Date().toISOString().slice(0, 10);

    downloadTextFile(
      `MediPOS_medicines_${day}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );

    notify("Medicine list CSV mein export ho gayi");
  };

  // Pharmacy settings aur logo ko bhi backup mein shamil karo.
  const handleBackup = () => {
    const day = new Date().toISOString().slice(0, 10);

    try {
      const backup = createBackup({
        medicines,
        sales,
        billCounter,
        settings,
      });

      downloadTextFile(`MediPOS_backup_${day}.json`, backup);
      notify(
        "Medicines, bills aur pharmacy settings ka backup download ho gaya",
      );
    } catch (err) {
      notify(
        err.message || "Backup nahi ban saka. Storage check karein.",
        "error",
      );
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    try {
      const data = parseBackup(await file.text());

      const msg =
        `Backup mein ${data.medicines.length} medicines aur ${data.sales.length} bills hain.\n` +
        `Pharmacy settings aur logo bhi restore ho sakte hain.\n` +
        `Is machine ka mojooda data replace ho jaye ga. Continue?`;

      if (!window.confirm(msg)) return;

      onRestore(data);
      notify("Backup restore ho gaya");
    } catch (err) {
      notify(err.message || "Restore fail ho gaya", "error");
    }
  };

  const modes = [
    {
      id: "add",
      title: "Add new / update",
      text: "Nayi medicines add hongi, purani ki price ya formula update hogi. Baaqi list aur stock safe.",
    },
    {
      id: "replace",
      title: "Replace whole list",
      text: "File ki list poori list ban jati hai. File mein jo medicine nahi wo hat jati hai.",
    },
  ];

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      {/* Medicine import and export */}
      <section className={card}>
        <h2 className="text-lg font-semibold">Medicine list</h2>

        <p className="mt-1 text-sm text-stone-600">
          {medicines.length} medicines, {formulaCount} ka formula likha hai,{" "}
          {trackedCount} ka stock bhara hua hai.
        </p>

        <p className="mt-3 text-sm text-stone-600">
          Excel (.xlsx, .xls) ya CSV file chunein. Headings hon:{" "}
          <b>Name, Company, Price</b> aur optional <b>Formula, Stock</b>. Sirf
          ek do nayi medicines add karni hon to <b>Stock tab (F3)</b> ke "New
          medicine" se bhi add kar sakte hain.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {modes.map((m) => (
            <label
              key={m.id}
              className={`cursor-pointer rounded-md border p-3 text-sm ${
                mode === m.id
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-stone-300 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                />
                {m.title}
              </span>

              <span className="mt-1 block text-stone-600">{m.text}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className={primaryBtn}
          >
            <FileSpreadsheet size={16} />
            Import Excel / CSV
          </button>

          <button type="button" onClick={handleTemplate} className={outlineBtn}>
            <Download size={16} />
            Sample template
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className={outlineBtn}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={handleImport}
        />
      </section>

      {/* Backup / restore */}
      <section className={card}>
        <h2 className="text-lg font-semibold">Backup and restore</h2>

        <p className="mt-1 text-sm text-stone-600">
          {sales.length} bills, {medicines.length} medicines. Backup mein
          pharmacy ka naam, address, phone aur logo bhi shamil hain. File USB
          mein copy karke doosre laptop par Restore karein.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleBackup} className={primaryBtn}>
            <Download size={16} />
            Download backup
          </button>

          <button
            type="button"
            onClick={() => restoreRef.current?.click()}
            className={outlineBtn}
          >
            <Upload size={16} />
            Restore from backup
          </button>
        </div>

        <input
          ref={restoreRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleRestore}
        />
      </section>
    </div>
  );
}
