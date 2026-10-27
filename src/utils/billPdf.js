import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_PHARMACY_SETTINGS } from "./storage";

const money = (n) => Number(n || 0).toLocaleString("en-US");

function getSettings(settings = {}) {
  return {
    ...DEFAULT_PHARMACY_SETTINGS,
    ...(settings || {}),
  };
}

export function makeFileName(customerName, date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n) => String(n).padStart(2, "0");

  const day = `${validDate.getFullYear()}-${pad(
    validDate.getMonth() + 1,
  )}-${pad(validDate.getDate())}`;

  const hours = validDate.getHours();

  const time = `${pad(hours % 12 || 12)}-${pad(
    validDate.getMinutes(),
  )}-${pad(validDate.getSeconds())}-${hours >= 12 ? "PM" : "AM"}`;

  const safeName =
    String(customerName || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[. ]+$/g, "")
      .slice(0, 60) || "Walk-in";

  return `${safeName}_${day}_${time}.pdf`;
}

function normalizePhone(phone = "") {
  let d = String(phone).replace(/\D/g, "");

  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "92" + d.slice(1);

  return d;
}

function discountLabel(totals) {
  return totals.percent ? `Discount (${totals.percent}%)` : "Discount";
}

function addPharmacyLogo(doc, logo, x, y, width, height) {
  if (!logo || typeof logo !== "string") return false;

  try {
    const format = logo.startsWith("data:image/png")
      ? "PNG"
      : logo.startsWith("data:image/jpeg") || logo.startsWith("data:image/jpg")
        ? "JPEG"
        : null;

    if (!format) return false;

    doc.addImage(logo, format, x, y, width, height);
    return true;
  } catch (error) {
    console.warn("MediPOS: Logo PDF mein add nahi ho saka.", error);
    return false;
  }
}

function buildBillPdf(
  bill,
  totals,
  customer = {},
  {
    a4Half = false,
    billNo: givenBillNo,
    date,
    fileName: savedFileName,
    settings: suppliedSettings,
  } = {},
) {
  const settings = getSettings(suppliedSettings);

  const shopName =
    String(settings.pharmacyName || "").trim() || "MediPOS Pharmacy";

  const shopAddress = String(settings.address || "").trim();
  const shopPhone = String(settings.phone || "").trim();
  const shopLogo = settings.logo || "";

  const doc = a4Half
    ? new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
    : new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });

  const fullW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = a4Half ? fullW / 2 : fullW;
  const narrow = a4Half;
  const margin = narrow ? 6 : 10;

  const now = date ? new Date(date) : new Date();
  const validNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const billNo = givenBillNo || `B-${validNow.getTime().toString().slice(-6)}`;

  const name = String(customer.name || "").trim();
  const phone = String(customer.phone || "").trim();

  // History mein saved filename ho to wohi use hoga.
  const fileName =
    typeof savedFileName === "string" &&
    savedFileName.trim() &&
    savedFileName.toLowerCase().endsWith(".pdf")
      ? savedFileName.trim()
      : makeFileName(name, validNow);

  const dateStr = validNow.toLocaleDateString();
  const timeStr = validNow.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.setProperties({
    title: `${shopName} - ${fileName.replace(/\.pdf$/i, "")}`,
    subject: "Pharmacy Bill",
    creator: "MediPOS",
  });

  // Pharmacy header
  const logoAdded = addPharmacyLogo(
    doc,
    shopLogo,
    margin,
    8,
    narrow ? 12 : 17,
    narrow ? 12 : 17,
  );

  const centerX = pageW / 2;
  const nameY = logoAdded ? (narrow ? 14 : 17) : 13;
  const nameFont = narrow ? 12 : 17;

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(nameFont);

  const nameMaxWidth =
    pageW - margin * 2 - (logoAdded ? (narrow ? 15 : 21) : 0);

  const nameLines = doc.splitTextToSize(shopName, nameMaxWidth);

  doc.text(
    nameLines.slice(0, 2),
    logoAdded ? centerX + (narrow ? 5 : 7) : centerX,
    nameY,
    { align: "center" },
  );

  let headerBottom = logoAdded
    ? narrow
      ? 23
      : 27
    : nameY + (nameLines.length > 1 ? 7 : 0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(narrow ? 7 : 9);
  doc.setTextColor(100);

  const infoLines = [];

  if (shopAddress) infoLines.push(shopAddress);
  if (shopPhone) infoLines.push(`Phone: ${shopPhone}`);

  if (infoLines.length) {
    const maxInfoWidth = pageW - margin * 2;

    const printableInfo = infoLines.flatMap((line) =>
      doc.splitTextToSize(line, maxInfoWidth).slice(0, 2),
    );

    printableInfo.slice(0, 3).forEach((line, index) => {
      const y = headerBottom + 4 + index * (narrow ? 3.5 : 4);
      doc.text(line, centerX, y, { align: "center" });
    });

    headerBottom += 4 + Math.min(printableInfo.length, 3) * (narrow ? 3.5 : 4);
  }

  const dividerY = headerBottom + 2;

  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.6);
  doc.line(margin, dividerY, pageW - margin, dividerY);

  // Bill information
  doc.setTextColor(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(narrow ? 8 : 10);

  const infoY = dividerY + 7;
  const lineH = narrow ? 4.5 : 5;
  const leftMaxW = (pageW - margin * 2) * 0.58;

  const fit = (text) => doc.splitTextToSize(text, leftMaxW)[0];

  const leftLines = [`Bill No: ${billNo}`];

  if (name) leftLines.push(fit(`Customer: ${name}`));
  if (phone) leftLines.push(fit(`Phone: ${phone}`));

  const rightLines = [`Date: ${dateStr}`, `Time: ${timeStr}`];

  leftLines.forEach((line, i) => {
    doc.text(line, margin, infoY + i * lineH);
  });

  rightLines.forEach((line, i) => {
    doc.text(line, pageW - margin, infoY + i * lineH, {
      align: "right",
    });
  });

  const infoRows = Math.max(leftLines.length, rightLines.length);
  const tableStartY = infoY + (infoRows - 1) * lineH + 6;

  const labelCell = (content) => ({
    content,
    colSpan: 4,
    styles: { halign: "right" },
  });

  const valueCell = (content) => ({
    content,
    styles: { halign: "center" },
  });

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

  // Medicine table
  const colWidths = narrow
    ? { n: 7, qty: 10, price: 16, amount: 22 }
    : { n: 10, qty: 14, price: 22, amount: 26 };

  autoTable(doc, {
    startY: tableStartY,
    margin: {
      left: margin,
      right: fullW - pageW + margin,
      bottom: 16,
    },
    theme: "grid",
    head: [["#", "Medicine", "Qty", "Price", "Amount"]],
    body: bill.map((item, idx) => [
      idx + 1,
      item.name,
      item.qty,
      money(item.price),
      money(Number(item.qty) * Number(item.price)),
    ]),
    foot,
    showFoot: "lastPage",
    styles: {
      font: "helvetica",
      fontSize: narrow ? 7 : 9,
      cellPadding: narrow ? 1.5 : 2.5,
      lineColor: [214, 211, 209],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [4, 120, 87],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [236, 253, 245],
      textColor: [4, 90, 65],
      fontStyle: "bold",
      fontSize: narrow ? 8 : 10,
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

  // Footer
  const finalY = doc.lastAutoTable?.finalY || tableStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(narrow ? 8 : 9);
  doc.setTextColor(120);

  const footerY = Math.min(Math.max(finalY + 7, pageH - 10), pageH - 5);

  doc.text("Thank you. Get well soon.", pageW / 2, footerY, {
    align: "center",
  });

  return { doc, fileName };
}

export function downloadBill(bill, totals, customer, meta = {}) {
  const { doc, fileName } = buildBillPdf(bill, totals, customer, meta);
  doc.save(fileName);
}

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
      await navigator.share({
        files: [file],
        title: `${getSettings(meta.settings).pharmacyName} Bill`,
      });
    } catch {
      // User ne sharing cancel kar di.
    }
  } else {
    doc.save(fileName);
  }
}

export function billText(bill, totals, customer = {}, meta = {}) {
  const settings = getSettings(meta.settings);

  const shopName =
    String(settings.pharmacyName || "").trim() || "MediPOS Pharmacy";

  const lines = bill.map(
    (item) =>
      `${item.name} x${item.qty} = Rs ${money(
        Number(item.qty) * Number(item.price),
      )}`,
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
      ? `Subtotal: Rs ${money(totals.subtotal)}\n${discountLabel(
          totals,
        )}: - Rs ${money(totals.discountAmount)}\n`
      : "";

  const when = (meta.date ? new Date(meta.date) : new Date()).toLocaleString();

  const pharmacyDetails = [
    settings.address,
    settings.phone ? `Phone: ${settings.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    shopName,
    pharmacyDetails,
    when,
    head,
    "",
    ...lines,
    "",
    sums.trimEnd(),
    `Total: Rs ${money(totals.total)}`,
    "Thank you. Get well soon.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function canShareFile() {
  try {
    const file = new File([""], "a.pdf", {
      type: "application/pdf",
    });

    return (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

export function shareWhatsApp(bill, totals, customer = {}, meta = {}) {
  downloadBill(bill, totals, customer, meta);

  const number = normalizePhone(customer.phone);
  const text = encodeURIComponent(billText(bill, totals, customer, meta));

  const url = number
    ? `https://wa.me/${number}?text=${text}`
    : `https://wa.me/?text=${text}`;

  window.open(url, "_blank");
}

export function shareEmail(bill, totals, customer = {}, meta = {}) {
  downloadBill(bill, totals, customer, meta);

  const settings = getSettings(meta.settings);
  const subject = `${settings.pharmacyName || "MediPOS"} Bill`;
  const body = billText(bill, totals, customer, meta);

  window.location.href = `mailto:?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function copyBillText(bill, totals, customer = {}, meta = {}) {
  return navigator.clipboard.writeText(billText(bill, totals, customer, meta));
}
