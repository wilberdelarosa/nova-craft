# Guía — Hardware (barcode) + Configuración Windows + Impresión + Instalación local

Objetivo: que el sistema sea “abierto” a cualquiera de estas opciones:
- Lector USB tipo teclado (HID) — recomendado
- Escaneo con cámara (webcam del PC) — opcional
- Celular como scanner y envío al PC — opcional (funciona incluso sin internet)

> Nota: el lector USB HID es el estándar más simple: para la app es como si el usuario escribiera el código en un input.

## 1) Lista de compras (Amazon) — con keywords exactos

No puedo garantizar acceso directo a listados de Amazon desde aquí (a veces bloquea robots), pero te dejo **búsquedas listas** (haz clic y elige según presupuesto) y criterios para elegir.

### 1.1 Lector de código de barras USB (recomendado)
- Búsqueda Amazon (MX):
  - https://www.amazon.com.mx/s?k=lector+codigo+de+barras+usb+code+128
- Búsqueda Amazon (US):
  - https://www.amazon.com/s?k=usb+barcode+scanner+code+128

**Criterios de selección**
- “USB HID / Keyboard Wedge” (que funcione como teclado)
- Soporte Code 128 / EAN-13 / UPC-A
- Configurable para agregar sufijo Enter
- Cable USB-A (para PC) o USB-C según tu equipo

**Tipo recomendado**
- 1D (láser/CCD) si solo usarás códigos lineales (Code 128/EAN).
- 2D (imager) si quieres también QR.

### 1.2 Impresora de etiquetas (si quieres etiquetas en rollo)
- Búsqueda Amazon (MX):
  - https://www.amazon.com.mx/s?k=impresora+termica+etiquetas+4x6
- Búsqueda Amazon (US):
  - https://www.amazon.com/s?k=thermal+label+printer+4x6

**Criterios**
- Driver Windows estable
- 203 dpi mínimo (300 dpi si el código es muy pequeño)
- Tamaños compatibles con tus etiquetas

### 1.3 Etiquetas térmicas (consumible)
- Búsqueda Amazon (MX):
  - https://www.amazon.com.mx/s?k=rollo+etiquetas+termicas+4x6

**Criterios**
- Tamaño (p.ej. 50x25mm para ropa, o 4x6 para envíos)
- Núcleo y ancho compatibles con la impresora

### 1.4 Impresora de ticket 80mm (si quieres ticket térmico)
- Búsqueda Amazon (MX):
  - https://www.amazon.com.mx/s?k=impresora+termica+80mm+usb
- Búsqueda Amazon (US):
  - https://www.amazon.com/s?k=80mm+thermal+receipt+printer+usb

**Criterios**
- ESC/POS compatible
- USB (y opcional Bluetooth/Ethernet)

### 1.5 Celular como scanner (opcional)
No necesitas hardware extra si usas:
- Cámara del PC, o
- Celular con una mini-web/app local que mande el código al PC.


## 2) Configuración del lector USB (Windows) — paso a paso

### 2.1 Instalación
1) Conecta el lector por USB.
2) Windows normalmente lo detecta como **teclado** (HID). No requiere driver.
3) Abre el Bloc de notas y escanea un código: debe “escribir” el contenido.

### 2.2 Sufijo Enter/Tab (muy importante)
- Muchos lectores permiten configurar que al final del scan envíe **Enter**.
- Esto se configura escaneando “códigos de programación” del manual del lector.

**Recomendación**
- Configurar “Append Enter” para que:
  - En POS agregue automáticamente al carrito
  - En Inventario busque automáticamente

### 2.3 Prueba funcional en la app
- En POS, el campo “Scan SKU / buscar…” debe:
  - aceptar el texto
  - procesar automáticamente al recibir Enter


## 3) Escaneo con cámara (PC) — alternativa

### 3.1 Requisitos
- Webcam funcional
- Permisos de cámara aceptados

### 3.2 Comportamiento UX
- Botón “Escanear” abre un panel
- Al detectar un código, cierra y procesa


## 4) Celular como scanner (en LAN) — alternativa

### 4.1 Dos opciones
- **Opción A (simple):** el celular usa una web local (página) para escanear y mandar el texto al Gateway.
- **Opción B (ultra simple):** usar una app que actúe como “teclado” o “Bluetooth HID” (depende del dispositivo).

**Opcion C (si no quieres WiFi):** USB tethering / hotspot por cable
- Algunos teléfonos permiten compartir red por USB.
- El PC y el celular quedan en la misma red local aunque no haya internet.

### 4.2 Requisitos de red
- PC y celular en la misma WiFi
- El Gateway expone un endpoint local (p.ej. `http://PC:PORT/scan`) y la UI muestra un QR con esa URL.


## 5) Generación de códigos de barra (en la app)

### 5.1 Formato recomendado
- Code 128

### 5.2 Regla de generación
- Si la variante no trae barcode:
  - generar uno único basado en secuencia (`INV2025-000123`) o hash corto.
- Validación: barcode único por variante.

### 5.3 Imprimir etiquetas
- Generar PDF con plantilla de etiqueta:
  - Nombre
  - SKU variante
  - Precio
  - Código de barras
- Ajustar tamaño de etiqueta en Configuración (sin inventar pantallas extra: solo parámetro).


## 6) Impresión (Windows)

### 6.1 Tickets
- Si es impresora 80mm:
  - preferir plantilla PDF 80mm
  - o imprimir directo ESC/POS (fase 2)

Nota: en MVP el ticket puede ser **informal**. Si luego necesitas fiscal, se agrega una **plantilla fiscal** y campos adicionales en Configuracion.

### 6.2 Etiquetas
- Para impresoras de etiquetas:
  - elegir tamaño exacto
  - calibrar margen en el driver


## 7) Instalación local (microservicios)

### 7.1 Recomendado: Docker Desktop
- Instalar Docker Desktop (Windows)
- Ejecutar `docker compose up -d`
- UI apunta a `http://localhost:<gateway>`

### 7.2 Alternativa (sin Docker)
- Ejecutar servicios con Node + PM2
- Postgres instalado localmente


## 8) Checklist de “funciona con cualquiera”
- Lector USB HID: funciona siempre, sin drivers.
- Cámara PC: depende de permisos, pero no requiere hardware extra.
- Celular: depende de red, pero es flexible.
