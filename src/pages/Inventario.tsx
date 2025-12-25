import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Package, 
  Filter, 
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  History,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MovementType, Variant, Product } from '@/types/inventory';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export default function Inventario() {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>(initialFilter === 'alertas' ? 'alerts' : initialFilter === 'bajo' ? 'low' : initialFilter === 'agotado' ? 'out' : 'all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Movement dialog
  const [movementDialog, setMovementDialog] = useState<{
    type: MovementType;
    variant: Variant;
    product: Product;
  } | null>(null);
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementRef, setMovementRef] = useState('');
  const [movementCost, setMovementCost] = useState('');

  // Kardex sheet
  const [kardexVariant, setKardexVariant] = useState<{ variant: Variant; product: Product } | null>(null);

  const { products, movements, categories, brands, addMovement, currentUser } = useStore();

  // Flatten all variants with product info
  const allVariants = useMemo(() => {
    const result: { variant: Variant; product: Product }[] = [];
    for (const product of products) {
      for (const variant of product.variants) {
        result.push({ variant, product });
      }
    }
    return result;
  }, [products]);

  const filteredVariants = useMemo(() => {
    return allVariants.filter(({ variant, product }) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(q) ||
          product.sku.toLowerCase().includes(q) ||
          variant.variantSku.toLowerCase().includes(q) ||
          variant.barcode?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Stock filter
      if (stockFilter === 'instock' && variant.stock <= 0) return false;
      if (stockFilter === 'low' && (variant.stock <= 0 || variant.stock > variant.minStock)) return false;
      if (stockFilter === 'out' && variant.stock > 0) return false;
      if (stockFilter === 'alerts' && variant.stock > variant.minStock) return false;

      return true;
    });
  }, [allVariants, searchQuery, stockFilter]);

  const stats = useMemo(() => {
    let total = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    for (const { variant, product } of allVariants) {
      total++;
      totalValue += variant.stock * product.cost;
      if (variant.stock === 0) outOfStock++;
      else if (variant.stock <= variant.minStock) lowStock++;
    }

    return { total, lowStock, outOfStock, totalValue };
  }, [allVariants]);

  const variantMovements = useMemo(() => {
    if (!kardexVariant) return [];
    return movements
      .filter((m) => m.variantId === kardexVariant.variant.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [movements, kardexVariant]);

  const handleOpenMovement = (type: MovementType, variant: Variant, product: Product) => {
    setMovementDialog({ type, variant, product });
    setMovementQty('');
    setMovementReason(type === 'entrada' ? 'Compra/Recepción' : type === 'ajuste' ? 'Conteo físico' : '');
    setMovementRef('');
    setMovementCost(product.cost.toString());
  };

  const handleSubmitMovement = () => {
    if (!movementDialog) return;

    const qty = parseInt(movementQty);
    if (!qty || qty <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }
    if (!movementReason.trim()) {
      toast.error('Ingresa un motivo');
      return;
    }

    const delta = movementDialog.type === 'salida' ? -qty : 
                  movementDialog.type === 'ajuste' ? qty - movementDialog.variant.stock : 
                  qty;

    addMovement({
      variantId: movementDialog.variant.id,
      type: movementDialog.type,
      quantityDelta: delta,
      unitCost: movementDialog.type === 'entrada' ? parseFloat(movementCost) || undefined : undefined,
      reason: movementReason,
      reference: movementRef || undefined,
      userId: currentUser?.id || '1',
    });

    toast.success(
      movementDialog.type === 'entrada' ? 'Entrada registrada' :
      movementDialog.type === 'salida' ? 'Salida registrada' :
      movementDialog.type === 'ajuste' ? 'Ajuste registrado' :
      'Devolución registrada'
    );

    setMovementDialog(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStockFilter('all');
  };

  const hasActiveFilters = searchQuery || stockFilter !== 'all';

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold">Inventario</h1>
            <p className="text-muted-foreground">
              {filteredVariants.length} de {stats.total} variantes
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-interactive cursor-pointer" onClick={() => setStockFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total variantes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-interactive cursor-pointer" onClick={() => setStockFilter('low')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock bajo</p>
                  <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-interactive cursor-pointer" onClick={() => setStockFilter('out')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agotados</p>
                  <p className="text-2xl font-bold text-destructive">{stats.outOfStock}</p>
                </div>
                <Package className="w-8 h-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-interactive">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor (costo)</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                </div>
                <div className="text-accent font-bold">$</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por producto, SKU, código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="instock">Con stock</SelectItem>
                  <SelectItem value="low">Stock bajo</SelectItem>
                  <SelectItem value="out">Agotados</SelectItem>
                  <SelectItem value="alerts">Con alertas</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]"></TableHead>
                    <TableHead>SKU Variante</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[200px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVariants.length > 0 ? (
                    filteredVariants.map(({ variant, product }) => {
                      const isLow = variant.stock > 0 && variant.stock <= variant.minStock;
                      const isOut = variant.stock === 0;

                      return (
                        <TableRow key={variant.id} className={cn(isOut && "bg-destructive/5")}>
                          <TableCell>
                            {product.images[0] ? (
                              <img 
                                src={product.images[0].url} 
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{variant.variantSku}</TableCell>
                          <TableCell>
                            <Link to={`/productos/${product.id}`} className="hover:underline font-medium">
                              {product.name}
                            </Link>
                          </TableCell>
                          <TableCell>{variant.size || '-'}</TableCell>
                          <TableCell>{variant.color || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={isOut ? 'destructive' : isLow ? 'outline' : 'secondary'}
                              className={cn(isLow && "text-warning border-warning")}
                            >
                              {variant.stock}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {variant.minStock}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(variant.stock * product.cost)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenMovement('entrada', variant, product)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Entrada
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenMovement('ajuste', variant, product)}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Ajuste
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setKardexVariant({ variant, product })}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Package className="w-10 h-10 mb-2 opacity-50" />
                          <p>No se encontraron variantes</p>
                          {hasActiveFilters && (
                            <Button variant="link" onClick={clearFilters} className="mt-1">
                              Limpiar filtros
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Dialog */}
      <Dialog open={!!movementDialog} onOpenChange={() => setMovementDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementDialog?.type === 'entrada' && <ArrowDownRight className="w-5 h-5 text-success" />}
              {movementDialog?.type === 'salida' && <ArrowUpRight className="w-5 h-5 text-destructive" />}
              {movementDialog?.type === 'ajuste' && <RefreshCw className="w-5 h-5 text-info" />}
              {movementDialog?.type === 'devolucion' && <ArrowDownRight className="w-5 h-5 text-warning" />}
              {movementDialog?.type === 'entrada' ? 'Entrada de inventario' :
               movementDialog?.type === 'salida' ? 'Salida de inventario' :
               movementDialog?.type === 'ajuste' ? 'Ajuste de inventario' :
               'Devolución'}
            </DialogTitle>
          </DialogHeader>

          {movementDialog && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{movementDialog.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {movementDialog.variant.size && `Talla: ${movementDialog.variant.size}`}
                  {movementDialog.variant.size && movementDialog.variant.color && ' • '}
                  {movementDialog.variant.color && `Color: ${movementDialog.variant.color}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Stock actual: <span className="font-semibold">{movementDialog.variant.stock}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {movementDialog.type === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
                </Label>
                <Input
                  type="number"
                  value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)}
                  placeholder={movementDialog.type === 'ajuste' ? 'Stock después del conteo' : 'Cantidad'}
                  autoFocus
                />
              </div>

              {movementDialog.type === 'entrada' && (
                <div className="space-y-2">
                  <Label>Costo unitario</Label>
                  <Input
                    type="number"
                    value={movementCost}
                    onChange={(e) => setMovementCost(e.target.value)}
                    placeholder="Costo por unidad"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={movementReason} onValueChange={setMovementReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementDialog.type === 'entrada' && (
                      <>
                        <SelectItem value="Compra/Recepción">Compra/Recepción</SelectItem>
                        <SelectItem value="Devolución de cliente">Devolución de cliente</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </>
                    )}
                    {movementDialog.type === 'salida' && (
                      <>
                        <SelectItem value="Venta">Venta</SelectItem>
                        <SelectItem value="Devolución a proveedor">Devolución a proveedor</SelectItem>
                        <SelectItem value="Merma">Merma</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </>
                    )}
                    {movementDialog.type === 'ajuste' && (
                      <>
                        <SelectItem value="Conteo físico">Conteo físico</SelectItem>
                        <SelectItem value="Corrección de error">Corrección de error</SelectItem>
                        <SelectItem value="Merma detectada">Merma detectada</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Referencia (opcional)</Label>
                <Input
                  value={movementRef}
                  onChange={(e) => setMovementRef(e.target.value)}
                  placeholder="Ej: Factura #123, Pedido #456"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitMovement}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kardex Sheet */}
      <Sheet open={!!kardexVariant} onOpenChange={() => setKardexVariant(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Kardex / Historial de movimientos</SheetTitle>
          </SheetHeader>

          {kardexVariant && (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{kardexVariant.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {kardexVariant.variant.variantSku}
                </p>
                <p className="text-sm mt-1">
                  Stock actual: <span className="font-bold">{kardexVariant.variant.stock}</span>
                </p>
              </div>

              <div className="space-y-2">
                {variantMovements.length > 0 ? (
                  variantMovements.map((movement) => (
                    <div 
                      key={movement.id} 
                      className="p-3 border rounded-lg flex items-start justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          movement.type === 'entrada' && "bg-success/10",
                          movement.type === 'salida' && "bg-destructive/10",
                          movement.type === 'ajuste' && "bg-info/10",
                          movement.type === 'devolucion' && "bg-warning/10"
                        )}>
                          {movement.type === 'entrada' && <ArrowDownRight className="w-4 h-4 text-success" />}
                          {movement.type === 'salida' && <ArrowUpRight className="w-4 h-4 text-destructive" />}
                          {movement.type === 'ajuste' && <RefreshCw className="w-4 h-4 text-info" />}
                          {movement.type === 'devolucion' && <ArrowDownRight className="w-4 h-4 text-warning" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">{movement.type}</p>
                          <p className="text-xs text-muted-foreground">{movement.reason}</p>
                          {movement.reference && (
                            <p className="text-xs text-muted-foreground">Ref: {movement.reference}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={movement.quantityDelta >= 0 ? 'default' : 'destructive'}
                        className={movement.quantityDelta >= 0 ? 'bg-success' : ''}
                      >
                        {movement.quantityDelta >= 0 ? '+' : ''}{movement.quantityDelta}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Sin movimientos registrados</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
