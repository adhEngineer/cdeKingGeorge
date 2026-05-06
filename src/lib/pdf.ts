import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { OrderFormData } from './types';

const templateUrl = `${import.meta.env.BASE_URL}formular-uniforme-2025-2026-v2.pdf`;

const drawText = (
  page: import('pdf-lib').PDFPage,
  text: string,
  x: number,
  y: number,
  size = 10,
  font?: import('pdf-lib').PDFFont,
) => {
  page.drawText(text || '-', {
    x,
    y,
    size,
    font,
    color: rgb(0.06, 0.12, 0.16),
  });
};

export async function generateOrderPdf(data: OrderFormData) {
  const templateBytes = await fetch(templateUrl).then((response) => response.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [page1, page2] = pdfDoc.getPages();

  page1.setFont(font);
  page2.setFont(font);

  drawText(page1, data.student_name, 208, 634, 14, bold);
  drawText(page1, data.class_group, 273, 612, 14, bold);
  drawText(page1, data.parent_name, 224, 590, 14, bold);
  drawText(page1, data.order_date, 138, 565, 14, bold);

  data.items.forEach((item, index) => {
    const y = index === 0 ? 470 : 441;
    drawText(page1, item.shirt_size, 356, y - 1, 13, bold);
    drawText(page1, String(item.quantity_piece), 532, y - 1, 13, bold);
  });
  drawText(page1, String(data.set_quantity), 459, 455, 13, bold);

  page2.setFont(bold);
  drawText(page2, data.signature_name, 224, 60, 15, bold);

  const bytes = await pdfDoc.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
