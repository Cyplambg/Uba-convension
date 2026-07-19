import * as XLSX from "xlsx";
import { MONTHS_FR } from "./months";

export interface MonthlyRow {
  month: number;
  cc: number;
  ce: number;
  pm: number;
}

/**
 * Converts an image file to base64 data URL for embedding in Excel
 * Usage: const logoBase64 = await imageToBase64('/logo.png');
 */
export async function imageToBase64(imagePath: string): Promise<string | null> {
  try {
    const response = await fetch(imagePath);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function workbookToBlob(wb: XLSX.WorkBook): Blob {
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function exportAgencyYear(opts: {
  agencyName: string;
  agencyCode?: string;
  year: number;
  rows: MonthlyRow[];
}) {
  const { agencyName, agencyCode, year, rows } = opts;
  const map = new Map(rows.map((r) => [r.month, r]));

  const header = [
    ["ZOUANE CONVENTIONS"],
    [""],  // Reserved for logo space
    [`Agence : ${agencyName}${agencyCode ? " (" + agencyCode + ")" : ""}`],
    [`Année : ${year}`],
    [`Date d'export : ${new Date().toLocaleDateString("fr-FR")}`],
    [],
    ["Mois", "CC", "CE", "PM", "Total"],
  ];

  const body: (string | number)[][] = MONTHS_FR.map((name, i) => {
    const r = map.get(i + 1);
    const cc = r?.cc ?? 0;
    const ce = r?.ce ?? 0;
    const pm = r?.pm ?? 0;
    return [name, cc, ce, pm, cc + ce + pm];
  });

  // Totals row with formulas
  const startRow = header.length + 1; // 1-based; header lines above
  const endRow = startRow + 11;
  const totalRow = [
    "TOTAL",
    { f: `SUM(B${startRow}:B${endRow})` },
    { f: `SUM(C${startRow}:C${endRow})` },
    { f: `SUM(D${startRow}:D${endRow})` },
    { f: `SUM(E${startRow}:E${endRow})` },
  ];

  const aoa = [...header, ...body, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

  // Merge title across A1:E1 and logo space A2:E2
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Logo space
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}`);
  const filename = `Conventions_${agencyName.replace(/\s+/g, "_")}_${year}.xlsx`;
  downloadBlob(workbookToBlob(wb), filename);
}

export interface AgencyYearData {
  agencyId: string;
  agencyName: string;
  agencyCode?: string;
  rows: MonthlyRow[];
}

export function exportAnnualReport(opts: { year: number; agencies: AgencyYearData[] }) {
  const { year, agencies } = opts;
  const wb = XLSX.utils.book_new();

  // Synthesis sheet
  const synthHeader = [
    ["ZOUANE CONVENTIONS — BILAN ANNUEL"],
    [""],  // Reserved for logo space
    [`Année : ${year}`],
    [`Date d'export : ${new Date().toLocaleDateString("fr-FR")}`],
    [`Nombre d'agences : ${agencies.length}`],
    [],
    ["Agence", "Code", "CC", "CE", "PM", "Total"],
  ];
  const startRow = synthHeader.length + 1;
  const synthBody = agencies.map((a) => {
    const cc = a.rows.reduce((s, r) => s + (r.cc || 0), 0);
    const ce = a.rows.reduce((s, r) => s + (r.ce || 0), 0);
    const pm = a.rows.reduce((s, r) => s + (r.pm || 0), 0);
    return [a.agencyName, a.agencyCode ?? "", cc, ce, pm, cc + ce + pm];
  });
  const endRow = startRow + agencies.length - 1;
  const totalRow = agencies.length
    ? [
        "TOTAL GÉNÉRAL", "",
        { f: `SUM(C${startRow}:C${endRow})` },
        { f: `SUM(D${startRow}:D${endRow})` },
        { f: `SUM(E${startRow}:E${endRow})` },
        { f: `SUM(F${startRow}:F${endRow})` },
      ]
    : [];
  const synth = XLSX.utils.aoa_to_sheet([...synthHeader, ...synthBody, totalRow]);
  synth["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  synth["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },  // Logo space
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
  ];
  XLSX.utils.book_append_sheet(wb, synth, "Synthèse");

  // One sheet per agency
  for (const a of agencies) {
    const map = new Map(a.rows.map((r) => [r.month, r]));
    const header = [
      ["ZOUANE CONVENTIONS"],
      [""],  // Reserved for logo space
      [`Agence : ${a.agencyName}${a.agencyCode ? " (" + a.agencyCode + ")" : ""}`],
      [`Année : ${year}`],
      [],
      ["Mois", "CC", "CE", "PM", "Total"],
    ];
    const body: (string | number)[][] = MONTHS_FR.map((name, i) => {
      const r = map.get(i + 1);
      const cc = r?.cc ?? 0, ce = r?.ce ?? 0, pm = r?.pm ?? 0;
      return [name, cc, ce, pm, cc + ce + pm];
    });
    const sRow = header.length + 1;
    const eRow = sRow + 11;
    const tRow = [
      "TOTAL",
      { f: `SUM(B${sRow}:B${eRow})` },
      { f: `SUM(C${sRow}:C${eRow})` },
      { f: `SUM(D${sRow}:D${eRow})` },
      { f: `SUM(E${sRow}:E${eRow})` },
    ];
    const ws = XLSX.utils.aoa_to_sheet([...header, ...body, tRow]);
    ws["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },  // Logo space
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    ];
    const sheetName = (a.agencyCode || a.agencyName).replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || `Agence`);
  }

  downloadBlob(workbookToBlob(wb), `Bilan_Annuel_${year}.xlsx`);
}

