import { useState, useMemo, useRef } from 'react';
import {
    Barcode,
    Plus,
    Printer,
    Download,
    Settings2,
    Search,
    Package,
    Smartphone,
    QrCode,
    Wifi,
    Copy,
    Check,
    RefreshCw,
    Trash2,
    Eye,
    Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import type { Product, Variant } from '@/types/inventory';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
}

// Generador de código de barras simple (Code 128 simulado visual)
function generateBarcodeNumber(prefix: string = 'INV'): string {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${prefix}${year}${random}`;
}

// Configuración de etiqueta
interface LabelConfig {
    showProductName: boolean;
    showSku: boolean;
    showPrice: boolean;
    showSize: boolean;
    showColor: boolean;
    showBarcode: boolean;
    showQr: boolean;
    labelWidth: number;
    labelHeight: number;
    fontSize: 'small' | 'medium' | 'large';
}

const defaultLabelConfig: LabelConfig = {
    showProductName: true,
    showSku: true,
    showPrice: true,
    showSize: true,
    showColor: true,
    showBarcode: true,
    showQr: false,
    labelWidth: 50,
    labelHeight: 25,
    fontSize: 'medium',
};

export default function CodigosBarras() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [showMobileScanner, setShowMobileScanner] = useState(false);
    const [showCameraScanner, setShowCameraScanner] = useState(false);
    const [labelConfig, setLabelConfig] = useState<LabelConfig>(defaultLabelConfig);
    const [copies, setCopies] = useState<Record<string, number>>({});
    const [connectionCode, setConnectionCode] = useState('');
    const [mobileConnected, setMobileConnected] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const { products, updateVariant } = useStore();

    // Todas las variantes
    const allVariants = useMemo(() => {
        const variants: { variant: Variant; product: Product }[] = [];
        products.forEach(product => {
            product.variants.forEach(variant => {
                variants.push({ variant, product });
            });
        });
        return variants;
    }, [products]);

    // Variantes filtradas
    const filteredVariants = useMemo(() => {
        if (!searchQuery.trim()) return allVariants;
        const q = searchQuery.toLowerCase();
        return allVariants.filter(({ variant, product }) =>
            variant.variantSku.toLowerCase().includes(q) ||
            variant.barcode?.toLowerCase().includes(q) ||
            product.name.toLowerCase().includes(q) ||
            product.sku.toLowerCase().includes(q)
        );
    }, [allVariants, searchQuery]);

    // Variantes seleccionadas
    const selectedItems = useMemo(() => {
        return allVariants.filter(({ variant }) => selectedVariants.includes(variant.id));
    }, [allVariants, selectedVariants]);

    const handleSelectVariant = (variantId: string) => {
        setSelectedVariants(prev =>
            prev.includes(variantId)
                ? prev.filter(id => id !== variantId)
                : [...prev, variantId]
        );
    };

    const handleSelectAll = () => {
        if (selectedVariants.length === filteredVariants.length) {
            setSelectedVariants([]);
        } else {
            setSelectedVariants(filteredVariants.map(({ variant }) => variant.id));
        }
    };

    const handleGenerateBarcode = (variant: Variant, product: Product) => {
        if (variant.barcode) {
            toast.info('Esta variante ya tiene código de barras');
            return;
        }

        const newBarcode = generateBarcodeNumber();
        updateVariant(product.id, variant.id, { barcode: newBarcode });
        toast.success('Código generado', { description: newBarcode });
    };

    const handleGenerateSelected = () => {
        let generated = 0;
        let skipped = 0;
        selectedItems.forEach(({ variant, product }) => {
            if (!variant.barcode) {
                const newBarcode = generateBarcodeNumber();
                updateVariant(product.id, variant.id, { barcode: newBarcode });
                generated++;
            } else {
                skipped++;
            }
        });

        if (generated === 0 && skipped > 0) {
            toast.info(`${skipped} variante(s) ya tienen código de barras`, {
                description: 'No se generaron códigos nuevos'
            });
        } else if (generated > 0 && skipped > 0) {
            toast.success(`${generated} códigos generados`, {
                description: `${skipped} variante(s) ya tenían código`
            });
        } else if (generated > 0) {
            toast.success(`${generated} códigos generados`);
        } else {
            toast.info('No hay variantes seleccionadas sin código');
        }
    };

    const handleCopyBarcode = (barcode: string) => {
        navigator.clipboard.writeText(barcode);
        toast.success('Código copiado al portapapeles');
    };

    const handlePrintLabels = () => {
        if (selectedItems.length === 0) {
            toast.error('Selecciona variantes para imprimir');
            return;
        }
        setShowPreviewDialog(true);
    };

    const handleConnectMobile = () => {
        // Generar código de conexión único
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setConnectionCode(code);
        // Nota: La conexión real requiere un servidor WebSocket
        // que permita la comunicación entre el PC y el dispositivo móvil.
        // Por ahora, esto genera un código que se puede usar para
        // implementar la conexión en el futuro.
        toast.info('Código generado', {
            description: 'Funcionalidad de conexión remota en desarrollo'
        });
    };

    const handleScannedCode = (code: string) => {
        // Buscar variante por código
        const found = allVariants.find(({ variant }) =>
            variant.barcode === code || variant.variantSku === code
        );

        if (found) {
            handleSelectVariant(found.variant.id);
            toast.success('Producto encontrado', {
                description: `${found.product.name} - ${found.variant.size || ''} ${found.variant.color || ''}`,
            });
        } else {
            toast.error('Código no encontrado', { description: code });
        }

        setShowCameraScanner(false);
        searchRef.current?.focus();
    };

    const setCopyCount = (variantId: string, count: number) => {
        setCopies(prev => ({ ...prev, [variantId]: Math.max(1, count) }));
    };

    const getCopyCount = (variantId: string) => copies[variantId] || 1;

    // Generar HTML para impresión
    const generatePrintHtml = () => {
        const fontSize = labelConfig.fontSize === 'small' ? '8px' : labelConfig.fontSize === 'medium' ? '10px' : '12px';

        let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas de Productos</title>
        <style>
          @page { margin: 5mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
          }
          .label {
            width: ${labelConfig.labelWidth}mm;
            height: ${labelConfig.labelHeight}mm;
            border: 1px solid #ddd;
            padding: 2mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: ${fontSize};
            page-break-inside: avoid;
          }
          .product-name { font-weight: bold; margin-bottom: 1mm; }
          .sku { color: #666; font-size: 0.9em; }
          .price { font-weight: bold; font-size: 1.2em; margin-top: 1mm; }
          .variant-info { color: #888; font-size: 0.85em; }
          .barcode { 
            font-family: 'Libre Barcode 128', monospace;
            font-size: 28px;
            letter-spacing: 2px;
          }
          .barcode-text { font-size: 8px; font-family: monospace; }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="labels-container">
    `;

        selectedItems.forEach(({ variant, product }) => {
            const count = getCopyCount(variant.id);
            for (let i = 0; i < count; i++) {
                html += `
          <div class="label">
            ${labelConfig.showProductName ? `<div class="product-name">${product.name}</div>` : ''}
            ${labelConfig.showSku ? `<div class="sku">${variant.variantSku}</div>` : ''}
            ${(labelConfig.showSize || labelConfig.showColor) ? `
              <div class="variant-info">
                ${labelConfig.showSize && variant.size ? `Talla: ${variant.size}` : ''}
                ${labelConfig.showSize && variant.size && labelConfig.showColor && variant.color ? ' | ' : ''}
                ${labelConfig.showColor && variant.color ? `Color: ${variant.color}` : ''}
              </div>
            ` : ''}
            ${labelConfig.showPrice ? `<div class="price">${formatCurrency(variant.priceOverride ?? product.price)}</div>` : ''}
            ${labelConfig.showBarcode && variant.barcode ? `
              <div class="barcode">*${variant.barcode}*</div>
              <div class="barcode-text">${variant.barcode}</div>
            ` : ''}
          </div>
        `;
            }
        });

        html += `
        </div>
      </body>
      </html>
    `;

        return html;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(generatePrintHtml());
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        } else {
            toast.error('No se pudo abrir la ventana de impresión');
        }
    };

    const handleDownloadPdf = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(generatePrintHtml());
            printWindow.document.close();
            toast.success('Abre el diálogo de impresión y guarda como PDF');
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Barcode className="w-7 h-7" />
                            Códigos de Barras
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Genera, personaliza e imprime etiquetas de productos
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configurar etiqueta
                        </Button>
                        <Button
                            disabled={selectedVariants.length === 0}
                            onClick={handlePrintLabels}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir ({selectedVariants.length})
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="productos" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="productos" className="gap-2">
                            <Package className="w-4 h-4" />
                            Productos
                        </TabsTrigger>
                        <TabsTrigger value="escaneo" className="gap-2">
                            <Camera className="w-4 h-4" />
                            Escaneo
                        </TabsTrigger>
                        <TabsTrigger value="movil" className="gap-2">
                            <Smartphone className="w-4 h-4" />
                            Dispositivo Móvil
                        </TabsTrigger>
                    </TabsList>

                    {/* Pestaña de Productos */}
                    <TabsContent value="productos" className="space-y-4">
                        {/* Búsqueda y acciones */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            ref={searchRef}
                                            placeholder="Buscar por SKU, nombre o código..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleSelectAll}
                                        >
                                            {selectedVariants.length === filteredVariants.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleGenerateSelected}
                                            disabled={selectedVariants.length === 0}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Generar códigos
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lista de variantes */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        Variantes ({filteredVariants.length})
                                    </CardTitle>
                                    {selectedVariants.length > 0 && (
                                        <Badge variant="secondary">
                                            {selectedVariants.length} seleccionadas
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border max-h-[500px] overflow-auto">
                                    {filteredVariants.map(({ variant, product }) => (
                                        <div
                                            key={variant.id}
                                            className={`p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors ${selectedVariants.includes(variant.id) ? 'bg-primary/5' : ''
                                                }`}
                                        >
                                            <Checkbox
                                                checked={selectedVariants.includes(variant.id)}
                                                onCheckedChange={() => handleSelectVariant(variant.id)}
                                            />

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
                                                <p className="text-xs font-mono text-muted-foreground">{variant.variantSku}</p>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(variant.priceOverride ?? product.price)}</p>
                                                {variant.barcode ? (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Badge variant="secondary" className="font-mono text-xs">
                                                            {variant.barcode}
                                                        </Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => handleCopyBarcode(variant.barcode!)}
                                                        >
                                                            <Copy className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-1"
                                                        onClick={() => handleGenerateBarcode(variant, product)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Generar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {filteredVariants.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>No se encontraron variantes</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Pestaña de Escaneo */}
                    <TabsContent value="escaneo" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Lector USB/HID */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Barcode className="w-5 h-5" />
                                        Lector USB (HID)
                                    </CardTitle>
                                    <CardDescription>
                                        Conecta un lector de códigos de barras USB
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm font-medium mb-2">Instrucciones:</p>
                                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Conecta el lector USB a tu computadora</li>
                                            <li>Windows lo detectará automáticamente como teclado</li>
                                            <li>Haz clic en el campo de búsqueda arriba</li>
                                            <li>Escanea cualquier código de barras</li>
                                        </ol>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-success" />
                                        <span>Compatible con Code 128, EAN-13, UPC-A</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-success" />
                                        <span>Configura sufijo Enter en tu lector</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cámara del PC */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Camera className="w-5 h-5" />
                                        Cámara del PC
                                    </CardTitle>
                                    <CardDescription>
                                        Usa la webcam para escanear códigos
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Abre la cámara de tu computadora para escanear códigos de barras o QR directamente.
                                    </p>
                                    <Button
                                        className="w-full"
                                        onClick={() => setShowCameraScanner(true)}
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Abrir cámara
                                    </Button>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Eye className="w-4 h-4" />
                                        <span>Requiere permisos de cámara</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Pestaña de Dispositivo Móvil */}
                    <TabsContent value="movil" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Smartphone className="w-5 h-5" />
                                    Usar Celular como Scanner
                                    <Badge variant="secondary" className="ml-2">Opciones</Badge>
                                </CardTitle>
                                <CardDescription>
                                    Diferentes formas de usar tu celular para escanear códigos
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Opción 1: Abrir en celular */}
                                    <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Wifi className="w-5 h-5 text-primary" />
                                            <h3 className="font-medium">Opción Recomendada</h3>
                                            <Badge variant="default" className="ml-auto">Fácil</Badge>
                                        </div>
                                        <p className="text-sm font-medium mb-2">
                                            Abre esta app en tu celular
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Accede a la misma URL desde el navegador de tu celular (Chrome/Safari).
                                            Usa la pestaña "Escaneo" &gt; "Cámara" para escanear.
                                        </p>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <p className="text-xs text-muted-foreground mb-1">URL de la aplicación:</p>
                                            <code className="text-sm font-mono break-all">
                                                {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174'}
                                            </code>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-success">
                                            <Check className="w-4 h-4" />
                                            <span>Funciona ahora mismo</span>
                                        </div>
                                    </div>

                                    {/* Opción 2: Lector USB en celular */}
                                    <div className="p-4 border rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Barcode className="w-5 h-5 text-primary" />
                                            <h3 className="font-medium">Lector USB + OTG</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Conecta un lector USB a tu celular Android usando un adaptador OTG.
                                            El lector funcionará como teclado.
                                        </p>
                                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                            <li>Requiere adaptador USB-C OTG</li>
                                            <li>Compatible con la mayoría de Android</li>
                                            <li>El código se escribe automáticamente</li>
                                        </ul>
                                    </div>
                                </div>

                                <Separator />

                                {/* Conexión remota (en desarrollo) */}
                                <div className="p-4 border-2 border-dashed rounded-lg opacity-75">
                                    <div className="flex items-center gap-2 mb-3">
                                        <QrCode className="w-5 h-5 text-muted-foreground" />
                                        <h3 className="font-medium text-muted-foreground">Conexión Remota</h3>
                                        <Badge variant="outline" className="ml-auto">En Desarrollo</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Próximamente: Escanea en el celular y los productos aparecen automáticamente en el PC.
                                        Requiere servidor WebSocket para sincronización en tiempo real.
                                    </p>
                                    {connectionCode ? (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-muted rounded-lg text-center">
                                                <p className="text-xs text-muted-foreground mb-2">Código de prueba (no funcional)</p>
                                                <p className="text-2xl font-mono font-bold tracking-widest text-muted-foreground">{connectionCode}</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => setConnectionCode('')}
                                            >
                                                Cerrar
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="w-full" onClick={handleConnectMobile} disabled>
                                            Próximamente
                                        </Button>
                                    )}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <p className="font-medium mb-2">💡 Recomendación:</p>
                                    <p>
                                        Por ahora, la forma más fácil es abrir esta aplicación directamente en tu celular
                                        y usar la cámara para escanear. Los datos se sincronizan automáticamente porque
                                        ambos dispositivos acceden a la misma base de datos.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Dialog de configuración de etiqueta */}
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configurar Etiqueta</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <Label>Campos a mostrar</Label>
                            <div className="space-y-2">
                                {[
                                    { key: 'showProductName' as const, label: 'Nombre del producto' },
                                    { key: 'showSku' as const, label: 'SKU' },
                                    { key: 'showPrice' as const, label: 'Precio' },
                                    { key: 'showSize' as const, label: 'Talla' },
                                    { key: 'showColor' as const, label: 'Color' },
                                    { key: 'showBarcode' as const, label: 'Código de barras' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <Checkbox
                                            id={key}
                                            checked={labelConfig[key]}
                                            onCheckedChange={(checked) =>
                                                setLabelConfig(prev => ({ ...prev, [key]: checked }))
                                            }
                                        />
                                        <Label htmlFor={key} className="font-normal cursor-pointer">{label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ancho (mm)</Label>
                                <Input
                                    type="number"
                                    value={labelConfig.labelWidth}
                                    onChange={(e) => setLabelConfig(prev => ({
                                        ...prev,
                                        labelWidth: parseInt(e.target.value) || 50
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Alto (mm)</Label>
                                <Input
                                    type="number"
                                    value={labelConfig.labelHeight}
                                    onChange={(e) => setLabelConfig(prev => ({
                                        ...prev,
                                        labelHeight: parseInt(e.target.value) || 25
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Tamaño de fuente</Label>
                            <Select
                                value={labelConfig.fontSize}
                                onValueChange={(v) => setLabelConfig(prev => ({ ...prev, fontSize: v as 'small' | 'medium' | 'large' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="small">Pequeño</SelectItem>
                                    <SelectItem value="medium">Mediano</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={() => {
                            setShowConfigDialog(false);
                            toast.success('Configuración guardada');
                        }}>
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de vista previa e impresión */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Vista Previa de Etiquetas</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {selectedItems.length} variante(s) seleccionada(s)
                            </p>
                            <p className="text-sm font-medium">
                                Total de etiquetas: {selectedItems.reduce((sum, { variant }) => sum + getCopyCount(variant.id), 0)}
                            </p>
                        </div>

                        <div className="border rounded-lg divide-y max-h-[300px] overflow-auto">
                            {selectedItems.map(({ variant, product }) => (
                                <div key={variant.id} className="p-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {variant.variantSku}
                                            {variant.barcode && ` • ${variant.barcode}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm">Copias:</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={getCopyCount(variant.id)}
                                            onChange={(e) => setCopyCount(variant.id, parseInt(e.target.value) || 1)}
                                            className="w-16 h-8 text-center"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Preview de etiqueta */}
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-3">Vista previa de etiqueta</p>
                            <div
                                className="bg-white border rounded p-3 text-center mx-auto"
                                style={{
                                    width: `${Math.min(labelConfig.labelWidth * 2, 200)}px`,
                                    minHeight: `${labelConfig.labelHeight * 2}px`
                                }}
                            >
                                {labelConfig.showProductName && (
                                    <p className="font-bold text-sm">Nombre Producto</p>
                                )}
                                {labelConfig.showSku && (
                                    <p className="text-xs text-gray-500">SKU-EJEMPLO-001</p>
                                )}
                                {(labelConfig.showSize || labelConfig.showColor) && (
                                    <p className="text-xs text-gray-400">
                                        {labelConfig.showSize && 'Talla: M'}
                                        {labelConfig.showSize && labelConfig.showColor && ' | '}
                                        {labelConfig.showColor && 'Color: Negro'}
                                    </p>
                                )}
                                {labelConfig.showPrice && (
                                    <p className="font-bold text-sm mt-1">$499.00</p>
                                )}
                                {labelConfig.showBarcode && (
                                    <div className="mt-1">
                                        <div className="text-xl font-mono">||||||||||||</div>
                                        <p className="text-[8px] font-mono">INV2025000001</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                            Cancelar
                        </Button>
                        <Button variant="secondary" onClick={handleDownloadPdf}>
                            <Download className="w-4 h-4 mr-2" />
                            Guardar PDF
                        </Button>
                        <Button onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Scanner de cámara */}
            <BarcodeScanner
                open={showCameraScanner}
                onClose={() => setShowCameraScanner(false)}
                onScan={handleScannedCode}
            />
        </AppLayout>
    );
}
