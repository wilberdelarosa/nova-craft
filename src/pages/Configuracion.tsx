import { useState } from 'react';
import { 
  Store, 
  Receipt, 
  Database,
  Save,
  Download,
  Upload,
  CheckCircle2,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

export default function Configuracion() {
  const { storeConfig, updateStoreConfig } = useStore();
  
  const [formData, setFormData] = useState({
    storeName: storeConfig.storeName,
    storeAddress: storeConfig.storeAddress || '',
    storePhone: storeConfig.storePhone || '',
    storeEmail: storeConfig.storeEmail || '',
    defaultTaxRate: storeConfig.defaultTaxRate.toString(),
    ticketTemplate: storeConfig.ticketTemplate,
    ticketSeriesPrefix: storeConfig.ticketSeriesPrefix,
    currency: storeConfig.currency,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    updateStoreConfig({
      storeName: formData.storeName,
      storeAddress: formData.storeAddress || undefined,
      storePhone: formData.storePhone || undefined,
      storeEmail: formData.storeEmail || undefined,
      defaultTaxRate: parseFloat(formData.defaultTaxRate) || 16,
      ticketTemplate: formData.ticketTemplate as 'informal' | 'fiscal',
      ticketSeriesPrefix: formData.ticketSeriesPrefix,
      currency: formData.currency,
    });
    
    toast.success('Configuración guardada', {
      description: 'Los cambios se han aplicado correctamente',
    });
    
    setIsSaving(false);
  };

  const handleExportData = () => {
    // Get all data from localStorage
    const data = localStorage.getItem('inventory-store');
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${formData.storeName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Backup exportado', {
      description: 'El archivo se ha descargado correctamente',
    });
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        localStorage.setItem('inventory-store', JSON.stringify(data));
        toast.success('Backup restaurado', {
          description: 'Los datos se han importado. Recarga la página para ver los cambios.',
        });
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error('Error al importar', {
          description: 'El archivo no tiene un formato válido',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">
            Personaliza tu tienda y preferencias del sistema
          </p>
        </div>

        <Tabs defaultValue="tienda" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tienda" className="gap-2">
              <Store className="w-4 h-4" />
              Tienda
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Receipt className="w-4 h-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="datos" className="gap-2">
              <Database className="w-4 h-4" />
              Datos
            </TabsTrigger>
          </TabsList>

          {/* Store Settings */}
          <TabsContent value="tienda">
            <Card>
              <CardHeader>
                <CardTitle>Información de la tienda</CardTitle>
                <CardDescription>
                  Estos datos aparecerán en tus tickets y reportes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Nombre de la tienda</Label>
                    <Input
                      id="storeName"
                      value={formData.storeName}
                      onChange={(e) => handleInputChange('storeName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Teléfono</Label>
                    <Input
                      id="storePhone"
                      value={formData.storePhone}
                      onChange={(e) => handleInputChange('storePhone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Dirección</Label>
                  <Input
                    id="storeAddress"
                    value={formData.storeAddress}
                    onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      value={formData.storeEmail}
                      onChange={(e) => handleInputChange('storeEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select 
                      value={formData.currency} 
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                        <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Tasa de impuesto por defecto (%)
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    value={formData.defaultTaxRate}
                    onChange={(e) => handleInputChange('defaultTaxRate', e.target.value)}
                    className="max-w-[150px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Este porcentaje se aplicará automáticamente a las ventas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ticket Settings */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de tickets</CardTitle>
                <CardDescription>
                  Personaliza el formato y numeración de tus tickets de venta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticketPrefix">Prefijo de numeración</Label>
                    <Input
                      id="ticketPrefix"
                      value={formData.ticketSeriesPrefix}
                      onChange={(e) => handleInputChange('ticketSeriesPrefix', e.target.value.toUpperCase())}
                      placeholder="VTA"
                      maxLength={5}
                    />
                    <p className="text-sm text-muted-foreground">
                      Ejemplo: {formData.ticketSeriesPrefix}-2024-0001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticketTemplate">Plantilla de ticket</Label>
                    <Select 
                      value={formData.ticketTemplate} 
                      onValueChange={(value) => handleInputChange('ticketTemplate', value)}
                    >
                      <SelectTrigger id="ticketTemplate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informal">Informal (nota de venta)</SelectItem>
                        <SelectItem value="fiscal">Fiscal (factura)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Último ticket generado:</strong>{' '}
                    <span className="font-mono">
                      {formData.ticketSeriesPrefix}-{new Date().getFullYear()}-{String(storeConfig.lastTicketNumber).padStart(4, '0')}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="datos">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Respaldo de datos</CardTitle>
                  <CardDescription>
                    Exporta o importa todos los datos de tu sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={handleExportData} className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar backup
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                        id="import-file"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => document.getElementById('import-file')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Importar backup
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Importar un backup reemplazará todos los datos actuales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Almacenamiento local</CardTitle>
                  <CardDescription>
                    Los datos se guardan en el navegador de forma segura
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-success">Base de datos local activa</p>
                      <p className="text-sm text-muted-foreground">
                        Los datos persisten en localStorage del navegador
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
