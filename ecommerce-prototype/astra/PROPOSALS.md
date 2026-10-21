# Guates Coffee Roasters · Otro mapa del café

Documento de concepto y especificación de un prototipo. Español colombiano, de tú: primero lo que puedes sentir, después el dato que lo explica.

**Supuesto:** la tostaduría está en Villavicencio, Meta, en 4.142 N, −73.627 W, a unos 470 m s. n. m. Es un supuesto del brief, pendiente de confirmación. Nombres, productores, fincas, variedades o mezcla y procesos proceden de las etiquetas del brief. No se añaden certificaciones ni afirmaciones de trazabilidad. Altitudes y coordenadas de finca, cosechas, notas, tiempos, temperaturas, humedad y kilómetros son **dato de muestra**. El terreno no representa relieve medido.

## 1. Tres direcciones

### A. Otro mapa del café

**En una frase:** elige una sensación y sigue el camino que la trajo hasta tu taza.

La tienda se organiza como un mapa editorial: cinco cafés, cinco entradas al recorrido. La ficha abre con productor, lugar y notas de muestra; al avanzar, el relieve se transforma en ruta, fruto, grano y taza. El viaje respeta el proceso de cada café, sin obligarte a recorrerlo para comprar.

**Interacción distintiva:** una línea de recorrido conecta un selector de etapas, un mapa proyectado y un grano que cambia. Puedes adelantar a “Tu taza” y volver a la finca sin perder el café elegido ni el carrito.

**Por qué es Guates:** convierte la curiosidad de quien llega de otro lugar en una invitación abierta. Los Llanos son el lugar desde el que se cuenta la historia, no una afirmación de que todo el café crece allí. Firma: “Donde empieza otro mapa del café”.

### B. El taller de una taza

**En una frase:** toca cada transformación y descubre qué cambia en tu café.

La tienda es una mesa de trabajo: tarjetas cuadradas, herramientas dibujadas y un fruto central. Arrastras una tarjeta de proceso hacia el grano para ver qué se retira, qué se conserva y qué llega al secado. El origen acompaña cada transformación en una ficha pequeña, sin dominar la navegación.

**Interacción distintiva:** abre la cereza, retira el pergamino y compara lavado, natural y honey en tres bandejas. Honey conserva parte de la capa dulce de la fruta durante el secado; no significa que se le agregue miel.

**Por qué es Guates:** generoso, cercano y explicativo. Enseña sin convertir el conocimiento en una prueba para comprar. Favorece la comparación de procesos; su riesgo es que el visitante juegue y olvide explorar productores.

### C. Pasaporte de curiosidades

**En una frase:** cada bolsa abre una nueva página de tu recorrido.

La tienda se parece a una libreta de viaje: cada origen ocupa una doble página con productor, territorio, animal ilustrado y receta. La historia conecta visitas, compras y una suscripción que propone el siguiente lugar por explorar.

**Interacción distintiva:** estampas un origen después de marcar “Ya lo probé”; el sello despliega tu nota personal y un enlace a ese productor. Comprar no demuestra haber probado: las dos acciones permanecen separadas.

**Por qué es Guates:** recoge el significado de guate como alguien curioso que llega, aprende y comparte. Favorece el regreso y la suscripción; su riesgo es pedir una cuenta demasiado pronto o convertir la experiencia en competencia.

### Recomendación

**Desarrollar Otro mapa del café.** Responde directamente a “ver todo el recorrido que tuvo que hacer para tener esa taza”, y sirve tanto al visitante que quiere comprar en segundos como al que quiere explorar. El mapa aporta contexto, el grano explica cambios y una ficha siempre visible permite decidir. Tomar del Taller la transformación del fruto y del Pasaporte un registro voluntario después de la compra. No mezclar las tres metáforas en la navegación principal.

Dirección visual: bloques de color plano, contornos finos con pequeñas irregularidades, esquinas cuadradas y aire de papel impreso. Roboto Slab en títulos, Roboto en lectura/datos, Caveat Brush solo en acentos cortos. Ilustraciones lineales de chigüiro, garza y moriche; acompañan la marca, no certifican fauna de una finca. Sin degradados, sombras, brillos, PBR ni bloom. Relieve con caras de color uniforme y curvas de nivel.

## 2. Arquitectura de páginas y flujos

| Pantalla | Qué muestra | Acción y continuidad |
| --- | --- | --- |
| Inicio | Firma de marca, ilustración de sabana, “¿Por dónde quieres empezar?”, cinco entradas sensoriales con notas marcadas como muestra y primer tramo del mapa. | “Explora los cafés” abre catálogo; “Sigue esta taza” abre una ficha. Comprar no exige reproducir animaciones. |
| Catálogo | Cinco tarjetas con nombre, productor, lugar, proceso explicado, peso y precio de muestra. Filtros por proceso, lugar y sensación. | Filtrar conserva selección; conteo y estado vacío visibles. Comparar dos cafés alinea sensación, origen y proceso. |
| Ficha de producto | Nombre, sensación propuesta, productor de etiqueta, variedad, proceso, peso, molienda y CTA. Debajo: altimetría, coordenadas y etapas. | “Conoce el recorrido” abre el stepper. Scroll y botones manejan el mismo estado sin secuestrar el scroll. Compra accesible sin completar etapas. |
| Recorrido en ficha | Cosecha → despulpado cuando aplica → fermentación → lavado/secado según proceso → trilla → tostión → empaque → envío → tu taza. Mapa: finca → trilla → tostaduría → ciudad. | Cada etapa tiene texto fuera del canvas. El mapa tiene cuatro paradas; el relato tiene nueve etapas. Son índices distintos. |
| Carrito | Café, presentación, molienda, cantidad, precio, entrega estimada por ciudad y desglose. “Así llegó hasta aquí” enlaza al recorrido. | Editar cantidad o quitar recalcula total. Suscripción nunca seleccionada por defecto. Continuar como invitado. |
| Checkout | Contacto, dirección, entrega, pago y revisión del costo final. Solo datos necesarios. | Validación junto al campo, conservar datos al volver. El demo simula confirmación sin pagos ni datos de tarjeta. |
| Confirmación | Número, resumen, siguiente paso, receta y opción de guardar origen. | “Prepara tu primera taza”. Pasaporte voluntario. |
| Suscripción | Café fijo o selección del tostador; cada 2/4 semanas; gramos, molienda, siguiente fecha y precio transparentes. | Revisar antes de activar; pausar, saltar o cancelar desde la cuenta. No prometer el próximo lote si aún no está confirmado. |

Flujo principal: inicio → catálogo → ficha → carrito → checkout → confirmación → receta. Exploración: ficha → recorrido → comparar → ficha. Recurrencia: ficha/suscripción → frecuencia → revisión → checkout → gestión. Todo admite teclado. En móvil, tarjetas en una columna y pasos horizontales desplazables; texto y controles siguen disponibles sin WebGL.

Estados mínimos: cargando, mapa no disponible, agotado, ciudad fuera de cobertura, carrito vacío, pago fallido y datos por confirmar. “Dato de muestra” acompaña el dato. En producción, usar registros por lote y mostrar fuente/actualización; si falta un dato, decir “Por confirmar”.

**Implementado en el demo:** cuatro módulos, selección de cinco cafés, ciudad, nueve etapas narrativas, controles independientes, distancia geométrica, receta, carrito y confirmación local. La arquitectura especifica el producto completo; filtros avanzados, comparación, cuenta, pasaporte persistente, pagos y gestión de suscripción son propuestas, no integraciones terminadas.

## 3. Relato del recorrido

Ejemplo: **Lavado / Castillo / Benedicto Puentes / Palma Roja / China Alta, Tolima**. Solo esos datos proceden de la etiqueta. Todos los números siguientes son **dato de muestra**, salvo el supuesto de la tostaduría. Los tiempos son ilustrativos; no sumarlos como plazo de entrega ni usarlos como instrucciones de procesamiento.

| Etapa | Lo que te contamos | Datos a mostrar | Momento 3D |
| --- | --- | --- | --- |
| 1. Cosecha | “Aquí empieza: una fruta madura que se recoge y se selecciona. Antes de ser grano, tu café fue cereza.” | **Dato de muestra:** 1.850 m s. n. m.; 4.5800, −75.1600; junio de 2026; 1 día de selección. Productor/finca: etiqueta. | Vuelo desde vista alta al pin; una franja de color marca su altitud, sin resplandor. Aparece la cereza. |
| 2. Despulpado | “Retiramos la piel y buena parte de la pulpa. El grano todavía guarda una capa dulce a su alrededor.” | **Dato de muestra:** 4 h después de cosechar, el mismo día; 1.850 m; 20 °C ambiente. | La cereza se abre. En natural, esta etapa se sustituye por selección de fruta entera; no se despulpa antes de secar. |
| 3. Fermentación | “Los microorganismos transforman parte de los azúcares de la fruta. El tiempo y el cuidado influyen; por sí solos no prometen un sabor.” | **Dato de muestra:** 36 h de referencia, 20 °C ambiente; recipiente/método por confirmar. | Marcas discretas alrededor del grano; horas en texto. No se representa un tanque ni un método no confirmado. |
| 4. Lavado y secado | “Lavado significa que se retira con agua la capa que queda después de la fermentación. Luego el café pierde humedad durante el secado.” | **Dato de muestra:** 9,5 días de secado; humedad final 11 %; total cosecha a seco 12 días. Método por confirmar. | Permanece el pergamino y unas líneas planas sugieren aire. Honey no muestra lavado completo; natural mantiene la fruta hasta secar. |
| 5. Trilla | “Quitamos las capas secas que protegen el grano. Así queda el café verde, listo para seguir hacia la tostión.” | **Dato de muestra:** centro propuesto en Ibagué, 4.4389, −75.2322; 1.285 m; 38 km desde finca; 1 día de operación. | Segunda parada; se abre el pergamino y aparece el grano verde. En natural se retira también la envoltura seca de fruta. |
| 6. Tostión | “El calor transforma el grano y desarrolla aromas. Tostión es ese cambio controlado: no un sello automático de calidad.” | **Supuesto:** Villavicencio, 4.1420, −73.6270, ~470 m. **Dato de muestra:** 315 km desde trilla; 10 min; lectura final de sonda hipotética 202 °C, no receta. | El grano cambia a un tono plano. El control 1–5 explora una ilustración; no cambia el producto ni una curva real de tostado. |
| 7. Empaque | “Guardamos el café y anotamos su lote y fecha. Así puedes saber qué bolsa tienes entre manos.” | **Dato de muestra:** lote GUA-LAV-2606; tostión 2026-07-02; empaque 2026-07-03; 250 g. Fechas ilustrativas, no oferta vigente. | Ficha cuadrada de empaque junto al grano; colores de la etiqueta. Esta animación de empaque queda propuesta para producción. |
| 8. Envío | “Desde los Llanos empieza el último tramo. Elige tu ciudad y mira hasta dónde llega este recorrido.” | **Dato de muestra:** Bogotá, 4.7110, −74.0721, 2.640 m; 122 km terrestres propuestos; 2–4 días de ejemplo. La distancia del demo es en línea recta y se etiqueta aparte. | Última conexión; el grano viaja hasta la ciudad y la cámara acompaña sin giros bruscos. |
| 9. Tu taza | “Ahora el camino pasa por tus manos. Prueba, ajusta y cuéntanos qué encontraste.” | **Receta de muestra:** filtro manual, 15 g de café, 250 g de agua, 92 °C, 2:30–3:00 min, molienda media como punto de partida. | Taza cenital con tres líneas de aroma. Movimiento reducido: composición fija. |

**Ramas:** Regional y Lavado siguen lavado. Natural y Platea secan con fruta, sin despulpado/lavado previos; fermentación y secado pueden solaparse. Honey retira piel y seca conservando parte del mucílago, la capa dulce que rodea el grano; no lleva miel añadida. No deducir tanque, levaduras, tiempos o secador a partir del nombre comercial. La transformación por capas es una simplificación anatómica, no una simulación del proceso exacto.

## 4. Diez interacciones memorables

1. **La altura al alcance de tu dedo.** Arrastrar gira el relieve; tocar/pasar puntero devuelve altitud ilustrada. “Marca la altura” destaca una curva con grosor real. Alternativa textual sin puntero. Implementado.
2. **El último tramo hasta tu ciudad.** Bogotá, Medellín, Cali o Villavicencio cambian la ruta. Haversine calcula distancia en línea recta desde tostaduría; no es costo ni distancia vial. Coordenadas de muestra. Implementado.
3. **Dos relojes, una historia.** El stepper relaciona etapa narrativa y parada espacial. Se separan días de proceso, minutos de tostión y días de envío, sin sumar intervalos superpuestos. Stepper implementado; cronología proporcional propuesta.
4. **Abre lo que no ves en la bolsa.** Cereza/pergamino/verde/tostado abre cubiertas y revela el grano y su hendidura. Natural/honey mantienen sus explicaciones propias. Anatomía simplificada implementada.
5. **Una tostión para mirar.** Mueves 1–5 y ves tonos discretos. No cambia tu pedido ni predice sabor. 4 y 5 comparten café de origen: no existe casi negro en la paleta. Implementado.
6. **Tu pasaporte, a tu ritmo.** “Ya lo probé” crea sello rectangular con lugar, mes y “A mí me supo a…”. Sin publicar ni competir; exportar y crear cuenta son opcionales. Propuesta.
7. **Receta para llevar a la cocina.** Una/dos tazas recalcula gramos y conserva la proporción visible. Copiar produce texto plano. Receta y copia implementadas; biblioteca de recetas propuesta.
8. **Compara dos caminos.** Lavado junto a Natural: puede coincidir finca, pero cambian capas y secado. Diferencias de etiqueta separadas de sensaciones de muestra. Propuesta.
9. **El mapa de tu próxima bolsa.** Suscripción fija/exploración muestra el siguiente origen cuando esté confirmado y permite saltar. Selector básico de frecuencia implementado; cuenta y cobro recurrente propuestos.
10. **Un chigüiro te deja una pista.** Ilustración lineal con “Que diga honey no significa que tenga miel”. No tapa compra ni reproduce sonido. Ilustración y pista implementadas; revelaciones por etapa propuestas.

## 5. Datos de muestra de los cinco cafés

Los tres cafés de Palma Roja comparten coordenadas y altitud de muestra: no conocemos parcelas. “Blend” conserva su texto sin inventar composición. “Rengijo” conserva la escritura del brief. Las notas son propuestas creativas, no evaluación sensorial. Las trillas son puntos urbanos de referencia ficticios, no instalaciones identificadas. Los kilómetros terrestres no equivalen al arco del mapa ni a Haversine.

```json
{
  "aviso": "Todo campo dentro de muestra es dato de muestra, no trazabilidad verificada. Etiqueta transcrita del brief. Kilómetros terrestres propuestos, no calculados con el mapa.",
  "tostaduria": {
    "nombre": "Guates Coffee Roasters",
    "ciudad": "Villavicencio, Meta",
    "lat": 4.142,
    "lng": -73.627,
    "altitud_msnm": 470,
    "estado": "supuesto del brief; ubicación y altitud por confirmar"
  },
  "cafes": [
    {
      "id": "regional",
      "nombre": "Regional",
      "etiqueta": {
        "productor": "Tatiana Rincón",
        "lugar": "Cubarral, Meta",
        "finca": "Llanogrande",
        "variedad_o_mezcla": "Blend",
        "proceso": "Lavado"
      },
      "colores": {
        "tinta": "#624532",
        "papel": "#F6F3ED"
      },
      "muestra": {
        "estado": "dato de muestra",
        "altitud_msnm": 1350,
        "coordenadas": {
          "lat": 3.86,
          "lng": -73.98
        },
        "mes_cosecha": "2026-05",
        "notas_sensoriales": [
          "panela",
          "cacao",
          "naranja dulce"
        ],
        "proceso_dias": {
          "total_cosecha_a_cafe_seco": 11,
          "fermentacion_referencial": 1,
          "secado": 9,
          "nota": "La fermentación puede solaparse con el secado; las duraciones no se suman. No incluye reposo, trilla ni transporte."
        },
        "ruta": {
          "trilla": {
            "nombre": "Centro de trilla propuesto · Granada, Meta",
            "lat": 3.546,
            "lng": -73.706,
            "estado": "dato de muestra; no es un proveedor identificado"
          },
          "finca_a_trilla_km": 48,
          "trilla_a_tostaduria_km": 87,
          "total_hasta_tostaduria_km": 135,
          "metodo": "Estimación creativa de carretera: dato de muestra, no calculada ni verificada"
        }
      }
    },
    {
      "id": "lavado",
      "nombre": "Lavado",
      "etiqueta": {
        "productor": "Benedicto Puentes",
        "lugar": "China Alta, Tolima",
        "finca": "Palma Roja",
        "variedad_o_mezcla": "Castillo",
        "proceso": "Lavado"
      },
      "colores": {
        "tinta": "#4E71F0",
        "papel": "#9DB5EC"
      },
      "muestra": {
        "estado": "dato de muestra",
        "altitud_msnm": 1850,
        "coordenadas": {
          "lat": 4.58,
          "lng": -75.16
        },
        "mes_cosecha": "2026-06",
        "notas_sensoriales": [
          "mandarina",
          "caramelo",
          "flor blanca"
        ],
        "proceso_dias": {
          "total_cosecha_a_cafe_seco": 12,
          "fermentacion_referencial": 1.5,
          "secado": 9.5,
          "nota": "La fermentación puede solaparse con el secado; las duraciones no se suman. No incluye reposo, trilla ni transporte."
        },
        "ruta": {
          "trilla": {
            "nombre": "Centro de trilla propuesto · Ibagué, Tolima",
            "lat": 4.4389,
            "lng": -75.2322,
            "estado": "dato de muestra; no es un proveedor identificado"
          },
          "finca_a_trilla_km": 38,
          "trilla_a_tostaduria_km": 315,
          "total_hasta_tostaduria_km": 353,
          "metodo": "Estimación creativa de carretera: dato de muestra, no calculada ni verificada"
        }
      }
    },
    {
      "id": "natural",
      "nombre": "Natural",
      "etiqueta": {
        "productor": "Benedicto Puentes",
        "lugar": "China Alta, Tolima",
        "finca": "Palma Roja",
        "variedad_o_mezcla": "Bourbon Rosado",
        "proceso": "Natural"
      },
      "colores": {
        "tinta": "#364831",
        "papel": "#91AD80"
      },
      "muestra": {
        "estado": "dato de muestra",
        "altitud_msnm": 1850,
        "coordenadas": {
          "lat": 4.58,
          "lng": -75.16
        },
        "mes_cosecha": "2026-06",
        "notas_sensoriales": [
          "fresa",
          "guayaba",
          "chocolate"
        ],
        "proceso_dias": {
          "total_cosecha_a_cafe_seco": 23,
          "fermentacion_referencial": 3,
          "secado": 22,
          "nota": "La fermentación puede solaparse con el secado; las duraciones no se suman. No incluye reposo, trilla ni transporte."
        },
        "ruta": {
          "trilla": {
            "nombre": "Centro de trilla propuesto · Ibagué, Tolima",
            "lat": 4.4389,
            "lng": -75.2322,
            "estado": "dato de muestra; no es un proveedor identificado"
          },
          "finca_a_trilla_km": 38,
          "trilla_a_tostaduria_km": 315,
          "total_hasta_tostaduria_km": 353,
          "metodo": "Estimación creativa de carretera: dato de muestra, no calculada ni verificada"
        }
      }
    },
    {
      "id": "honey",
      "nombre": "Honey",
      "etiqueta": {
        "productor": "Juan Rengifo",
        "lugar": "Pitalito, Huila",
        "finca": "Rengijo",
        "variedad_o_mezcla": "Papayo",
        "proceso": "Honey"
      },
      "colores": {
        "tinta": "#F2D139",
        "papel": "#F5E380"
      },
      "muestra": {
        "estado": "dato de muestra",
        "altitud_msnm": 1780,
        "coordenadas": {
          "lat": 1.86,
          "lng": -76.07
        },
        "mes_cosecha": "2026-05",
        "notas_sensoriales": [
          "miel de caña",
          "durazno",
          "flor de azahar"
        ],
        "proceso_dias": {
          "total_cosecha_a_cafe_seco": 17,
          "fermentacion_referencial": 1,
          "secado": 15,
          "nota": "La fermentación puede solaparse con el secado; las duraciones no se suman. No incluye reposo, trilla ni transporte."
        },
        "ruta": {
          "trilla": {
            "nombre": "Centro de trilla propuesto · Neiva, Huila",
            "lat": 2.9386,
            "lng": -75.2673,
            "estado": "dato de muestra; no es un proveedor identificado"
          },
          "finca_a_trilla_km": 191,
          "trilla_a_tostaduria_km": 425,
          "total_hasta_tostaduria_km": 616,
          "metodo": "Estimación creativa de carretera: dato de muestra, no calculada ni verificada"
        }
      }
    },
    {
      "id": "platea",
      "nombre": "Platea",
      "etiqueta": {
        "productor": "Benedicto Puentes",
        "lugar": "China Alta, Tolima",
        "finca": "Palma Roja",
        "variedad_o_mezcla": "Moka",
        "proceso": "Natural"
      },
      "colores": {
        "tinta": "#81164B",
        "papel": "#DB92BA"
      },
      "muestra": {
        "estado": "dato de muestra",
        "altitud_msnm": 1850,
        "coordenadas": {
          "lat": 4.58,
          "lng": -75.16
        },
        "mes_cosecha": "2026-06",
        "notas_sensoriales": [
          "ciruela",
          "cacao",
          "uva morada"
        ],
        "proceso_dias": {
          "total_cosecha_a_cafe_seco": 25,
          "fermentacion_referencial": 4,
          "secado": 24,
          "nota": "La fermentación puede solaparse con el secado; las duraciones no se suman. No incluye reposo, trilla ni transporte."
        },
        "ruta": {
          "trilla": {
            "nombre": "Centro de trilla propuesto · Ibagué, Tolima",
            "lat": 4.4389,
            "lng": -75.2322,
            "estado": "dato de muestra; no es un proveedor identificado"
          },
          "finca_a_trilla_km": 38,
          "trilla_a_tostaduria_km": 315,
          "total_hasta_tostaduria_km": 353,
          "metodo": "Estimación creativa de carretera: dato de muestra, no calculada ni verificada"
        }
      }
    }
  ]
}
```

## Contrato técnico y uso

Servir esta carpeta mediante HTTP: `python3 -m http.server 8080`, luego abrir `http://localhost:8080/demo.html`. No requiere instalación ni build. La única solicitud externa es la importación literal de three.js r160 desde jsDelivr, compartida por la caché de módulos del navegador. No hay modelos, texturas, analítica o geolocalización.

Cada módulo autónomo exporta `mount(container, options)` y devuelve `update(options)` (mezcla parcial) y `destroy()` (idempotente). El contenedor necesita anchura y altura medibles. Cada instancia administra canvas, ResizeObserver, IntersectionObserver, eventos, geometrías, materiales y contexto WebGL. Oculta o en pestaña de fondo no mantiene el bucle. Con `prefers-reduced-motion: reduce`, cada selección produce un fotograma final estático, sin RAF continuo. La preferencia también se puede cambiar con el demo abierto.

| Módulo | Opciones y comportamiento |
| --- | --- |
| `three/origin-terrain.js` | `seed`, `farmAltitude`, `minAlt`, `maxAlt`, `colors:{line,land,accent}`, `lat`, `lng`. Extras: `contourInterval` (200 m), `highlightFarm` (true), `onHover({altitude,x,z})` o null fuera del terreno, `onAltitudeHover(altitude, point)`. Ruido determinista, malla 36×36, curvas por intersección de triángulos. Altitud anclada al centro. No devuelve coordenadas de un terreno geográfico real. |
| `three/journey-route.js` | `stage` 0…n−1, admite fracciones; `stops:[{name,lat,lng}]` (2–12); `speed` en segmentos/s (0,65), `follow`, `onStop({index,stop})`. Cuatro paradas por defecto. Notifica llegada también al retroceder; la inicial una vez. Cambiar `stops` reinicia ruta. Movimiento reducido: notifica las paradas cruzadas en la actualización estática. |
| `three/bean-morph.js` | `stage` 0=cereza, 1=pergamino, 2=verde, 3=tostado; `roast` 1…5. Mitades abiertas, dos lóbulos con hendidura física. Transformación visual por capas, no interpolación de topología. |
| `three/cup.js` | `roast` 1…5 y `aroma` true/false. Líquido plano y tres líneas de aroma. Color ilustrativo, no predicción del café preparado. |

`colors` acepta únicamente HEX de la paleta; valores ajenos vuelven al predeterminado. Se limitan índices y magnitudes. Una altitud de finca inconsistente se ajusta al interior del intervalo de altitudes. Los callbacks deben ser funciones. Los controles muestran rangos válidos.

**Color:** #624532 es el café más oscuro permitido. Tostión 4/5 comparte ese color; no se inventa casi negro. Para diferenciarlos por color hará falta aprobar un tono nuevo. Honey conserva sol sobre luz como identidad gráfica; la lectura usa café sobre crema porque amarillo sobre amarillo no sirve para texto pequeño.

**Tipografía:** `local()` pide Roboto Slab, Roboto y Caveat Brush. Si no están instaladas, se usan serif/sans-serif/cursive del sistema; no hay descarga externa de fuentes. Para reproducirlas exactamente en producción se deben incorporar sus archivos autorizados.

**Accesibilidad y rendimiento:** texto completo fuera del canvas, controles etiquetados, estado de carrito anunciado, foco visible, controles por teclado, movimiento reducido y aviso por escena si WebGL falla. El arrastre es complementario. Geometría pequeña, materiales básicos, sin luces/sombras y DPR máximo 2. Cuatro observadores independientes. No se afirma un FPS medido en teléfono.

**Límites:** mapa central esquemático, sin límites administrativos ni rutas viales; terreno sin DEM; coordenadas/fechas de muestra; sin inventario, pagos, cuenta o logística. Carrito en memoria, se pierde al recargar; no recoge datos personales. La suscripción solo registra frecuencia en el resumen local. Requiere WebGL y CDN para las escenas. Sin CDN, el HTML, catálogo y carrito siguen disponibles y las escenas muestran aviso.

## Verificación de esta entrega

- Sintaxis comprobada con `node --input-type=module --check`: los cuatro módulos y el script del demo pasan.
- Los cuatro imports de three.js coinciden exactamente con `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`. El demo apunta a los cuatro archivos mediante rutas relativas existentes.
- El bloque JSON se analiza correctamente, incluye cinco cafés y coincide con los datos incrustados en el demo. Las sumas de kilómetros hasta la tostaduría son consistentes.
- Auditoría de HEX: módulos y demo solo declaran los doce colores autorizados.
- Prueba de ciclo de vida con DOM/Three.js simulados: las cuatro instancias montan, actualizan, pausan fuera de pantalla y en pestaña oculta, detienen RAF con movimiento reducido y destruyen observadores, eventos, geometrías, materiales y renderers. `destroy()` repetido no falla. Se comprobó la secuencia de callbacks de ruta 0 → 1 → 2 → 3 → 2 → 1 → 0.
- **No se pudo comprobar el renderizado WebGL real ni medir rendimiento móvil:** el sandbox rechazó abrir un puerto para el servidor HTTP local (`PermissionError: Operation not permitted`). Las pruebas simuladas no sustituyen esa revisión visual. No se descargaron dependencias ni se instalaron paquetes.
- Se crearon únicamente los seis archivos solicitados en la carpeta de entrega. No se modificaron archivos preexistentes del proyecto.
