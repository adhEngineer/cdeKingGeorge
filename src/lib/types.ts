export type ProductType = 'short_sleeve' | 'long_sleeve';

export type OrderItemInput = {
  product_type: ProductType;
  shirt_size: string;
  quantity_set: number;
  quantity_piece: number;
};

export type Profile = {
  id: string;
  email: string;
  parent_name: string;
  student_name: string;
  class_group: string;
  role: 'parent' | 'admin';
};

export type Order = {
  id: string;
  user_id: string;
  student_name: string;
  class_group: string;
  parent_name: string;
  order_date: string;
  signature_name: string;
  status: string;
  created_at: string;
  order_items?: OrderItemInput[];
  order_files?: { storage_path: string; file_name: string }[];
};

export type OrderFormData = {
  student_name: string;
  class_group: string;
  parent_name: string;
  order_date: string;
  signature_name: string;
  items: OrderItemInput[];
};
