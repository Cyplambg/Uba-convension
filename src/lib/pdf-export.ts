import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MONTHS_FR } from "./months";
import { AgencyYearData, MonthlyRow, imageToBase64 } from "./excel-export";

export async function exportAgencyYearPdf(opts: {
  agencyName: string;
  agencyCode?: string;
  year: number;
  rows: MonthlyRow[];
}) {
  const { agencyName, agencyCode, year, rows } = opts;
  const doc = new jsPDF("p", "mm", "a4");
  const primaryColor: [number, number, number] = [204, 0, 0];

  const logoBase64 = await imageToBase64("/logo.jpg");

  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", 14, 15, 20, 20);
  }

  doc.setFontSize(16);
  doc.text("UBA Archives", 42, 22);
  doc.setFontSize(11);
  doc.text(`Agence : ${agencyName}${agencyCode ? " (" + agencyCode + ")" : ""}`, 14, 42);
  doc.text(`Année : ${year}`, 14, 48);
  doc.text(`Édité le : ${new Date().toLocaleDateString("fr-FR")}`, 14, 54);

  const map = new Map(rows.map((r) => [r.month, r]));
  let totalCC = 0, totalCE = 0, totalPM = 0;
  const body = MONTHS_FR.map((name, i) => {
    const r = map.get(i + 1);
    const cc = r?.cc ?? 0, ce = r?.ce ?? 0, pm = r?.pm ?? 0;
    totalCC += cc; totalCE += ce; totalPM += pm;
    return [name, cc, ce, pm, cc + ce + pm];
  });

  autoTable(doc, {
    startY: 60,
    head: [["Mois", "CC", "CE", "PM", "Total"]],
    body: [...body, [{ content: "TOTAL", styles: { halign: "right" } }, totalCC, totalCE, totalPM, totalCC + totalCE + totalPM]],
    headStyles: { fillColor: primaryColor },
    columnStyles: { 0: { fontStyle: "bold" }, 4: { fontStyle: "bold" } },
  });

  doc.save(`Conventions_${agencyName.replace(/\s+/g, "_")}_${year}.pdf`);
}

export async function exportAnnualReportPdf(opts: { year: number; agencies: AgencyYearData[] }) {
  const { year, agencies } = opts;
  const doc = new jsPDF("p", "mm", "a4");

  // Couleur primaire UBA
  const primaryColor: [number, number, number] = [204, 0, 0];

  const logoBase64 = await imageToBase64("/logo.jpg");

  // --- Page de Synthèse ---
  if (logoBase64) {
    doc.addImage(logoBase64, "JPEG", 14, 15, 30, 30);
  }

  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("BILAN ANNUEL DES CONVENTIONS", 14, 60);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Année : ${year}`, 14, 70);
  doc.text(`Date d'édition : ${new Date().toLocaleDateString("fr-FR")}`, 14, 78);
  doc.text(`Agences couvertes : ${agencies.length}`, 14, 86);

  // Synthèse globale
  let totalCC = 0, totalCE = 0, totalPM = 0;
  const synthBody = agencies.map(a => {
    const cc = a.rows.reduce((s, r) => s + (r.cc || 0), 0);
    const ce = a.rows.reduce((s, r) => s + (r.ce || 0), 0);
    const pm = a.rows.reduce((s, r) => s + (r.pm || 0), 0);
    const total = cc + ce + pm;
    totalCC += cc; totalCE += ce; totalPM += pm;
    return [a.agencyName, a.agencyCode || "-", cc, ce, pm, total];
  });
  
  // Tri par total décroissant
  synthBody.sort((a, b) => (b[5] as number) - (a[5] as number));

  const totalGeneral = totalCC + totalCE + totalPM;
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Synthèse des Agences", 14, 110);

  autoTable(doc, {
    startY: 115,
    head: [["Agence", "Code", "CC", "CE", "PM", "Total"]],
    body: [
      ...synthBody,
      [{ content: 'TOTAL GÉNÉRAL', colSpan: 2, styles: { halign: 'right' } }, totalCC, totalCE, totalPM, totalGeneral]
    ],
    theme: "striped",
    headStyles: { fillColor: primaryColor },
    didParseCell: function (data) {
      if (data.section === 'body' && data.row.index === data.table.body.length - 1) {
         data.cell.styles.fontStyle = 'bold';
         data.cell.styles.fillColor = [240, 240, 240];
      }
    }
  });

  // --- Détails par Agence ---
  agencies.forEach((a) => {
    doc.addPage();
    
    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", 14, 15, 20, 20);
    }

    doc.setFontSize(16);
    doc.text(`Détail Agence : ${a.agencyName} ${a.agencyCode ? `(${a.agencyCode})` : ""}`, 14, 45);
    doc.setFontSize(11);
    doc.text(`Année : ${year}`, 14, 52);

    const map = new Map(a.rows.map((r) => [r.month, r]));
    
    let aCC = 0, aCE = 0, aPM = 0;
    const body = MONTHS_FR.map((name, i) => {
      const r = map.get(i + 1);
      const cc = r?.cc ?? 0, ce = r?.ce ?? 0, pm = r?.pm ?? 0;
      const total = cc + ce + pm;
      aCC += cc; aCE += ce; aPM += pm;
      return [name, cc, ce, pm, total];
    });

    autoTable(doc, {
      startY: 60,
      head: [["Mois", "CC", "CE", "PM", "Total"]],
      body: [
        ...body,
        [{ content: 'TOTAL', styles: { halign: 'right' } }, aCC, aCE, aPM, aCC + aCE + aPM]
      ],
      theme: "grid",
      headStyles: { fillColor: primaryColor },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index === data.table.body.length - 1) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });
  });

  // Numérotation des pages
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} sur ${pages}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`Bilan_Annuel_Conventions_${year}.pdf`);
}
