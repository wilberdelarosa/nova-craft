import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, X, Flashlight, SwitchCamera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }, []);

  const startScanner = useCallback(async (cameraId?: string) => {
    if (!containerRef.current || !open) return;

    try {
      await stopScanner();
      setError(null);

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError('No se detectó ninguna cámara');
        return;
      }

      setCameras(devices);
      const camera = cameraId || devices[currentCameraIndex]?.id || devices[0].id;

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-scanner-container');
      }

      await scannerRef.current.start(
        camera,
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          onScan(decodedText);
          toast.success('Código escaneado', { description: decodedText });
          handleClose();
        },
        () => {
          // Ignore failures, just scanning
        }
      );

      // Check flash support
      const track = scannerRef.current.getRunningTrackSettings?.();
      if (track && 'torch' in track) {
        setHasFlash(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err?.message?.includes('Permission')) {
        setError('Permiso de cámara denegado. Actívalo en la configuración del navegador.');
      } else {
        setError('Error al acceder a la cámara');
      }
    }
  }, [open, currentCameraIndex, onScan, stopScanner]);

  const handleClose = useCallback(async () => {
    await stopScanner();
    setFlashOn(false);
    onClose();
  }, [stopScanner, onClose]);

  const toggleFlash = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore - torch is valid but not typed
        advanced: [{ torch: !flashOn }]
      });
      setFlashOn(!flashOn);
    } catch {
      toast.error('Flash no disponible');
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanner(cameras[nextIndex].id);
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => startScanner(), 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escanear Código
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div
            id="barcode-scanner-container"
            ref={containerRef}
            className={cn(
              "w-full aspect-[4/3] bg-muted",
              error && "flex items-center justify-center"
            )}
          >
            {error && (
              <div className="text-center p-6">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => startScanner()}
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          {/* Scanner overlay */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-72 h-44">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-lg" />
                {/* Scanning line */}
                <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-accent/50 animate-pulse" />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            {hasFlash && (
              <Button
                variant={flashOn ? 'default' : 'secondary'}
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={toggleFlash}
              >
                <Flashlight className="w-5 h-5" />
              </Button>
            )}
            {cameras.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg"
                onClick={switchCamera}
              >
                <SwitchCamera className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Apunta la cámara al código de barras
          </p>
          <Button variant="ghost" onClick={handleClose} className="mt-2">
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
