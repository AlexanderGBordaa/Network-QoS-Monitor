# Network QoS Monitor - Analizador y Visualizador de Calidad de Red Móvil

> **Licenciatura en Sistemas de Información - Programación Móvil (2026)**  
> **Trabajo Práctico 05:** Analizador y visualizador de calidad de red móvil en tiempo real con mapeo de cobertura personal.  
> **Área temática:** Redes de Datos, Telecomunicaciones y Telecomunicaciones Satelitales.  
> **Tecnología:** React Native CLI (TypeScript) + Kotlin Native Module + Node.js/Express Backend.

---

## 📱 Descripción del Proyecto

**Network QoS Monitor** es una solución móvil integral multiplataforma diseñada para medir, auditar, almacenar y visualizar en tiempo real la Calidad de Servicio (**QoS**) y Calidad de Experiencia (**QoE**) de conexiones móviles y WiFi.

La aplicación opera por debajo de las capas convencionales de abstracción de React Native mediante un **módulo nativo en Kotlin** (`TelephonyManager` / `TelephonyCallback` / `CellSignalStrength`) para extraer métricas de radiofrecuencia (RSSI, RSRP, RSRQ, SINR, operador, tecnología 2G/3G/4G/5G NR), orquesta sondas de latencia mediante **sockets TCP crudos**, ejecuta tests de throughput (bajada/subida) contra un backend de referencia dedicado, georreferencia cada muestra con GPS y proyecta un **mapa de calor (Heatmap)** interactivo de cobertura.

---

## 🏛️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Capa de Presentación                            │
│  • Dashboard en tiempo real (Métricas RF, tipo de red, señal dBm)     │
│  • Speedometer Gauge & Sondas de Latencia Multi-Host                   │
│  • Mapa de Calor (Heatmap de Cobertura con react-native-maps)          │
│  • Series Temporales (Latencia RTT & Throughput con SVG)               │
│  • Historial navegable con filtros y exportador CSV / JSON             │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Store Reactivo (Zustand)                           │
│  • useQoSStore: Estado global desacoplado del hilo principal           │
└────────────────────────────────────────────────────────────────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Motor Sondas  │           │ Persistencia  │           │  Geo Layer    │
│ & Throughput  │           │ SQLite Local  │           │  & Background │
│ (TCP Sockets, │           │ (Consultas    │           │ (GPS, Alertas │
│ HTTP Streams) │           │ por zona/red) │           │ Degradación)  │
└───────────────┘           └───────────────┘           └───────────────┘
        │                                                       │
        ▼                                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Native Bridge (Kotlin / Android)                       │
│  • TelephonyQoSModule: TelephonyManager, SignalStrength, CellInfo      │
│  • Emisión de eventos reactivos onSignalStrengthChanged                │
└────────────────────────────────────────────────────────────────────────┘
                                    │ (HTTP / TCP)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Backend de Referencia (Node.js)                       │
│  • GET /api/download (Stream binario sin caché)                       │
│  • POST /api/upload (Cálculo de throughput con nanosegundos)           │
│  • TCP Echo Server (Puerto 5050 para sondas RTT socket directas)      │
│  • Contenedor Docker listo para despliegue                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Cumplimiento de Requisitos Funcionales

| ID | Requisito | Estado | Implementación / Archivos |
| :--- | :--- | :---: | :--- |
| **RF-01** | Detectar y mostrar tipo de red activa y operador | ✅ | `TelephonyQoSModule.kt`, `networkDetector.ts`, `MetricsCard.tsx` |
| **RF-02** | Medir RTT (ping) contra al menos 3 hosts configurables (min/avg/max/jitter) | ✅ | `pingEngine.ts` (TCP Sockets, Jitter RFC 3550), `PingProbeCard.tsx` |
| **RF-03** | Test de descarga y subida con cálculo de throughput en Mbps | ✅ | `throughputEngine.ts`, `server.ts` (Backend), `SpeedTestGauge.tsx` |
| **RF-04** | Registrar cada medición con timestamp y coordenadas GPS | ✅ | `locationService.ts`, `database.ts`, `useQoSStore.ts` |
| **RF-05** | Visualizar historial en mapa con Heatmap de intensidad/calidad | ✅ | `react-native-maps` (`Heatmap` y `Marker`), `SignalHeatmap.tsx`, `CoverageMapScreen.tsx` |
| **RF-06** | Graficar series temporales de latencia y throughput por sesión | ✅ | `ChartsView.tsx` (curvas SVG multivariable), `HistoryScreen.tsx` |
| **RF-07** | Muestreos periódicos en background y notificación de degradación | ✅ | `backgroundService.ts`, `notificationService.ts` (`@notifee/react-native`) |
| **RF-08** | Exportar historial de mediciones a CSV y JSON | ✅ | `exportService.ts`, `HistoryScreen.tsx` (Share API) |
| **RF-09** | Filtrar historial por tipo de red, fechas y zona geográfica | ✅ | `database.ts` (`getFilteredMeasurements`), chips interactivos en UI |

---

## 📁 Estructura del Repositorio

```
TP 5 Network QoS Monitor/
├── backend/                        # Backend de referencia para pruebas de Throughput
│   ├── src/
│   │   └── server.ts               # Servidor Express + TCP Echo Server
│   ├── test/
│   │   └── server.test.mjs         # Pruebas automatizadas de endpoints
│   ├── Dockerfile                  # Empaquetado en contenedor Docker
│   ├── docker-compose.yml          # Orquestación de contenedores
│   ├── package.json
│   └── README.md
│
└── mobile/                         # Aplicación React Native CLI
    ├── android/
    │   └── app/src/main/
    │       ├── AndroidManifest.xml # Permisos de red, telefonía, ubicación y foreground
    │       └── java/com/networkqosmonitor/
    │           ├── MainActivity.kt
    │           ├── MainApplication.kt
    │           └── telephony/
    │               ├── TelephonyQoSModule.kt   # Módulo nativo en Kotlin
    │               └── TelephonyQoSPackage.kt  # ReactPackage registration
    ├── src/
    │   ├── native/
    │   │   └── TelephonyQoS.ts     # Bridge tipado TypeScript al módulo nativo
    │   ├── services/
    │   │   ├── networkDetector.ts  # Fusión de NetInfo + TelephonyQoS
    │   │   ├── pingEngine.ts       # Sondas TCP, latencia RTT y Jitter RFC 3550
    │   │   ├── throughputEngine.ts # Pruebas de bajada y subida en Mbps
    │   │   ├── locationService.ts  # Adquisición de GPS y precisión
    │   │   ├── database.ts         # Persistencia SQLite con soporte de filtros
    │   │   ├── backgroundService.ts# Muestreo periódico y análisis de degradación
    │   │   ├── notificationService.ts # Alertas locales Notifee
    │   │   └── exportService.ts    # Exportación CSV y JSON
    │   ├── store/
    │   │   └── useQoSStore.ts      # Store reactivo Zustand
    │   ├── components/
    │   │   ├── MetricsCard.tsx     # Tarjeta de tecnología celular y señal dBm
    │   │   ├── PingProbeCard.tsx   # Panel de latencia multi-host
    │   │   ├── SpeedTestGauge.tsx  # Tacómetro de velocidad y progreso
    │   │   ├── SignalHeatmap.tsx   # Mapa de calor y marcadores de QoS
    │   │   └── ChartsView.tsx      # Gráficos SVG de series temporales
    │   └── screens/
    │       ├── DashboardScreen.tsx # Pantalla principal y diagnóstico rápido
    │       ├── SpeedTestScreen.tsx # Ejecutor de throughput y sondas
    │       ├── CoverageMapScreen.tsx # Mapa interactivo con filtros
    │       ├── HistoryScreen.tsx   # Historial navegable y exportador
    │       └── SettingsScreen.tsx  # Configuración de backend y hosts de ping
    ├── App.tsx                     # Navegación y arranque del sistema
    └── package.json
```

---

## 🚀 Guía de Instalación y Ejecución

### 1. Iniciar el Backend de Referencia

El backend provee los endpoints de descarga y subida calibrados para la prueba de velocidad:

```bash
cd backend
npm install
npm run build
npm start
```
*El servidor iniciará en `http://localhost:3000` (HTTP) y puerto `5050` (TCP Echo).*

#### O ejecutar con Docker:
```bash
cd backend
docker compose up --build -d
```

Para verificar que el backend funciona correctamente, corre el suite de tests:
```bash
npm test
```

---

### 2. Iniciar la Aplicación Móvil (Android)

> **Nota para emuladores Android:** Por defecto la app se comunica con el backend mediante `http://10.0.2.2:3000` (la dirección de loopback del host en el emulador de Android). Si pruebas en un dispositivo físico conectado a la misma red WiFi, configura la IP de tu computadora en la pestaña **Ajustes** de la app.

```bash
cd mobile

# 1. Instalar dependencias
npm install --legacy-peer-deps

# 2. Iniciar el empaquetador Metro
npm start

# 3. En otra terminal, compilar e instalar en Android
npm run android
```

---

## 🔬 Metodología de Medición Técnica

### 1. Cálculo de Latencia (RTT) y Jitter (RFC 3550)
- Las sondas abren conexiones directas sobre sockets TCP hacia los hosts objetivo (Google DNS `8.8.8.8:53`, Cloudflare `1.1.1.1:53` y Backend de Referencia `10.0.2.2:5050`).
- Se cronometra el RTT de cada paquete.
- El **Jitter** se calcula siguiendo el estándar **RFC 3550**:
  $$\text{Jitter} = \frac{1}{N-1} \sum_{i=1}^{N-1} |\text{RTT}_{i+1} - \text{RTT}_i|$$
- Se calcula además el porcentaje de pérdida de paquetes (\% packet loss).

### 2. Medición de Throughput (Mbps)
- **Descarga:** Se solicita un payload binario sin compresión ni almacenamiento en caché (`Cache-Control: no-store`) con longitud conocida. Se muestrea el flujo de bytes transmitidos y se computa:
  $$\text{Throughput (Mbps)} = \frac{\text{Bytes} \times 8}{\text{Tiempo transcurrido (segundos)} \times 10^6}$$
- **Subida:** Se genera un buffer en memoria (`Uint8Array`) y se transmite vía `POST /api/upload` monitoreando los eventos `xhr.upload.onprogress`.

### 3. Criterios de Alerta por Degradación de Calidad (RF-07)
El servicio en segundo plano emite una alerta si detecta:
- Pérdida de paquetes $\ge 40\%$
- Latencia promedio $> 350\text{ ms}$
- Jitter $> 100\text{ ms}$
- Nivel de señal móvil $<-115\text{ dBm}$

---

## 📄 Licencia y Créditos
Desarrollado para la cátedra de **Programación Móvil (2026)** - Licenciatura en Sistemas de Información.
