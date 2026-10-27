import { useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  Package,
  AlertTriangle,
  CircleX,
  ReceiptText,
  TrendingUp,
  Clock3,
  ShieldAlert,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
  Flame,
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";

const money = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });

const dateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const currency = (value) => `Rs ${money(value)}`;

export default function DashboardView({
  medicines = [],
  sales = [],
  lowStock = 10,
  onNewSale,
  onAddMedicine,
  onViewInventory,
}) {
  const [timeFilter, setTimeFilter] = useState("7days"); // 'today' | '7days' | 'month'

  const now = new Date();
  const todayKey = dateKey(now);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const todaySales = sales.filter((sale) => dateKey(sale.date) === todayKey);
  const monthlySales = sales.filter((sale) => {
    const date = new Date(sale.date);
    return !Number.isNaN(date.getTime()) && date >= monthStart && date < monthEnd;
  });

  const sumSales = (list) =>
    list.reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);

  const todayTotal = sumSales(todaySales);
  const monthTotal = sumSales(monthlySales);

  // Estimated Profit Calculation
  const todayProfit = todaySales.reduce((sum, sale) => {
    const profit = sale.totals?.profit || sale.totals?.total * 0.22; // ~22% pharmacy average margin
    return sum + Number(profit);
  }, 0);

  const trackedMedicines = medicines.filter((m) => m.stock != null);
  const lowStockMedicines = trackedMedicines.filter(
    (m) => Number(m.stock) > 0 && Number(m.stock) <= lowStock
  );
  const outOfStockMedicines = trackedMedicines.filter(
    (m) => Number(m.stock) <= 0
  );
  const optimalStockCount = trackedMedicines.length - lowStockMedicines.length - outOfStockMedicines.length;

  const stockUnits = trackedMedicines.reduce(
    (sum, m) => sum + Math.max(0, Number(m.stock) || 0),
    0
  );

  // Dynamic Chart Data based on filter
  const chartDaysCount = timeFilter === "today" ? 1 : timeFilter === "month" ? 30 : 7;
  const chartData = Array.from({ length: chartDaysCount }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (chartDaysCount - 1 - index)
    );
    const key = dateKey(date);
    const total = sales
      .filter((sale) => dateKey(sale.date) === key)
      .reduce((sum, sale) => sum + Number(sale.totals?.total || 0), 0);

    return {
      key,
      label: chartDaysCount === 1 ? "Today" : date.toLocaleDateString("en", { weekday: "short" }),
      dateLabel: date.toLocaleDateString("en", { day: "numeric", month: "short" }),
      total,
    };
  });

  const maxChartValue = Math.max(...chartData.map((d) => d.total), 1);

  // Calculate Top Selling Medicines from Sales items
  const medicineSalesCount = {};
  sales.forEach((sale) => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item) => {
        const name = item.name || "Unknown Medicine";
        medicineSalesCount[name] = (medicineSalesCount[name] || 0) + Number(item.qty || 1);
      });
    }
  });

  const topSellingMedicines = Object.entries(medicineSalesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 pb-8 text-stone-800">
      
      {/* Top Banner & Quick Shortcuts Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold tracking-wider text-emerald-300 uppercase border border-emerald-500/30">
                MediPOS Enterprise Pro • Live Terminal #1
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Pharmacy Command Center
            </h2>
            <p className="mt-1 text-sm text-emerald-100/70">
              Complete automated control over counter sales, inventory health & margins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-md text-sm font-semibold border border-white/15 shadow-inner">
              <CalendarDays size={16} className="text-emerald-300" />
              {now.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
            </div>

            <button
              onClick={onNewSale}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-sm font-bold text-stone-950 shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle size={18} />
              New POS Sale
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Executive Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        
        {/* Today's Sales */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">Today's Revenue</p>
              <h3 className="mt-2 text-2xl font-black text-stone-900">{currency(todayTotal)}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <ArrowUpRight size={14} />
                <span>{todaySales.length} bills completed today</span>
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3.5 text-emerald-700 border border-emerald-100">
              <Banknote size={22} />
            </div>
          </div>
        </div>

        {/* Est. Profit */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">Est. Today Profit</p>
              <h3 className="mt-2 text-2xl font-black text-stone-900">{currency(todayProfit)}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                <Activity size={14} />
                <span>~22% Avg margin calculated</span>
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3.5 text-blue-700 border border-blue-100">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">Monthly Total</p>
              <h3 className="mt-2 text-2xl font-black text-stone-900">{currency(monthTotal)}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-purple-600">
                <Sparkles size={14} />
                <span>{monthlySales.length} bills this month</span>
              </div>
            </div>
            <div className="rounded-2xl bg-purple-50 p-3.5 text-purple-700 border border-purple-100">
              <ChartNoAxesCombined size={22} />
            </div>
          </div>
        </div>

        {/* Stock Inventory Items */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-wider text-stone-400 uppercase">Total Inventory</p>
              <h3 className="mt-2 text-2xl font-black text-stone-900">{medicines.length.toLocaleString()}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <Package size={14} />
                <span>{stockUnits.toLocaleString()} units in stock</span>
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3.5 text-amber-700 border border-amber-100">
              <Package size={22} />
            </div>
          </div>
        </div>

      </div>

      {/* Main Analytics Chart & Inventory Health Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        
        {/* Interactive Chart Section */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm xl:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">Sales Analytics Trend</h3>
                <p className="mt-0.5 text-xs text-stone-500">Revenue performance over time.</p>
              </div>

              {/* Time filter tabs */}
              <div className="flex items-center rounded-xl bg-stone-100 p-1 border border-stone-200">
                <button
                  onClick={() => setTimeFilter("today")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    timeFilter === "today" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter("7days")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    timeFilter === "7days" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeFilter("month")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    timeFilter === "month" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
                  }`}
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Bar Chart Bars */}
            <div className="mt-8 flex h-56 items-end gap-2 sm:gap-3 overflow-x-auto pb-2">
              {chartData.map((day) => {
                const height = day.total > 0 ? Math.max((day.total / maxChartValue) * 100, 10) : 0;

                return (
                  <div
                    key={day.key}
                    title={`${day.dateLabel}: ${currency(day.total)}`}
                    className="flex h-full min-w-[32px] flex-1 flex-col items-center justify-end gap-2 group cursor-pointer"
                  >
                    <span className="text-[9px] font-bold text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {money(day.total)}
                    </span>

                    <div className="flex h-40 w-full items-end justify-center">
                      <div
                        className={`w-full max-w-10 rounded-t-lg transition-all duration-300 ${
                          day.total > 0
                            ? "bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-md"
                            : "bg-stone-100"
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>

                    <div className="text-center">
                      <p className="text-[11px] font-bold text-stone-800">{day.label}</p>
                      <p className="text-[9px] text-stone-400 font-medium">{day.dateLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inventory Stock Health & Alerts Widget */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Stock Health Status</h3>
              <ShieldAlert size={20} className="text-amber-500" />
            </div>
            <p className="mt-0.5 text-xs text-stone-500">Critical stock breakdown and alerts.</p>

            {/* Visual Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-emerald-700">Optimal ({optimalStockCount})</span>
                <span className="text-amber-700">Low ({lowStockMedicines.length})</span>
                <span className="text-red-700">Out ({outOfStockMedicines.length})</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100 gap-0.5">
                <div style={{ width: `${trackedMedicines.length ? (optimalStockCount / trackedMedicines.length) * 100 : 100}%` }} className="bg-emerald-500 transition-all" />
                <div style={{ width: `${trackedMedicines.length ? (lowStockMedicines.length / trackedMedicines.length) * 100 : 0}%` }} className="bg-amber-400 transition-all" />
                <div style={{ width: `${trackedMedicines.length ? (outOfStockMedicines.length / trackedMedicines.length) * 100 : 0}%` }} className="bg-red-500 transition-all" />
              </div>
            </div>

            {/* Alert Cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold">Low Stock</span>
                </div>
                <p className="mt-2 text-xl font-black text-amber-900">{lowStockMedicines.length}</p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
                <div className="flex items-center gap-2 text-red-800">
                  <CircleX size={16} />
                  <span className="text-xs font-bold">Out of Stock</span>
                </div>
                <p className="mt-2 text-xl font-black text-red-900">{outOfStockMedicines.length}</p>
              </div>
            </div>

            {/* Quick Urgent List */}
            <div className="mt-4 border-t border-stone-100 pt-3 max-h-32 overflow-y-auto pr-1 space-y-1.5">
              {[...outOfStockMedicines, ...lowStockMedicines].slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-stone-800 truncate">{m.name}</span>
                  <span className={`font-bold px-2 py-0.5 rounded ${Number(m.stock) <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {Number(m.stock) <= 0 ? "Out" : `${m.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Top Selling Medicines & Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        
        {/* Top Selling Medicines */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">Fast-Moving Medicines</h3>
              <p className="mt-0.5 text-xs text-stone-500">Most frequently sold items by quantity.</p>
            </div>
            <Flame size={20} className="text-orange-500 animate-bounce" />
          </div>

          <div className="mt-5 space-y-3">
            {topSellingMedicines.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 font-medium">
                No sales item history available yet.
              </div>
            ) : (
              topSellingMedicines.map(([name, qty], idx) => (
                <div key={name} className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-stone-800 truncate max-w-[160px]">{name}</span>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {qty} units sold
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-sm xl:col-span-2 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-stone-200/90 p-5 bg-stone-50/50">
            <div>
              <h3 className="text-base font-bold text-stone-900">Recent Transactions</h3>
              <p className="mt-0.5 text-xs text-stone-500">Latest completed counter bills.</p>
            </div>
            <ReceiptText size={20} className="text-stone-400" />
          </div>

          {recentSales.length === 0 ? (
            <div className="p-10 text-center">
              <ReceiptText className="mx-auto text-stone-300" size={36} />
              <p className="mt-3 font-bold text-stone-700 text-sm">No sales recorded yet</p>
              <p className="mt-1 text-xs text-stone-400">Completed counter bills will appear here instantly.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[550px] text-left text-sm">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b border-stone-200">
                  <tr>
                    <th className="px-5 py-3">Bill No.</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="transition-colors hover:bg-stone-50/80">
                      <td className="px-5 py-3.5 font-black text-emerald-700">{sale.billNo || "—"}</td>
                      <td className="px-5 py-3.5 font-bold text-stone-800">{sale.customer?.name?.trim() || "Walk-in Customer"}</td>
                      <td className="px-5 py-3.5 text-xs text-stone-500 font-medium">{formatDateTime(sale.date)}</td>
                      <td className="px-5 py-3.5 text-right font-black text-stone-900 tabular-nums">{currency(sale.totals?.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-stone-400 font-semibold">
          MediPOS Pharmacy Management System • World-Class Enterprise Edition
        </p>
      </div>

    </section>
  );
}