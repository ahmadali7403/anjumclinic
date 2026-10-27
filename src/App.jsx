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
  Package,
  LayoutDashboard,
  Store,
} from "lucide-react";

import {
  downloadBill,
  printBill,
  shareBill,
  shareWhatsApp,
  shareEmail,
  copyBillText,
  canShareFile,
  makeFileName,
} from "./utils/billPdf";

import { usePersistentState, formatBillNo } from "./utils/storage";
import HistoryView from "./components/HistoryView";
import StockView from "./components/StockView";
import DataView from "./components/DataView";
import DashboardView from "./components/DashboardView";
import SettingsView from "./components/SettingsView";

// Sample medicines
const SAMPLE_MEDICINES = [
  {
    id: 1,
    name: "Panadol 500mg",
    company: "GSK",
    price: 25,
    formula: "Paracetamol",
    stock: 100,
  },
  {
    id: 2,
    name: "Brufen 400mg",
    company: "Abbott",
    price: 40,
    formula: "Ibuprofen",
    stock: 60,
  },
  {
    id: 3,
    name: "Augmentin 625mg",
    company: "GSK",
    price: 380,
    formula: "Amoxicillin, Clavulanic Acid",
    stock: 8,
  },
  {
    id: 4,
    name: "Risek 20mg",
    company: "Getz",
    price: 210,
    formula: "Omeprazole",
    stock: 0,
  },
  {
    id: 5,
    name: "Disprin",
    company: "Reckitt",
    price: 12,
    formula: "Aspirin",
    stock: null,
  },
  {
    id: 6,
    name: "Arinac Forte",
    company: "Abbott",
    price: 55,
    formula: "Ibuprofen, Pseudoephedrine",
    stock: 40,
  },
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

const DEFAULT_SETTINGS = {
  pharmacyName: "MediPOS Pharmacy",
  address: "",
  phone: "",
  logo: "",
};

const money = (n) => Number(n || 0).toLocaleString("en-US");

const sameMed = (a, b) => a.name === b.name && a.company === b.company;

const saleMeta = (s, settings) => ({
  billNo: s.billNo,
  date: s.date,
  settings,
  fileName: s.fileName || makeFileName(s.customer?.name, new Date(s.date)),
});

export default function App() {
  // ---- Saved data ----
  const [medicines, setMedicines] = usePersistentState(
    "medipos.medicines",
    SAMPLE_MEDICINES,
  );

  const [sales, setSales] = usePersistentState("medipos.sales", []);
  const [counter, setCounter] = usePersistentState("medipos.counter", 0);

  const [bill, setBill] = usePersistentState("medipos.draft.bill", []);

  const [customer, setCustomer] = usePersistentState(
    "medipos.draft.customer",
    EMPTY_CUSTOMER,
  );

  const [discount, setDiscount] = usePersistentState(
    "medipos.draft.discount",
    EMPTY_DISCOUNT,
  );

  // ---- Pharmacy settings ----
  const [settings, setSettings] = usePersistentState(
    "medipos.settings",
    DEFAULT_SETTINGS,
  );

  // Handle settings saved by older versions or incomplete backups
  const pharmacySettings = {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
  };

  // ---- UI state ----
  const [view, setView] = useState("pos");
  const [query, setQuery] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [notice, setNotice] = useState(null);

  const searchRef = useRef(null);

  const notify = (text, type = "ok") => {
    setNotice({ text, type, id: Date.now() });
  };

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

  // ---- Medicine search ----
  const results = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) return medicines;

    return medicines.filter((m) => {
      const hay = `${m.name} ${m.company} ${m.formula || ""}`.toLowerCase();

      return terms.every((t) => hay.includes(t));
    });
  }, [query, medicines]);

  const getQty = (id) => qtyMap[id] ?? 1;

  const billQtyOf = (med) => bill.find((i) => sameMed(i, med))?.qty ?? 0;

  // ---- Add medicine to bill ----
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

  // ---- Change bill quantity ----
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

  // ---- Update stock ----
  const updateStock = (med, stock) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, stock } : m)),
    );

    notify(
      stock == null
        ? `${med.name}: stock tracking band`
        : `${med.name}: stock ${stock} kar diya`,
    );
  };

  // ---- Add new medicine ----
  const addMedicine = (medicine) => {
    const duplicate = medicines.some(
      (m) =>
        m.name.trim().toLowerCase() === medicine.name.trim().toLowerCase() &&
        (m.company || "").trim().toLowerCase() ===
          (medicine.company || "").trim().toLowerCase(),
    );

    if (duplicate) {
      notify("Ye medicine isi company ke saath pehle se mojood hai", "error");
      return false;
    }

    const newMedicine = {
      ...medicine,
      id: Date.now(),
    };

    setMedicines((prev) => [...prev, newMedicine]);

    notify(`${newMedicine.name} add ho gayi`);

    return true;
  };

  // ---- Update medicine price ----
  const updatePrice = (med, price) => {
    const newPrice = Number(price);

    if (!Number.isFinite(newPrice) || newPrice < 0) {
      notify("Price valid honi chahiye", "error");
      return;
    }

    setMedicines((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, price: newPrice } : m)),
    );

    notify(`${med.name}: price Rs ${money(newPrice)} kar di`);
  };

  // ---- Bill totals ----
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

  const draftMeta = {
    billNo: formatBillNo(counter + 1),
    settings: pharmacySettings,
  };

  // ---- Complete sale ----
  const completeSale = () => {
    if (empty) return;

    const n = counter + 1;
    const saleDate = new Date().toISOString();

    const sale = {
      id: String(Date.now()),
      billNo: formatBillNo(n),
      date: saleDate,
      fileName: makeFileName(customer.name, new Date(saleDate)),
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
    ) {
      return;
    }

    setSales((prev) => prev.filter((s) => s.id !== sale.id));

    setMedicines((prev) =>
      prev.map((m) => {
        const it = sale.items.find((i) => sameMed(i, m));

        return it && m.stock != null ? { ...m, stock: m.stock + it.qty } : m;
      }),
    );

    if (lastSale?.id === sale.id) {
      setLastSale(null);
    }

    notify(`Bill ${sale.billNo} delete ho gaya`);
  };

  // ---- Backup restore ----
  const restoreAll = (data) => {
    setMedicines(data.medicines);
    setSales(data.sales);
    setCounter(data.billCounter);

    if (data.settings) {
      setSettings({
        ...DEFAULT_SETTINGS,
        ...data.settings,
      });
    }

    resetDraft();
    setLastSale(null);

    notify("Backup restore ho gaya");
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F3") {
        e.preventDefault();
        setView("stock");
      } else if (e.key === "F4") {
        e.preventDefault();
        setView("history");
      } else if (e.key === "F9") {
        e.preventDefault();
        completeSale();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();

        if (!empty) {
          printBill(bill, totals, customer, draftMeta);
        } else if (lastSale) {
          printBill(
            lastSale.items,
            lastSale.totals,
            lastSale.customer,
            saleMeta(lastSale, pharmacySettings),
          );
        }
      } else if (e.key === "Escape") {
        setQuery("");
        setShareOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- Share options ----
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

  // ---- Navigation tabs ----
  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "pos",
      label: "Billing (F2)",
      icon: ShoppingCart,
    },
    {
      id: "stock",
      label: "Stock (F3)",
      icon: Package,
    },
    {
      id: "history",
      label: "History (F4)",
      icon: History,
    },
    {
      id: "data",
      label: "Data",
      icon: Database,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Store,
    },
  ];

  const dashboardActive = view === "dashboard";

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      {/* Notice */}
      {notice && (
        <div
          role="status"
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm text-white shadow-lg ${
            notice.type === "error" ? "bg-red-600" : "bg-emerald-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* LEFT: Main content */}
      <main
        className={`flex min-w-0 flex-col gap-4 overflow-hidden p-6 ${
          dashboardActive ? "w-full" : "w-2/3"
        }`}
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill className="text-emerald-700" size={26} />
            <h1 className="text-2xl font-semibold">MediPOS</h1>
          </div>

          <nav className="flex flex-wrap gap-1">
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
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </header>

        {/* Dashboard */}
        {view === "dashboard" && (
          <DashboardView
            medicines={medicines}
            sales={sales}
            lowStock={LOW_STOCK}
          />
        )}

        {/* Billing / POS */}
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
                placeholder="Search by medicine, company or formula (Enter adds the first result)"
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
                    const inBill = billQtyOf(med);
                    const remaining = tracked ? med.stock - inBill : Infinity;

                    const soldOut = tracked && remaining <= 0;
                    const low = tracked && !soldOut && remaining <= LOW_STOCK;

                    return (
                      <li
                        key={med.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{med.name}</p>

                          <p className="text-sm text-stone-500">
                            {med.company}
                            {med.formula && (
                              <span className="ml-2 italic">{med.formula}</span>
                            )}
                          </p>

                          {tracked && (
                            <p
                              className={`text-sm ${
                                soldOut
                                  ? "font-medium text-red-600"
                                  : low
                                    ? "font-medium text-amber-600"
                                    : "text-emerald-700"
                              }`}
                            >
                              {soldOut ? "Out of stock" : `Stock: ${remaining}`}

                              {inBill > 0 && (
                                <span className="ml-2 font-normal text-stone-500">
                                  ({inBill} in bill)
                                </span>
                              )}
                            </p>
                          )}
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
                          <Plus size={16} />
                          Add
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
              F2 Search &nbsp; F3 Stock &nbsp; F4 History &nbsp; F9 Complete
              sale &nbsp; Ctrl+P Print &nbsp; Esc Clear search
            </p>
          </>
        )}

        {/* Stock */}
        {view === "stock" && (
          <StockView
            medicines={medicines}
            lowStock={LOW_STOCK}
            onUpdateStock={updateStock}
            onUpdatePrice={updatePrice}
            onAddMedicine={addMedicine}
          />
        )}

        {/* History */}
        {view === "history" && (
          <HistoryView
            sales={sales}
            settings={pharmacySettings}
            onPrint={(s) =>
              printBill(
                s.items,
                s.totals,
                s.customer,
                saleMeta(s, pharmacySettings),
              )
            }
            onPdf={(s) =>
              downloadBill(
                s.items,
                s.totals,
                s.customer,
                saleMeta(s, pharmacySettings),
              )
            }
            onDelete={deleteSale}
          />
        )}

        {/* Data */}
        {view === "data" && (
          <DataView
            medicines={medicines}
            sales={sales}
            billCounter={counter}
            settings={pharmacySettings}
            onReplaceMedicines={setMedicines}
            onRestore={restoreAll}
            notify={notify}
          />
        )}

        {/* Settings */}
        {view === "settings" && (
          <SettingsView
            settings={pharmacySettings}
            onSave={(newSettings) =>
              setSettings({
                ...DEFAULT_SETTINGS,
                ...newSettings,
              })
            }
            notify={notify}
          />
        )}
      </main>

      {/* RIGHT: Current bill sidebar */}
      <aside
        className={`${
          dashboardActive ? "hidden" : "flex"
        } w-1/3 min-w-0 flex-col border-l border-stone-300 bg-white p-6`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Receipt size={20} />
            Current bill
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
                  saleMeta(lastSale, pharmacySettings),
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
                  saleMeta(lastSale, pharmacySettings),
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
              setCustomer((c) => ({
                ...c,
                name: e.target.value,
              }))
            }
            placeholder="Customer name"
            className={fieldCls}
          />

          <input
            type="tel"
            value={customer.phone}
            onChange={(e) =>
              setCustomer((c) => ({
                ...c,
                phone: e.target.value,
              }))
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
                setDiscount((d) => ({
                  ...d,
                  value: e.target.value,
                }))
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
                  onClick={() =>
                    setDiscount((d) => ({
                      ...d,
                      type: opt.type,
                    }))
                  }
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
                  Discount
                  {totals.percent ? ` (${totals.percent}%)` : ""}
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
              <Printer size={16} />
              Print
            </button>

            <button
              disabled={empty}
              onClick={() => downloadBill(bill, totals, customer, draftMeta)}
              className={actionBtn}
            >
              <Download size={16} />
              PDF
            </button>

            <div className="relative">
              <button
                disabled={empty}
                onClick={() => setShareOpen((o) => !o)}
                className={actionBtn}
              >
                <Share2 size={16} />
                Share
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
                      <Icon size={16} />
                      {label}
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
