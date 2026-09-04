export type AbcClass = "A" | "B" | "C";

export type BalanceReason =
  | "time_oos"
  | "stock_amount"
  | "time_based"
  | "inbound_surplus";

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: number;
          name: string;
          active: boolean;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          name: string;
          active?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          active?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: number;
          shop_id: number;
          productcode: string;
          barcode: string | null;
          name: string;
          product_type: string;
          active: boolean;
          pick_velocity: number;
          current_stock: number;
          free_stock: number;
          idwarehouse: number | null;
          abc_class: AbcClass | null;
          balance_need: boolean;
          balance_reason: BalanceReason | null;
          balance_reason_label: string | null;
          last_balanced_at: string | null;
          balance_cooldown_until: string | null;
          temporary_stock_threshold: number | null;
          days_of_cover: number | null;
          picqer_updated_at: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;
          shop_id: number;
          productcode: string;
          barcode?: string | null;
          name: string;
          product_type?: string;
          active?: boolean;
          pick_velocity?: number;
          current_stock?: number;
          free_stock?: number;
          idwarehouse?: number | null;
          abc_class?: AbcClass | null;
          balance_need?: boolean;
          balance_reason?: BalanceReason | null;
          balance_reason_label?: string | null;
          last_balanced_at?: string | null;
          balance_cooldown_until?: string | null;
          temporary_stock_threshold?: number | null;
          days_of_cover?: number | null;
          picqer_updated_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          shop_id?: number;
          productcode?: string;
          barcode?: string | null;
          name?: string;
          product_type?: string;
          active?: boolean;
          pick_velocity?: number;
          current_stock?: number;
          free_stock?: number;
          idwarehouse?: number | null;
          abc_class?: AbcClass | null;
          balance_need?: boolean;
          balance_reason?: BalanceReason | null;
          balance_reason_label?: string | null;
          last_balanced_at?: string | null;
          balance_cooldown_until?: string | null;
          temporary_stock_threshold?: number | null;
          days_of_cover?: number | null;
          picqer_updated_at?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      global_settings: {
        Row: {
          id: number;
          class_a_min_velocity: number;
          class_b_min_velocity: number;
          balance_threshold_days: number;
          stock_amount_threshold: number;
          max_days_without_balance: number;
          return_supplier_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          class_a_min_velocity?: number;
          class_b_min_velocity?: number;
          balance_threshold_days?: number;
          stock_amount_threshold?: number;
          max_days_without_balance?: number;
          return_supplier_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          class_a_min_velocity?: number;
          class_b_min_velocity?: number;
          balance_threshold_days?: number;
          stock_amount_threshold?: number;
          max_days_without_balance?: number;
          return_supplier_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      class_settings: {
        Row: {
          abc_class: AbcClass;
          balance_threshold_days: number | null;
          stock_amount_threshold: number | null;
          max_days_without_balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          abc_class: AbcClass;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          abc_class?: AbcClass;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shop_class_settings: {
        Row: {
          shop_id: number;
          abc_class: AbcClass;
          balance_threshold_days: number | null;
          stock_amount_threshold: number | null;
          max_days_without_balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          shop_id: number;
          abc_class: AbcClass;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          shop_id?: number;
          abc_class?: AbcClass;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_class_settings_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_settings: {
        Row: {
          shop_id: number;
          class_a_min_velocity: number | null;
          class_b_min_velocity: number | null;
          balance_threshold_days: number | null;
          stock_amount_threshold: number | null;
          max_days_without_balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          shop_id: number;
          class_a_min_velocity?: number | null;
          class_b_min_velocity?: number | null;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          shop_id?: number;
          class_a_min_velocity?: number | null;
          class_b_min_velocity?: number | null;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_settings_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: true;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      product_settings: {
        Row: {
          product_id: number;
          class_a_min_velocity: number | null;
          class_b_min_velocity: number | null;
          balance_threshold_days: number | null;
          stock_amount_threshold: number | null;
          max_days_without_balance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          product_id: number;
          class_a_min_velocity?: number | null;
          class_b_min_velocity?: number | null;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          product_id?: number;
          class_a_min_velocity?: number | null;
          class_b_min_velocity?: number | null;
          balance_threshold_days?: number | null;
          stock_amount_threshold?: number | null;
          max_days_without_balance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_settings_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      balance_events: {
        Row: {
          id: string;
          product_id: number;
          trigger_reason: BalanceReason;
          counted_stock: number | null;
          notes: string | null;
          counted_at: string;
        };
        Insert: {
          id?: string;
          product_id: number;
          trigger_reason: BalanceReason;
          counted_stock?: number | null;
          notes?: string | null;
          counted_at?: string;
        };
        Update: {
          id?: string;
          product_id?: number;
          trigger_reason?: BalanceReason;
          counted_stock?: number | null;
          notes?: string | null;
          counted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "balance_events_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      picqer_purchase_orders: {
        Row: {
          id: number;
          status: "concept" | "purchased" | "received" | "cancelled";
          idsupplier: number | null;
          purchaseorderid: string | null;
          supplier_name: string | null;
          supplier_orderid: string | null;
          idwarehouse: number | null;
          delivery_date: string | null;
          remarks: string | null;
          created_at_picqer: string | null;
          is_return_supplier: boolean;
          products_count: number;
          amount_ordered: number;
          amount_received: number;
          products: unknown;
          updated_at_picqer: string | null;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id: number;
          status: "concept" | "purchased" | "received" | "cancelled";
          idsupplier?: number | null;
          purchaseorderid?: string | null;
          supplier_name?: string | null;
          supplier_orderid?: string | null;
          idwarehouse?: number | null;
          delivery_date?: string | null;
          remarks?: string | null;
          created_at_picqer?: string | null;
          is_return_supplier?: boolean;
          products_count?: number;
          amount_ordered?: number;
          amount_received?: number;
          products?: unknown;
          updated_at_picqer?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          status?: "concept" | "purchased" | "received" | "cancelled";
          idsupplier?: number | null;
          purchaseorderid?: string | null;
          supplier_name?: string | null;
          supplier_orderid?: string | null;
          idwarehouse?: number | null;
          delivery_date?: string | null;
          remarks?: string | null;
          created_at_picqer?: string | null;
          is_return_supplier?: boolean;
          products_count?: number;
          amount_ordered?: number;
          amount_received?: number;
          products?: unknown;
          updated_at_picqer?: string | null;
          last_seen_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      inbound_sync_state: {
        Row: {
          id: number;
          po_watermark: string | null;
          receipts_watermark: string | null;
          baseline_completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          po_watermark?: string | null;
          receipts_watermark?: string | null;
          baseline_completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          po_watermark?: string | null;
          receipts_watermark?: string | null;
          baseline_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      processed_receipts: {
        Row: {
          id: number;
          receiptid: string | null;
          status: string | null;
          completed_at: string | null;
          skipped_return: boolean;
          processed_at: string;
          idsupplier: number | null;
          supplier_name: string | null;
          idpurchaseorder: number | null;
          purchaseorderid: string | null;
          products_count: number;
          amount: number;
          products: unknown;
        };
        Insert: {
          id: number;
          receiptid?: string | null;
          status?: string | null;
          completed_at?: string | null;
          skipped_return?: boolean;
          processed_at?: string;
          idsupplier?: number | null;
          supplier_name?: string | null;
          idpurchaseorder?: number | null;
          purchaseorderid?: string | null;
          products_count?: number;
          amount?: number;
          products?: unknown;
        };
        Update: {
          id?: number;
          receiptid?: string | null;
          status?: string | null;
          completed_at?: string | null;
          skipped_return?: boolean;
          processed_at?: string;
          idsupplier?: number | null;
          supplier_name?: string | null;
          idpurchaseorder?: number | null;
          purchaseorderid?: string | null;
          products_count?: number;
          amount?: number;
          products?: unknown;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
