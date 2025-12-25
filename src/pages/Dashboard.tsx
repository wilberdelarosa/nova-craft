import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Receipt, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Plus,
  Warehouse
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStore } from '@/lib/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('es-MX').format(num);
}

export default function Dashboard() {
  const { sales, products, getLowStockVariants, getOutOfStockVariants, storeConfig } = useStore();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const monthSales = sales.filter(
      (s) => new Date(s.createdAt) >= startOfMonth && s.status === 'completada'
    );
    const lastMonthSales = sales.filter(
      (s) => new Date(s.createdAt) >= startOfLastMonth && 
             new Date(s.createdAt) <= endOfLastMonth && 
             s.status === 'completada'
    );

    const totalSales = monthSales.reduce((sum, s) => sum + s.total, 0);
    const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + s.total, 0);
    const salesChange = lastMonthTotal > 0 ? ((totalSales - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    const totalTickets = monthSales.length;
    const lastMonthTickets = lastMonthSales.length;
    const ticketsChange = lastMonthTickets > 0 ? ((totalTickets - lastMonthTickets) / lastMonthTickets) * 100 : 0;

    const totalUnits = monthSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );

    // Calculate sales by product
    const productSales: Record<string, { units: number; revenue: number }> = {};
    monthSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { units: 0, revenue: 0 };
        }
        productSales[item.productName].units += item.quantity;
        productSales[item.productName].revenue += item.lineTotal;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Sales by day (last 7 days)
    const salesByDay: { date: string; amount: number; tickets: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('es-MX', { weekday: 'short' });
      const daySales = sales.filter(
        (s) => new Date(s.createdAt).toISOString().split('T')[0] === dateStr && s.status === 'completada'
      );
      salesByDay.push({
        date: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        amount: daySales.reduce((sum, s) => sum + s.total, 0),
        tickets: daySales.length,
      });
    }

    // Total inventory value
    let inventoryValue = 0;
    let totalVariants = 0;
    products.forEach((p) => {
      p.variants.forEach((v) => {
        inventoryValue += v.stock * p.cost;
        totalVariants++;
      });
    });

    return {
      totalSales,
      salesChange,
      totalTickets,
      ticketsChange,
      totalUnits,
      topProducts,
      salesByDay,
      inventoryValue,
      totalVariants,
    };
  }, [sales, products]);

  const lowStock = getLowStockVariants();
  const outOfStock = getOutOfStockVariants();

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Resumen del mes • {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/inventario">
                <Plus className="w-4 h-4 mr-2" />
                Entrada
              </Link>
            </Button>
            <Button asChild>
              <Link to="/ventas">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Nueva venta
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Ventas del mes</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSales)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {stats.salesChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                )}
                <span className={`text-sm font-medium ${stats.salesChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {Math.abs(stats.salesChange).toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Tickets</p>
                  <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalTickets)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-info" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                {stats.ticketsChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-success" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-destructive" />
                )}
                <span className={`text-sm font-medium ${stats.ticketsChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {Math.abs(stats.ticketsChange).toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Unidades vendidas</p>
                  <p className="text-2xl font-bold mt-1">{formatNumber(stats.totalUnits)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Promedio: {stats.totalTickets > 0 ? (stats.totalUnits / stats.totalTickets).toFixed(1) : 0} por ticket
              </p>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Alertas de stock</p>
                  <p className="text-2xl font-bold mt-1">{lowStock.length + outOfStock.length}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  outOfStock.length > 0 ? 'bg-destructive/10' : lowStock.length > 0 ? 'bg-warning/10' : 'bg-success/10'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    outOfStock.length > 0 ? 'text-destructive' : lowStock.length > 0 ? 'text-warning' : 'text-success'
                  }`} />
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <Badge variant="outline" className="text-destructive border-destructive/30">
                  {outOfStock.length} agotados
                </Badge>
                <Badge variant="outline" className="text-warning border-warning/30">
                  {lowStock.length} bajos
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Ventas últimos 7 días</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.salesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Top vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {stats.topProducts.map((product, index) => (
                    <div key={product.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1 mr-2">
                          {index + 1}. {product.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {product.units} uds
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(product.revenue / stats.topProducts[0].revenue) * 100} 
                          className="h-1.5"
                        />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {formatCurrency(product.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No hay ventas este mes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/ventas">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="text-sm">Nueva venta</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/productos/nuevo">
                    <Plus className="w-5 h-5" />
                    <span className="text-sm">Nuevo producto</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/inventario?action=entrada">
                    <Warehouse className="w-5 h-5" />
                    <span className="text-sm">Entrada stock</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Link to="/historial">
                    <Receipt className="w-5 h-5" />
                    <span className="text-sm">Ver historial</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Resumen de inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor total (costo)</p>
                    <p className="text-lg font-semibold">{formatCurrency(stats.inventoryValue)}</p>
                  </div>
                  <Warehouse className="w-8 h-8 text-muted-foreground/50" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Productos</p>
                    <p className="text-xl font-semibold">{products.length}</p>
                  </div>
                  <div className="p-3 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Variantes</p>
                    <p className="text-xl font-semibold">{stats.totalVariants}</p>
                  </div>
                </div>

                {(lowStock.length > 0 || outOfStock.length > 0) && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/inventario?filter=alertas">
                      <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
                      Ver alertas de stock
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
