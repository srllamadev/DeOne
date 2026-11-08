# Tablero de módulos

Cada persona actualiza las casillas de su módulo y enlaza el PR o la evidencia. Marcar una casilla después de comprobar su criterio. El código de partida ya permite recorrer una remesa simulada de Lidia a Martha. Las casillas abiertas describen el trabajo de integración y entrega.

Crear una rama por módulo desde `main`, con los nombres de abajo. Abrir PR temprano y coordinar cambios a `packages/contracts/src/index.ts` con ambos responsables de UI y backend. En cada PR indicar qué se puede probar, cómo y qué dependencia sigue abierta.

## 1 · UI wallet · `codex/wallet-ui`

**Archivos** [Dashboard](../apps/frontend/src/wallet/dashboard.tsx) · [Navegación](../apps/frontend/src/wallet/bottom-nav.tsx) · [Perfiles](../apps/frontend/src/wallet/profile-picker.tsx) · [CSS](../apps/frontend/src/styles/globals.css)

**Base incluida** Inicio de ambas cuentas, saldo visible u oculto, alias copiable, historial y selector en Más. Retiro y Servicios figuran como funciones futuras.

- [ ] **H4** Comparar Lidia y Martha con las capturas. Validar la paleta y los pesos tipográficos en [la guía visual](estilos.md). Adjuntar una captura móvil por perfil.
- [ ] **H6** Verificar navegación, copia del alias, ocultación del saldo, lectura de importes y foco con teclado. Probar anchos de 320, 390, 768 y 1440 px.
- [ ] **H8** Abrir Movimientos después de recibir y mostrar un solo abono COP. Verificar que el enlace abre el comprobante de esa remesa.

## 2 · UI remesa · `codex/remittance-ui`

**Archivos** [Formulario](../apps/frontend/src/remittances/send-form.tsx) · [Seguimiento](../apps/frontend/src/remittances/receipt.tsx) · [Cliente API](../apps/frontend/src/lib/api.ts)

**Base incluida** Cotización por alias, comisión, confirmación, consulta periódica, estado terminal, referencia y enlace a Stellar cuando existe un hash.

- [ ] **H4** Probar monto con coma y punto, alias incorrecto, salida desde el perfil equivocado y doble clic. El formulario debe comunicar el error y conservar los datos.
- [ ] **H6** Probar cotización vencida y recuperación al volver a cotizar. Verificar que recargar el comprobante mantiene el mismo identificador.
- [ ] **H8** Integrar con el hash de Dev 4. Confirmar que la UI diferencia el pago en Testnet del abono COP simulado y muestra el estado de revisión cuando falla el desembolso.

## 3 · Backend y datos · `codex/remittance-backend`

**Archivos** [Rutas API](../apps/backend/src/index.ts) · [Orquestador](../apps/backend/src/remittances/service.ts) · [Contratos](../packages/contracts/src/index.ts)

**Base incluida** API de demo, cotización por dos minutos, reserva en memoria, débito, idempotencia, cola serial y registro del abono.

- [ ] **H3** Crear migraciones PostgreSQL para cuentas, cotizaciones, remesas, movimientos y trabajos. Mantener importes fiat en enteros con escala 2.
- [ ] **H4** En una transacción, reservar saldo, consumir la cotización y encolar el trabajo. Crear restricciones únicas por cotización consumida, ordenante y clave de idempotencia, y movimiento por remesa y tipo.
- [ ] **H7** Consumir la cola con un worker persistente. Con Dev 4, guardar XDR firmado y hash antes de enviar. Reiniciar entre etapas y demostrar que el envío se recupera sin generar otro pago ni otro abono.
- [ ] **H9** Probar vencimiento, saldo insuficiente, reintento, confirmaciones simultáneas y fallo de salida. Documentar el `DATABASE_URL` en la plantilla al conectar la base.

## 4 · Stellar · `codex/stellar-testnet`

**Archivos** [Puerto de liquidación](../apps/backend/src/stellar/rail.ts) · [Adaptador Testnet](../apps/backend/src/stellar/testnet.ts) · [Plantilla de entorno](../apps/backend/.env.example)

**Base incluida** Adaptador opcional que firma y envía un pago clásico a Horizon Testnet, comunica el hash al orquestador y consulta el hash si el envío devuelve un error.

- [ ] **H2** Preparar dos cuentas de Testnet con XLM, configurar trustlines al emisor de USDC de Testnet y fondear la cuenta de liquidación con USDC de prueba. Guardar la semilla en el entorno del servidor.
- [ ] **H3** Ejecutar la remesa de Bs 10,00 y adjuntar un enlace de Stellar Testnet que muestre 1,20 USDC, emisor y destino esperados.
- [ ] **H7** Con Dev 3, persistir XDR y hash. Probar un resultado incierto, consultar el hash y reenviar solo el mismo XDR si sigue vigente y procede.

## 5 · Rampas, QA y entrega · `codex/ramps-demo`

**Archivos** [Rampas simuladas](../apps/backend/src/ramps/demo.ts) · [Perfiles de demo](../apps/backend/src/wallet/profiles.ts) · [Arranque](../README.md#arranque-del-monorepo)

**Base incluida** Adaptadores de entrada y salida simulados, perfiles de prueba y opción para forzar fallo de abono.

- [x] **H2** Documentar cobertura publicada, sandbox, mínimos y requisitos pendientes. [Validación de candidatos](rampas-qa.md#h2--validación-de-los-tramos-fiat)
- [x] **H4** Demostrar por API un envío con `DEMO_PAYOUT_RESULT=success` y otro con `failed`. El segundo quedó en revisión y el saldo de Martha se mantuvo. [Resultados de la API](rampas-qa.md#h4--resultados-de-la-api-local)
- [ ] **H9** Ejecutar la demo desde móvil y escritorio. Verificar las etapas, los saldos, la persistencia disponible y la etiqueta de cada tramo.
- [ ] **H10** Entregar URL de demo, guion de 60–90 segundos y grabación de respaldo. Preparar una remesa nueva para la presentación.

## Entrega de equipo

1. Abrir la wallet de Lidia y elegir **Pago**. Cotizar Bs 10,00 a `@martha`. Debe mostrar Bs 0,50 de comisión incluida y $4.500 COP de demo.
2. Confirmar, abrir el seguimiento y recargar. La remesa conserva su referencia mientras el backend está levantado. Cuando Dev 4 complete Testnet, abrir el hash.
3. Cambiar a Martha desde **Más**. Comprobar una entrada de $4.500 COP y el saldo actualizado.
4. Mostrar el caso de desembolso fallido en una corrida aparte. La remesa queda en revisión.
