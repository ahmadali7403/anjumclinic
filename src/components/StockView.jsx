import { useEffect, useMemo, useState } from "react";
import { Search, AlertTriangle, PackageX, Boxes } from "lucide-react";

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
  ok: { text: "In stock", cls: "bg-emerald-50 text-emerald-700" },
  low: { text: "Low stock", cls: "bg-amber-50 text-amber-700" },
  out: { text: "Out of stock", cls: "bg-red-50 text-red-700" },
  untracked: { text: "Not tracked", cls: "bg-stone-100 text-stone-500" },
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

// Type karke Enter ya bahar click karne par save hota hai. Khali chhorne par stock track nahi hota.
function StockInput({ value, onCommit }) {
  const [text, setText] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const t = text.trim();
    if (t === "") {
      if (value != null) onCommit(null);
      return;
    }
    const n = Math.max(0, Math.round(Number(t)));
    if (!Number.isFinite(n)) {
      setText(value == null ? "" : String(value));
      return;
    }
    if (n !== value) onCommit(n);
    setText(String(n));
  };

  return (
    <input
      type="number"
      min="0"
      value={text}
      placeholder="Not tracked"
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-center outline-none focus:border-emerald-600"
    />
  );
}

export default function StockView({ medicines, lowStock, onUpdateStock }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | low | out | untracked

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
      if (filter !== "all" && statusOf(m, lowStock) !== filter) return false;
      const hay = `${m.name} ${m.company}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // Low / out filter mein sab se kam stock wali medicine pehle
    if (filter === "low" || filter === "out") {
      list = [...list].sort((a, b) => a.stock - b.stock);
    }
    return list;
  }, [medicines, q, filter, lowStock]);

  const filters = [
    { id: "all", label: "All" },
    { id: "low", label: "Low" },
    { id: "out", label: "Out of stock" },
    { id: "untracked", label: "Not tracked" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={18}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search medicine or company"
            className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg border border-stone-300 text-sm">
          {filters.map((f) => (
            <button
              key={f.id}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-300 bg-white">
        {rows.length === 0 ? (
          <p className="p-6 text-stone-500">
            Is filter ya search mein koi medicine nahi mili.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Medicine</th>
                <th className="px-4 py-2 text-center font-medium">Price</th>
                <th className="px-4 py-2 text-center font-medium">Stock</th>
                <th className="px-4 py-2 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {rows.slice(0, SHOW_LIMIT).map((m) => {
                const badge = BADGE[statusOf(m, lowStock)];
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-stone-500">{m.company}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums">
                      Rs {money(m.price)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StockInput
                        value={m.stock}
                        onCommit={(n) => onUpdateStock(m, n)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
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
        Stock badalne ke liye number likh kar Enter dabayein. Khali chhorne par
        us medicine ka stock track nahi hoga.
      </p>
    </>
  );
}
