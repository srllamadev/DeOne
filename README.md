# DeOne

Wallet web de remesas Bolivia → Colombia. Plan de hackathon para cinco desarrolladores en 12 horas.

## Decisión técnica

**Construir una remesa de extremo a extremo con USDC en Stellar Testnet y ambos tramos fiat simulados.** Lidia confirma un envío en BOB y Martha ve el abono de prueba en COP. El comprobante enlaza al pago en Testnet y separa esa confirmación del abono simulado. Para la demo, usar dos perfiles precargados y un único corredor BOB → COP.

Para mover dinero real, hacen falta un proveedor que cobre BOB y entregue USDC en Stellar y otro que reciba ese USDC y desembolse COP a la beneficiaria. Stellar liquida el tramo USDC. DeOne coordina los tres pasos y muestra su estado.

| Pieza | Qué verificar |
| --- | --- |
| Entrada Bolivia | **alyto** publica conversión BOB ↔ USDC en Stellar, cobros por QR y un anchor con SEP-10/12/24/31. Validar acceso de integrador y que el depósito SEP-24 permita cobrar BOB por el medio elegido, entregar USDC al destino del flujo y consultar su estado. La oferta de su wallet para consumidores y la API del anchor se validan por separado. [alyto](https://alyto.io/) |
| Salida Colombia | **VANK** documenta USDC en Stellar → COP por llave Bre-B, con SEP-6 para API, SEP-24 interactivo y SEP-38 para cotización firme. Publica un sandbox en Stellar Testnet y un mínimo de retiro de **1 USDC**. Confirmar alta comercial, datos de ordenante y beneficiaria, comisiones y confirmación final antes de lanzar. [Guía de integración de VANK](https://vank.co/en/anchor-stellar) |
| Pollar | SDK opcional para login, wallets, firma y rampas. Su README documenta BOB vía Stereum + CCTP bajo Solana. Antes de usarlo como rampa de origen, verificar con `getRampRoutes` y una cotización que el resultado sea **USDC en Stellar**, en la dirección, entorno y monto requeridos. Mantenerlo fuera de la ruta crítica de la demo. [SDK oficial de Pollar](https://github.com/pollar-xyz/pollar) |

**SEP-24** sirve para un depósito o retiro con formulario alojado por el anchor. **SEP-6** expone el flujo por API, con los pasos de usuario que pida el proveedor. **SEP-31** encaja si una entidad de origen y un anchor receptor acuerdan operar la remesa directamente. **SEP-38** cotiza la conversión cuando el proveedor lo admite. Para un piloto automatizado, evaluar cobro confirmado en Bolivia y payout API en Colombia con beneficiaria registrada. [Guía de Stellar sobre rampas y pagos transfronterizos](https://stellar.org/blog/ecosystem/fiat-on-off-ramps-and-cross-border-payments-on-stellar) · [SEP-38](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md)

**Bs 10 es el monto del ejemplo de demo.** En vivo, validar el mínimo de entrada y que el USDC neto después de comisiones cumpla el mínimo de salida. Si la cotización no pasa esos controles, mostrar el mínimo aplicable antes de iniciar el cobro. [Límites de VANK](https://vank.co/en/anchor-stellar)

## Arquitectura del MVP

Un repositorio en TypeScript. **Next.js** con App Router, Tailwind y Route Handlers para la web y la API, **PostgreSQL** para el estado y una tabla de trabajos, y **un worker Node.js** del mismo repo. El worker consume trabajos persistidos y llama a `PayInProvider`, `StellarRail` y `PayOutProvider`. Para el hackathon, desplegar la web y ejecutar el worker como proceso persistente. La demo usa una sesión de prueba con cookie y dos perfiles ficticios. Las rutas resuelven la cuenta activa del lado servidor.

```mermaid
flowchart LR
    A[Lidia y Martha · Web] --> B[API Next.js]
    B --> C[(PostgreSQL)]
    C <--> D[Worker de remesas]
    D --> E[Cobro BOB simulado]
    D --> F[Pago USDC · Stellar Testnet]
    D --> G[Abono COP simulado]
```

### Flujo que debe verse en pantalla

1. Lidia abre **Pago**, elige a Martha por alias y escribe `Bs 10,00`. La cotización de demo muestra **Bs 0,50 de comisión incluida**, **$4.500 COP netos** y su vencimiento. Es una tarifa ficticia de prueba.
2. Lidia confirma. La API reserva Bs 10 del saldo de prueba, crea la remesa y encola el cobro simulado en la misma transacción de base de datos. Al confirmarse el cobro simulado, la reserva se convierte en débito.
3. El worker envía **1,20 USDC de prueba** desde una cuenta de liquidación precargada a una cuenta de destino de prueba. Usar un `Payment` clásico con `@stellar/stellar-sdk` y Horizon Testnet. Preparar ambas cuentas con XLM de Friendbot y trustlines al emisor de USDC de Testnet. Fondear la cuenta de liquidación con USDC de Circle. Guardar el hash y verificar el resultado en la red. [Stellar para desarrolladores](https://developers.stellar.org/) · [USDC en Stellar](https://www.circle.com/multi-chain-usdc/stellar) · [Faucet de Circle](https://faucet.circle.com/)
4. Tras confirmar el pago en Stellar, el adaptador de salida confirma el abono de demo. El worker acredita $4.500 COP en la cuenta ficticia de Martha, registra el movimiento y cierra la remesa en una sola transacción de base de datos. El pago on-chain es verificable en Testnet y el movimiento COP es una anotación de demo. En el piloto con Bre-B, el dinero llega a la cuenta bancaria asociada a la llave y la app refleja el desembolso en el historial.

### Contrato para trabajar en paralelo desde el minuto 45

| Operación | Contrato |
| --- | --- |
| `GET /api/wallet` | Devuelve perfil activo, moneda, saldo disponible de demo y últimos movimientos. |
| `POST /api/quotes` | Recibe `recipientAlias` y `sendAmountMinor`. Devuelve `quoteId`, monto total BOB, comisión incluida, COP netos, `expiresAt` y `mode`. |
| `POST /api/remittances` | Recibe `quoteId` y cabecera `Idempotency-Key`. Devuelve `remittanceId` y `status`. Repetir la misma solicitud devuelve la remesa existente. Cada cotización se consume una vez. |
| `GET /api/remittances/:id` | Devuelve estado, montos, etapas y `txHash` si existe. La UI consulta cada 2–3 segundos durante el envío y actualiza la wallet al completarse. |
| `POST /api/demo/profile` | Cambia entre los dos perfiles ficticios de la sesión de demo. El servidor verifica que el modo demo esté activo. |

**Estados** `AWAITING_PAYIN → PAYIN_CONFIRMED → STELLAR_PENDING → STELLAR_CONFIRMED → PAYOUT_PENDING → COMPLETED`. Agregar `FAILED` para fallos definitivos sin fondos pendientes y `REVIEW_REQUIRED` si hay fondos en tránsito o resultado incierto. Una cotización vencida se rechaza antes de reservar saldo. `COMPLETED` requiere confirmación del adaptador de desembolso, incluso si el hash ya existe.

**Datos mínimos** `demo_accounts`, `quotes`, `remittances`, `wallet_entries` y `jobs`. Registrar hash, referencias de proveedor, estado y marcas de tiempo en la remesa. Usar enteros en unidades menores para fiat, por ejemplo `1000` para Bs 10,00 y `450000` para $4.500 COP con escala 2. Enviar USDC al SDK como string decimal. La sesión y la cotización determinan titular, destinataria y montos en el servidor.

**Reintentos** Usar restricciones únicas para cotización consumida, clave de idempotencia por ordenante y movimiento por remesa y tipo. Reservar o acreditar saldo bajo transacción. El worker procesa un pago Stellar a la vez desde la cuenta de prueba. Persistir el XDR firmado con vencimiento y el hash antes de enviar. Si la respuesta es incierta, consultar el hash y reenviar el mismo XDR mientras sea válido. Si persiste la incertidumbre, enviar a revisión. Liberar una reserva si falla el cobro antes del débito. En el piloto, verificar firmas de webhooks y conciliar por identificador antes de reintentar un pago externo.

**Entornos** `DEMO_MODE=1`, red Testnet y claves de prueba solo en variables de servidor. Cuentas, QR, beneficiarias y datos de identidad ficticios. Si se prueba VANK, confirmar que su sandbox acepta el emisor configurado y usar la cuenta y el memo que devuelva el anchor para esa orden. [Datos de sandbox de VANK](https://vank.co/en/anchor-stellar)

## UI web basada en las capturas

Usar el mismo componente para los dos perfiles, con bandera y formato local `es-BO` o `es-CO`. Paleta aproximada de la referencia. Los importes de las capturas sirven para ilustrar la jerarquía visual y la base de datos de demo controla el saldo mostrado.

| Elemento | Implementación |
| --- | --- |
| Color | Fondo `#0D0D0D`, tarjetas `#151515`, líneas `#3A3A3A`, amarillo `#FFD000`, texto `#F7F7F7`, secundario `#B8B8B8`, abono `#72D654`, débito `#FF5353`. Acompañar el color con signo y texto. |
| Encabezado y saldo | Marca DeOne, nombre, bandera, alias o número de cuenta ficticio copiable. Tarjeta con borde amarillo, saldo grande, botón para ocultarlo y etiqueta persistente **Modo demo**. |
| Acciones | Tres botones amarillos como en las capturas. **Cobro** muestra el alias y permite copiarlo. **Pago** abre la remesa. **Retiro** se muestra deshabilitado con «Próximamente». |
| Actividad | «Últimos movimientos» muestra concepto, fecha, monto y estado. «Ver todos» lleva a **Movimientos**. En el detalle aparecen el comprobante y, cuando existe, el enlace a Stellar Testnet. |
| Navegación | **Inicio · Servicios · Movimientos · Más**. Inicio y Movimientos son funcionales. Más contiene el selector de perfil de demo. Servicios queda como acceso futuro. En móvil, barra inferior. En escritorio, la misma jerarquía en un contenedor centrado con espacio lateral. |

Pantallas imprescindibles `Inicio → Pago → Revisar cotización → Seguimiento/comprobante`, más historial y vista de Martha. Dejar para después el escáner de cámara, QR bancario real, pagos de servicios, retiro manual, registro abierto y corredores adicionales.

## Reparto para cinco desarrolladores

| Responsable | Módulo y propiedad | Entrega comprobable |
| --- | --- | --- |
| **Dev 1 · UI wallet** | `components/wallet` e inicio. Tokens de color, saldo, perfiles, botones, historial, diseño responsive y etiqueta de demo. | A la H4 se ven Lidia y Martha con datos de prueba. A la H8 las vistas leen la API y muestran el abono. |
| **Dev 2 · UI remesa** | `app/pago` y detalle. Alias, monto, cotización, confirmación, seguimiento, errores y comprobante. | A la H4 puede recorrer el flujo con fixtures. A la H8 puede usar la API y abrir el enlace al hash. |
| **Dev 3 · Backend y datos** | `app/api`, `server/remittances` y migraciones. Sesión demo, contrato, cotización, saldo, estados y worker. | A la H4 crea una remesa persistente. A la H7 procesa los tres adaptadores y una confirmación repetida produce un solo movimiento. |
| **Dev 4 · Stellar** | `server/stellar`. Cuentas Testnet, trustlines, faucet, `Payment`, persistencia del XDR y consulta del hash junto con Dev 3. | A la H3 obtiene el primer hash de prueba. A la H7 el worker recupera una confirmación pendiente usando el hash. |
| **Dev 5 · Rampas, integración y demo** | `server/ramps`, datos semilla y despliegue. Implementa cobro y abono simulados, verifica accesos y mínimos de alyto/VANK y coordina QA. | A la H4 entrega adaptadores con éxito y fallo controlado. A la H10 deja un enlace de demo, un guion y una grabación de respaldo. |

### Reloj de trabajo

| Hora | Punto de control |
| --- | --- |
| **H0–H0:45** | Crear el esqueleto y cerrar contrato, fixture de Bs 10, estados y responsables de carpetas. Dev 1 y 2 empiezan con fixtures. Dev 4 fondea cuentas en paralelo. Dev 5 revisa el sandbox sin bloquear al equipo. |
| **H0:45–H4** | Construir módulos en paralelo. Antes de H3 validar el primer pago en Testnet. Si falta acceso o compatibilidad fiat, seguir con ambos adaptadores simulados. Si falta USDC de Circle, probar con un activo propio de Testnet etiquetado como tal y conservar USDC como diseño de producción. |
| **H4–H7** | Unir la API, el worker y los adaptadores. Demostrar desde API el envío con hash, el débito BOB y el abono COP simulado. |
| **H7–H9** | Conectar ambas vistas, probar recarga, cotización vencida, doble confirmación y fallo de payout posterior a Stellar. |
| **H9–H10** | Desplegar y probar desde dos navegadores, revisar móvil y preparar datos frescos para la presentación. |
| **H10–H12** | Congelar funcionalidades, corregir fallos bloqueantes, grabar el recorrido y ensayar el pitch. |

## Criterio de entrega y paso a piloto

- Lidia envía Bs 10,00 de demo y ve el débito, las etapas y el comprobante. Martha ve una sola entrada por $4.500 COP de demo después de confirmar la salida. El hash abre un pago verificable en Stellar Testnet.
- Un doble clic crea una sola remesa. Recargar conserva el estado. Una cotización vencida no debita. Un desembolso fallido tras confirmar en Stellar queda en revisión y no acredita COP.
- Presentación de 60–90 segundos. Mostrar la cotización de Lidia, confirmar, abrir el hash y cambiar a Martha para enseñar el abono simulado. Identificar cada tramo con **Fiat simulado · Stellar Testnet · Fiat simulado**.
- Para habilitar dinero real, verificar contratos y requisitos de KYC/KYB con los proveedores, aprobar el corredor y las condiciones de custodia, confirmar los mínimos y la vigencia de cotizaciones, y probar conciliación, reembolsos y desembolso a una llave Bre-B con los proveedores. Mantener separados los saldos de prueba y el historial de desembolsos bancarios.
