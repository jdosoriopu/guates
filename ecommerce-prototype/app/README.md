# Guates · Main fuera del canvas

Esta aplicación continúa el prototipo existente. No es un nuevo diseño: convierte la plantilla y el controlador de `../canvas/project/Main.dc.html` a React 18, utiliza directamente el sistema Guates y monta las escenas existentes de `../drawings/illus.js`.

## Ejecutar

Desde esta carpeta (`ecommerce-prototype/app`), con Node.js 22+ y Python 3:

```sh
npm ci
npm run dev
```

`npm run build` genera `dist/`. `npm run preview` sirve la compilación. Para alojamiento estático, las rutas deben servir `index.html` como fallback sin cambiar la URL. No publicar el servidor de desarrollo.

## Qué se conserva

| Trabajo existente | Implementación conservada | Adaptación |
| --- | --- | --- |
| Inicio y carrusel de personalidades | Plantilla de Main, SVG, animales, textos y controlador | React; pausa por movimiento reducido |
| Recomendación por ánimo y costumbre | MOODS, TASTES, emo, mood y perfiles de Main | Sin cambiar cafés ni recomendaciones |
| Hilo ilustrado del inicio | Ilustraciones SVG y lógica de scroll de Main | Mismos nodos, etapas y composición |
| Catálogo | Filtros por proceso, orden, tarjetas y compra rápida | URL, filtro adicional por rasgos existentes y comparación |
| Ficha | Presentaciones, molienda, precio, personalidad, receta, finca y etiqueta | URL propia y compra accesible durante el recorrido |
| Nueve etapas inversas | `stageList`, `STAGE_MAP`, rutas y ramas por proceso | `?etapa=0…8`, atrás/adelante y enlace directo |
| Mapas, grano, taza y relieve | `drawings/illus.js`, contrato `update/destroy` | Referencias React estables, limpieza y aviso si Canvas falla |
| Ciudad | Las seis ciudades y los cálculos existentes | Persistencia y parámetro `ciudad` |
| Carrito y entrega | Identidad de variantes, precios, cantidades, envío y recogida de Main | Persistencia, historial y resumen recurrente |
| Suscripción | Café fijo/explorador, frecuencias, presentaciones y molienda de Main | Gestión de pausas, saltos, cambios y cancelación |
| Pasaporte de confirmación | Sellos y acción explícita «Ya lo probé» | Perfil local, notas, edición y cafés probados fuera de la tienda |
| Móvil | Main adaptable, usado por Movil.dc.html | Viewport real de 390 px, sin el marco fijo del editor |
| Moderna, ModernaMovil, Bolsa y propuestas Astra | Originales intactos | Se conservan como alternativas; no se fusionan con Main |
| Escenas 3D | `scenes-3d/` y `astra/three/` intactos | No se cargan sobre el global de las escenas 2D |

El Main actual dibuja el inicio con SVG. La ficha y los flujos comerciales usan Canvas 2D. No se sustituye esa elección por WebGL. La API 3D no incluye todas las funciones usadas por Main, como `trail`.

## Conversión reproducible

`scripts/migrate.py` lee el archivo de trabajo actual de Main, incluyendo los cambios locales anteriores a esta migración. Compila sus directivas `sc-if`, `sc-for`, referencias y componentes Guates a llamadas React estáticas; no usa `eval` ni un intérprete en el navegador.

- `generated/Template.jsx`: plantilla original, con puntos de extensión en cabecera, contenido y pie.
- `generated/logic.js`: script original, cambiando únicamente la clase base, importaciones y exportaciones.
- `generated/canvas.css`: estilos originales sin las declaraciones duplicadas de tokens; los tokens canónicos se importan del sistema de diseño.
- `generated/provenance.json`: hash de la fuente y conteo de nodos convertidos.
- `src/Store.jsx`: extensión del controlador: rutas, persistencia, ciclo de escenas y compra simulada.
- `src/Extensions.jsx`: páginas y capacidades que faltaban, sin reemplazar las pantallas originales.
- `src/state.js`: rutas, fechas, validación de variantes y almacenamiento.

No editar `generated/` a mano. `npm run generate` incorpora cambios posteriores de Main; dev y build ejecutan esa conversión al iniciar. Los archivos originales del canvas no se modifican al convertir.

Diferencias intencionales: enlaces de cuenta/información, barra de compra durante el recorrido, controles y páginas adicionales, confirmación que deja explícito que no envía correos ni productos, eliminación de una sombra decorativa heredada del botón del carrito. Se conservan los costos, ciudades, perfiles, presentaciones y contenido original. No se ha marcado ningún café como agotado en el catálogo habitual.

## Animaciones del carrusel

Los cinco animales incorporan los SVG animados del export «Guates tienda el recorrido de tu taza – Prototipo · tienda Guates (3).html». `animation-import.json` registra la procedencia y los hashes. La importación conserva navegación y pie actuales; las escenas Canvas del export eran idénticas a las existentes.

Para repetir la importación: `python3 scripts/import_animations.py "/ruta/al/export.html"`, seguido de `npm run generate`. El importador actualiza únicamente el arte del carrusel, sus estilos y sus indicadores de selección en Main. La tienda no depende del archivo de Downloads ni del runtime del editor. Las animaciones se desactivan con la preferencia de movimiento reducido.

## Rutas y persistencia

`/`, `/cafes`, `/cafes/:slug`, `/recorrido`, `/suscripcion`, `/bolsa`, `/checkout`, `/pedido/confirmacion?pedido=…`, `/cuenta`, `/cuenta/pedidos`, `/cuenta/suscripciones`, `/cuenta/pasaporte`, `/sobre-guates`, `/ayuda`, `/envios-y-devoluciones`, `/privacidad`, `/terminos`.

Catálogo: `proceso`, `orden`, `sensacion`, `comparar`. Ficha: `etapa`. Ciudad: `ciudad`. El almacenamiento local usa `guates.canvas-store.v1`, separado de otros prototipos. Guarda bolsa, selección, ciudad, perfil, pedidos, suscripciones y notas. Los borradores de entrega se conservan al volver y se eliminan al confirmar; no se guardan dirección, teléfono ni correo en los pedidos.

Una compra no marca automáticamente un café como probado. El perfil es obligatorio para gestionar una suscripción o conservar notas, y opcional para compra única. Es un perfil local de demostración: no autentica personas ni aísla información entre usuarios del mismo navegador. Usa datos ficticios. Mi cuenta permite borrar los datos locales.

## Simulación y límites

Los pagos, pedidos, entregas, perfiles y suscripciones son simulaciones. No hay cuentas remotas, cobros, reservas de inventario, correos ni logística real. «Escenarios de prueba», dentro de checkout, permite simular pago pendiente/fallido, agotado y destino sin cobertura; estos casos no cambian los datos originales ni se guardan al recargar.

El pago pendiente no activa suscripciones. Los montos recurrentes utilizan los precios y la tarifa de la ciudad originales; cada futura suscripción tiene su propio envío (o recogida sin envío). Cambiar frecuencia programa la siguiente entrega desde hoy; pausar suspende entregas; saltar avanza un intervalo; cancelar evita futuras entregas simuladas.

Para producción faltan autenticación, datos privados en servidor, catálogo y lotes confirmados, stock, validación de precios en servidor, pasarela y eventos de pago, cobros recurrentes, logística y políticas aprobadas. El sistema oficial carga un bundle SVG de aproximadamente 1 MB y fuentes externas para Roboto Slab y Caveat Brush; no se ha alterado ese sistema para optimizarlo.

## Verificación

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Las pruebas de equivalencia ejecutan el controlador original y el migrado: comparan todos los datos, precios, nueve etapas por café/ciudad, recetas por método/cantidad y totales por entrega. Las pruebas de navegador cubren escritorio y móvil, recomendaciones, escenas, variantes, rutas, persistencia, compra invitada/mixta, errores, suscripciones y pasaporte.

Las capturas de la aplicación migrada se revisan a 1440 y 390 px. El runtime privado del editor no está incluido en el repositorio; no se afirma una comparación pixel a pixel contra un canvas ejecutado externamente. La conservación se verifica además mediante la conversión íntegra de nodos y la equivalencia del controlador original.
