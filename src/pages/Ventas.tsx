import { useState, useRef, useEffect, useMemo } from 'react';
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
  Download
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
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { printTicket, downloadTicket } from '@/lib/ticketPdf';
import type { PaymentMethod, Sale } from '@/types/inventory';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export default function Ventas() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  // Payment form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [amountReceived, setAmountReceived] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState('');

  const { 
    cart, 
    products,
    addToCart, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    completeSale,
    getVariantByBarcode,
    storeConfig
  } = useStore();

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { variant: typeof products[0]['variants'][0]; product: typeof products[0] }[] = [];
    
    for (const product of products) {
      for (const variant of product.variants) {
        if (
          variant.variantSku.toLowerCase().includes(q) ||
          variant.barcode?.toLowerCase().includes(q) ||
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q)
        ) {
          results.push({ variant, product });
          if (results.length >= 10) break;
        }
      }
      if (results.length >= 10) break;
    }
    return results;
  }, [searchQuery, products]);

  // Cart calculations
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity - item.discount),
      0
    );
    const discountAmount = globalDiscount ? parseFloat(globalDiscount) || 0 : 0;
    const tax = (subtotal - discountAmount) * (storeConfig.defaultTaxRate / 100);
    const total = subtotal + tax - discountAmount;
    return { subtotal, tax, discountAmount, total };
  }, [cart, globalDiscount, storeConfig.defaultTaxRate]);

  // Handle barcode scan (Enter key)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const result = getVariantByBarcode(searchQuery.trim());
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
      } else if (searchResults.length === 1) {
        const { variant, product } = searchResults[0];
        if (variant.stock <= 0) {
          toast.error('Producto agotado');
        } else {
          addToCart(variant, product);
          toast.success('Agregado al carrito');
        }
        setSearchQuery('');
      } else if (searchResults.length === 0) {
        toast.error('Producto no encontrado');
      }
    }
  };

  // Handle scanned barcode from camera
  const handleBarcodeScanned = (code: string) => {
    const result = getVariantByBarcode(code);
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
    } else {
      toast.error('Producto no encontrado', { description: code });
    }
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

  const handleOpenPayment = () => {
    if (cart.length === 0) {
      toast.error('Carrito vacío', { description: 'Agrega productos para continuar' });
      return;
    }
    setAmountReceived(cartTotals.total.toFixed(2));
    setShowPaymentDialog(true);
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
                <Badge variant="secondary" className="font-mono">
                  F9 = Cobrar
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
              {/* Search Input */}
              <div className="relative mb-4 flex gap-2">
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
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={() => setShowScanner(true)}
                  title="Escanear con cámara"
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>

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
                  placeholder="Descuento global ($)"
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
                  <span>{formatCurrency(cartTotals.subtotal)}</span>
                </div>
                {cartTotals.discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Descuento</span>
                    <span>-{formatCurrency(cartTotals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA ({storeConfig.defaultTaxRate}%)</span>
                  <span>{formatCurrency(cartTotals.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotals.total)}</span>
                </div>
              </div>

              <Button 
                onClick={handleOpenPayment} 
                className="w-full h-12 text-base"
                disabled={cart.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Cobrar
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
              onClick={() => lastSale && printTicket(lastSale, storeConfig)}
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
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </AppLayout>
  );
}
