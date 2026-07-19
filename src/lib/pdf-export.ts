import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MONTHS_FR } from "./months";
import { downloadFile } from "./download";

export interface MonthlyRow {
  month: number;
  cc: number;
  ce: number;
  pm: number;
}

export function exportAgencyYearPdf(opts: {
  agencyName: string;
  agencyCode?: string;
  year: number;
  rows: MonthlyRow[];
}) {
  const { agencyName, agencyCode, year, rows } = opts;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Zouane Conventions", 14, 20);
  doc.setFontSize(11);
  doc.text(`Agence : ${agencyName}${agencyCode ? " (" + agencyCode + ")" : ""}`, 14, 30);
  doc.text(`Année : ${year}`, 14, 36);
  doc.text(`Édité le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 42);

  const tableData = MONTHS_FR.map((name, i) => {
    const r = rows.find((r) => r.month === i + 1);
    const cc = r?.cc ?? 0;
    const ce = r?.ce ?? 0;
    const pm = r?.pm ?? 0;
    return [name, cc, ce, pm, cc + ce + pm];
  });

  const totalCC = rows.reduce((s, r) => s + (r.cc || 0), 0);
  const totalCE = rows.reduce((s, r) => s + (r.ce || 0), 0);
  const totalPM = rows.reduce((s, r) => s + (r.pm || 0), 0);

  autoTable(doc, {
    startY: 48,
    head: [["Mois", "CC", "CE", "PM", "Total"]],
    body: [...tableData, ["TOTAL", totalCC, totalCE, totalPM, totalCC + totalCE + totalPM]],
    footStyles: { fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold" }, 4: { fontStyle: "bold" } },
    headStyles: { fillColor: [51, 51, 51] },
  });

  const buffer = doc.output("arraybuffer");
  const filename = `Conventions_${agencyName.replace(/\s+/g, "_")}_${year}.pdf`;
  downloadFile(new Uint8Array(buffer), filename, "application/pdf");
}
