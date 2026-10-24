import { useState, useMemo } from "react";
import {
  Search,
  Plus,
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

const SAMPLE_MEDICINES = [
  { id: 1, name: "Panadol 500mg", company: "GSK", price: 25 },
  { id: 2, name: "Brufen 400mg", company: "Abbott", price: 40 },
  { id: 3, name: "Augmentin 625mg", company: "GSK", price: 380 },
  { id: 4, name: "Risek 20mg", company: "Getz", price: 210 },
  { id: 5, name: "Disprin", company: "Reckitt", price: 12 },
  { id: 6, name: "Arinac Forte", company: "Abbott", price: 55 },
];

const actionBtn =
  "flex w-full items-center justify-center gap-1 rounded-md border border-stone-300 py-2 text-sm hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40";

const fieldCls =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600";

const EMPTY_CUSTOMER = { name: "", phone: "" };
const EMPTY_DISCOUNT = { type: "amount", value: "" }; // type: "amount" (Rs) ya "percent" (%)

export default function App() {
  const [query, setQuery] = useState("");
  const [qtyMap, setQtyMap] = useState({});
  const [bill, setBill] = useState([]);
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [discount, setDiscount] = useState(EMPTY_DISCOUNT);
  const [shareOpen, setShareOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_MEDICINES;
    return SAMPLE_MEDICINES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q),
    );
  }, [query]);

  const getQty = (id) => qtyMap[id] ?? 1;

  const addToBill = (med) => {
    const qty = Math.max(1, Number(getQty(med.id)) || 1);
    setBill((prev) => {
      const existing = prev.find((i) => i.id === med.id);
      if (existing) {
        return prev.map((i) =>
          i.id === med.id ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...prev, { ...med, qty }];
    });
    setQtyMap((prev) => ({ ...prev, [med.id]: 1 }));
  };

  const removeItem = (id) => setBill((prev) => prev.filter((i) => i.id !== id));

  const clearBill = () => {
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
  // Discount 0 se kam ya subtotal se zyada nahi ho sakta
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

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      run: () => shareWhatsApp(bill, totals, customer),
    },
    {
      label: "Email",
      icon: Mail,
      run: () => shareEmail(bill, totals, customer),
    },
    {
      label: "Copy bill text",
      icon: Copy,
      run: () => copyBillText(bill, totals, customer),
    },
    ...(canShareFile()
      ? [
          {
            label: "Share PDF file",
            icon: FileUp,
            run: () => shareBill(bill, totals, customer),
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      {/* LEFT: 2/3 */}
      <main className="flex w-2/3 flex-col gap-4 p-6">
        <header className="flex items-center gap-2">
          <Pill className="text-emerald-700" size={26} />
          <h1 className="text-2xl font-semibold">MediPOS</h1>
        </header>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            size={18}
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by medicine or company name"
            className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-stone-300 bg-white">
          {results.length === 0 ? (
            <p className="p-6 text-stone-500">
              No medicine found. Try a different name.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {results.map((med) => (
                <li key={med.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-stone-500">{med.company}</p>
                  </div>
                  <span className="w-24 text-right tabular-nums">
                    Rs {med.price}
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
                    onKeyDown={(e) => e.key === "Enter" && addToBill(med)}
                    className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-center outline-none focus:border-emerald-600"
                  />
                  <button
                    onClick={() => addToBill(med)}
                    className="flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-2 text-white hover:bg-emerald-800"
                  >
                    <Plus size={16} /> Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* RIGHT: 1/3 */}
      <aside className="flex w-1/3 flex-col border-l border-stone-300 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Receipt size={20} /> Current bill
          </h2>
          {!empty && (
            <button
              onClick={clearBill}
              className="text-sm text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <p className="text-stone-500">
              Bill is empty. Add a medicine from the list.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {bill.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-stone-500">
                      {item.qty} × Rs {item.price}
                    </p>
                  </div>
                  <span className="tabular-nums">
                    Rs {item.qty * item.price}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="text-stone-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
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

          {/* Subtotal / discount / total */}
          {discountAmount > 0 && (
            <div className="mb-1 space-y-1 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">Rs {subtotal}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>
                  Discount{totals.percent ? ` (${totals.percent}%)` : ""}
                </span>
                <span className="tabular-nums">- Rs {discountAmount}</span>
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-stone-600">Total</span>
            <span className="text-3xl font-semibold tabular-nums">
              Rs {total}
            </span>
          </div>

          <button
            disabled={empty}
            className="mt-4 w-full rounded-lg bg-emerald-700 py-3 text-lg font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Complete sale
          </button>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              disabled={empty}
              onClick={() => printBill(bill, totals, customer)}
              className={actionBtn}
            >
              <Printer size={16} /> Print
            </button>
            <button
              disabled={empty}
              onClick={() => downloadBill(bill, totals, customer)}
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
