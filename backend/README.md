# Backend de Referencia - Network QoS Monitor

Servicio de referencia para medición de Throughput (bajada/subida) y sondas de Latencia (RTT / Jitter). Cumple con los requerimientos de la sección **04.2** y **RF-03** del Trabajo Práctico.

## 🚀 Características
- **HTTP Download Test (`GET /api/download?sizeMb=N`)**: Stream de bytes binarios directos sin compresión ni caché (`no-store`, `no-cache`), con cálculo de encabezados para evaluación precisa de Mbps.
- **HTTP Upload Test (`POST /api/upload`)**: Recepción de stream binario directo en tiempo real, registrando bytes recibidos, duración a nivel nanosegundo (`process.hrtime.bigint`) y cálculo de Mbps del lado servidor.
- **HTTP Ping Test (`GET /api/ping`)**: Endpoint liviano para pruebas de latencia HTTP.
- **TCP Echo Server (`Port 5050`)**: Servidor socket TCP raw para sondas directas de RTT y Jitter con `react-native-tcp-socket` sin overhead de HTTP.
- **Health Check (`GET /api/health`)**: Estado del servicio, uptime y métricas de servidor.
- **Contenerización**: Listo para correr con Docker y Docker Compose.

---

## 🛠️ Instalación y Ejecución Local

### Requisitos
- Node.js >= 18
- npm

### Pasos
```bash
# 1. Instalar dependencias
npm install

# 2. Modo desarrollo (recarga en vivo)
npm run dev

# 3. Compilación y producción
npm run build
npm start
```

El servidor estará escuchando en:
- HTTP: `http://localhost:3000`
- TCP Echo: `tcp://localhost:5050`

---

## 🐳 Ejecución con Docker

```bash
# Construir y levantar contenedor
docker compose up --build -d

# Ver logs
docker compose logs -f

# Detener contenedor
docker compose down
```

---

## 📡 Documentación de Endpoints

### 1. `GET /api/health`
Retorna el estado del servicio.
**Respuesta:**
```json
{
  "status": "ok",
  "service": "Network QoS Reference Backend",
  "timestamp": 1727800000000,
  "uptimeSeconds": 42
}
```

### 2. `GET /api/ping`
Respuesta instantánea con timestamp para medir RTT en capa de aplicación.
**Respuesta:**
```json
{
  "pong": true,
  "serverTimestamp": 1727800000120
}
```

### 3. `GET /api/download`
Parámetros query opcionales:
- `sizeMb` (número, ej: `5`, `10`, `25`. Por defecto: `5`).
- `bytes` (número exacto de bytes).

Retorna un payload de bytes aleatorios/dummy con cabeceras `Content-Length` y `Cache-Control: no-store`.

### 4. `POST /api/upload`
Envía un cuerpo binario (`application/octet-stream` o multipart).
**Respuesta:**
```json
{
  "success": true,
  "receivedBytes": 5242880,
  "durationMs": 142.5,
  "serverThroughputMbps": 294.33,
  "timestamp": 1727800000500
}
```

### 5. `TCP Socket (Puerto 5050)`
Acepta conexiones TCP. Cada paquete enviado es devuelto inmediatamente (Echo) al cliente para medición de RTT por socket.
