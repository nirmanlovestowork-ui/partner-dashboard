export type Assignee = 'BIBHU' | 'ADMIN';

export interface Task {
  task_id: string;
  task_name: string;
  description?: string;
  due_date: string | null;
  status: boolean;
  assignee: Assignee;
}

export interface Party {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
}

export interface Service {
  id?: string;
  name: string;
  unit_price: number;
}

export interface InvoiceItem {
  id: string;
  serviceId?: string;
  name: string;
  unit_price: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  date: string;
  party: Party;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grand_total: number;
}
