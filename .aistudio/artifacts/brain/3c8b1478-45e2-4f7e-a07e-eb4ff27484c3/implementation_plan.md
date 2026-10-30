# Agente de Estudio y Resumen Semanal (Motor Ollama)

Implementación de un agente estático ubicado junto al título "Erick's Planner" en la barra superior, con un modal espacioso centrado sobre el calendario para analizar notas académicas y actividades semanales, extrayendo resúmenes, hitos completados y temas pendientes de estudio, con un entorno preparado y proxy Express hacia la API de Ollama (sin Gemini).

## Decisiones Críticas y Confirmadas por el Usuario

> [!IMPORTANT]
> Se han incorporado las respuestas del usuario sobre la arquitectura y la experiencia:
> - **Conexión de Ollama**: Proxy backend Express (`/api/ollama/*`) para evitar bloqueos CORS del navegador y gestionar peticiones locales (`http://localhost:11434` o remoto).
> - **Formato Visual**: Modal amplio centrado sobre el calendario, integrado con la estética minimalista oscura de la aplicación.
> - **Modelo y Credenciales**: Interfaz y entorno preparados con campos de configuración (URL base, modelo y campo opcional para API Key / token de autorización que el usuario proporcionará posteriormente). No se utiliza la API de Gemini bajo ninguna circunstancia.

## 1. Visión General y Concepto Central

- **Propósito**: Permitir que el usuario obtenga una visión sintetizada y accionable de su semana académica: qué temas ha anotado en sus cuadernos de cuatrimestre, qué compromisos o clases tuvo en el calendario semanal, y qué temas clave debe repasar y estudiar.
- **Diferenciador UX**: No es un botón flotante tipo chatbot intrusivo; es un agente accesible de forma permanente y limpia junto a la marca "Erick's Planner" en el encabezado.
- **Flexibilidad de Motor**: Preparado para ejecutarse contra modelos locales vía Ollama (ej. Llama 3.2, Mistral, Qwen, DeepSeek), con diagnóstico de conexión, selector de modelo y soporte para claves o endpoints personalizados.

## 2. Experiencia de Usuario y Diseño Visual

### Flujo de Interacción
1. **Acceso**: En la esquina superior izquierda, justo al lado de "Erick's Planner", se ubica el botón/icono estático del Agente (icono `Bot` sobrio, sin animaciones ni colores estridentes).
2. **Apertura**: Al pulsar el icono, se despliega con animación suave un **modal amplio centrado** con fondo oscuro zinc-950/90, borde sutil zinc-800 y backdrop difuminado.
3. **Pestañas de Navegación del Agente**:
   - **Resumen Semanal**:
     - *Hitos y Actividades Realizadas*: Eventos del calendario de la semana activa y notas redactadas recientemente.
     - *Contenido de Notas por Materia*: Síntesis estructurada por cuatrimestre y asignatura.
     - *Guía de Estudio y Pendientes*: Detección de conceptos clave para repasar, tareas o lecturas pendientes.
   - **Configuración de Ollama**:
     - Endpoint Base (por defecto `http://localhost:11434`).
     - Nombre de Modelo (campo de texto editable con sugerencias rápidas: `llama3.2`, `mistral`, `deepseek-r1`, `qwen2.5`).
     - Clave de API / Token de Portador (opcional para proxies o túneles protegidos).
     - Botón "Probar Conexión" con indicador de estado (Conectado / Desconectado / Verificando).
4. **Acción de Generación**:
   - Botón *"Generar Resumen con Ollama"*.
   - El agente compila el contexto actual (eventos de la semana + notas académicas vigentes) y solicita el resumen estructurado a Ollama.
   - Si Ollama no está en ejecución, muestra un estado claro con instrucciones de inicio (`ollama serve`) y una vista previa contextual construida a partir de las notas existentes para que la interfaz sea 100% interactiva de inmediato.

### Estilo Visual (SaaS Dashboard & Anti-Slop)
- Paleta neutra zinc oscura (`zinc-950`, `zinc-900`, `zinc-800`) alineada con la tipografía `Plus Jakarta Sans` y datos tabulares en `JetBrains Mono`.
- Cero píldoras decorativas o badges de colores aleatorios; jerarquía tipográfica limpia con divisores milimétricos.
- Números y fechas con `tabular-nums` para alineación visual exacta.

## 3. Decisiones de Producto y Arquitectura Técnica

- **Express Full-Stack Server**:
  - Para soportar el proxy backend solicitado por el usuario y evitar bloqueos por CORS al conectar con `http://localhost:11434`, se configura `server.ts` con Express montando `vite.middlewares` en desarrollo (`"dev": "tsx server.ts"`).
  - Rutas de proxy:
    - `GET /api/ollama/status`: Verifica la disponibilidad de la instancia Ollama y devuelve la lista de modelos instalados (`/api/tags`).
    - `POST /api/ollama/generate`: Recibe el prompt contextual y el modelo, y transmite la respuesta hacia el cliente.
- **Almacenamiento Local de Preferencias del Agente**:
  - La URL del servidor Ollama, el modelo elegido y la API Key opcional se guardan en `localStorage` mediante un hook reactivo dedicado (`useAgentSettings`).

## 4. Diagrama de Arquitectura y Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                       TopBar Header                         │
│  [Calendar] Erick's Planner   [Bot Agente]                  │
└──────────────────────────────────────┬──────────────────────┘
                                       │ Click
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 AgentModal (Modal Amplio)                   │
│ ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│ │  Pestaña Resumen Semanal    │ │  Configuración Ollama   │ │
│ │  • Qué hice esta semana     │ │  • URL Base             │ │
│ │  • Notas redactadas         │ │  • Modelo               │ │
│ │  • Temas que debo estudiar  │ │  • API Key / Token      │ │
│ │  [Generar Resumen]          │ │  [Probar Conexión]      │ │
│ └──────────────┬──────────────┘ └────────────┬────────────┘ │
└────────────────┼─────────────────────────────┼──────────────┘
                 │                             │
                 ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│           Proxy Express Backend (/api/ollama/*)             │
│   • Evita problemas de CORS desde el navegador              │
│   • Reenvía peticiones a Ollama local / remoto              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Instancia de Ollama (Local)                 │
│                 http://localhost:11434                      │
└─────────────────────────────────────────────────────────────┘
```

## Plan de Ejecución tras Aprobación

1. **Configuración de Servidor Express (`server.ts`)**:
   - Crear `server.ts` con Express y Vite dev middleware en puerto 3000.
   - Implementar endpoints `/api/ollama/status` y `/api/ollama/generate` con timeout seguro y manejo de errores.
   - Actualizar script `"dev"` en `package.json` a `"tsx server.ts"`.
2. **Hook y Utilidades del Agente (`src/hooks/useAgent.ts`)**:
   - Extracción de contexto de notas y eventos de la semana seleccionada.
   - Persistencia de configuración de Ollama (URL, modelo, clave).
   - Manejo de estados: `idle`, `connecting`, `generating`, `ready`, `error`.
3. **Componente `AgentModal.tsx`**:
   - Modal amplio centrado con animación fluida.
   - Vistas: Análisis semanal (actividades, notas, temas de estudio) y Ajustes de conexión con probador de ping.
4. **Integración en `TopBar.tsx` y `App.tsx`**:
   - Añadir el icono estático de Agente junto a "Erick's Planner".
   - Conectar estado del modal y sincronizar notas y calendario.
5. **Verificación**:
   - Comprobación de compilación TypeScript (`compile_applet`) y prueba de respuesta de los endpoints.
