# Demo de DeOne · H7 a H12

Ensayo local de la rama `feature--fiat-ramps-adapters` con la compilación de producción. Cobro BOB, Stellar y desembolso COP en modo simulado. Los dos perfiles usan datos ficticios y el saldo se reinicia al reiniciar el backend.

## H7 · Arranque del entorno

Ejecutar desde la raíz del monorepo. En Windows, usar PowerShell.

**Terminal 1 · Compilar y levantar la API**

```powershell
npm.cmd ci
$env:BACKEND_URL = "http://127.0.0.1:4407"
npm.cmd run build
$env:HOST = "127.0.0.1"
$env:PORT = "4407"
$env:STELLAR_MODE = "simulated"
$env:DEMO_PAYOUT_RESULT = "success"
npm.cmd run start -w @deone/backend
```

**Terminal 2 · Levantar la web**

```powershell
$env:BACKEND_URL = "http://127.0.0.1:4407"
Set-Location apps/frontend
node ../../node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3411
```

Abrir la [wallet local](http://127.0.0.1:3411/) y consultar [la salud de la API desde la web](http://127.0.0.1:3411/api/health). La respuesta esperada es `{"status":"ok","mode":"demo","stellarMode":"simulated"}`. Para un nuevo ensayo, reiniciar la API y abrir una ventana privada para empezar como Lidia.

## H9 · Criterios del recorrido

1. Abrir la wallet de Lidia y verificar el saldo inicial de **Bs 10.250,80**. Entrar en **Pago** y cotizar **Bs 10,00** para `@martha`.
2. Confirmar que la cotización muestra **Bs 0,50** de comisión incluida y **$4.500 COP** previstos. Enviar y esperar **Remesa completada**.
3. Recargar el comprobante y comprobar que conserva la referencia. El detalle indica **BOB simulado · Stellar simulado · COP simulado**.
4. Abrir **Más → Martha · Colombia**. Verificar saldo de **$2.454.500 COP** y un único movimiento de $4.500 asociado al comprobante.

Para el caso de desembolso fallido, consultar los [resultados y la prueba de H4](rampas-qa.md#h4--resultados-de-la-api-local).

| Ensayo verificado | Referencia local | Resultado |
| --- | --- | --- |
| Chrome móvil · 390 × 844 | `37794aa4-ca5e-47ec-8314-6681626af8e5` | Cotización, recarga y un abono asociado al comprobante. |
| Chrome escritorio · 960 × 960 | `3072effa-d604-4a93-8ce2-a2117da0a98a` | Mismo recorrido, grabado desde el navegador. |

`npm run check`, `npm test` y `npm run build` pasaron. Cada recorrido se ejecutó con una instancia nueva del backend y en ambos el comprobante permaneció disponible tras recargar la página.

## H10 · Guion de presentación · 70 segundos

| Tiempo | Acción en pantalla | Qué decir |
| --- | --- | --- |
| 0–15 s | Inicio de Lidia | «Con DeOne, Lidia puede enviar bolivianos a Martha en Colombia. Cada una ve sus movimientos y su saldo en moneda local.» |
| 15–33 s | **Pago → Ver cotización** | «Lidia selecciona a Martha y envía Bs 10,00. Antes de confirmar, ve la comisión incluida de Bs 0,50 y el importe previsto de $4.500 COP para Martha. Es una cotización de prueba.» |
| 33–52 s | **Confirmar envío → Seguimiento** | «DeOne registra la remesa y sigue las etapas de cobro, liquidación y desembolso. En este ensayo los tres tramos se simulan. La referencia sigue disponible al recargar.» |
| 52–70 s | **Más → Martha · Colombia** | «Martha ve un solo abono simulado de $4.500 COP. Ese movimiento abre el mismo comprobante.» |

Si la versión de presentación se ejecuta con Testnet, indicar «Los tramos fiat son simulados y el pago de USDC se ejecutó en Stellar Testnet» y abrir el explorador solo después de comprobar el resultado de la transacción.

**Respaldo local** `test-results/deone-demo/deone-demo.mp4`. Es una captura de navegador sin audio de 25 segundos y permite mostrar el flujo simulado aunque los servicios estén detenidos.

## H12 · Antes de repetir el ensayo

- Confirmar que la web responde y que `/api/health` muestra el modo esperado.
- Abrir una sesión nueva, ejecutar el recorrido de H9 y comprobar el abono en la vista de Martha.
- Si la demo en vivo se interrumpe, reproducir la captura local siguiendo el mismo guion.

## Pendientes para el entorno compartido

| Responsable | Entrega pendiente |
| --- | --- |
| Integrantes 1 y 2 | Repetir el recorrido en la versión conjunta de la UI. `ui-remesa-v1` está publicada como rama aparte y el ensayo se hizo sobre la rama de rampas. |
| Integrante 3 | Integrar el worker y PostgreSQL, y comprobar que la remesa y sus trabajos sobreviven al reinicio. La rama ensayada usa almacenamiento en memoria. |
| Integrante 4 | Habilitar Testnet con las cuentas fondeadas y aportar un hash verificable. |
| Integrante 5 | Arrancar la versión conjunta en el hosting de la demo, compartir la URL con el equipo y repetir el ensayo desde allí. |
