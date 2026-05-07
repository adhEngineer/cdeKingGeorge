import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { OrderFormData } from './types';

const templateUrl = `${import.meta.env.BASE_URL}formular-uniforme-2026-2027.pdf`;

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

const drawBlackText = (
  page: import('pdf-lib').PDFPage,
  text: string,
  x: number,
  y: number,
  size = 10,
  font?: import('pdf-lib').PDFFont,
) => {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
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

  drawText(page1, data.student_name, 206, 579, 13, bold);
  drawText(page1, data.class_group, 274, 559, 12, bold);
  drawText(page1, data.parent_name, 236, 538, 13, bold);
  drawText(page1, data.order_date, 160, 518, 13, bold);

  data.items.forEach((item, index) => {
    const y = index === 0 ? 443 : 424;
    drawText(page1, item.shirt_size, 407, y, 13, bold);
    drawText(page1, String(item.quantity_piece), 486, y, 13, bold);
  });

  page1.drawRectangle({
    x: 92,
    y: 296,
    width: 468,
    height: 90,
    color: rgb(1, 1, 1),
  });
  drawBlackText(page1, '- conform contract educational, setul de uniforme este compus din 2 tricouri cu maneca', 100, 358, 9.6, font);
  drawBlackText(page1, 'scurta si 2 tricouri cu maneca lunga in valoare de 650lei/set.', 100, 345, 9.6, font);
  drawBlackText(page1, '- la solicitarea pe bucata (exceptand setul conform contract) pretul este:', 100, 327, 9.6, font);
  page1.drawCircle({ x: 120, y: 317, size: 1.8, color: rgb(0, 0, 0) });
  page1.drawCircle({ x: 120, y: 304, size: 1.8, color: rgb(0, 0, 0) });
  drawBlackText(page1, 'tricou cu maneca scurta - 150lei/buc.', 128, 314, 9.6, font);
  drawBlackText(page1, 'tricou cu maneca lunga - 175lei/buc.', 128, 301, 9.6, font);

  page2.setFont(bold);
  drawText(page2, data.signature_name, 232, 56, 15, bold);

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
