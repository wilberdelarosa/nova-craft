import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Product, 
  Variant, 
  Sale, 
  SaleItem,
  CartItem, 
  InventoryMovement, 
  StoreConfig,
  PaymentMethod,
  Category,
  Brand,
  Supplier,
  User,
  AuditLog
} from '@/types/inventory';

// Sample data generators
const generateId = () => Math.random().toString(36).substring(2, 11);

const sampleCategories: Category[] = [
  { id: '1', name: 'Camisas' },
  { id: '2', name: 'Pantalones' },
  { id: '3', name: 'Vestidos' },
  { id: '4', name: 'Accesorios' },
  { id: '5', name: 'Calzado' },
];

const sampleBrands: Brand[] = [
  { id: '1', name: 'Zara' },
  { id: '2', name: 'H&M' },
  { id: '3', name: 'Mango' },
  { id: '4', name: 'Pull&Bear' },
  { id: '5', name: 'Bershka' },
];

const sampleSuppliers: Supplier[] = [
  { id: '1', name: 'Textiles del Norte', phone: '55 1234 5678', email: 'ventas@textilesnorte.com' },
  { id: '2', name: 'Moda Importada SA', phone: '55 8765 4321', email: 'pedidos@modaimportada.com' },
  { id: '3', name: 'Fashion Wholesale', phone: '55 1122 3344', email: 'info@fashionwholesale.com' },
];

const sampleProducts: Product[] = [
  {
    id: '1',
    sku: 'CAM-OXF-001',
    name: 'Camisa Oxford Clásica',
    description: 'Camisa de algodón 100% con corte slim fit',
    categoryId: '1',
    brandId: '1',
    supplierId: '1',
    cost: 180,
    price: 450,
    taxRate: 16,
    active: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-20'),
    images: [{ id: '1', productId: '1', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'v1', productId: '1', variantSku: 'CAM-OXF-001-S-AZ', size: 'S', color: 'Azul', barcode: 'INV2024000001', stock: 8, minStock: 3, active: true },
      { id: 'v2', productId: '1', variantSku: 'CAM-OXF-001-M-AZ', size: 'M', color: 'Azul', barcode: 'INV2024000002', stock: 12, minStock: 3, active: true },
      { id: 'v3', productId: '1', variantSku: 'CAM-OXF-001-L-AZ', size: 'L', color: 'Azul', barcode: 'INV2024000003', stock: 5, minStock: 3, active: true },
      { id: 'v4', productId: '1', variantSku: 'CAM-OXF-001-S-BL', size: 'S', color: 'Blanco', barcode: 'INV2024000004', stock: 2, minStock: 3, active: true },
      { id: 'v5', productId: '1', variantSku: 'CAM-OXF-001-M-BL', size: 'M', color: 'Blanco', barcode: 'INV2024000005', stock: 0, minStock: 3, active: true },
    ],
  },
  {
    id: '2',
    sku: 'PAN-JEA-002',
    name: 'Jeans Slim Fit',
    description: 'Pantalón de mezclilla con stretch',
    categoryId: '2',
    brandId: '2',
    supplierId: '2',
    cost: 280,
    price: 699,
    taxRate: 16,
    active: true,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-12-18'),
    images: [{ id: '2', productId: '2', url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'v6', productId: '2', variantSku: 'PAN-JEA-002-28-OS', size: '28', color: 'Oscuro', barcode: 'INV2024000006', stock: 6, minStock: 2, active: true },
      { id: 'v7', productId: '2', variantSku: 'PAN-JEA-002-30-OS', size: '30', color: 'Oscuro', barcode: 'INV2024000007', stock: 15, minStock: 2, active: true },
      { id: 'v8', productId: '2', variantSku: 'PAN-JEA-002-32-OS', size: '32', color: 'Oscuro', barcode: 'INV2024000008', stock: 10, minStock: 2, active: true },
      { id: 'v9', productId: '2', variantSku: 'PAN-JEA-002-30-CL', size: '30', color: 'Claro', barcode: 'INV2024000009', stock: 4, minStock: 2, active: true },
    ],
  },
  {
    id: '3',
    sku: 'VES-FLO-003',
    name: 'Vestido Floral Verano',
    description: 'Vestido midi con estampado floral',
    categoryId: '3',
    brandId: '3',
    supplierId: '1',
    cost: 320,
    price: 890,
    taxRate: 16,
    active: true,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-12-15'),
    images: [{ id: '3', productId: '3', url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'v10', productId: '3', variantSku: 'VES-FLO-003-S-RO', size: 'S', color: 'Rosa', barcode: 'INV2024000010', stock: 3, minStock: 2, active: true },
      { id: 'v11', productId: '3', variantSku: 'VES-FLO-003-M-RO', size: 'M', color: 'Rosa', barcode: 'INV2024000011', stock: 7, minStock: 2, active: true },
      { id: 'v12', productId: '3', variantSku: 'VES-FLO-003-L-RO', size: 'L', color: 'Rosa', barcode: 'INV2024000012', stock: 1, minStock: 2, active: true },
    ],
  },
  {
    id: '4',
    sku: 'ACC-CIN-004',
    name: 'Cinturón de Cuero',
    description: 'Cinturón de piel genuina con hebilla metálica',
    categoryId: '4',
    brandId: '4',
    supplierId: '3',
    cost: 150,
    price: 399,
    taxRate: 16,
    active: true,
    createdAt: new Date('2024-04-20'),
    updatedAt: new Date('2024-12-10'),
    images: [{ id: '4', productId: '4', url: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'v13', productId: '4', variantSku: 'ACC-CIN-004-85-NE', size: '85cm', color: 'Negro', barcode: 'INV2024000013', stock: 20, minStock: 5, active: true },
      { id: 'v14', productId: '4', variantSku: 'ACC-CIN-004-95-NE', size: '95cm', color: 'Negro', barcode: 'INV2024000014', stock: 18, minStock: 5, active: true },
      { id: 'v15', productId: '4', variantSku: 'ACC-CIN-004-85-CA', size: '85cm', color: 'Café', barcode: 'INV2024000015', stock: 12, minStock: 5, active: true },
    ],
  },
  {
    id: '5',
    sku: 'CAL-TEN-005',
    name: 'Tenis Urbanos',
    description: 'Tenis casuales con suela de goma',
    categoryId: '5',
    brandId: '5',
    supplierId: '2',
    cost: 450,
    price: 1199,
    taxRate: 16,
    active: true,
    createdAt: new Date('2024-05-10'),
    updatedAt: new Date('2024-12-05'),
    images: [{ id: '5', productId: '5', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'v16', productId: '5', variantSku: 'CAL-TEN-005-25-BL', size: '25', color: 'Blanco', barcode: 'INV2024000016', stock: 4, minStock: 2, active: true },
      { id: 'v17', productId: '5', variantSku: 'CAL-TEN-005-26-BL', size: '26', color: 'Blanco', barcode: 'INV2024000017', stock: 6, minStock: 2, active: true },
      { id: 'v18', productId: '5', variantSku: 'CAL-TEN-005-27-BL', size: '27', color: 'Blanco', barcode: 'INV2024000018', stock: 8, minStock: 2, active: true },
      { id: 'v19', productId: '5', variantSku: 'CAL-TEN-005-26-NE', size: '26', color: 'Negro', barcode: 'INV2024000019', stock: 5, minStock: 2, active: true },
    ],
  },
];

const sampleSales: Sale[] = [
  {
    id: '1',
    saleNumber: 'VTA-2024-0001',
    userId: '1',
    customerName: 'María García',
    customerPhone: '55 1234 5678',
    subtotal: 1149,
    tax: 183.84,
    discount: 0,
    total: 1332.84,
    paymentMethod: 'tarjeta',
    amountReceived: 1332.84,
    change: 0,
    status: 'completada',
    createdAt: new Date('2024-12-20T10:30:00'),
    items: [
      { id: 'si1', saleId: '1', variantId: 'v2', productName: 'Camisa Oxford Clásica', variantName: 'M / Azul', quantity: 1, unitPrice: 450, discount: 0, lineTotal: 450 },
      { id: 'si2', saleId: '1', variantId: 'v7', productName: 'Jeans Slim Fit', variantName: '30 / Oscuro', quantity: 1, unitPrice: 699, discount: 0, lineTotal: 699 },
    ],
  },
  {
    id: '2',
    saleNumber: 'VTA-2024-0002',
    userId: '1',
    subtotal: 890,
    tax: 142.40,
    discount: 50,
    total: 982.40,
    paymentMethod: 'efectivo',
    amountReceived: 1000,
    change: 17.60,
    status: 'completada',
    createdAt: new Date('2024-12-21T15:45:00'),
    items: [
      { id: 'si3', saleId: '2', variantId: 'v11', productName: 'Vestido Floral Verano', variantName: 'M / Rosa', quantity: 1, unitPrice: 890, discount: 50, lineTotal: 840 },
    ],
  },
  {
    id: '3',
    saleNumber: 'VTA-2024-0003',
    userId: '1',
    customerName: 'Carlos López',
    subtotal: 1598,
    tax: 255.68,
    discount: 0,
    total: 1853.68,
    paymentMethod: 'transferencia',
    amountReceived: 1853.68,
    change: 0,
    status: 'completada',
    createdAt: new Date('2024-12-22T11:20:00'),
    items: [
      { id: 'si4', saleId: '3', variantId: 'v13', productName: 'Cinturón de Cuero', variantName: '85cm / Negro', quantity: 1, unitPrice: 399, discount: 0, lineTotal: 399 },
      { id: 'si5', saleId: '3', variantId: 'v17', productName: 'Tenis Urbanos', variantName: '26 / Blanco', quantity: 1, unitPrice: 1199, discount: 0, lineTotal: 1199 },
    ],
  },
];

const sampleMovements: InventoryMovement[] = [
  { id: 'm1', variantId: 'v1', type: 'entrada', quantityDelta: 10, unitCost: 180, reason: 'Compra inicial', reference: 'FAC-001', userId: '1', createdAt: new Date('2024-12-01') },
  { id: 'm2', variantId: 'v2', type: 'entrada', quantityDelta: 15, unitCost: 180, reason: 'Compra inicial', reference: 'FAC-001', userId: '1', createdAt: new Date('2024-12-01') },
  { id: 'm3', variantId: 'v2', type: 'salida', quantityDelta: -1, reason: 'Venta VTA-2024-0001', reference: 'VTA-2024-0001', userId: '1', createdAt: new Date('2024-12-20') },
  { id: 'm4', variantId: 'v7', type: 'salida', quantityDelta: -1, reason: 'Venta VTA-2024-0001', reference: 'VTA-2024-0001', userId: '1', createdAt: new Date('2024-12-20') },
  { id: 'm5', variantId: 'v11', type: 'salida', quantityDelta: -1, reason: 'Venta VTA-2024-0002', reference: 'VTA-2024-0002', userId: '1', createdAt: new Date('2024-12-21') },
  { id: 'm6', variantId: 'v5', type: 'ajuste', quantityDelta: -2, reason: 'Merma - producto dañado', userId: '1', createdAt: new Date('2024-12-22') },
];

interface StoreState {
  // User
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Data
  products: Product[];
  categories: Category[];
  brands: Brand[];
  suppliers: Supplier[];
  sales: Sale[];
  movements: InventoryMovement[];
  auditLogs: AuditLog[];
  
  // Cart
  cart: CartItem[];
  
  // Config
  storeConfig: StoreConfig;
  
  // Actions - Auth
  login: (username: string, password: string) => boolean;
  logout: () => void;
  
  // Actions - Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'images' | 'variants'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addVariant: (productId: string, variant: Omit<Variant, 'id' | 'productId'>) => Variant;
  updateVariant: (productId: string, variantId: string, updates: Partial<Variant>) => void;
  
  // Actions - Inventory
  addMovement: (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => void;
  
  // Actions - Cart
  addToCart: (variant: Variant, product: Product) => void;
  updateCartItem: (variantId: string, quantity: number, discount?: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  
  // Actions - Sales
  completeSale: (paymentMethod: PaymentMethod, amountReceived: number, customerName?: string, customerPhone?: string, discount?: number) => Sale | null;
  
  // Actions - Config
  updateStoreConfig: (updates: Partial<StoreConfig>) => void;
  
  // Helpers
  getProductById: (id: string) => Product | undefined;
  getVariantById: (variantId: string) => { variant: Variant; product: Product } | undefined;
  getVariantByBarcode: (barcode: string) => { variant: Variant; product: Product } | undefined;
  searchProducts: (query: string) => Product[];
  getLowStockVariants: () => { variant: Variant; product: Product }[];
  getOutOfStockVariants: () => { variant: Variant; product: Product }[];
  getDashboardStats: () => {
    totalSales: number;
    totalTickets: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      isAuthenticated: false,
      products: sampleProducts,
      categories: sampleCategories,
      brands: sampleBrands,
      suppliers: sampleSuppliers,
      sales: sampleSales,
      movements: sampleMovements,
      auditLogs: [],
      cart: [],
      storeConfig: {
        storeName: 'Mi Tienda de Ropa',
        storeAddress: 'Av. Principal #123, Col. Centro',
        storePhone: '55 1234 5678',
        storeEmail: 'ventas@mitienda.com',
        currency: 'MXN',
        defaultTaxRate: 16,
        ticketTemplate: 'informal',
        ticketSeriesPrefix: 'VTA',
        lastTicketNumber: 3,
      },

      // Auth actions
      login: (username, password) => {
        // Simple auth for MVP (admin/admin)
        if (username === 'admin' && password === 'admin') {
          const user: User = {
            id: '1',
            username: 'admin',
            role: 'admin',
            name: 'Administrador',
            active: true,
            createdAt: new Date(),
          };
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false, cart: [] });
      },

      // Product actions
      addProduct: (productData) => {
        const newProduct: Product = {
          ...productData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          images: [],
          variants: [],
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        return newProduct;
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));
      },

      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));
      },

      addVariant: (productId, variantData) => {
        const newVariant: Variant = {
          ...variantData,
          id: generateId(),
          productId,
        };
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? { ...p, variants: [...p.variants, newVariant], updatedAt: new Date() }
              : p
          ),
        }));
        return newVariant;
      },

      updateVariant: (productId, variantId, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  variants: p.variants.map((v) =>
                    v.id === variantId ? { ...v, ...updates } : v
                  ),
                  updatedAt: new Date(),
                }
              : p
          ),
        }));
      },

      // Inventory actions
      addMovement: (movementData) => {
        const newMovement: InventoryMovement = {
          ...movementData,
          id: generateId(),
          createdAt: new Date(),
        };
        
        // Update stock
        set((state) => {
          const updatedProducts = state.products.map((p) => ({
            ...p,
            variants: p.variants.map((v) =>
              v.id === movementData.variantId
                ? { ...v, stock: v.stock + movementData.quantityDelta }
                : v
            ),
          }));
          
          return {
            movements: [...state.movements, newMovement],
            products: updatedProducts,
          };
        });
      },

      // Cart actions
      addToCart: (variant, product) => {
        set((state) => {
          const existing = state.cart.find((item) => item.variant.id === variant.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.variant.id === variant.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }
          return {
            cart: [
              ...state.cart,
              {
                variant,
                product,
                quantity: 1,
                discount: 0,
                unitPrice: variant.priceOverride ?? product.price,
              },
            ],
          };
        });
      },

      updateCartItem: (variantId, quantity, discount) => {
        set((state) => ({
          cart: state.cart.map((item) =>
            item.variant.id === variantId
              ? { ...item, quantity, discount: discount ?? item.discount }
              : item
          ),
        }));
      },

      removeFromCart: (variantId) => {
        set((state) => ({
          cart: state.cart.filter((item) => item.variant.id !== variantId),
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      // Sales actions
      completeSale: (paymentMethod, amountReceived, customerName, customerPhone, discount = 0) => {
        const state = get();
        if (state.cart.length === 0) return null;

        const subtotal = state.cart.reduce(
          (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
          0
        );
        const taxableBase = Math.max(0, subtotal - discount);
        const tax = taxableBase * (state.storeConfig.defaultTaxRate / 100);
        const total = taxableBase + tax;
        const change = amountReceived - total;

        const newSaleNumber = `${state.storeConfig.ticketSeriesPrefix}-${new Date().getFullYear()}-${String(state.storeConfig.lastTicketNumber + 1).padStart(4, '0')}`;

        const saleItems: SaleItem[] = state.cart.map((item) => ({
          id: generateId(),
          saleId: '',
          variantId: item.variant.id,
          productName: item.product.name,
          variantName: `${item.variant.size || ''} / ${item.variant.color || ''}`.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          lineTotal: item.unitPrice * item.quantity - item.discount,
        }));

        const newSale: Sale = {
          id: generateId(),
          saleNumber: newSaleNumber,
          userId: state.currentUser?.id || '1',
          customerName,
          customerPhone,
          subtotal,
          tax,
          discount,
          total,
          paymentMethod,
          amountReceived,
          change,
          status: 'completada',
          createdAt: new Date(),
          items: saleItems.map((item) => ({ ...item, saleId: '' })),
        };

        // Update inventory
        state.cart.forEach((item) => {
          state.addMovement({
            variantId: item.variant.id,
            type: 'salida',
            quantityDelta: -item.quantity,
            reason: `Venta ${newSaleNumber}`,
            reference: newSaleNumber,
            userId: state.currentUser?.id || '1',
          });
        });

        set((state) => ({
          sales: [...state.sales, newSale],
          cart: [],
          storeConfig: {
            ...state.storeConfig,
            lastTicketNumber: state.storeConfig.lastTicketNumber + 1,
          },
        }));

        return newSale;
      },

      // Config actions
      updateStoreConfig: (updates) => {
        set((state) => ({
          storeConfig: { ...state.storeConfig, ...updates },
        }));
      },

      // Helpers
      getProductById: (id) => get().products.find((p) => p.id === id),

      getVariantById: (variantId) => {
        for (const product of get().products) {
          const variant = product.variants.find((v) => v.id === variantId);
          if (variant) return { variant, product };
        }
        return undefined;
      },

      getVariantByBarcode: (barcode) => {
        for (const product of get().products) {
          const variant = product.variants.find(
            (v) => v.barcode === barcode || v.variantSku === barcode
          );
          if (variant) return { variant, product };
        }
        return undefined;
      },

      searchProducts: (query) => {
        const q = query.toLowerCase();
        return get().products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.variants.some(
              (v) =>
                v.variantSku.toLowerCase().includes(q) ||
                v.barcode?.toLowerCase().includes(q)
            )
        );
      },

      getLowStockVariants: () => {
        const results: { variant: Variant; product: Product }[] = [];
        for (const product of get().products) {
          for (const variant of product.variants) {
            if (variant.stock > 0 && variant.stock <= variant.minStock) {
              results.push({ variant, product });
            }
          }
        }
        return results;
      },

      getOutOfStockVariants: () => {
        const results: { variant: Variant; product: Product }[] = [];
        for (const product of get().products) {
          for (const variant of product.variants) {
            if (variant.stock === 0) {
              results.push({ variant, product });
            }
          }
        }
        return results;
      },

      getDashboardStats: () => {
        const state = get();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthSales = state.sales.filter(
          (s) => new Date(s.createdAt) >= startOfMonth && s.status === 'completada'
        );

        const totalSales = monthSales.reduce((sum, s) => sum + s.total, 0);
        const totalTickets = monthSales.length;
        const totalUnits = monthSales.reduce(
          (sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0),
          0
        );

        let lowStockCount = 0;
        let outOfStockCount = 0;
        
        for (const product of state.products) {
          for (const variant of product.variants) {
            if (variant.stock === 0) outOfStockCount++;
            else if (variant.stock <= variant.minStock) lowStockCount++;
          }
        }

        return {
          totalSales,
          totalTickets,
          totalUnits,
          lowStockCount,
          outOfStockCount,
        };
      },
    }),
    {
      name: 'inventory-store',
      partialize: (state) => ({
        // Auth state - persist user session
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        // Data
        products: state.products,
        categories: state.categories,
        brands: state.brands,
        suppliers: state.suppliers,
        sales: state.sales,
        movements: state.movements,
        storeConfig: state.storeConfig,
      }),
    }
  )
);
