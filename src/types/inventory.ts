// Core types for the inventory system

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'cajero' | 'almacen' | 'gerencia';
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  supplierId?: string;
  cost: number;
  price: number;
  priceDOP: number; // Precio en Peso Dominicano
  priceUSD: number; // Precio en Dólares
  taxRate: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  images: ImageAsset[];
  variants: Variant[];
  tags?: string[];
}

export interface Variant {
  id: string;
  productId: string;
  variantSku: string;
  size?: string;
  color?: string;
  barcode?: string;
  priceOverride?: number;
  priceDOPOverride?: number;
  priceUSDOverride?: number;
  stock: number;
  minStock: number;
  active: boolean;
}

export interface ImageAsset {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'devolucion';

export interface InventoryMovement {
  id: string;
  variantId: string;
  type: MovementType;
  quantityDelta: number;
  unitCost?: number;
  reason: string;
  reference?: string;
  userId: string;
  createdAt: Date;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type SaleStatus = 'completada' | 'cancelada' | 'devuelta';
export type Currency = 'DOP' | 'USD';

export interface Sale {
  id: string;
  saleNumber: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  customerRNC?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: Currency;
  exchangeRate: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  status: SaleStatus;
  createdAt: Date;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface CartItem {
  variant: Variant;
  product: Product;
  quantity: number;
  discount: number;
  unitPrice: number;
}

export interface ExchangeRate {
  USD_DOP: number;
  lastUpdated: Date;
  source: string;
}

export interface StoreConfig {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeEmail?: string;
  logoUrl?: string;
  currency: Currency;
  defaultTaxRate: number;
  ticketTemplate: 'informal' | 'fiscal';
  ticketSeriesPrefix: string;
  lastTicketNumber: number;
  ticketFooter?: string;
  exchangeRate: ExchangeRate;
}

export interface DashboardStats {
  totalSales: number;
  totalTickets: number;
  totalUnits: number;
  totalProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  topProducts: { product: Product; units: number; revenue: number }[];
  salesByDay: { date: string; amount: number }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: Date;
}

// Búsqueda inteligente
export interface SmartSearchParams {
  query: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  supplier?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
}

// Reportes dinámicos
export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  category?: string;
  brand?: string;
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
  groupBy: 'day' | 'week' | 'month' | 'year';
  currency: Currency;
}
