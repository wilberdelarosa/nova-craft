import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Calendar,
  Download,
  FileText,
  ShoppingCart,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#fbbf24', '#f472b6', '#a78bfa'];

export default function Reportes() {
  const [dateRange, setDateRange] = useState('7');
  const { sales, products } = useStore();

  const filteredSales = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    return sales.filter(sale =>
      isWithinInterval(new Date(sale.createdAt), { start: startDate, end: endDate })
    );
  }, [sales, dateRange]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = filteredSales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const avgTicket = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;
    
    // Comparación con período anterior
    const days = parseInt(dateRange);
    const prevStartDate = startOfDay(subDays(new Date(), days * 2));
    const prevEndDate = endOfDay(subDays(new Date(), days + 1));
    
    const prevSales = sales.filter(sale =>
      isWithinInterval(new Date(sale.createdAt), { start: prevStartDate, end: prevEndDate })
    );
    const prevTotal = prevSales.reduce((sum, sale) => sum + sale.total, 0);
    const salesGrowth = prevTotal > 0 ? ((totalSales - prevTotal) / prevTotal) * 100 : 0;

    return {
      totalSales,
      totalItems,
      avgTicket,
      salesCount: filteredSales.length,
      salesGrowth
    };
  }, [filteredSales, sales, dateRange]);

  // Ventas por día
  const dailySales = useMemo(() => {
    const days = parseInt(dateRange);
    const data: { date: string; total: number; count: number }[] = [];

    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = filteredSales.filter(sale =>
        isWithinInterval(new Date(sale.createdAt), { start: dayStart, end: dayEnd })
      );

      data.push({
        date: format(date, 'dd MMM', { locale: es }),
        total: daySales.reduce((sum, sale) => sum + sale.total, 0),
        count: daySales.length
      });
    }

    return data;
  }, [filteredSales, dateRange]);

  // Productos más vendidos
  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.productName;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += item.unitPrice * item.quantity;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredSales]);

  // Ventas por método de pago
  const paymentMethods = useMemo(() => {
    const methods: Record<string, number> = {};
    
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod;
      methods[method] = (methods[method] || 0) + sale.total;
    });

    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia'
    };

    return Object.entries(methods).map(([key, value]) => ({
      name: labels[key] || key,
      value
    }));
  }, [filteredSales]);

  // Categorías más vendidas (usando nombre del producto como referencia)
  const topCategories = useMemo(() => {
    const categories: Record<string, { name: string; revenue: number }> = {};

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        // Usar primera palabra del nombre como categoría aproximada
        const cat = item.productName.split(' ')[0] || 'Otros';
        if (!categories[cat]) {
          categories[cat] = { name: cat, revenue: 0 };
        }
        categories[cat].revenue += item.unitPrice * item.quantity;
      });
    });

    return Object.values(categories)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales]);

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Folio', 'Cliente', 'Método de Pago', 'Subtotal', 'Impuesto', 'Total'];
    const rows = filteredSales.map(sale => [
      format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'),
      sale.id,
      sale.customerName || 'Público general',
      sale.paymentMethod,
      sale.subtotal.toFixed(2),
      sale.tax.toFixed(2),
      sale.total.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ventas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Reportes y Estadísticas
            </h1>
            <p className="text-muted-foreground mt-1">
              Análisis de ventas y rendimiento del negocio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="14">Últimos 14 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
                </div>
                <div className={`p-3 rounded-full ${stats.salesGrowth >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  <DollarSign className={`w-5 h-5 ${stats.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
              <div className={`flex items-center gap-1 mt-2 text-sm ${stats.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.salesGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{Math.abs(stats.salesGrowth).toFixed(1)}%</span>
                <span className="text-muted-foreground">vs período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transacciones</p>
                  <p className="text-2xl font-bold">{stats.salesCount}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ventas completadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</p>
                </div>
                <div className="p-3 rounded-full bg-accent/10">
                  <FileText className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Por transacción
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unidades Vendidas</p>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </div>
                <div className="p-3 rounded-full bg-secondary">
                  <Package className="w-5 h-5 text-secondary-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Productos vendidos
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="ventas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ventas" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Ventas
            </TabsTrigger>
            <TabsTrigger value="productos" className="gap-2">
              <Package className="w-4 h-4" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Métodos de Pago
            </TabsTrigger>
          </TabsList>

          {/* Ventas Tab */}
          <TabsContent value="ventas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Día</CardTitle>
                <CardDescription>Evolución de ventas en el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transacciones por Día</CardTitle>
                <CardDescription>Número de ventas completadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Productos Tab */}
          <TabsContent value="productos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Productos Más Vendidos</CardTitle>
                  <CardDescription>Top 10 por unidades vendidas</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {topProducts.map((product, index) => (
                        <div key={product.name} className="flex items-center gap-3">
                          <Badge variant={index < 3 ? 'default' : 'secondary'} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.quantity} unidades
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos de ventas en este período
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Categoría</CardTitle>
                  <CardDescription>Distribución de ingresos</CardDescription>
                </CardHeader>
                <CardContent>
                  {topCategories.length > 0 ? (
                    <div className="space-y-3">
                      {topCategories.map((cat, index) => {
                        const total = topCategories.reduce((sum, c) => sum + c.revenue, 0);
                        const percentage = total > 0 ? (cat.revenue / total) * 100 : 0;
                        
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{cat.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(cat.revenue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos en este período
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pagos Tab */}
          <TabsContent value="pagos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Método de Pago</CardTitle>
                  <CardDescription>Ingresos por tipo de pago</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethods}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {paymentMethods.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos en este período
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalle por Método</CardTitle>
                  <CardDescription>Resumen de ingresos</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length > 0 ? (
                    <div className="space-y-4">
                      {paymentMethods.map((method, index) => {
                        const total = paymentMethods.reduce((sum, m) => sum + m.value, 0);
                        const percentage = total > 0 ? (method.value / total) * 100 : 0;
                        
                        return (
                          <div key={method.name} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{method.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {percentage.toFixed(1)}% del total
                              </p>
                            </div>
                            <p className="text-xl font-bold">{formatCurrency(method.value)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No hay datos en este período
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
