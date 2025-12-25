# Propuesta integral — App de Inventario (Tienda de Ropa)

Fecha: 24-Dic-2025

## 1) Objetivo
Construir una aplicación **robusta, escalable y mantenible** para inventario y ventas de una tienda de ropa, ejecutándose **localmente** (desktop, apariencia web) con opción futura de **migrar dinámicamente** la base de datos a **Supabase (Postgres)** u otra solución en la nube, sin reescribir el negocio.

Enfoque adicional: convertirlo en un **software genérico personalizable** (plantillas, campos configurables y parámetros por negocio) sin perder robustez.

El foco es:
- Operación diaria rápida (entradas/salidas, ventas, devoluciones, ajustes).
- Visibilidad inmediata: stock actual, ventas del mes, top vendidos, alertas.
- Auditoría e historial completo (quién cambió qué y cuándo).
- Reportes/recibos **PDF**.
- Filtros potentes (por talla, color, marca, proveedor, fechas, etc.).
- Gestión con o sin fotos.

## 2) Usuarios y roles
### MVP (ahora)
- **Solo rol Admin**: acceso completo a todo.

### Escalable (futuro)
- **Cajero/Ventas**: ventas, devoluciones, reimpresión PDF.
- **Almacén**: entradas, conteos, ajustes.
- **Gerencia**: solo lectura + métricas.

Autenticación local ahora; listo para crecer a multiusuario/SSO cuando se migre a nube.

## 3) Módulos funcionales

### 3.1 Catálogo / Productos
- Alta/edición de productos con:
  - SKU/código interno (y/o código de barras)
  - Nombre, descripción
  - Marca, categoría, subcategoría
  - Proveedor
  - Precio costo, precio venta, impuesto
  - Variantes: talla, color, modelo, temporada
  - Fotos (0..N)
  - Estado: activo/inactivo
- Importación/exportación (CSV/Excel) (planeado).

### 3.2 Inventario (Stock)
- Stock por **variante** (recomendado para ropa): (producto + talla + color).
- Movimientos de inventario:
  - Entrada (compra/recepción)
  - Salida (venta)
  - Ajuste (merma, conteo, corrección)
  - Devolución (cliente / proveedor)
- **Kardex/Historial** por producto/variante.
- Alertas:
  - Stock bajo
  - Stock agotado

### 3.3 Ventas / POS simplificado
- Registro de venta:
  - Búsqueda rápida por SKU / scan de código:
    - Lector USB (HID) conectado a la PC
    - Teléfono como scanner (modo offline en LAN/USB)
    - Cámara del PC (opcional)
  - Carrito con variantes
  - Descuentos (por línea o total)
  - Impuestos
  - Métodos de pago: efectivo, tarjeta, transferencia (configurable)
- Ticket/recibo:
  - Impresión y/o guardado en PDF
  - Numeración correlativa
  - Plantilla **informal** (MVP) + soporte a plantilla **fiscal** (cuando se requiera)
- Devoluciones y cancelaciones con auditoría.

### 3.4 Reportes y métricas
Enfocado a “rápido ver el mes”:
- Ventas del mes (monto, #tickets, unidades)
- Top más vendidos (unidades, ingresos)
- Rotación de inventario (básica)
- Stock actual valorizado (costo/venta)
- Margen bruto estimado
- Comparativo por períodos (mes actual vs anterior) (planeado)

### 3.5 Búsqueda y filtros avanzados
Requisitos clave:
- Filtros combinables (AND/OR) para:
  - categoría, marca, proveedor
  - rango de precios
  - tallas, colores
  - stock > 0, stock bajo
  - fecha última venta
  - fecha de creación
- Ordenación y vistas guardadas (planeado)

### 3.6 Usuarios, permisos y auditoría
- ABM de usuarios.
- Roles y permisos por módulo.
- Auditoría (eventos):
  - login/logout
  - creación/edición de producto
  - ajustes de inventario
  - ventas/cancelaciones

### 3.7 Configuración
- Impuestos
- Moneda
- Numeración de ticket
- Logo y datos de la tienda
- Parámetros de stock bajo

## 4) Requisitos no funcionales (robustez)

### 4.1 Rendimiento
- Búsquedas y listados deben responder en < 300 ms en local para catálogos típicos (hasta decenas de miles de variantes).
- Indexado correcto de DB.
- Paginación y carga incremental en UI.

### 4.2 Confiabilidad
- Transacciones ACID para ventas y movimientos.
- Backups automáticos locales.
- Recuperación ante fallos (journaling).

### 4.3 Seguridad
- Contraseñas hasheadas (Argon2/Bcrypt).
- Roles/permiso en backend.
- Logs de auditoría.
- Encriptación de backups (opcional).

### 4.4 Escalabilidad
- Separación estricta de:
  - dominio/negocio
  - persistencia (DB)
  - UI
- Implementar un “capa de repositorios” para soportar DB intercambiables.

## 5) Tecnología propuesta (local desktop “casi web”)

> Nota: mencionaste “tecnología de lovable”. Asumo que te refieres a **Lovable** como herramienta de construcción rápida de UI/flujo. La propuesta de abajo mantiene compatibilidad con un front web moderno, pero prioriza que el núcleo sea portable.

### Opción recomendada (microservicios local + escalable)
- **UI Desktop**: Electron + Web UI (React con Vite/Next).
- **API Gateway** (local): Node.js (Fastify o NestJS) con REST + WebSocket.
- **Microservicios** (local):
  - `catalog-service`
  - `inventory-service`
  - `sales-service`
  - `reporting-service`
  - `docs-service` (PDF/plantillas)
  - `auth-service` (aunque en MVP sea trivial)
- **Base de datos local**: Postgres vía Docker (recomendado para microservicios).
  - Ideal: **una base por servicio** dentro del mismo Postgres (p.ej. `catalog_db`, `inventory_db`, ...).
- **ORM / acceso a datos**: Prisma o Drizzle (por servicio).
- **PDF**: HTML→PDF (Playwright) para tickets/etiquetas consistentes.
- **Imágenes**: disco local (carpeta administrada) y luego Supabase Storage al migrar.

Motivo: microservicios te permite escalar, separar responsabilidades y migrar servicios a nube por etapas.

### Opción alternativa (más “desktop puro”)
- Tauri + React (más liviano que Electron) + backend Rust/Node.

## 6) Arquitectura para cambiar/migrar DB (local ↔ Supabase)

### 6.1 Principio clave: “DB Provider” intercambiable (por servicio)
Cada microservicio debe soportar proveedores de DB configurables:
- **LocalPostgresProvider** (default local)
- **SupabasePostgresProvider** (cloud)

Cada servicio mantiene sus migraciones y su esquema. El Gateway no depende de la DB.

### 6.2 Estrategia de migración de datos
Soportar 2 caminos:
1) **Export/Import**: exportar un snapshot (JSON/CSV + imágenes) e importar en otra DB.
2) **Migración asistida**: conexión a Supabase + ejecutar migraciones + subir datos.

Imágenes:
- Local: carpeta `data/images/`.
- Cloud: Supabase Storage (bucket) con URLs firmadas.

### 6.3 Sincronización (si se quiere híbrido)
Tu requerimiento: **paridad local↔nube**, poder **desactivar la nube**, operar **100% local**, y luego **actualizar la nube** cuando quieras.

Propuesta (3 modos):
1) **Local-only**: todo queda en DB local; cero dependencia de internet.
2) **Hybrid (local-first + sync)**: la app escribe primero local y un proceso de sync sube cambios a la nube.
3) **Cloud-only** (opcional): si en el futuro quieres operar directo contra Supabase.

Diseño recomendado: **Hybrid local-first** (sincronización diferida)
- Cada microservicio mantiene una tabla/carpeta de **event log (outbox)**: todo cambio importante genera un evento (append-only).
- Un **sync worker** por servicio:
  - Si nube está activa: empuja eventos pendientes a Supabase.
  - Si nube está desactivada o no hay internet: acumula eventos y reintenta.
- La UI muestra estado: `Local OK`, `Nube desconectada`, `Pendientes: N`.

Conflictos (cuando se vuelve a conectar)
- MVP recomendado: **una sola instancia operativa** (un PC) para evitar conflictos.
- Si habrá varias instancias en el futuro:
  - usar IDs globales (UUID/ULID) y `updated_at`
  - estrategia: "last write wins" para catálogos, y reglas estrictas para ventas/inventario (ventas no se reescriben; se compensan con movimientos).

En MVP: si quieres entregar rápido y robusto
- Empezar con **migración (export/import)**.
- Evolucionar a **sync local-first** en fase 2 cuando ya tengas operación estable.

## 7) Modelo de datos (alto nivel)
Entidades principales:
- **User** (roles)
- **Product** (producto base)
- **Variant** (talla/color)
- **InventoryMovement** (kardex)
- **Sale** (cabecera)
- **SaleItem** (detalle)
- **Customer** (opcional, recomendado)
- **Supplier**
- **AuditLog**
- **ImageAsset** (metadata)

Relaciones clave:
- Product 1..N Variant
- Variant 1..N InventoryMovement
- Sale 1..N SaleItem (referencia a Variant)

Invariante de stock:
- Stock = suma(movimientos) o stock materializado + movimientos para auditoría.
- Recomendación: **stock materializado** (tabla `variant_stock`) + movimientos para historial.

## 8) “Tiempo real” en local
Interpretación simple y efectiva:
- Cuando se registra una venta o ajuste, el stock y métricas se actualizan **instantáneamente** en la UI.

Implementación (microservicios):
- Servicios emiten eventos (p.ej. `sales.sale.completed`, `inventory.stock.updated`).
- Gateway consolida y re-emite por WebSocket a la UI.
- UI refresca listas y KPIs sin recargar.

Si hay múltiples instancias (LAN), entonces sí conviene Postgres + WebSocket + bloqueo/conciliación.

## 9) Flujo de trabajo principal (operación)

### 9.1 Entrada de mercadería
1) Buscar/crear producto y variante.
2) Registrar entrada con cantidad y costo.
3) Impactar stock + movimiento.

### 9.2 Venta
1) Buscar por SKU/scan.
2) Agregar variantes al carrito.
3) Cobrar.
4) Generar ticket PDF.
5) Impactar stock + movimiento + auditoría.

### 9.3 Ajuste / Conteo
1) Seleccionar variante.
2) Registrar motivo (merma, conteo, corrección).
3) Impactar stock + movimiento + auditoría.

## 10) UI/UX (pantallas mínimas)
- Login
- Dashboard (métricas del mes, top vendidos, alertas stock)
- Productos (listado + filtros + detalle)
- Inventario (stock por variante + ajustes)
- Ventas (POS) + historial
- Reportes
- Configuración
- Usuarios/roles (en MVP solo Admin; queda preparado para futuro)

## 10.1 UX moderna e intuitiva (lineamientos)
- Acciones “core” a 1 clic: `Nueva venta`, `Entrada`, `Ajuste`, `Nuevo producto`.
- Tablas con: búsqueda instantánea, filtros claros, paginación.
- Feedback inmediato: toasts/estados al registrar venta/ajuste.
- Modo escaneo: input siempre enfocado; soportar Enter/Tab al final del scan.
- Confirmaciones solo donde importa (ajustes/cancelaciones) para no frenar al usuario.

## 10.2 Código de barras (lector/celular) y etiquetas
- Soportar lector USB “keyboard wedge” (HID): funciona como escribir y Enter.
- Soportar cámara (webcam del PC) para escaneo (opcional).
- En Catálogo/Variantes:
  - Generar barcode automáticamente si no se proporciona.
  - Botón `Imprimir etiquetas` (PDF) listo para impresora.

## 10.3 Cliente (datos primarios + extensible)
Requerimiento: guardar datos primarios y poder ampliar campos.
- MVP (primario): `nombre` y `telefono` (opcionales).
- Escalable: campos extra por configuración (p.ej. email, documento, dirección, notas).

Implementación recomendada (genérica):
- `Customer` con columnas base + `custom_fields_json` para campos dinámicos.
- En reportes/ventas, el cliente es opcional.

## 10.4 Software genérico personalizable (sin reescribir)
Personalización sin crear pantallas “extra”:
- Parámetros en Configuración:
  - Plantilla ticket: informal / fiscal
  - Formato de numeración
  - Campos de cliente habilitados
  - Campos de producto habilitados (p.ej. temporada, material, etc.)
- Plantillas (HTML) versionadas para tickets/etiquetas.

## 11) Backups y recuperación
Local:
- Backups automáticos programados (diario) con retención (p.ej. 7/30 días).
- Botón “Exportar backup ahora”.
- Validación de integridad.

Cloud (Supabase):
- Backups gestionados por proveedor + export lógico.

## 12) Roadmap propuesto (por fases)

### Fase 0 — Descubrimiento (1–2 días)
- Definir catálogo (variantes: talla/color)
- Definir formato de ticket/recibo
- Definir roles

### Fase 1 — MVP Operativo (2–4 semanas)
- Auth (solo Admin) + base para roles
- Productos + variantes + fotos
- Stock + movimientos (entrada/salida/ajuste)
- Ventas + PDF ticket
- Generación de códigos de barra + etiquetas PDF
- Dashboard simple (ventas mes, stock, top vendidos)
- Filtros básicos (búsqueda, categoría, marca, stock)
- Backups locales

### Fase 2 — Potencia y control (3–6 semanas)
- Filtros avanzados (combinables)
- Auditoría completa
- Reportes más completos
- Importación/exportación
- Mejoras de performance (índices, paginación, caché)

### Fase 3 — Migración a nube (2–4 semanas)
- Provider Supabase + Storage
- Herramienta de migración (asistida)
- Modo multiusuario/roles reforzados (si aplica)

## 13) Riesgos y mitigaciones
- **Variantes mal definidas** (talla/color):
  - Mitigación: acordar desde el día 1 el modelo (Variant) y no “parchar” después.
- **Filtros avanzados** pueden complicar UX:
  - Mitigación: empezar con filtros base y evolucionar a builder.
- **Tiempo real multi-PC** en LAN:
  - Mitigación: definir si será 1 PC o varias; si varias, ir a Postgres local + backend central.
- **Migración a Supabase** con imágenes:
  - Mitigación: definir estrategia de Storage y URLs desde el inicio.

## 14) Entregables
- App desktop local instalable
- DB local configurada
- Generación de PDF de recibos
- Dashboard y reportes
- Documentación:
  - instalación
  - backups
  - migración a Supabase (cuando aplique)

## 15) Preguntas mínimas para cerrar alcance (importantes)
1) ¿Será 1 PC o varias en red local?
2) ¿Manejas tallas/colores como variantes obligatorias siempre?
3) ¿Requieres lector de código de barras sí o no?
4) ¿El ticket debe incluir datos fiscales/empresa o es informal?
5) ¿Necesitas clientes (nombre/teléfono) o solo venta rápida?
