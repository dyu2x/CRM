import React from 'react';
import { Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { useCRM } from '../../context/CRMContext';

type ExportFormat = 'csv' | 'pdf' | 'xlsx' | 'json' | 'tsv' | 'xml';
interface Props {
  tableKey: string;
  tableLabel: string;
  rows: Record<string, unknown>[];
}

const stamp = () => new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const flatten = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const ExportDataButton: React.FC<Props> = ({ tableKey, tableLabel, rows }) => {
  const { currentUser, rolePermissions } = useCRM();
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const roleGrants = rolePermissions[currentUser?.role || ''] || [];
  const canExport = isAdmin || (roleGrants.includes(tableKey) && roleGrants.includes(`export:${tableKey}`));
  const [format, setFormat] = React.useState<ExportFormat>('csv');
  if (!canExport) return null;

  const exportFile = async (format: ExportFormat) => {
    const createdAt = new Date();
    const timestamp = stamp();
    const filename = `${safeName(tableLabel)}-${createdAt.toISOString().replace(/[:.]/g, '-')}`;
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const data = rows.map((row) => Object.fromEntries(columns.map((column) => [column, flatten(row[column])])));
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ report: tableLabel, createdAt: createdAt.toISOString(), records: data }, null, 2)], { type: 'application/json;charset=utf-8;' });
      downloadBlob(blob, `${filename}.json`);
    } else if (format === 'xml') {
      const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&apos;');
      const xml = `<?xml version="1.0" encoding="UTF-8"?><export report="${esc(tableLabel)}" created="${createdAt.toISOString()}">${data.map(row => `<record>${columns.map(col => `<${safeName(col) || 'field'}>${esc(row[col])}</${safeName(col) || 'field'}>`).join('')}</record>`).join('')}</export>`;
      downloadBlob(new Blob([xml], { type: 'application/xml;charset=utf-8;' }), `${filename}.xml`);
    } else if (format === 'tsv') {
      const cell = (v: unknown) => String(v ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
      const tsv = [columns.map(cell).join('\t'), ...data.map(row => columns.map(col => cell(row[col])).join('\t'))].join('\r\n');
      downloadBlob(new Blob(['\uFEFF', tsv], { type: 'text/tab-separated-values;charset=utf-8;' }), `${filename}.tsv`);
    } else if (format === 'csv') {
      const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [
        [ `Report: ${tableLabel}`, `Created: ${timestamp}`, `Records: ${rows.length}` ].map(quote).join(','),
        '',
        columns.map(quote).join(','),
        ...data.map((row) => columns.map((column) => quote(row[column])).join(',')),
      ].join('\r\n');
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${filename}.csv`);
    } else if (format === 'xlsx') {
      const xml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const cellRef = (column: number, row: number) => {
        let letters = '';
        let n = column + 1;
        while (n > 0) { const rem = (n - 1) % 26; letters = String.fromCharCode(65 + rem) + letters; n = Math.floor((n - 1) / 26); }
        return `${letters}${row}`;
      };
      const matrix: unknown[][] = [
        [`Report: ${tableLabel}`],
        [`Created: ${timestamp}`],
        [`Records: ${rows.length}`],
        [],
        columns,
        ...data.map((row) => columns.map((column) => row[column])),
      ];
      const sheetRows = matrix.map((row, rowIndex) => {
        const cells = row.map((value, columnIndex) => `<c r="${cellRef(columnIndex, rowIndex + 1)}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      }).join('');
      const zip = new JSZip();
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
      zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Filtered Export" sheetId="1" r:id="rId1"/></sheets></workbook>`);
      zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
      zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
      zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(tableLabel)}</dc:title><dc:subject>Filtered CRM data export</dc:subject><dc:creator>Mesina Farms CRM</dc:creator><dcterms:created xmlns:dcterms="http://purl.org/dc/terms/" xsi:type="dcterms:W3CDTF" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">${createdAt.toISOString()}</dcterms:created></cp:coreProperties>`);
      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      downloadBlob(blob, `${filename}.xlsx`);
    } else {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 32;
      const usableWidth = pageWidth - margin * 2;
      const colWidth = usableWidth / Math.max(columns.length, 1);
      let y = 38;
      pdf.setFontSize(14);
      pdf.text(tableLabel, margin, y);
      y += 18;
      pdf.setFontSize(8);
      pdf.text(`Created: ${timestamp}    |    Records: ${rows.length}`, margin, y);
      y += 22;
      const drawHeader = () => {
        pdf.setFont('helvetica', 'bold');
        columns.forEach((column, index) => pdf.text(pdf.splitTextToSize(column, colWidth - 6)[0] || '', margin + index * colWidth, y));
        y += 12;
        pdf.setFont('helvetica', 'normal');
        pdf.setDrawColor(180);
        pdf.line(margin, y - 7, pageWidth - margin, y - 7);
      };
      drawHeader();
      data.forEach((row) => {
        const cells = columns.map((column) => pdf.splitTextToSize(String(row[column] ?? ''), Math.max(20, colWidth - 6)));
        const lineCount = Math.max(1, ...cells.map((cell) => cell.length));
        const rowHeight = Math.max(12, lineCount * 9);
        if (y + rowHeight > pdf.internal.pageSize.getHeight() - 28) {
          pdf.addPage();
          y = 38;
          drawHeader();
        }
        cells.forEach((cell, index) => pdf.text(cell.slice(0, 5), margin + index * colWidth, y));
        y += rowHeight + 3;
      });
      pdf.save(`${filename}.pdf`);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white p-1">
      <span className="px-1 text-[10px] font-semibold text-neutral-500">Export {rows.length}</span>
      <select aria-label="Export format" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-700">
        <option value="csv">CSV</option><option value="pdf">PDF</option><option value="xlsx">Excel (.xlsx)</option>
        <option value="json">JSON</option><option value="tsv">TSV</option><option value="xml">XML</option>
      </select>
      <button type="button" title={`Download ${tableLabel} as ${format.toUpperCase()}`} aria-label={`Download ${tableLabel} as ${format.toUpperCase()}`} onClick={() => void exportFile(format)} className="inline-flex items-center justify-center rounded p-1.5 text-neutral-700 hover:bg-neutral-100"><Download className="h-4 w-4" /></button>
    </div>

  );
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
