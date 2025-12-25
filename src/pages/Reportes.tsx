import { useState, useMemo } from 'react';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Package,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    FileText,
    Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
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

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reportes() {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const { sales, products, storeConfig } = useStore();

    // Métricas del período seleccionado
    const metrics = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let prevStartDate: Date;
        let prevEndDate: Date;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                prevEndDate = new Date(startDate.getTime() - 1);
                prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
                prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
                break;
            default: // month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        const currentSales = sales.filter(
            s => new Date(s.createdAt) >= startDate && s.status === 'completada'
        );
        const prevSales = sales.filter(
            s => new Date(s.createdAt) >= prevStartDate && new Date(s.createdAt) <= prevEndDate && s.status === 'completada'
        );

        const totalSales = currentSales.reduce((sum, s) => sum + s.total, 0);
        const prevTotalSales = prevSales.reduce((sum, s) => sum + s.total, 0);
        const salesChange = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

        const totalTickets = currentSales.length;
        const prevTotalTickets = prevSales.length;
        const ticketsChange = prevTotalTickets > 0 ? ((totalTickets - prevTotalTickets) / prevTotalTickets) * 100 : 0;

        const totalUnits = currentSales.reduce(
            (sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0),
            0
        );
        const prevTotalUnits = prevSales.reduce(
            (sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0),
            0
        );
        const unitsChange = prevTotalUnits > 0 ? ((totalUnits - prevTotalUnits) / prevTotalUnits) * 100 : 0;

        // Margen bruto estimado
        const totalCost = currentSales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                const product = products.find(p => p.variants.some(v => v.id === item.variantId));
                return itemSum + (product?.cost || 0) * item.quantity;
            }, 0);
        }, 0);
        const grossMargin = totalSales - totalCost;
        const marginPercent = totalSales > 0 ? (grossMargin / totalSales) * 100 : 0;

        return {
            totalSales,
            salesChange,
            totalTickets,
            ticketsChange,
            totalUnits,
            unitsChange,
            grossMargin,
            marginPercent,
            avgTicket: totalTickets > 0 ? totalSales / totalTickets : 0,
        };
    }, [sales, products, period]);

    // Top productos vendidos
    const topProducts = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const productSales: Record<string, { name: string; units: number; revenue: number }> = {};

        sales
            .filter(s => new Date(s.createdAt) >= startDate && s.status === 'completada')
            .forEach(sale => {
                sale.items.forEach(item => {
                    const key = item.productName;
                    if (!productSales[key]) {
                        productSales[key] = { name: key, units: 0, revenue: 0 };
                    }
                    productSales[key].units += item.quantity;
                    productSales[key].revenue += item.lineTotal;
                });
            });

        return Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [sales, period]);

    // Datos para gráfico de ventas por día
    const salesByDay = useMemo(() => {
        const now = new Date();
        const days: { date: string; ventas: number; tickets: number }[] = [];
        const daysCount = period === 'week' ? 7 : period === 'month' ? 30 : 12;

        for (let i = daysCount - 1; i >= 0; i--) {
            const date = new Date(now);
            if (period === 'year') {
                date.setMonth(date.getMonth() - i);
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                const monthSales = sales.filter(
                    s => new Date(s.createdAt) >= monthStart && new Date(s.createdAt) <= monthEnd && s.status === 'completada'
                );

                days.push({
                    date: date.toLocaleDateString('es-MX', { month: 'short' }),
                    ventas: monthSales.reduce((sum, s) => sum + s.total, 0),
                    tickets: monthSales.length,
                });
            } else {
                date.setDate(date.getDate() - i);
                const dayStart = new Date(date.setHours(0, 0, 0, 0));
                const dayEnd = new Date(date.setHours(23, 59, 59, 999));

                const daySales = sales.filter(
                    s => new Date(s.createdAt) >= dayStart && new Date(s.createdAt) <= dayEnd && s.status === 'completada'
                );

                days.push({
                    date: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
                    ventas: daySales.reduce((sum, s) => sum + s.total, 0),
                    tickets: daySales.length,
                });
            }
        }

        return days;
    }, [sales, period]);

    // Stock valorizado
    const stockValue = useMemo(() => {
        let costValue = 0;
        let priceValue = 0;
        let totalUnits = 0;

        products.forEach(product => {
            product.variants.forEach(variant => {
                totalUnits += variant.stock;
                costValue += variant.stock * product.cost;
                priceValue += variant.stock * (variant.priceOverride ?? product.price);
            });
        });

        return { costValue, priceValue, totalUnits, potentialMargin: priceValue - costValue };
    }, [products]);

    // Ventas por categoría
    const salesByCategory = useMemo(() => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const categories: Record<string, number> = {};

        sales
            .filter(s => new Date(s.createdAt) >= startDate && s.status === 'completada')
            .forEach(sale => {
                sale.items.forEach(item => {
                    const product = products.find(p =>
                        p.variants.some(v => v.id === item.variantId)
                    );
                    const category = product?.categoryId || 'Sin categoría';
                    categories[category] = (categories[category] || 0) + item.lineTotal;
                });
            });

        return Object.entries(categories).map(([name, value], index) => ({
            name,
            value,
            color: CHART_COLORS[index % CHART_COLORS.length],
        }));
    }, [sales, products]);

    const MetricCard = ({
        title,
        value,
        change,
        icon: Icon,
        format = 'currency'
    }: {
        title: string;
        value: number;
        change?: number;
        icon: typeof DollarSign;
        format?: 'currency' | 'number' | 'percent';
    }) => (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                    </div>
                    {change !== undefined && (
                        <Badge
                            variant={change >= 0 ? 'default' : 'destructive'}
                            className="gap-1"
                        >
                            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(change).toFixed(1)}%
                        </Badge>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-1">
                        {format === 'currency' ? formatCurrency(value) :
                            format === 'percent' ? `${value.toFixed(1)}%` :
                                value.toLocaleString()}
                    </p>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BarChart3 className="w-7 h-7" />
                            Reportes y Métricas
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Análisis de ventas, inventario y rendimiento
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                            <SelectTrigger className="w-40">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Última semana</SelectItem>
                                <SelectItem value="month">Este mes</SelectItem>
                                <SelectItem value="year">Este año</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Ventas Totales"
                        value={metrics.totalSales}
                        change={metrics.salesChange}
                        icon={DollarSign}
                    />
                    <MetricCard
                        title="Tickets"
                        value={metrics.totalTickets}
                        change={metrics.ticketsChange}
                        icon={FileText}
                        format="number"
                    />
                    <MetricCard
                        title="Unidades Vendidas"
                        value={metrics.totalUnits}
                        change={metrics.unitsChange}
                        icon={ShoppingBag}
                        format="number"
                    />
                    <MetricCard
                        title="Ticket Promedio"
                        value={metrics.avgTicket}
                        icon={TrendingUp}
                    />
                </div>

                {/* Gráficos principales */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gráfico de ventas */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">Ventas por {period === 'year' ? 'Mes' : 'Día'}</CardTitle>
                            <CardDescription>Evolución de ventas en el período seleccionado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={salesByDay}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" />
                                        <YAxis className="text-xs" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="ventas"
                                            stroke="hsl(var(--primary))"
                                            fill="hsl(var(--primary) / 0.2)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Margen y Stock */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                            <CardDescription>Margen bruto y valorización</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                                <p className="text-sm text-success font-medium">Margen Bruto</p>
                                <p className="text-2xl font-bold text-success">{formatCurrency(metrics.grossMargin)}</p>
                                <p className="text-xs text-muted-foreground mt-1">{metrics.marginPercent.toFixed(1)}% del total</p>
                            </div>

                            <Separator />

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Stock Valorizado</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Valor a costo</span>
                                        <span className="font-medium">{formatCurrency(stockValue.costValue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Valor a precio</span>
                                        <span className="font-medium">{formatCurrency(stockValue.priceValue)}</span>
                                    </div>
                                    <div className="flex justify-between text-success">
                                        <span className="text-sm">Margen potencial</span>
                                        <span className="font-medium">{formatCurrency(stockValue.potentialMargin)}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Unidades en Stock</p>
                                    <p className="text-xl font-bold">{stockValue.totalUnits.toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Top productos y categorías */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top vendidos */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Top 10 Productos</CardTitle>
                            <CardDescription>Por ingresos en el período</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {topProducts.length > 0 ? (
                                <div className="space-y-3">
                                    {topProducts.map((product, index) => (
                                        <div key={product.name} className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.units} unidades</p>
                                            </div>
                                            <p className="font-medium">{formatCurrency(product.revenue)}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No hay ventas en este período</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ventas por categoría */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Ventas por Categoría</CardTitle>
                            <CardDescription>Distribución del mes actual</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {salesByCategory.length > 0 ? (
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={salesByCategory.slice(0, 5)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                                            <Tooltip
                                                formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--card))',
                                                    border: '1px solid hsl(var(--border))'
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {salesByCategory.slice(0, 5).map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No hay datos de categorías</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
