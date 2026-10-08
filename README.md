# Señal: un servicio HTTP original

Demo MIT sin dependencias externas, correo, cuentas, pagos ni base de datos.
Node responde cada petición con el estado del proceso; no es un sitio estático.

## Local

Node **22.23.3**. `npm ci`, `npm run check`, `npm test`, `PORT=8080 npm start`.
Abre `http://localhost:8080`. Escucha en **0.0.0.0**, también accesible desde la red
local si el cortafuegos lo permite. No contiene secretos ni datos personales.

- `/`: HTML generado por el proceso, versión y actividad.
- `/status.json`: estado, identificador de arranque y contador efímero.
- `/healthz`: JSON `status: ok`; `node scripts/healthcheck.mjs` verifica la salud.
- `/service.css`, `/signal.svg`: activos propios.
- Otras URLs, incluso query strings no declaradas: **404**, sin fallback HTML.
- Solo GET/HEAD; otros métodos dan 405. Las pruebas negativas POST son locales.
- SIGTERM/SIGINT deja de aceptar conexiones, termina peticiones activas y sale
  con código 0; deadline de cinco segundos sale con 1 si no termina.

**No hay persistencia:** contador, uptime y bootId se reinician al reiniciar.
Los GET cuentan peticiones, incluidas las sondas; no representan visitantes.
No es monitorización ni SLA. `noindex` corresponde a esta demo, no a un producto.

## Docker

Base oficial Node22.23.3 Alpine fijada por digest multi-arquitectura comprobado
el 2026-10-08. `docker build -t hostbrid-service-demo .`; cuando exista un motor,
`docker run --rm --name hostbrid-service-demo -p 8080:8080 hostbrid-service-demo`.
Usuario no root, comando exec directo Node y HEALTHCHECK local. No volumen.
Un HEALTHCHECK Docker no se convierte automáticamente en probes Kubernetes.

El 2026-10-08 se construyó la imagen OCI con el builder existente y se probó
en un Job temporal contra su digest final: Node 22.23.3, usuario 1000, salud,
uptime, CSS/SVG por hash, rutas 404, SIGTERM y reinicio de memoria. Cero POST.
El motor Docker local siguió cerrado. El Job y referencias temporales se
limpiaron; no se publicó una URL ni se cambió la cuota.

Digest probado: `sha256:d5cb98668b936d50365953a0ee9f7f628c5eb0e5370303562859b33ed85f0953`.
El verificador del Job era PID1: lanzó el servidor como hijo y le envió
SIGTERM. No prueba el rollout ni la entrega de SIGTERM por Kubernetes a un
servidor que sea PID1.

El helper de HEALTHCHECK se ejecutó; no es prueba del estado health de un
Docker daemon ni de sondas Kubernetes. Revalidar la imagen si cambia el código.

## Hostbrid Projects: propuesta pendiente de cuota

Tipo **servicio**, Dockerfile en la raíz, imagen vacía (construir desde Git),
puerto 8080, una réplica, variable pública `PORT=8080`. No usar preset HTML ni
publicar `dist`; no necesita framework estático. Un Job temporal no demuestra
OAuth de cliente, push automático, Ingress público ni un servicio persistente.

**Los servicios requieren un plan con servicios incluidos y cuota libre.**
La cuota de sitios estáticos no incluye procesos permanentes. Revisa el plan
y su precio antes de crear recursos; esta demo no contrata nada ni demuestra
servicios gratuitos. La prueba CI usó infraestructura interna temporal sin
crear Projects, Service, Ingress, PVC, pedidos o suscripciones.
