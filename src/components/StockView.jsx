import { useMemo, useRef, useState } from "react";
import {
  Search,
  AlertTriangle,
  PackageX,
  Boxes,
  PackagePlus,
  Plus,
  X,
  Pencil,
  Check,
} from "lucide-react";

const money = (n) => Number(n).toLocaleString("en-US");
const SHOW_LIMIT = 200;

const statusOf = (m, lowStock) =>
  m.stock == null
    ? "untracked"
    : m.stock <= 0
      ? "out"
      : m.stock <= lowStock
        ? "low"
        : "ok";

const BADGE = {
  ok: { text: "In", cls: "bg-emerald-50 text-emerald-700" },
  low: { text: "Low", cls: "bg-amber-50 text-amber-700" },
  out: { text: "Out", cls: "bg-red-50 text-red-700" },
  untracked: { text: "Not tracked", cls: "bg-stone-100 text-stone-500" },
};

const fieldCls =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600";

const EMPTY_FORM = {
  name: "",
  company: "",
  price: "",
  formula: "",
  stock: "",
};

function Stat({ label, value, icon: Icon, tone = "text-stone-900" }) {
  return (
    <div className="rounded-lg border border-stone-300 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm text-stone-500">
        <Icon size={14} /> {label}
      </p>
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

// Nayi medicine add karne ka form
function NewMedicineForm({ onAdd, onClose }) {
  const [f, setF] = useState(EMPTY_FORM);
  const nameRef = useRef(null);

  const set = (key) => (e) => setF((p) => ({ ...p, [key]: e.target.value }));

  const priceNum = Number(f.price);

  const valid =
    f.name.trim() !== "" &&
    f.price !== "" &&
    Number.isFinite(priceNum) &&
    priceNum >= 0 &&
    (f.stock.trim() === "" ||
      (Number.isFinite(Number(f.stock)) && Number(f.stock) >= 0));

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;

    const stockNum = f.stock.trim() === "" ? null : Math.round(Number(f.stock));

    const ok = onAdd({
      name: f.name.trim(),
      company: f.company.trim(),
      price: priceNum,
      formula: f.formula.trim(),
      stock: stockNum,
    });

    if (ok) {
      setF(EMPTY_FORM);
      nameRef.current?.focus();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-emerald-300 bg-emerald-50/50 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">New medicine</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="text-stone-500 hover:text-stone-800"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          ref={nameRef}
          autoFocus
          value={f.name}
          onChange={set("name")}
          placeholder="Name (strength ke saath) *"
          className={fieldCls}
          required
        />
        <input
          value={f.company}
          onChange={set("company")}
          placeholder="Company"
          className={fieldCls}
        />
        <input
          type="number"
          min="0"
          step="any"
          value={f.price}
          onChange={set("price")}
          placeholder="Price *"
          className={fieldCls}
          required
        />
        <input
          value={f.formula}
          onChange={set("formula")}
          placeholder="Formula"
          className={fieldCls}
        />
        <input
          type="number"
          min="0"
          step="1"
          value={f.stock}
          onChange={set("stock")}
          placeholder="Opening stock"
          className={fieldCls}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          * Zaroori hai. Opening stock khali chhorein to baad mein Add stock se
          bhar sakte hain.
        </p>
        <button
          type="submit"
          disabled={!valid}
          className="flex items-center gap-1 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          <Plus size={16} /> Add medicine
        </button>
      </div>
    </form>
  );
}

// Price edit control
function PriceEditor({ med, onSave }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(med.price));

  const startEditing = () => {
    setPrice(String(med.price));
    setEditing(true);
  };

  const cancelEditing = () => {
    setPrice(String(med.price));
    setEditing(false);
  };

  const save = () => {
    if (price.trim() === "") return;

    const nextPrice = Number(price);

    if (!Number.isFinite(nextPrice) || nextPrice < 0) return;

    onSave(med, nextPrice);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="whitespace-nowrap font-medium tabular-nums">
          Rs {money(med.price)}
        </span>
        <button
          type="button"
          onClick={startEditing}
          title={`Edit price for ${med.name}`}
          aria-label={`Edit price for ${med.name}`}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100"
        >
          <Pencil size={13} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-36 flex-col items-center gap-2">
      <input
        type="number"
        min="0"
        step="any"
        autoFocus
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancelEditing();
        }}
        aria-label={`New price for ${med.name}`}
        className="w-28 rounded-md border border-emerald-500 px-2 py-1.5 text-center outline-none focus:ring-2 focus:ring-emerald-500/20"
      />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={save}
          disabled={
            price.trim() === "" ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
          }
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-800 disabled:bg-stone-300"
        >
          <Check size={13} /> Save
        </button>

        <button
          type="button"
          onClick={cancelEditing}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100"
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

// Naya maal aane par existing stock mein quantity add hoti hai
function ReceiveControl({ med, onCommit }) {
  const [text, setText] = useState("");

  const add = () => {
    const n = Math.round(Number(text));

    if (!Number.isFinite(n) || n <= 0) return;

    onCommit((med.stock ?? 0) + n);
    setText("");
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        min="1"
        step="1"
        value={text}
        placeholder="Qty"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        aria-label={`Add stock to ${med.name}`}
        className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-center outline-none focus:border-emerald-600"
      />
      <button
        type="button"
        onClick={add}
        disabled={!(Number(text) > 0)}
        className="flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        <PackagePlus size={14} /> Add
      </button>
    </div>
  );
}

export default function StockView({
  medicines,
  lowStock,
  onUpdateStock,
  onUpdatePrice,
  onAddMedicine,
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const counts = useMemo(() => {
    const c = { all: medicines.length, low: 0, out: 0, untracked: 0 };

    medicines.forEach((m) => {
      const s = statusOf(m, lowStock);
      if (s !== "ok") c[s]++;
    });

    return c;
  }, [medicines, lowStock]);

  const rows = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

    let list = medicines.filter((m) => {
      if (filter !== "all" && statusOf(m, lowStock) !== filter) {
        return false;
      }

      const hay = `${m.name} ${m.company} ${m.formula || ""}`.toLowerCase();

      return terms.every((t) => hay.includes(t));
    });

    if (filter === "low" || filter === "out") {
      list = [...list].sort((a, b) => a.stock - b.stock);
    }

    return list;
  }, [medicines, q, filter, lowStock]);

  const filters = [
    { id: "all", label: "All" },
    { id: "low", label: "Low" },
    { id: "out", label: "Out" },
    { id: "untracked", label: "Not tracked" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Medicines" value={counts.all} icon={Boxes} />

        <Stat
          label={`Low stock (${lowStock} ya kam)`}
          value={counts.low}
          icon={AlertTriangle}
          tone={counts.low ? "text-amber-600" : undefined}
        />

        <Stat
          label="Out of stock"
          value={counts.out}
          icon={PackageX}
          tone={counts.out ? "text-red-600" : undefined}
        />
      </div>

      {showForm && (
        <NewMedicineForm
          onAdd={onAddMedicine}
          onClose={() => setShowForm(false)}
        />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={18}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medicine, company or formula"
            className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div className="flex flex-wrap overflow-hidden rounded-lg border border-stone-300 text-sm">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-2.5 ${
                filter === f.id
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-100"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>

        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <Plus size={16} /> New medicine
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-stone-300 bg-white">
        {rows.length === 0 ? (
          <p className="p-6 text-stone-500">
            Is filter ya search mein koi medicine nahi mili.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Medicine</th>
                <th className="px-3 py-2 text-center font-medium">Price</th>
                <th className="px-3 py-2 text-center font-medium">Stock</th>
                <th className="px-3 py-2 text-center font-medium">Add stock</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200">
              {rows.slice(0, SHOW_LIMIT).map((m) => {
                const status = statusOf(m, lowStock);
                const badge = BADGE[status];

                return (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-stone-500">
                        {m.company}
                        {m.formula && (
                          <span className="ml-2 italic">{m.formula}</span>
                        )}
                      </p>
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <PriceEditor med={m} onSave={onUpdatePrice} />
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-base font-semibold tabular-nums ${
                          status === "out"
                            ? "text-red-600"
                            : status === "low"
                              ? "text-amber-600"
                              : status === "untracked"
                                ? "text-stone-400"
                                : "text-stone-900"
                        }`}
                      >
                        {m.stock == null ? "-" : m.stock}
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      <ReceiveControl
                        med={m}
                        onCommit={(n) => onUpdateStock(m, n)}
                      />
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {rows.length > SHOW_LIMIT && (
          <p className="border-t border-stone-200 px-4 py-3 text-sm text-stone-500">
            Pehle {SHOW_LIMIT} dikh rahe hain ({rows.length} mein se). Search se
            narrow karein.
          </p>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Price badalne ke liye Edit dabayein aur Save karein. Yeh sirf medicine
        ki current price update karta hai; pehle se saved bills ki prices nahi
        badalni chahiye. Naya maal aane par Add stock use karein. Sale hone par
        stock khud kam hota hai.
      </p>
    </>
  );
}
