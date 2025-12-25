import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Building2,
  User,
  Phone,
  Percent,
  X,
  CheckCircle2,
  Printer,
  Package,
  Camera,
  Download,
  Filter,
  RefreshCw,
  DollarSign,
  Tag,
  Barcode,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore, formatDOP, formatUSD, generateBarcode } from '@/lib/store';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { printTicket, downloadTicket } from '@/lib/ticketPdf';
import type { PaymentMethod, Sale, Currency } from '@/types/inventory';
import { cn } from '@/lib/utils';

export default function Ventas() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastReadCode, setLastReadCode] = useState<string | null>(null);
  const lastReadTimerRef = useRef<number | null>(null);
  const searchQueryRef = useRef('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Búsqueda inteligente
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [minPriceFilter, setMinPriceFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState(true);

  // Producto rápido
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductPrice, setQuickProductPrice] = useState('');
  const [quickProductBarcode, setQuickProductBarcode] = useState('');
  const [quickProductCategory, setQuickProductCategory] = useState('General');

  // Payment form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');
  const [saleCurrency, setSaleCurrency] = useState<Currency>('DOP');

  const {
    cart,
    products,
    categories,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    completeSale,
    getVariantByBarcode,
    addProductQuick,
    storeConfig,
    fetchExchangeRate
  } = useStore();

  // Tasa de cambio con valor por defecto
  const exchangeRate = storeConfig?.exchangeRate?.USD_DOP ?? 60;

  // Función de formato según moneda
  const formatCurrency = (amount: number) => {
    return saleCurrency === 'DOP' ? formatDOP(amount) : formatUSD(amount);
  };

  // Convertir precio según moneda
  const convertPrice = (priceDOP: number) => {
    if (saleCurrency === 'USD') {
      return priceDOP / exchangeRate;
    }
    return priceDOP;
  };

  // Focus search on mount y actualizar tasa
  useEffect(() => {
    searchRef.current?.focus();
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Keep focus reasonably stable for HID scanning
  useEffect(() => {
    if (showPaymentDialog || showScanner || showSuccessDialog || showQuickAdd) return;
    searchRef.current?.focus();
  }, [showPaymentDialog, showScanner, showSuccessDialog, showQuickAdd]);

  const markLastRead = useCallback((code: string) => {
    setLastReadCode(code);
    if (lastReadTimerRef.current) {
      window.clearTimeout(lastReadTimerRef.current);
    }
    lastReadTimerRef.current = window.setTimeout(() => {
      setLastReadCode(null);
      lastReadTimerRef.current = null;
    }, 2500);
  }, []);

  // Búsqueda inteligente con filtros
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && categoryFilter === 'all' && !minPriceFilter && !maxPriceFilter) return [];
    
    const q = searchQuery.toLowerCase();
    const results: { variant: typeof products[0]['variants'][0]; product: typeof products[0]; score: number }[] = [];

    for (const product of products) {
      if (!product.active) continue;
      
      // Filtro de categoría
      if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) continue;
      
      // Filtro de precio
      const productPrice = product.priceDOP || product.price;
      if (minPriceFilter && productPrice < parseFloat(minPriceFilter)) continue;
      if (maxPriceFilter && productPrice > parseFloat(maxPriceFilter)) continue;

      for (const variant of product.variants) {
        if (!variant.active) continue;
        
        // Filtro de stock
        if (inStockOnly && variant.stock <= 0) continue;

        let score = 0;
        
        // Calcular relevancia de búsqueda
        if (q) {
          if (variant.barcode?.toLowerCase() === q) score += 100; // Coincidencia exacta de código
          else if (variant.variantSku.toLowerCase() === q) score += 90;
          else if (product.sku.toLowerCase() === q) score += 85;
          else if (product.name.toLowerCase().includes(q)) score += 70;
          else if (variant.barcode?.toLowerCase().includes(q)) score += 60;
          else if (variant.variantSku.toLowerCase().includes(q)) score += 50;
          else if (product.description?.toLowerCase().includes(q)) score += 30;
          else if (product.tags?.some(t => t.toLowerCase().includes(q))) score += 40;
          else if (variant.color?.toLowerCase().includes(q)) score += 35;
          else if (variant.size?.toLowerCase().includes(q)) score += 35;
          else continue; // No hay match
        } else {
          score = 50; // Solo filtros, sin búsqueda
        }

        results.push({ variant, product, score });
        if (results.length >= 20) break;
      }
      if (results.length >= 20) break;
    }
    
    // Ordenar por relevancia
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [searchQuery, products, categoryFilter, minPriceFilter, maxPriceFilter, inStockOnly]);

  const processScanOrSearch = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;

    markLastRead(value);

    const result = getVariantByBarcode(value);
    if (result) {
      if (result.variant.stock <= 0) {
        toast.error('Producto agotado', {
          description: `${result.product.name} no tiene stock disponible`,
        });
      } else {
        addToCart(result.variant, result.product);
        toast.success('Agregado al carrito', {
          description: `${result.product.name} - ${result.variant.size || ''} ${result.variant.color || ''}`,
        });
      }
      setSearchQuery('');
      return;
    }

    if (searchResults.length === 1) {
      const { variant, product } = searchResults[0];
      if (variant.stock <= 0) {
        toast.error('Producto agotado');
      } else {
        addToCart(variant, product);
        toast.success('Agregado al carrito');
      }
      setSearchQuery('');
      return;
    }

    if (searchResults.length === 0) {
      toast.error('Producto no encontrado', { description: value });
    }
  }, [addToCart, getVariantByBarcode, markLastRead, searchResults]);

  // Cart calculations con moneda
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
      0
    );
    const discountAmount = globalDiscount ? parseFloat(globalDiscount) || 0 : 0;
    const taxableBase = Math.max(0, subtotal - discountAmount);
    const tax = taxableBase * (storeConfig.defaultTaxRate / 100);
    const total = taxableBase + tax;
    
    // Convertir según moneda seleccionada
    const convertedTotal = saleCurrency === 'USD' 
      ? total / storeConfig.exchangeRate.USD_DOP 
      : total;
    
    return { subtotal, tax, discountAmount, total, convertedTotal };
  }, [cart, globalDiscount, storeConfig.defaultTaxRate, storeConfig.exchangeRate.USD_DOP, saleCurrency]);

  // Handle barcode scan (Enter/Tab suffix)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && searchQuery.trim()) {
      e.preventDefault();
      processScanOrSearch(searchQuery);
    }
  };

  // Handle scanned barcode from camera
  const handleBarcodeScanned = (code: string) => {
    processScanOrSearch(code);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const handleAddToCart = (variant: typeof products[0]['variants'][0], product: typeof products[0]) => {
    const cartItem = cart.find((item) => item.variant.id === variant.id);
    const currentQty = cartItem?.quantity || 0;

    if (currentQty >= variant.stock) {
      toast.error('Stock insuficiente', {
        description: `Solo hay ${variant.stock} unidades disponibles`,
      });
      return;
    }

    addToCart(variant, product);
    toast.success('Agregado', { description: `${product.name}` });
    setSearchQuery('');
    searchRef.current?.focus();
  };

  const handleQuantityChange = (variantId: string, newQty: number) => {
    const cartItem = cart.find((item) => item.variant.id === variantId);
    if (!cartItem) return;

    if (newQty <= 0) {
      removeFromCart(variantId);
      return;
    }

    if (newQty > cartItem.variant.stock) {
      toast.error('Stock insuficiente');
      return;
    }

    updateCartItem(variantId, newQty);
  };

  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Carrito vacío', { description: 'Agrega productos para continuar' });
      return;
    }
    setAmountReceived(cartTotals.total.toFixed(2));
    setShowPaymentDialog(true);
  }, [cart.length, cartTotals.total]);

  // Global key handling: allow F9 to charge, F10 to quick add, and tolerate scan when focus is lost
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showPaymentDialog || showScanner || showSuccessDialog || showQuickAdd) return;

      if (e.key === 'F9') {
        e.preventDefault();
        handleOpenPayment();
        return;
      }

      if (e.key === 'F10') {
        e.preventDefault();
        setShowQuickAdd(true);
        return;
      }

      // Don't interfere with normal typing in other inputs
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || !!target?.isContentEditable) return;

      // Basic scan buffering when focus is lost (keyboard wedge)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const currentQuery = searchQueryRef.current;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (currentQuery.trim()) {
          e.preventDefault();
          processScanOrSearch(currentQuery);
        }
        return;
      }

      if (e.key === 'Backspace') {
        if (currentQuery) {
          e.preventDefault();
          setSearchQuery((prev) => prev.slice(0, -1));
        }
        searchRef.current?.focus();
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        setSearchQuery((prev) => prev + e.key);
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleOpenPayment, processScanOrSearch, showPaymentDialog, showScanner, showSuccessDialog, showQuickAdd]);

  // Crear producto rápido
  const handleQuickAddProduct = () => {
    if (!quickProductName.trim() || !quickProductPrice) {
      toast.error('Nombre y precio son requeridos');
      return;
    }

    const price = parseFloat(quickProductPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Precio inválido');
      return;
    }

    const newProduct = addProductQuick(
      quickProductName.trim(),
      price,
      quickProductBarcode || undefined,
      quickProductCategory
    );

    if (newProduct && newProduct.variants.length > 0) {
      addToCart(newProduct.variants[0], newProduct);
      toast.success('Producto creado y agregado al carrito', {
        description: `${newProduct.name} - ${formatDOP(price)}`
      });
    }

    // Reset form
    setQuickProductName('');
    setQuickProductPrice('');
    setQuickProductBarcode('');
    setQuickProductCategory('General');
    setShowQuickAdd(false);
    searchRef.current?.focus();
  };

  // Generar código de barras dinámico
  const handleGenerateBarcode = () => {
    setQuickProductBarcode(generateBarcode());
  };

  const handleCompleteSale = () => {
    const received = parseFloat(amountReceived) || 0;

    if (paymentMethod === 'efectivo' && received < cartTotals.total) {
      toast.error('Monto insuficiente');
      return;
    }

    const sale = completeSale(
      paymentMethod,
      received,
      customerName || undefined,
      customerPhone || undefined,
      cartTotals.discountAmount
    );

    if (sale) {
      setLastSale(sale);
      setShowPaymentDialog(false);
      setShowSuccessDialog(true);

      // Reset form
      setPaymentMethod('efectivo');
      setAmountReceived('');
      setCustomerName('');
      setCustomerPhone('');
      setGlobalDiscount('');
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false);
    setLastSale(null);
    searchRef.current?.focus();
  };

  const change = paymentMethod === 'efectivo'
    ? Math.max(0, (parseFloat(amountReceived) || 0) - cartTotals.total)
    : 0;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 animate-fade-in">
        {/* Left: Search & Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Punto de Venta
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="font-mono">F9=Cobrar</Badge>
                  <Badge variant="outline" className="font-mono">F10=Crear</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
              {/* Search Input con filtros */}
              <div className="space-y-2 mb-4">
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      ref={searchRef}
                      type="text"
                      placeholder="Escanear código o buscar producto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="pl-10 h-12 text-base"
                      autoFocus
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant={showFilters ? 'default' : 'outline'}
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => setShowFilters(!showFilters)}
                    title="Filtros avanzados"
                  >
                    <Filter className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => setShowScanner(true)}
                    title="Escanear con cámara"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 shrink-0"
                    onClick={() => setShowQuickAdd(true)}
                    title="Crear producto rápido (F10)"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Filtros avanzados */}
                {showFilters && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg animate-fade-in">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9">
                        <Tag className="w-3 h-3 mr-1" />
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Precio mín"
                      value={minPriceFilter}
                      onChange={(e) => setMinPriceFilter(e.target.value)}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      placeholder="Precio máx"
                      value={maxPriceFilter}
                      onChange={(e) => setMaxPriceFilter(e.target.value)}
                      className="h-9"
                    />
                    <Button 
                      variant={inStockOnly ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setInStockOnly(!inStockOnly)}
                      className="h-9"
                    >
                      Solo con stock
                    </Button>
                  </div>
                )}
              </div>

              {lastReadCode && (
                <div className="-mt-2 mb-3">
                  <Badge variant="secondary" className="font-mono">
                    Leído: {lastReadCode}
                  </Badge>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && (
                <div className="flex-1 overflow-auto border border-border rounded-lg">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-border">
                      {searchResults.map(({ variant, product }) => (
                        <button
                          key={variant.id}
                          onClick={() => handleAddToCart(variant, product)}
                          disabled={variant.stock <= 0}
                          className={cn(
                            "w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left",
                            variant.stock <= 0 && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {product.images[0] ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {variant.size && `Talla: ${variant.size}`}
                              {variant.size && variant.color && ' • '}
                              {variant.color && `Color: ${variant.color}`}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {variant.variantSku}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(variant.priceOverride ?? product.price)}</p>
                            <Badge
                              variant={variant.stock > 0 ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              Stock: {variant.stock}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No se encontraron productos</p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state when no search */}
              {!searchQuery && cart.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Carrito vacío</h3>
                  <p className="text-muted-foreground max-w-xs">
                    Escanea un código de barras o busca un producto para comenzar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-[420px] flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Carrito</CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Vaciar
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-auto p-0">
              {cart.length > 0 ? (
                <div className="divide-y divide-border">
                  {cart.map((item) => (
                    <div key={item.variant.id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant.size} {item.variant.color && `/ ${item.variant.color}`}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.variant.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.variant.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <p className="font-semibold text-sm">
                          {formatCurrency(item.unitPrice * item.quantity - item.discount)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(item.variant.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Sin productos</p>
                </div>
              )}
            </CardContent>

            {/* Totals & Payment */}
            <div className="flex-shrink-0 border-t p-4 space-y-3 bg-muted/30">
              {/* Selector de moneda */}
              <div className="flex items-center justify-between p-2 bg-background rounded-lg border">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Moneda:</span>
                </div>
                <div className="flex gap-1">
                  {(['DOP', 'USD'] as Currency[]).map((cur) => (
                    <Button
                      key={cur}
                      variant={saleCurrency === cur ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSaleCurrency(cur)}
                      className="h-7 px-3"
                    >
                      {cur}
                    </Button>
                  ))}
                </div>
              </div>
              
              {saleCurrency === 'USD' && (
                <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Tasa: 1 USD = {formatDOP(storeConfig.exchangeRate.USD_DOP)}
                </div>
              )}

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cliente (opcional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Teléfono"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Discount */}
              <div className="relative">
                <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Descuento global (RD$)"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatDOP(cartTotals.subtotal)}</span>
                </div>
                {cartTotals.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Descuento</span>
                    <span>-{formatDOP(cartTotals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ITBIS ({storeConfig.defaultTaxRate}%)</span>
                  <span>{formatDOP(cartTotals.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total {saleCurrency}</span>
                  <span className={saleCurrency === 'USD' ? 'text-green-600' : ''}>
                    {formatCurrency(cartTotals.convertedTotal)}
                  </span>
                </div>
                {saleCurrency === 'USD' && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Equiv. DOP</span>
                    <span>{formatDOP(cartTotals.total)}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleOpenPayment}
                className="w-full h-12 text-base"
                disabled={cart.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Cobrar {formatCurrency(cartTotals.convertedTotal)}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrar venta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total a cobrar</p>
              <p className="text-3xl font-bold">{formatCurrency(cartTotals.total)}</p>
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'efectivo' as const, label: 'Efectivo', icon: Banknote },
                  { value: 'tarjeta' as const, label: 'Tarjeta', icon: CreditCard },
                  { value: 'transferencia' as const, label: 'Transfer.', icon: Building2 },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                      paymentMethod === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'efectivo' && (
              <div className="space-y-2">
                <Label htmlFor="amount">Monto recibido</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="text-xl font-semibold text-center h-14"
                  autoFocus
                />
                {change > 0 && (
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-success">Cambio</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(change)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCompleteSale}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold mb-1">¡Venta completada!</h2>
            <p className="text-muted-foreground mb-4">
              Ticket: <span className="font-mono font-medium">{lastSale?.saleNumber}</span>
            </p>
            <div className="w-full p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total cobrado</span>
                <span className="font-semibold">{formatCurrency(lastSale?.total || 0)}</span>
              </div>
              {lastSale && lastSale.change > 0 && (
                <div className="flex justify-between text-success">
                  <span>Cambio entregado</span>
                  <span className="font-semibold">{formatCurrency(lastSale.change)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (!lastSale) return;
                const ok = printTicket(lastSale, storeConfig);
                if (!ok) {
                  toast.error('No se pudo abrir la ventana de impresión', {
                    description: 'Permite ventanas emergentes o usa "Descargar PDF"',
                  });
                }
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => lastSale && downloadTicket(lastSale, storeConfig)}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
            <Button onClick={handleCloseSuccess} className="flex-1">
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => {
          setShowScanner(false);
          window.setTimeout(() => searchRef.current?.focus(), 0);
        }}
        onScan={handleBarcodeScanned}
      />

      {/* Quick Add Product Dialog */}
      <Dialog open={showQuickAdd} onOpenChange={setShowQuickAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Crear Producto Rápido
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qp-name">Nombre del producto *</Label>
              <Input
                id="qp-name"
                placeholder="Ej: Camisa azul talla M"
                value={quickProductName}
                onChange={(e) => setQuickProductName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="qp-price">Precio RD$ *</Label>
                <Input
                  id="qp-price"
                  type="number"
                  placeholder="0.00"
                  value={quickProductPrice}
                  onChange={(e) => setQuickProductPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qp-category">Categoría</Label>
                <Select value={quickProductCategory} onValueChange={setQuickProductCategory}>
                  <SelectTrigger id="qp-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qp-barcode">Código de barras</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="qp-barcode"
                    placeholder="Escanear o generar"
                    value={quickProductBarcode}
                    onChange={(e) => setQuickProductBarcode(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateBarcode}
                  title="Generar código automático"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Generar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deja vacío para generar automáticamente
              </p>
            </div>

            {quickProductPrice && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Precio en USD</p>
                <p className="font-semibold text-lg">
                  {formatUSD(parseFloat(quickProductPrice) / storeConfig.exchangeRate.USD_DOP)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAdd(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickAddProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Crear y Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
