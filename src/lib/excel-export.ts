import * as XLSX from "xlsx";
import { MONTHS_FR } from "./months";
import { downloadFile } from "./download";

export interface MonthlyRow {
  month: number;
  cc: number;
  ce: number;
  pm: number;
}

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

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function workbookToBuffer(wb: XLSX.WorkBook): Uint8Array {
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

// Styles pour les cellules
const headerStyle = {
  font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "DC2626" } }, // Rouge UBA
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  },
};

const titleStyle = {
  font: { bold: true, sz: 16, color: { rgb: "DC2626" } },
  alignment: { horizontal: "center", vertical: "center" },
};

const infoStyle = {
  font: { sz: 11 },
  alignment: { horizontal: "left", vertical: "center" },
};

const dataStyle = {
  font: { sz: 11 },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
  numFmt: "#,##0",
};

const totalStyle = {
  font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "059669" } }, // Vert pour les totaux
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "medium", color: { rgb: "000000" } },
    bottom: { style: "medium", color: { rgb: "000000" } },
    left: { style: "medium", color: { rgb: "000000" } },
    right: { style: "medium", color: { rgb: "000000" } },
  },
  numFmt: "#,##0",
};

const monthStyle = {
  font: { bold: true, sz: 11 },
  alignment: { horizontal: "left", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  },
};

function applyStyle(ws: XLSX.WorkSheet, cellAddress: string, style: any) {
  if (!ws[cellAddress]) ws[cellAddress] = { t: "s", v: "" };
  ws[cellAddress].s = style;
}

function applyRangeStyle(ws: XLSX.WorkSheet, startRow: number, startCol: number, endRow: number, endCol: number, style: any) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      applyStyle(ws, addr, style);
    }
  }
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
    ["UBA ARCHIVES"],
    [""],
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

  const startRow = header.length + 1;
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
  
  // Largeurs de colonnes
  ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  
  // Fusions de cellules
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Titre
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Ligne vide
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Agence
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, // Année
    { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Date
  ];

  // Application des styles
  applyStyle(ws, "A1", titleStyle); // Titre
  applyStyle(ws, "A3", infoStyle); // Agence
  applyStyle(ws, "A4", infoStyle); // Année
  applyStyle(ws, "A5", infoStyle); // Date

  // Style de l'en-tête du tableau (ligne 7)
  for (let c = 0; c < 5; c++) {
    const addr = XLSX.utils.encode_cell({ r: 6, c });
    applyStyle(ws, addr, headerStyle);
  }

  // Style des données (lignes 8 à 19 - les 12 mois)
  for (let r = 7; r < 19; r++) {
    // Colonne mois
    applyStyle(ws, XLSX.utils.encode_cell({ r, c: 0 }), monthStyle);
    // Colonnes de données
    for (let c = 1; c < 5; c++) {
      applyStyle(ws, XLSX.utils.encode_cell({ r, c }), dataStyle);
    }
  }

  // Style de la ligne TOTAL (ligne 20)
  for (let c = 0; c < 5; c++) {
    const addr = XLSX.utils.encode_cell({ r: 19, c });
    applyStyle(ws, addr, totalStyle);
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}`);
  const filename = `Conventions_${agencyName.replace(/\s+/g, "_")}_${year}.xlsx`;
  downloadFile(workbookToBuffer(wb), filename, MIME_XLSX);
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

  // ===== ONGLET SYNTHÈSE =====
  const synthHeader = [
    ["UBA ARCHIVES — BILAN ANNUEL"],
    [""],
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
  
  // Largeurs de colonnes
  synth["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
  
  // Fusions de cellules
  synth["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Titre
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Ligne vide
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Année
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Date
    { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // Nombre agences
  ];

  // Application des styles pour l'onglet Synthèse
  applyStyle(synth, "A1", titleStyle); // Titre
  applyStyle(synth, "A3", infoStyle); // Année
  applyStyle(synth, "A4", infoStyle); // Date
  applyStyle(synth, "A5", infoStyle); // Nombre d'agences

  // Style de l'en-tête du tableau (ligne 7)
  for (let c = 0; c < 6; c++) {
    const addr = XLSX.utils.encode_cell({ r: 6, c });
    applyStyle(synth, addr, headerStyle);
  }

  // Style des données (lignes des agences)
  for (let r = 7; r < 7 + agencies.length; r++) {
    // Colonne nom agence (gras)
    applyStyle(synth, XLSX.utils.encode_cell({ r, c: 0 }), {
      ...dataStyle,
      font: { ...dataStyle.font, bold: true },
      alignment: { horizontal: "left", vertical: "center" },
    });
    // Colonne code (normal)
    applyStyle(synth, XLSX.utils.encode_cell({ r, c: 1 }), dataStyle);
    // Colonnes de données numériques
    for (let c = 2; c < 6; c++) {
      applyStyle(synth, XLSX.utils.encode_cell({ r, c }), dataStyle);
    }
  }

  // Style de la ligne TOTAL GÉNÉRAL
  if (agencies.length > 0) {
    const totalRowIndex = 7 + agencies.length;
    for (let c = 0; c < 6; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalRowIndex, c });
      applyStyle(synth, addr, totalStyle);
    }
  }

  XLSX.utils.book_append_sheet(wb, synth, "Synthèse");

  // ===== ONGLETS PAR AGENCE =====
  for (const a of agencies) {
    const map = new Map(a.rows.map((r) => [r.month, r]));
    const header = [
      ["UBA ARCHIVES"],
      [""],
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
    
    // Largeurs de colonnes
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    
    // Fusions de cellules
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    ];

    // Application des styles
    applyStyle(ws, "A1", titleStyle);
    applyStyle(ws, "A3", infoStyle);
    applyStyle(ws, "A4", infoStyle);

    // En-tête du tableau (ligne 6)
    for (let c = 0; c < 5; c++) {
      applyStyle(ws, XLSX.utils.encode_cell({ r: 5, c }), headerStyle);
    }

    // Données (12 mois)
    for (let r = 6; r < 18; r++) {
      applyStyle(ws, XLSX.utils.encode_cell({ r, c: 0 }), monthStyle);
      for (let c = 1; c < 5; c++) {
        applyStyle(ws, XLSX.utils.encode_cell({ r, c }), dataStyle);
      }
    }

    // Ligne TOTAL
    for (let c = 0; c < 5; c++) {
      applyStyle(ws, XLSX.utils.encode_cell({ r: 18, c }), totalStyle);
    }

    const sheetName = (a.agencyCode || a.agencyName).replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || `Agence`);
  }

  downloadFile(workbookToBuffer(wb), `Bilan_Annuel_${year}.xlsx`, MIME_XLSX);
}
