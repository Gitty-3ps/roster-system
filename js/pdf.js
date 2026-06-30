/**
 * pdf.js — PDF export logic.
 * Depends on jsPDF + jspdf-autotable loaded via CDN in index.html.
 * All PDF layout decisions live here — nothing else needs to know
 * about jsPDF.
 */

import { pad, formatDateLong } from './utils.js';

/**
 * Generates and downloads a PDF roster report.
 *
 * @param {object}  params
 * @param {string}  params.serviceName   — e.g. "Saturday Morning Service"
 * @param {string}  params.serviceDate   — "YYYY-MM-DD"
 * @param {Array}   params.roster        — full RosterEntry[]
 * @param {Function} params.onError      — called with an error message string
 * @param {Function} params.onSuccess    — called when PDF is saved
 */
export function downloadPDF({ serviceName, serviceDate, roster, onError, onSuccess }) {
  if (typeof window.jspdf === 'undefined') {
    onError('PDF library loading — please try again in a moment.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now       = new Date();
  const timeStr   = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const reportTime = `${now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })} at ${timeStr}`;

  // ── Header band ──
  doc.setFillColor(60, 110, 71);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('GraceBoard', 14, 16);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text('Church Service Roster', 14, 24);
  doc.setFontSize(9);
  doc.text(`Report generated: ${reportTime}`, 14, 32);

  // ── Service info ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(serviceName, 14, 50);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(formatDateLong(serviceDate), 14, 57);

  // ── Summary counts ──
  const confirmed = roster.filter((r) => r.status === 'confirmed').length;
  const pending   = roster.filter((r) => r.status === 'pending').length;
  const declined  = roster.filter((r) => r.status === 'declined').length;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 110, 71);  doc.text(`Total: ${roster.length}`, 14, 65);
  doc.setTextColor(59, 109, 17);  doc.text(`Confirmed: ${confirmed}`, 40, 65);
  doc.setTextColor(133, 79, 11);  doc.text(`Pending: ${pending}`, 80, 65);
  doc.setTextColor(163, 45, 45);  doc.text(`Declined: ${declined}`, 115, 65);
  doc.setTextColor(30, 30, 30);

  // ── Table ──
  doc.autoTable({
    startY: 71,
    head:   [['#', 'Name', 'Program Part', 'Status']],
    body:   roster.map((p, i) => [
      i + 1,
      p.name,
      p.role,
      p.status.charAt(0).toUpperCase() + p.status.slice(1),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [60, 110, 71],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', textColor: [130, 130, 130] },
      1: { cellWidth: 60 },
      2: { cellWidth: 80 },
      3: { cellWidth: 35 },
    },
    didParseCell(data) {
      if (data.column.index === 3 && data.section === 'body') {
        const v = data.cell.raw.toLowerCase();
        if      (v === 'confirmed') data.cell.styles.textColor = [59, 109, 17];
        else if (v === 'pending')   data.cell.styles.textColor = [133, 79, 11];
        else if (v === 'declined')  data.cell.styles.textColor = [163, 45, 45];
      }
    },
    alternateRowStyles: { fillColor: [248, 252, 249] },
  });

  // ── Footer ──
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text(`GraceBoard  •  Printed ${reportTime}`, 14, finalY);

  const filename = `${serviceName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${serviceDate}-roster.pdf`;
  doc.save(filename);
  onSuccess();
}
