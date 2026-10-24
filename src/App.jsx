import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Pill,
  Printer,
  Download,
  Share2,
  MessageCircle,
  Mail,
  Copy,
  FileUp,
  Check,
  X,
  ShoppingCart,
  History,
  Database,
} from "lucide-react";
import {
  downloadBill,
  printBill,
  shareBill,
  shareWhatsApp,
  shareEmail,
  copyBillText,
  canShareFile,
} from "./utils/billPdf";
import { usePersistentState, formatBillNo } from "./utils/storage";
import HistoryView from "./components/HistoryView";
import DataView from "./components/DataView";

// Pehli dafa app chalane par ye sample data dikhta hai. Excel import ke baad replace ho jata hai.
const SAMPLE_MEDICINES = [
  { id: 1, name: "Panadol 500mg", company: "GSK", price: 25, stock: null },
  { id: 2, name: "Brufen 400mg", company: "Abbott", price: 40, stock: null },
  { id: 3, name: "Augmentin 625mg", company: "GSK", price: 380, stock: null },
  { id: 4, name: "Risek 20mg", company: "Getz", price: 210, stock: null },
  { id: 5, name: "Disprin", company: "Reckitt", price: 12, stock: null },
  { id: 6, name: "Arinac Forte", company: "Abbott", price: 55, stock: null },
];

const LOW_STOCK = 10;
const SHOW_LIMIT = 100;

const actionBtn =
  "flex w-full items-center justify-center gap-1 rounded-md border border-stone-300 py-2 text-sm hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40";
const fieldCls =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600";
const stepBtn = "rounded-md border border-stone-300 p-1.5 hover:bg-stone-100";

const EMPTY_CUSTOMER = { name: "", phone: "" };
const EMPTY_DISCOUNT = { type: "amount", value: "" };

const money = (n) => Number(n).toLocaleString("en-US");
// Medicine ko name + company se pehchante hain (import ke baad id badal sakti hai)
const sameMed = (a, b) => a.name === b.name && a.company === b.company;
const saleMeta = (s) => ({ billNo: s.billNo, date: s.date });

export default function App() {
  // ---- Saved data (browser storage mein) ----
  const [medicines, setMedicines] = usePersistentState(
    "medipos.medicines",
    SAMPLE_MEDICINES,
  );
  const [sales, setSales] = usePersistentState("medipos.sales", []);
  const [counter, setCounter] = usePersistentState("medipos.counter", 0);

  // Current bill bhi save hota hai, refresh se ghayab nahi hota
  const [bill, setBill] = usePersistentState("medipos.draft.bill", []);
  const [customer, setCustomer] = usePersistentState(
    "medipos.draft.customer",
    EMPTY_CUSTOMER,
  );
  const [discount, setDiscount] = usePersistentState(
    "medipos.draft.discount",
    EMPTY_DISCOUNT,
  );

  // ---- UI state ----
  const [view, setView] = useState("pos"); // "pos" | "history" | "data"
  const [query, setQuery] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [notice, setNotice] = useState(null);
  const searchRef = useRef(null);

  const notify = (text, type = "ok") =>
    setNotice({ text, type, id: Date.now() });
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const focusSearch = () => {
    setView("pos");
    setTimeout(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    }, 0);
  };

  // ---- Search (multi word: "pan 500") ----
  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return medicines;
    return medicines.filter((m) => {
      const hay = `${m.name} ${m.company}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [query, medicines]);

  const getQty = (id) => qtyMap[id] ?? 1;
  const billQtyOf = (med) => bill.find((i) => sameMed(i, med))?.qty ?? 0;

  // ---- Bill actions ----
  const addToBill = (med) => {
    const want = Math.max(1, parseInt(getQty(med.id), 10) || 1);
    let add = want;

    if (med.stock != null) {
      const available = med.stock - billQtyOf(med);
      if (available <= 0) {
        notify(`${med.name}: stock khatam hai`, "error");
        return;
      }
      if (want > available) {
        add = available;
        notify(
          `${med.name}: sirf ${available} bacha hai, utna add kiya`,
          "error",
        );
      }
    }

    setBill((prev) => {
      const existing = prev.find((i) => sameMed(i, med));
      if (existing) {
        return prev.map((i) =>
          sameMed(i, med) ? { ...i, qty: i.qty + add } : i,
        );
      }
      return [
        ...prev,
        {
          id: med.id,
          name: med.name,
          company: med.company,
          price: med.price,
          qty: add,
        },
      ];
    });
    setQtyMap((prev) => ({ ...prev, [med.id]: 1 }));
    setLastSale(null);
    searchRef.current?.focus();
    searchRef.current?.select();
  };

  const setItemQty = (item, value) => {
    let qty = Math.max(1, parseInt(value, 10) || 1);
    const med = medicines.find((m) => sameMed(m, item));
    if (med && med.stock != null && qty > med.stock) {
      qty = Math.max(med.stock, 1);
      notify(`${item.name}: sirf ${med.stock} stock mein hai`, "error");
    }
    setBill((prev) => prev.map((i) => (sameMed(i, item) ? { ...i, qty } : i)));
  };

  const removeItem = (item) =>
    setBill((prev) => prev.filter((i) => !sameMed(i, item)));

  const resetDraft = () => {
    setBill([]);
    setCustomer(EMPTY_CUSTOMER);
    setDiscount(EMPTY_DISCOUNT);
    setShareOpen(false);
  };

  // ---- Totals ----
  const subtotal = bill.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountValue = Number(discount.value) || 0;
  const rawDiscount =
    discount.type === "percent"
      ? (subtotal * discountValue) / 100
      : discountValue;
  const discountAmount = Math.min(
    Math.max(Math.round(rawDiscount * 100) / 100, 0),
    subtotal,
  );
  const total = subtotal - discountAmount;
  const totals = {
    subtotal,
    discountAmount,
    total,
    percent:
      discount.type === "percent" && discountAmount > 0 ? discountValue : null,
  };
  const empty = bill.length === 0;
  const draftMeta = { billNo: formatBillNo(counter + 1) };

  // ---- Complete sale: history mein save + stock kam ----
  const completeSale = () => {
    if (empty) return;
    const n = counter + 1;
    const sale = {
      id: String(Date.now()),
      billNo: formatBillNo(n),
      date: new Date().toISOString(),
      customer: { ...customer },
      items: bill.map(({ id, name, company, price, qty }) => ({
        id,
        name,
        company,
        price,
        qty,
      })),
      totals,
    };

    setSales((prev) => [sale, ...prev]);
    setCounter(n);
    setMedicines((prev) =>
      prev.map((m) => {
        const it = sale.items.find((i) => sameMed(i, m));
        return it && m.stock != null
          ? { ...m, stock: Math.max(0, m.stock - it.qty) }
          : m;
      }),
    );
    setLastSale(sale);
    resetDraft();
    notify(`Sale ${sale.billNo} save ho gayi`);
    focusSearch();
  };

  // ---- History actions ----
  const deleteSale = (sale) => {
    if (
      !window.confirm(
        `Bill ${sale.billNo} delete karein? Stock wapas add ho jaye ga.`,
      )
    )
      return;
    setSales((prev) => prev.filter((s) => s.id !== sale.id));
    setMedicines((prev) =>
      prev.map((m) => {
        const it = sale.items.find((i) => sameMed(i, m));
        return it && m.stock != null ? { ...m, stock: m.stock + it.qty } : m;
      }),
    );
    if (lastSale?.id === sale.id) setLastSale(null);
    notify(`Bill ${sale.billNo} delete ho gaya`);
  };

  // ---- Backup restore ----
  const restoreAll = (data) => {
    setMedicines(data.medicines);
    setSales(data.sales);
    setCounter(data.billCounter);
    resetDraft();
    setLastSale(null);
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F4") {
        e.preventDefault();
        setView("history");
      } else if (e.key === "F9") {
        e.preventDefault();
        completeSale();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (!empty) printBill(bill, totals, customer, draftMeta);
        else if (lastSale)
          printBill(
            lastSale.items,
            lastSale.totals,
            lastSale.customer,
            saleMeta(lastSale),
          );
      } else if (e.key === "Escape") {
        setQuery("");
        setShareOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      run: () => shareWhatsApp(bill, totals, customer, draftMeta),
    },
    {
      label: "Email",
      icon: Mail,
      run: () => shareEmail(bill, totals, customer, draftMeta),
    },
    {
      label: "Copy bill text",
      icon: Copy,
      run: () => copyBillText(bill, totals, customer, draftMeta),
    },
    ...(canShareFile()
      ? [
          {
            label: "Share PDF file",
            icon: FileUp,
            run: () => shareBill(bill, totals, customer, draftMeta),
          },
        ]
      : []),
  ];

  const tabs = [
    { id: "pos", label: "Billing (F2)", icon: ShoppingCart },
    { id: "history", label: "History (F4)", icon: History },
    { id: "data", label: "Data", icon: Database },
  ];

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      {/* Notice */}
      {notice && (
        <div
          role="status"
          className={`fixed left-1/3 top-4 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm text-white shadow-lg ${
            notice.type === "error" ? "bg-red-600" : "bg-emerald-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* LEFT: 2/3 */}
      <main className="flex w-2/3 flex-col gap-4 overflow-hidden p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="text-emerald-700" size={26} />
            <h1 className="text-2xl font-semibold">MediPOS</h1>
          </div>
          <nav className="flex gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => (id === "pos" ? focusSearch() : setView(id))}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm ${
                  view === id
                    ? "bg-emerald-700 text-white"
                    : "text-stone-700 hover:bg-stone-200"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </header>

        {view === "pos" && (
          <>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                size={18}
              />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) {
                    addToBill(results[0]);
                    setQuery("");
                  }
                }}
                placeholder="Search medicine or company (Enter adds the first result)"
                className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-300 bg-white">
              {results.length === 0 ? (
                <p className="p-6 text-stone-500">
                  No medicine found. Try a different name.
                </p>
              ) : (
                <ul className="divide-y divide-stone-200">
                  {results.slice(0, SHOW_LIMIT).map((med) => {
                    const tracked = med.stock != null;
                    const remaining = tracked
                      ? med.stock - billQtyOf(med)
                      : Infinity;
                    const soldOut = tracked && remaining <= 0;
                    return (
                      <li
                        key={med.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-stone-500">
                            {med.company}
                            {tracked && (
                              <span
                                className={`ml-3 ${
                                  soldOut
                                    ? "font-medium text-red-600"
                                    : remaining <= LOW_STOCK
                                      ? "font-medium text-amber-600"
                                      : ""
                                }`}
                              >
                                {soldOut
                                  ? "Out of stock"
                                  : `Stock: ${remaining}`}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="w-24 text-right tabular-nums">
                          Rs {money(med.price)}
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={getQty(med.id)}
                          onChange={(e) =>
                            setQtyMap((prev) => ({
                              ...prev,
                              [med.id]: e.target.value,
                            }))
                          }
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => e.key === "Enter" && addToBill(med)}
                          className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-center outline-none focus:border-emerald-600"
                        />
                        <button
                          disabled={soldOut}
                          onClick={() => addToBill(med)}
                          className="flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                        >
                          <Plus size={16} /> Add
                        </button>
                      </li>
                    );
                  })}
                  {results.length > SHOW_LIMIT && (
                    <li className="px-4 py-3 text-sm text-stone-500">
                      Pehle {SHOW_LIMIT} dikh rahe hain ({results.length} mein
                      se). Search se narrow karein.
                    </li>
                  )}
                </ul>
              )}
            </div>

            <p className="text-xs text-stone-500">
              F2 Search &nbsp; F4 History &nbsp; F9 Complete sale &nbsp; Ctrl+P
              Print &nbsp; Esc Clear search
            </p>
          </>
        )}

        {view === "history" && (
          <HistoryView
            sales={sales}
            onPrint={(s) =>
              printBill(s.items, s.totals, s.customer, saleMeta(s))
            }
            onPdf={(s) =>
              downloadBill(s.items, s.totals, s.customer, saleMeta(s))
            }
            onDelete={deleteSale}
          />
        )}

        {view === "data" && (
          <DataView
            medicines={medicines}
            sales={sales}
            billCounter={counter}
            onReplaceMedicines={setMedicines}
            onRestore={restoreAll}
            notify={notify}
          />
        )}
      </main>

      {/* RIGHT: 1/3 */}
      <aside className="flex w-1/3 flex-col border-l border-stone-300 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Receipt size={20} /> Current bill
          </h2>
          {!empty && (
            <button
              onClick={resetDraft}
              className="text-sm text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Last saved sale */}
        {lastSale && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <Check size={16} />
            <span className="flex-1">Bill {lastSale.billNo} saved</span>
            <button
              onClick={() =>
                printBill(
                  lastSale.items,
                  lastSale.totals,
                  lastSale.customer,
                  saleMeta(lastSale),
                )
              }
              className="underline"
            >
              Print
            </button>
            <button
              onClick={() =>
                downloadBill(
                  lastSale.items,
                  lastSale.totals,
                  lastSale.customer,
                  saleMeta(lastSale),
                )
              }
              className="underline"
            >
              PDF
            </button>
            <button onClick={() => setLastSale(null)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Customer details */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <input
            value={customer.name}
            onChange={(e) =>
              setCustomer((c) => ({ ...c, name: e.target.value }))
            }
            placeholder="Customer name"
            className={fieldCls}
          />
          <input
            type="tel"
            value={customer.phone}
            onChange={(e) =>
              setCustomer((c) => ({ ...c, phone: e.target.value }))
            }
            placeholder="Phone number"
            className={fieldCls}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {empty ? (
            <p className="text-stone-500">
              Bill is empty. Add a medicine from the list.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {bill.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{item.name}</p>
                    <button
                      onClick={() => removeItem(item)}
                      aria-label={`Remove ${item.name}`}
                      className="text-stone-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setItemQty(item, item.qty - 1)}
                        aria-label="Decrease quantity"
                        className={stepBtn}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => setItemQty(item, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-14 rounded-md border border-stone-300 py-1 text-center text-sm outline-none focus:border-emerald-600"
                      />
                      <button
                        onClick={() => setItemQty(item, item.qty + 1)}
                        aria-label="Increase quantity"
                        className={stepBtn}
                      >
                        <Plus size={14} />
                      </button>
                      <span className="ml-2 text-sm text-stone-500">
                        x Rs {money(item.price)}
                      </span>
                    </div>
                    <span className="font-medium tabular-nums">
                      Rs {money(item.qty * item.price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-stone-300 pt-4">
          {/* Discount */}
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="discount" className="text-sm text-stone-600">
              Discount
            </label>
            <input
              id="discount"
              type="number"
              min="0"
              disabled={empty}
              value={discount.value}
              onChange={(e) =>
                setDiscount((d) => ({ ...d, value: e.target.value }))
              }
              placeholder="0"
              className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-center text-sm outline-none focus:border-emerald-600 disabled:opacity-40"
            />
            <div className="flex overflow-hidden rounded-md border border-stone-300 text-sm">
              {[
                { type: "amount", label: "Rs" },
                { type: "percent", label: "%" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  disabled={empty}
                  onClick={() => setDiscount((d) => ({ ...d, type: opt.type }))}
                  className={`px-3 py-1.5 disabled:opacity-40 ${
                    discount.type === opt.type
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {discountAmount > 0 && (
            <div className="mb-1 space-y-1 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">Rs {money(subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>
                  Discount{totals.percent ? ` (${totals.percent}%)` : ""}
                </span>
                <span className="tabular-nums">
                  - Rs {money(discountAmount)}
                </span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-stone-600">Total</span>
            <span className="text-3xl font-semibold tabular-nums">
              Rs {money(total)}
            </span>
          </div>

          <button
            disabled={empty}
            onClick={completeSale}
            className="mt-4 w-full rounded-lg bg-emerald-700 py-3 text-lg font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Complete sale (F9)
          </button>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              disabled={empty}
              onClick={() => printBill(bill, totals, customer, draftMeta)}
              className={actionBtn}
            >
              <Printer size={16} /> Print
            </button>
            <button
              disabled={empty}
              onClick={() => downloadBill(bill, totals, customer, draftMeta)}
              className={actionBtn}
            >
              <Download size={16} /> PDF
            </button>

            <div className="relative">
              <button
                disabled={empty}
                onClick={() => setShareOpen((o) => !o)}
                className={actionBtn}
              >
                <Share2 size={16} /> Share
              </button>
              {shareOpen && !empty && (
                <div className="absolute bottom-full right-0 mb-2 w-52 rounded-lg border border-stone-300 bg-white p-1 shadow-lg">
                  {shareOptions.map(({ label, icon: Icon, run }) => (
                    <button
                      key={label}
                      onClick={() => {
                        run();
                        setShareOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-stone-100"
                    >
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
