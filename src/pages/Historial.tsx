import { useState, useMemo } from 'react';
import { 
  Search, 
  Receipt, 
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Printer,
  Eye,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Sale, InventoryMovement } from '@/types/inventory';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export default function Historial() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const { sales, movements, getVariantById } = useStore();

  // Filter sales
  const filteredSales = useMemo(() => {
    return sales
      .filter((sale) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = 
            sale.saleNumber.toLowerCase().includes(q) ||
            sale.customerName?.toLowerCase().includes(q) ||
            sale.items.some(item => item.productName.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // Status
        if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

        // Date
        if (dateFilter !== 'all') {
          const saleDate = new Date(sale.createdAt);
          const now = new Date();
          if (dateFilter === 'today') {
            if (saleDate.toDateString() !== now.toDateString()) return false;
          } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            if (saleDate < weekAgo) return false;
          } else if (dateFilter === 'month') {
            if (saleDate.getMonth() !== new Date().getMonth()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, searchQuery, statusFilter, dateFilter]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements
      .filter((movement) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const variantInfo = getVariantById(movement.variantId);
          const matches = 
            movement.reason.toLowerCase().includes(q) ||
            movement.reference?.toLowerCase().includes(q) ||
            variantInfo?.product.name.toLowerCase().includes(q) ||
            variantInfo?.variant.variantSku.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Type
        if (typeFilter !== 'all' && movement.type !== typeFilter) return false;

        // Date
        if (dateFilter !== 'all') {
          const moveDate = new Date(movement.createdAt);
          const now = new Date();
          if (dateFilter === 'today') {
            if (moveDate.toDateString() !== now.toDateString()) return false;
          } else if (dateFilter === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            if (moveDate < weekAgo) return false;
          } else if (dateFilter === 'month') {
            if (moveDate.getMonth() !== new Date().getMonth()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [movements, searchQuery, typeFilter, dateFilter, getVariantById]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = searchQuery || dateFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <AppLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Historial</h1>
          <p className="text-muted-foreground">
            Consulta ventas y movimientos de inventario
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="ventas" className="gap-2">
              <Receipt className="w-4 h-4" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="movimientos" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Movimientos
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === 'ventas' ? "Buscar por ticket, cliente..." : "Buscar por producto, motivo..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                  </SelectContent>
                </Select>

                {activeTab === 'ventas' && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="completada">Completadas</SelectItem>
                      <SelectItem value="cancelada">Canceladas</SelectItem>
                      <SelectItem value="devuelta">Devueltas</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {activeTab === 'movimientos' && (
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="entrada">Entradas</SelectItem>
                      <SelectItem value="salida">Salidas</SelectItem>
                      <SelectItem value="ajuste">Ajustes</SelectItem>
                      <SelectItem value="devolucion">Devoluciones</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales Tab */}
          <TabsContent value="ventas" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.length > 0 ? (
                        filteredSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">{sale.saleNumber}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(sale.createdAt).toLocaleDateString('es-MX')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </TableCell>
                            <TableCell>{sale.customerName || '-'}</TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {sale.items.reduce((sum, item) => sum + item.quantity, 0)} artículo(s)
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {sale.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  sale.status === 'completada' ? 'default' :
                                  sale.status === 'cancelada' ? 'destructive' :
                                  'secondary'
                                }
                                className={sale.status === 'completada' ? 'bg-success' : ''}
                              >
                                {sale.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setSelectedSale(sale)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <Receipt className="w-10 h-10 mb-2 opacity-50" />
                              <p>No se encontraron ventas</p>
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
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movimientos" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.length > 0 ? (
                        filteredMovements.map((movement) => {
                          const variantInfo = getVariantById(movement.variantId);
                          return (
                            <TableRow key={movement.id}>
                              <TableCell>
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
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(movement.createdAt).toLocaleDateString('es-MX')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(movement.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </TableCell>
                              <TableCell>
                                {variantInfo ? (
                                  <div>
                                    <p className="font-medium text-sm">{variantInfo.product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {variantInfo.variant.size} / {variantInfo.variant.color}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {movement.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {movement.reason}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {movement.reference || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge 
                                  variant={movement.quantityDelta >= 0 ? 'default' : 'destructive'}
                                  className={movement.quantityDelta >= 0 ? 'bg-success' : ''}
                                >
                                  {movement.quantityDelta >= 0 ? '+' : ''}{movement.quantityDelta}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                              <RefreshCw className="w-10 h-10 mb-2 opacity-50" />
                              <p>No se encontraron movimientos</p>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Sale Detail Sheet */}
      <Sheet open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Detalle de venta</SheetTitle>
          </SheetHeader>

          {selectedSale && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket</span>
                  <span className="font-mono font-medium">{selectedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span>{new Date(selectedSale.createdAt).toLocaleString('es-MX')}</span>
                </div>
                {selectedSale.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span>{selectedSale.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método de pago</span>
                  <Badge variant="outline" className="capitalize">{selectedSale.paymentMethod}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge 
                    variant={selectedSale.status === 'completada' ? 'default' : 'destructive'}
                    className={selectedSale.status === 'completada' ? 'bg-success' : ''}
                  >
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Productos</h4>
                <div className="space-y-2">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="flex justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Descuento</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCurrency(selectedSale.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>

              <Button className="w-full">
                <Printer className="w-4 h-4 mr-2" />
                Reimprimir ticket
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
