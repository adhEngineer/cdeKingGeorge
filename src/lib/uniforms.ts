import type { Order, OrderItemInput, ProductType } from './types';

export const classGroupOptions = [
  'Gradinita',
  'Primar (clasele Pregatitoare - IV)',
  'Gimnaziu (clasele V-VIII)',
  'Liceu (clasele IX-XII)',
];

export const uniformColorOptions = [
  { key: 'red', label: 'Rosie' },
  { key: 'blue', label: 'Albastra' },
  { key: 'white', label: 'Alba' },
];

export function normalizeClassGroup(value: string) {
  return classGroupOptions.includes(value) ? value : '';
}

export function getUniformColor(classGroup: string) {
  if (classGroup === 'Gradinita') {
    return { key: 'red', label: 'Rosie' };
  }
  if (classGroup === 'Primar (clasele Pregatitoare - IV)') {
    return { key: 'blue', label: 'Albastra' };
  }
  if (classGroup === 'Gimnaziu (clasele V-VIII)' || classGroup === 'Liceu (clasele IX-XII)') {
    return { key: 'white', label: 'Alba' };
  }
  return { key: 'empty', label: 'Selecteaza clasa/grupa' };
}

export function getOrderSetQuantity(items: OrderItemInput[]) {
  return Math.max(0, ...items.map((item) => Number(item.quantity_set ?? 0)));
}

export function getProductSleeveLabel(productType: ProductType) {
  return productType === 'short_sleeve' ? 'Maneca scurta' : 'Maneca lunga';
}

export type SupplierSummaryRow = {
  key: string;
  colorKey: string;
  colorLabel: string;
  productType: ProductType;
  sleeveLabel: string;
  shirtSize: string;
  total: number;
};

export function getSupplierSummaryRows(orders: Order[]) {
  const summary = new Map<string, SupplierSummaryRow>();

  orders.forEach((order) => {
    const color = getUniformColor(order.class_group);
    const setQuantity = getOrderSetQuantity(order.order_items ?? []);

    order.order_items?.forEach((item) => {
      const total = Number(item.quantity_piece ?? 0) + setQuantity * 2;
      if (total <= 0) return;

      const key = `${color.key}-${item.product_type}-${item.shirt_size}`;
      const existing = summary.get(key);
      if (existing) {
        existing.total += total;
        return;
      }

      summary.set(key, {
        key,
        colorKey: color.key,
        colorLabel: color.label,
        productType: item.product_type,
        sleeveLabel: getProductSleeveLabel(item.product_type),
        shirtSize: item.shirt_size,
        total,
      });
    });
  });

  return Array.from(summary.values()).sort((left, right) => {
    const colorCompare = left.colorLabel.localeCompare(right.colorLabel, 'ro');
    if (colorCompare) return colorCompare;
    const sleeveCompare = left.sleeveLabel.localeCompare(right.sleeveLabel, 'ro');
    if (sleeveCompare) return sleeveCompare;
    return Number(left.shirtSize) - Number(right.shirtSize);
  });
}
