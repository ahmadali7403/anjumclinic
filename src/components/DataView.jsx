import { useRef } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { parseMedicineFile } from "../utils/importMedicines";
import { createBackup, parseBackup, downloadTextFile } from "../utils/storage";

const card = "rounded-lg border border-stone-300 bg-white p-5";
const primaryBtn =
  "flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800";
const outlineBtn =
  "flex items-center gap-2 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100";

export default function DataView({
  medicines,
  sales,
  billCounter,
  onReplaceMedicines,
  onRestore,
  notify,
}) {
  const importRef = useRef(null);
  const restoreRef = useRef(null);

  const trackedCount = medicines.filter((m) => m.stock != null).length;

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // same file dobara chunne ke liye
    if (!file) return;
    try {
      const { medicines: list, skipped } = await parseMedicineFile(file);
      const msg =
        `${list.length} medicines mili` +
        (skipped ? ` (${skipped} rows skip hui)` : "") +
        `.\nPurani list (${medicines.length}) replace ho jaye gi. Sales history safe rahegi.\nContinue?`;
      if (!window.confirm(msg)) return;
      onReplaceMedicines(list);
      notify(`${list.length} medicines import ho gayin`);
    } catch (err) {
      notify(err.message || "Import fail ho gaya", "error");
    }
  };

  const handleTemplate = () =>
    downloadTextFile(
      "medicines_template.csv",
      "Name,Company,Price,Stock\nPanadol 500mg,GSK,25,100\nBrufen 400mg,Abbott,40,60\n",
      "text/csv",
    );

  const handleBackup = () => {
    const day = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `MediPOS_backup_${day}.json`,
      createBackup({ medicines, sales, billCounter }),
    );
    notify("Backup file download ho gayi");
  };

  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      const msg =
        `Backup mein ${data.medicines.length} medicines aur ${data.sales.length} bills hain.\n` +
        `Is machine ka mojooda saara data replace ho jaye ga. Continue?`;
      if (!window.confirm(msg)) return;
      onRestore(data);
      notify("Backup restore ho gaya");
    } catch (err) {
      notify(err.message || "Restore fail ho gaya", "error");
    }
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      {/* Medicine import */}
      <section className={card}>
        <h2 className="text-lg font-semibold">Medicine list</h2>
        <p className="mt-1 text-sm text-stone-600">
          {medicines.length} medicines, {trackedCount} ka stock track ho raha
          hai.
        </p>
        <p className="mt-3 text-sm text-stone-600">
          Excel (.xlsx, .xls) ya CSV file chunein. Pehli sheet ki pehli row
          header honi chahiye: <b>Name, Company, Price, Stock</b>. Company aur
          Stock optional hain. Stock na ho to us medicine ka stock track nahi
          hoga.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => importRef.current?.click()}
            className={primaryBtn}
          >
            <FileSpreadsheet size={16} /> Import Excel / CSV
          </button>
          <button onClick={handleTemplate} className={outlineBtn}>
            <Download size={16} /> Sample template
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
          {sales.length} bills, {medicines.length} medicines. Ye data isi
          browser mein save hai. Naye laptop par le jane ke liye backup file USB
          mein copy karein aur wahan Restore karein.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={handleBackup} className={primaryBtn}>
            <Download size={16} /> Download backup
          </button>
          <button
            onClick={() => restoreRef.current?.click()}
            className={outlineBtn}
          >
            <Upload size={16} /> Restore from backup
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
