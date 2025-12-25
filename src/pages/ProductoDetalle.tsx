import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export default function ProductoDetalle() {
  const { productId } = useParams();
  const product = useStore((state) => (productId ? state.getProductById(productId) : undefined));
  const brands = useStore((state) => state.brands);
  const categories = useStore((state) => state.categories);

  const category = product ? categories.find((item) => item.id === product.categoryId) : undefined;
  const brand = product ? brands.find((item) => item.id === product.brandId) : undefined;

  if (!product) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="text-center space-y-3">
            <p className="text-lg font-semibold">Producto no encontrado</p>
            <p className="text-sm text-muted-foreground">
              El producto que intentas ver ya no existe o fue eliminado.
            </p>
            <Button asChild>
              <Link to="/productos" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver a productos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  const hasLowStock = product.variants.some((variant) => variant.stock > 0 && variant.stock <= variant.minStock);
  const isOutOfStock = totalStock === 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Detalle del producto</p>
            <h1 className="font-display text-2xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">SKU {product.sku}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/productos" className="flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Regresar a productos
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="grid gap-6 md:grid-cols-[220px,1fr]">
            <div className="flex flex-col items-center gap-3">
              {product.images[0] ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-44 h-44 object-cover rounded-lg border"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center rounded-lg border bg-muted">
                  Sin imagen
                </div>
              )}
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant={product.active ? 'secondary' : 'destructive'}>
                  {product.active ? 'Activo' : 'Inactivo'}
                </Badge>
                <Badge variant={isOutOfStock ? 'destructive' : hasLowStock ? 'outline' : 'secondary'}>
                  {isOutOfStock ? 'Sin stock' : hasLowStock ? 'Stock bajo' : 'Stock sano'}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio público</p>
                  <p className="font-medium">{formatCurrency(product.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Costo</p>
                  <p className="font-medium">{formatCurrency(product.cost)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoría</p>
                  <p className="font-medium">{category?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{brand?.name || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description || 'Sin descripción'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variantes ({product.variants.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variante</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Mínimo</TableHead>
                    <TableHead className="text-center">Código</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => {
                    const isLowStock = variant.stock > 0 && variant.stock <= variant.minStock;
                    const isEmpty = variant.stock === 0;

                    return (
                      <TableRow key={variant.id} className={cn(isEmpty && 'bg-destructive/10')}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{variant.variantSku}</p>
                            {variant.barcode && (
                              <p className="text-xs text-muted-foreground">{variant.barcode}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{variant.size || '-'}</TableCell>
                        <TableCell>{variant.color || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isEmpty ? 'destructive' : isLowStock ? 'outline' : 'secondary'}
                            className={cn(isLowStock && !isEmpty && 'text-warning border-warning')}
                          >
                            {variant.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{variant.minStock}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {variant.barcode || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(variant.stock * product.cost)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
