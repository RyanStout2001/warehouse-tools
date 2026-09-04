export type PicqerFulfilmentCustomer = {
  idfulfilment_customer: number;
  name: string;
};

export type PicqerProductStock = {
  idwarehouse: number;
  stock: number;
  freestock: number;
};

export type PicqerProduct = {
  idproduct: number;
  idfulfilment_customer: number | null;
  productcode: string;
  barcode: string | null;
  name: string;
  type?: string;
  active: boolean;
  analysis_pick_amount_per_day?: string | number | null;
  updated?: string | null;
  stock?: PicqerProductStock[];
};

export type PicqerPurchaseOrderStatus =
  | "concept"
  | "purchased"
  | "received"
  | "cancelled";

export type PicqerPurchaseOrderProduct = {
  idproduct: number;
  productcode?: string | null;
  name?: string | null;
  amount: number;
  amountreceived?: number;
};

export type PicqerPurchaseOrder = {
  idpurchaseorder: number;
  idsupplier?: number | null;
  idwarehouse?: number | null;
  purchaseorderid?: string | number | null;
  supplier_name?: string | null;
  supplier_orderid?: string | null;
  supplier?: { idsupplier?: number; name?: string } | null;
  status: PicqerPurchaseOrderStatus;
  remarks?: string | null;
  delivery_date?: string | null;
  created?: string | null;
  updated?: string | null;
  products?: PicqerPurchaseOrderProduct[];
};

export type PicqerReceiptProduct = {
  idproduct: number;
  idpurchaseorder?: number | null;
  productcode?: string | null;
  name?: string | null;
  amount: number;
  reverted_at?: string | null;
};

export type PicqerReceipt = {
  idreceipt: number;
  receiptid?: string | number | null;
  status?: string;
  completed_at?: string | null;
  updated?: string | null;
  created?: string | null;
  supplier?: { idsupplier?: number; name?: string } | null;
  purchaseorder?: {
    idpurchaseorder?: number;
    purchaseorderid?: string | number | null;
  } | null;
  products?: PicqerReceiptProduct[];
};

export type CachedPurchaseOrderProduct = {
  idproduct: number;
  productcode: string | null;
  name: string | null;
  amount: number;
  amountreceived: number;
};

export type CachedReceiptProduct = {
  idproduct: number;
  idpurchaseorder: number | null;
  productcode: string | null;
  name: string | null;
  amount: number;
  reverted_at: string | null;
};

