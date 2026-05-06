import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { supabase } from './supabase';
import type { Order } from './types';

export async function exportOrdersXlsx(orders: Order[]) {
  const rows = orders.flatMap((order) => {
    const items = order.order_items?.length ? order.order_items : [undefined];
    return items.map((item) => ({
      'Data creare': new Date(order.created_at).toLocaleString('ro-RO'),
      'Data comenzii': order.order_date,
      Elev: order.student_name,
      'Clasa/Grupa': order.class_group,
      Parinte: order.parent_name,
      Status: order.status,
      Produs: item?.product_type === 'short_sleeve' ? 'Tricou maneca scurta' : item?.product_type === 'long_sleeve' ? 'Tricou maneca lunga' : '',
      'Nr. tricou': item?.shirt_size ?? '',
      'Cantitate set': item?.quantity_set ?? '',
      'Cantitate bucata': item?.quantity_piece ?? '',
      'PDF': order.order_files?.[0]?.file_name ?? '',
    }));
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Comenzi');
  worksheet.columns = Object.keys(rows[0] ?? {
    'Data creare': '',
    'Data comenzii': '',
    Elev: '',
    'Clasa/Grupa': '',
    Parinte: '',
    Status: '',
    Produs: '',
    'Nr. tricou': '',
    'Cantitate set': '',
    'Cantitate bucata': '',
    PDF: '',
  }).map((key) => ({
    header: key,
    key,
    width: Math.max(14, key.length + 4),
  }));
  worksheet.addRows(rows);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `comenzi-uniforme-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportOrderPdfs(orders: Order[]) {
  if (!supabase) {
    throw new Error('Supabase nu este configurat.');
  }

  const zip = new JSZip();
  for (const order of orders) {
    const file = order.order_files?.[0];
    if (!file) continue;
    const { data, error } = await supabase.storage.from('order-pdfs').download(file.storage_path);
    if (error) throw error;
    zip.file(file.file_name, data);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pdf-comenzi-${new Date().toISOString().slice(0, 10)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
