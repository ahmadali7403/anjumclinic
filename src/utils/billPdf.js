import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const SHOP_NAME = "Anjum Clinic";
const SHOP_INFO = "0300-1626425, Sindhi Mor Saray Mughal";

const money = (n) => Number(n).toLocaleString("en-US");

function makeFileName(customerName, date) {
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}`;

  const safeName =
    (customerName || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_") || "Bill";

  return `${safeName}_${day}_${time}.pdf`;
}

function normalizePhone(phone = "") {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "92" + d.slice(1);
  return d;
}

function discountLabel(totals) {
  return totals.percent ? `Discount (${totals.percent}%)` : "Discount";
}

// meta = { billNo, date } -> history se dobara print karte waqt purana number aur date use hota hai
// a4Half = true  -> A4 portrait, bill sirf left half mein (print)
// a4Half = false -> A5 portrait (PDF download / share)
function buildBillPdf(
  bill,
  totals,
  customer = {},
  { a4Half = false, billNo: givenBillNo, date } = {},
) {
  const doc = a4Half
    ? new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
    : new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });

  const fullW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = a4Half ? fullW / 2 : fullW;
  const narrow = a4Half;
  const margin = narrow ? 6 : 10;

  const now = date ? new Date(date) : new Date();
  const billNo = givenBillNo || `B-${now.getTime().toString().slice(-6)}`;
  const name = (customer.name || "").trim();
  const phone = (customer.phone || "").trim();
  const fileName = makeFileName(name, now);
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setProperties({ title: fileName.replace(".pdf", "") });

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(narrow ? 14 : 18);
  doc.text(SHOP_NAME, pageW / 2, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(narrow ? 8 : 9);
  doc.setTextColor(100);
  if (SHOP_INFO) doc.text(SHOP_INFO, pageW / 2, 22, { align: "center" });

  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.6);
  doc.line(margin, 26, pageW - margin, 26);

  // ---- Bill info: 2 columns ----
  doc.setTextColor(30);
  doc.setFontSize(narrow ? 9 : 10);

  const infoY = 33;
  const lineH = 5;
  const leftMaxW = (pageW - margin * 2) * 0.58;
  const fit = (text) => doc.splitTextToSize(text, leftMaxW)[0];

  const leftLines = [`Bill No: ${billNo}`];
  if (name) leftLines.push(fit(`Customer: ${name}`));
  if (phone) leftLines.push(fit(`Phone: ${phone}`));

  const rightLines = [`Date: ${dateStr}`, `Time: ${timeStr}`];

  leftLines.forEach((t, i) => doc.text(t, margin, infoY + i * lineH));
  rightLines.forEach((t, i) =>
    doc.text(t, pageW - margin, infoY + i * lineH, { align: "right" }),
  );

  const infoRows = Math.max(leftLines.length, rightLines.length);
  const tableStartY = infoY + (infoRows - 1) * lineH + 6;

  // ---- Footer rows: Subtotal / Discount / Total ----
  const labelCell = (content) => ({
    content,
    colSpan: 4,
    styles: { halign: "right" },
  });
  const valueCell = (content) => ({ content, styles: { halign: "center" } });

  const foot = [];
  if (totals.discountAmount > 0) {
    foot.push([
      labelCell("Subtotal"),
      valueCell(`Rs ${money(totals.subtotal)}`),
    ]);
    foot.push([
      labelCell(discountLabel(totals)),
      valueCell(`- Rs ${money(totals.discountAmount)}`),
    ]);
  }
  foot.push([labelCell("Total"), valueCell(`Rs ${money(totals.total)}`)]);

  // ---- Items table ----
  const colWidths = narrow
    ? { n: 7, qty: 10, price: 16, amount: 22 }
    : { n: 10, qty: 14, price: 22, amount: 26 };

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: fullW - pageW + margin },
    theme: "grid",
    head: [["#", "Medicine", "Qty", "Price", "Amount"]],
    body: bill.map((item, idx) => [
      idx + 1,
      item.name,
      item.qty,
      money(item.price),
      money(item.qty * item.price),
    ]),
    foot,
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: narrow ? 8 : 9,
      cellPadding: narrow ? 1.8 : 2.5,
      lineColor: [214, 211, 209],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
      valign: "middle",
    },
    headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: "bold" },
    footStyles: {
      fillColor: [236, 253, 245],
      textColor: [4, 90, 65],
      fontStyle: "bold",
      fontSize: narrow ? 9 : 10,
    },
    alternateRowStyles: { fillColor: [250, 250, 249] },
    columnStyles: {
      0: { cellWidth: colWidths.n, halign: "center" },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: colWidths.qty, halign: "center" },
      3: { cellWidth: colWidths.price, halign: "center" },
      4: { cellWidth: colWidths.amount, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "head") {
        const aligns = ["center", "left", "center", "center", "center"];
        data.cell.styles.halign = aligns[data.column.index];
      }
    },
    didDrawPage: () => {
      if (!a4Half) return;
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(pageW, 5, pageW, pageH - 5);
      doc.setLineDashPattern([], 0);
    },
  });

  // ---- Footer ----
  doc.setFontSize(narrow ? 8 : 9);
  doc.setTextColor(120);
  doc.text("Thank you. Get well soon.", pageW / 2, pageH - 10, {
    align: "center",
  });

  return { doc, fileName };
}

export function downloadBill(bill, totals, customer, meta = {}) {
  const { doc, fileName } = buildBillPdf(bill, totals, customer, meta);
  doc.save(fileName);
}

// Print: A4 portrait, bill left half mein
export function printBill(bill, totals, customer, meta = {}) {
  const { doc } = buildBillPdf(bill, totals, customer, {
    ...meta,
    a4Half: true,
  });
  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
}

export async function shareBill(bill, totals, customer, meta = {}) {
  const { doc, fileName } = buildBillPdf(bill, totals, customer, meta);
  const file = new File([doc.output("blob")], fileName, {
    type: "application/pdf",
  });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Clinic bill" });
    } catch {
      /* share cancel */
    }
  } else {
    doc.save(fileName);
  }
}

export function billText(bill, totals, customer = {}, meta = {}) {
  const lines = bill.map(
    (i) => `${i.name} x${i.qty} = Rs ${money(i.qty * i.price)}`,
  );
  const head = [
    meta.billNo && `Bill No: ${meta.billNo}`,
    customer.name && `Customer: ${customer.name}`,
    customer.phone && `Phone: ${customer.phone}`,
  ]
    .filter(Boolean)
    .join("\n");
  const sums =
    totals.discountAmount > 0
      ? `Subtotal: Rs ${money(totals.subtotal)}\n${discountLabel(totals)}: - Rs ${money(
          totals.discountAmount,
        )}\n`
      : "";
  const when = (meta.date ? new Date(meta.date) : new Date()).toLocaleString();
  return `${SHOP_NAME}\n${when}\n${head ? head + "\n" : ""}\n${lines.join(
    "\n",
  )}\n\n${sums}Total: Rs ${money(totals.total)}`;
}

export function canShareFile() {
  try {
    const f = new File([""], "a.pdf", { type: "application/pdf" });
    return (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [f] })
    );
  } catch {
    return false;
  }
}

export function shareWhatsApp(bill, totals, customer = {}, meta = {}) {
  downloadBill(bill, totals, customer, meta);
  const number = normalizePhone(customer.phone);
  const text = encodeURIComponent(billText(bill, totals, customer, meta));
  window.open(
    number
      ? `https://wa.me/${number}?text=${text}`
      : `https://wa.me/?text=${text}`,
    "_blank",
  );
}

export function shareEmail(bill, totals, customer = {}, meta = {}) {
  downloadBill(bill, totals, customer, meta);
  window.location.href = `mailto:?subject=${encodeURIComponent(
    "Clinic bill",
  )}&body=${encodeURIComponent(billText(bill, totals, customer, meta))}`;
}

export function copyBillText(bill, totals, customer = {}, meta = {}) {
  return navigator.clipboard.writeText(billText(bill, totals, customer, meta));
}
