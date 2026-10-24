import { useMemo, useState } from "react";
import {
  Search,
  Printer,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const money = (n) => Number(n).toLocaleString("en-US");
const SHOW_LIMIT = 100;

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-300 bg-white px-4 py-3">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function HistoryView({ sales, onPrint, onPdf, onDelete }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((s) =>
      [
        s.billNo,
        s.customer?.name,
        s.customer?.phone,
        new Date(s.date).toLocaleDateString(),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [q, sales]);

  const todayKey = new Date().toDateString();
  const todaySales = sales.filter(
    (s) => new Date(s.date).toDateString() === todayKey,
  );
  const todayTotal = todaySales.reduce((sum, s) => sum + s.totals.total, 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Today's bills" value={todaySales.length} />
        <Stat label="Today's sales" value={`Rs ${money(todayTotal)}`} />
        <Stat label="All bills" value={sales.length} />
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          size={18}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by bill no, customer name, phone or date"
          className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-300 bg-white">
        {filtered.length === 0 ? (
          <p className="p-6 text-stone-500">
            {sales.length === 0
              ? "Abhi koi bill save nahi hua. Billing mein sale complete karein."
              : "Is search se koi bill nahi mila."}
          </p>
        ) : (
          <ul className="divide-y divide-stone-200">
            {filtered.slice(0, SHOW_LIMIT).map((s) => {
              const open = openId === s.id;
              const who =
                [s.customer?.name, s.customer?.phone]
                  .filter(Boolean)
                  .join(" - ") || "Walk-in";
              return (
                <li key={s.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setOpenId(open ? null : s.id)}
                      aria-label="Show items"
                      className="text-stone-400 hover:text-stone-700"
                    >
                      {open ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>

                    <div className="flex-1">
                      <p className="font-medium">
                        {s.billNo}
                        <span className="ml-2 font-normal text-stone-500">
                          {who}
                        </span>
                      </p>
                      <p className="text-sm text-stone-500">
                        {new Date(s.date).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>

                    <span className="w-28 text-right font-semibold tabular-nums">
                      Rs {money(s.totals.total)}
                    </span>

                    <button
                      onClick={() => onPrint(s)}
                      aria-label="Print bill"
                      className="rounded-md border border-stone-300 p-2 hover:bg-stone-100"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => onPdf(s)}
                      aria-label="Download PDF"
                      className="rounded-md border border-stone-300 p-2 hover:bg-stone-100"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(s)}
                      aria-label="Delete bill"
                      className="rounded-md border border-stone-300 p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {open && (
                    <div className="ml-8 mt-3 rounded-md bg-stone-50 p-3 text-sm">
                      <ul className="space-y-1">
                        {s.items.map((it) => (
                          <li
                            key={it.id}
                            className="flex justify-between gap-4"
                          >
                            <span>
                              {it.name}{" "}
                              <span className="text-stone-500">x {it.qty}</span>
                            </span>
                            <span className="tabular-nums">
                              Rs {money(it.qty * it.price)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {s.totals.discountAmount > 0 && (
                        <p className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-red-600">
                          <span>
                            Discount
                            {s.totals.percent ? ` (${s.totals.percent}%)` : ""}
                          </span>
                          <span className="tabular-nums">
                            - Rs {money(s.totals.discountAmount)}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {filtered.length > SHOW_LIMIT && (
              <li className="px-4 py-3 text-sm text-stone-500">
                Pehle {SHOW_LIMIT} bills dikh rahe hain ({filtered.length} mein
                se). Search se baaqi dhundein.
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}
