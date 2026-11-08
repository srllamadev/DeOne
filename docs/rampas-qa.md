# Rampas y QA · H2 y H4

Evidencia del integrante 5, registrada el 8 de noviembre de 2026. Las pruebas de DeOne se ejecutaron por HTTP contra dos instancias locales de la API.

## H2 · Validación de los tramos fiat

| Tramo y candidato | Evidencia pública | Pendiente para integrar |
| --- | --- | --- |
| **Entrada BOB → USDC en Stellar · alyto** | alyto publica conversión BOB ↔ USDC en Stellar y cobros QR en su wallet. Para integradores anuncia SEP-10, SEP-12, SEP-24 y SEP-31. [Sitio de alyto](https://alyto.io/) | Confirmar si el depósito SEP-24 admite BOB por QR para una app externa y entrega USDC a una cuenta Stellar indicada por el integrador. Pedir dominio del anchor, acceso a sandbox, métodos de confirmación, mínimos, comisiones y requisitos de alta. El `stellar.toml` del dominio público consultado respondió HTTP 404. |
| **Salida USDC en Stellar → COP · VANK** | El sandbox respondió HTTP 200 en `stellar.toml`, `/sep6/info` y `/sep38/info`. SEP-6 publica retiro USDC por Bre-B habilitado, con autenticación y mínimo de **1 USDC**. SEP-38 publica COP por Bre-B. [Guía de VANK](https://vank.co/anchor-stellar) · [SEP-6 de sandbox](https://dev-stable-anchor.thisisvank.com/sep6/info) · [SEP-38 de sandbox](https://dev-stable-anchor.thisisvank.com/sep38/info) | Probar un retiro autenticado en Testnet con SEP-10, identidad ficticia vía SEP-12, una llave Bre-B de prueba y una wallet fondeada. Para producción, VANK documenta certificación, registro de dominio y acuerdo de integración. |

**Decisión para la demo.** Mantener ambos tramos fiat simulados. VANK tiene la salida documentada y consultable en sandbox. El acceso de terceros al cobro boliviano, los costos y los mínimos del corredor completo siguen pendientes. Los **Bs 10,00 → $4.500 COP** de H4 provienen de la cotización de prueba de DeOne. Para evaluar Bs 10 en un piloto, pedir una cotización real y comprobar que el USDC disponible para el desembolso cumpla el mínimo de salida después de comisiones.

## H4 · Resultados de la API local

Modo Stellar `simulated`, con una cotización de **Bs 10,00** y comisión incluida de **Bs 0,50** en cada caso. Las referencias son IDs locales de demo.

| `DEMO_PAYOUT_RESULT` | Estado final | Lidia · saldo BOB | Martha · saldo COP | Abonos COP | Referencia local |
| --- | --- | --- | --- | --- | --- |
| `success` | `COMPLETED` | Bs 10.250,80 → Bs 10.240,80 | $2.450.000 → $2.454.500 | 1 de $4.500 | `6c432d47-a3a8-481f-8f72-2228a21bc772` |
| `failed` | `REVIEW_REQUIRED` | Bs 10.250,80 → Bs 10.240,80 | $2.450.000 → $2.450.000 | 0 | `431ed54c-a7f3-403b-bdf4-f3b768e7f433` |

En ambos casos se observaron `AWAITING_PAYIN → STELLAR_PENDING → PAYOUT_PENDING` antes del estado final. Se repitió la confirmación con la misma clave de idempotencia y la API devolvió la misma remesa. Lidia registró un solo débito. En el caso fallido, ese débito queda en revisión porque el cobro simulado ya había ocurrido.

### Repetir la prueba sin frontend

Desde la raíz, instalar dependencias con `npm.cmd ci` si hace falta. En una terminal PowerShell, iniciar un backend local aislado.

```powershell
$env:PORT = "4401"
$env:HOST = "127.0.0.1"
$env:STELLAR_MODE = "simulated"
$env:DEMO_PAYOUT_RESULT = "success"
npm.cmd run dev:backend
```

En otra terminal, desde la raíz, ejecutar el [verificador HTTP](../apps/backend/scripts/qa-ramps.mjs).

```powershell
node apps/backend/scripts/qa-ramps.mjs http://127.0.0.1:4401 success
```

Para repetir el fallo, detener la instancia de prueba, cambiar `DEMO_PAYOUT_RESULT` a `failed`, levantarla de nuevo y pasar `failed` como último argumento. El verificador imprime estados, saldos, conteos e ID. Devuelve un código de error si algo difiere.

### Para integrar con los roles 2 y 3

- **UI remesa.** Mostrar «Requiere revisión» para `REVIEW_REQUIRED`. El monto de la cotización sigue siendo previsto hasta que se confirme el abono. En el modo simulado la remesa no tiene hash de Stellar.
- **Backend.** El cobro confirmado y el abono confirmado son hitos separados. Al integrar un proveedor asíncrono, distinguir la creación de una orden y su confirmación. Mantener el abono de Martha condicionado al resultado confirmado del desembolso.
