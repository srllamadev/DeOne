# Guía visual · DeOne

La referencia de la wallet guía el orden de lectura. Primero van nombre y cuenta, luego saldo, tres acciones amarillas, movimientos y navegación inferior. La misma estructura presenta BOB para Lidia y COP para Martha. Los [tokens de CSS](../apps/frontend/src/styles/globals.css) aplican a todas las pantallas.

## Paleta

| Token | Color | Uso |
| --- | --- | --- |
| `--canvas` | `#0D0D0D` | Fondo general |
| `--surface` | `#151515` | Tarjetas, historial y barra inferior |
| `--border` | `#3A3A3A` | Bordes y divisores |
| `--accent` | `#FFD000` | Marca, contorno del saldo, acciones y foco |
| `--text` | `#F7F7F7` | Texto principal |
| `--muted` | `#B8B8B8` | Cuenta, fecha y texto secundario |
| `--credit` | `#72D654` | Abono con signo + |
| `--debit` | `#FF5353` | Débito con signo − y errores con mensaje |
| `--selected` | `#423700` | Fondo de la pestaña activa y etiqueta de demo |

## Tipografía

Usar **Roboto Condensed Variable**, instalada mediante Fontsource y servida por la app. En el [componente Money](../apps/frontend/src/lib/money.tsx), renderizar las cifras y la moneda por separado.

| Texto | Familia y peso | Regla |
| --- | --- | --- |
| Cifras de saldo, movimientos, importes y número de cuenta | Roboto Condensed **ExtraBold 800** | Clase `.money-number` y cifras tabulares. |
| `Bs`, `COP` y `$` | Roboto Condensed **Regular 400** | Clase `.money-unit`. Dentro del saldo, usar 0,72 del tamaño de las cifras. |
| Nombres de perfil y títulos | Roboto Condensed **Bold 700** | «Hola Lidia», «Hola Martha» y encabezados de sección. |
| Cuenta, fechas, etiquetas y ayuda | Roboto Condensed **Regular 400** | Mantener legibilidad con texto claro y metadatos en gris. |

Escribir **Bs 10.250,80** y **$ 2.450.000 COP**. Formatear con `es-BO` y `es-CO`. La base usa dos decimales para BOB y pesos enteros para COP. Usar signos y etiquetas en abonos y débitos para que el color sea complementario.

## Composición y estados

- **Encabezado.** Marca amarilla, divisor, saludo, bandera, número copiable y avatar. La etiqueta **Modo demo** queda junto al encabezado o al título de la remesa.
- **Saldo.** Tarjeta oscura con borde amarillo de 2 px y esquinas de unos 22 px. El ojo alterna mostrar y ocultar el monto con una etiqueta accesible.
- **Acciones.** Tres columnas del mismo ancho. Iconos lineales oscuros sobre amarillo. Cobro copia el alias, Pago navega al envío y Retiro conserva su lugar con «Próximamente».
- **Actividad.** Una tarjeta con divisores. A la izquierda van concepto y fecha. A la derecha va el importe con signo. «Ver todos» abre Movimientos.
- **Navegación.** Inicio, Servicios, Movimientos y Más. Usar un bloque amarillo oscuro con texto amarillo para la pestaña activa. En escritorio, centrar la wallet en un contenedor de hasta 624 px.
- **Interacción.** Controles principales de al menos 44 px, foco visible y campos de 16 px o más. Etiquetar botones de icono. Anunciar mensajes de error, copia y cambios de estado con texto.

Revisar a **320, 390, 768 y 1440 px**. Comprobar que el saldo cabe, la barra inferior no tapa el último movimiento y los nombres y números se leen al aumentar el zoom.
