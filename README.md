# 🎾 Torneos de Pádel - Aplicación Web

Una aplicación web completa para gestionar torneos de pádel con base de datos en Supabase.

## 📁 Estructura del Proyecto

```
padel-tournaments/
├── index.html          # Página principal (Clasificación y formulario)
├── partidos.html       # Página de historial de partidos
├── styles.css          # Estilos CSS centralizados
├── config.js           # Configuración de la aplicación
├── utils.js            # Utilidades y funciones auxiliares
├── services.js         # Servicios para Supabase
├── app.js              # Lógica principal de la aplicación
├── INSTRUCCIONES_SUPABASE.md  # Guía de configuración
└── README.md           # Este archivo
```

## 🚀 Características

### ✅ Funcionalidades Implementadas
- **Gestión de jugadores**: Visualización con estadísticas reales
- **Registro de partidos**: Formulario completo con validación
- **Historial de partidos**: Vista detallada de todos los partidos
- **Estadísticas automáticas**: Cálculo de victorias y derrotas
- **Validación en tiempo real**: Prevenciónde duplicados y errores
- **Interfaz responsive**: Diseño adaptativo para móviles y desktop

### 🎯 Características Técnicas
- **Arquitectura modular**: Código organizado en archivos separados
- **Base de datos real**: Supabase con PostgreSQL
- **Validación robusta**: Frontend y backend
- **UX mejorada**: Feedback visual y estados de carga
- **Código mantenible**: Estructura clara y documentada

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Base de datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS
- **Arquitectura**: Modular con clases ES6

## 📋 Archivos Principales

### `index.html`
- Página principal con Clasificación
- Formulario para registrar partidos
- Navegación entre secciones

### `partidos.html`
- Historial completo de partidos
- Detalles de cada partido jugado
- Estadísticas de ganadores

### `styles.css`
- Estilos centralizados
- Animaciones y transiciones
- Diseño responsive
- Clases utilitarias

### `config.js`
- Configuración de Supabase
- Constantes de la aplicación
- Mensajes del sistema
- Colores y temas

### `utils.js`
- Clases de utilidades:
  - `ValidationUtils`: Validación de datos
  - `DOMUtils`: Manipulación del DOM
  - `DateUtils`: Formateo de fechas
  - `ArrayUtils`: Operaciones con arrays
  - `StringUtils`: Manipulación de strings
  - `EventUtils`: Gestión de eventos
  - `StorageUtils`: LocalStorage

### `services.js`
- Clase `SupabaseService`:
  - CRUD de jugadores
  - CRUD de partidos
  - Cálculo de estadísticas
  - Manejo de errores

### `app.js`
- Clase `PadelApp`:
  - Inicialización de la aplicación
  - Gestión de eventos
  - Validación de formularios
  - Interfaz de usuario

## 🔧 Configuración

### 1. Configurar Supabase
1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ejecutar el SQL de `INSTRUCCIONES_SUPABASE.md`
4. Actualizar credenciales en `config.js`

### 2. Ejecutar la Aplicación
```bash
# Opción 1: Servidor local
python -m http.server 8000

# Opción 2: Live Server (VS Code)
# Instalar extensión Live Server y hacer clic en "Go Live"

# Opción 3: Abrir directamente
# Abrir index.html en el navegador
```

## 📊 Base de Datos

### Tabla `jugadores`
- `id`: Identificador único
- `nombre`: Nombre del jugador
- `created_at`: Fecha de creación

### Tabla `partidos`
- `id`: Identificador único
- `pareja1_jugador1_id`: Jugador 1 de pareja 1
- `pareja1_jugador2_id`: Jugador 2 de pareja 1
- `pareja2_jugador1_id`: Jugador 1 de pareja 2
- `pareja2_jugador2_id`: Jugador 2 de pareja 2
- `pareja1_set1/2/3`: Puntuación pareja 1
- `pareja2_set1/2/3`: Puntuación pareja 2
- `ganador_pareja`: Ganador calculado automáticamente
- `fecha_partido`: Fecha del partido

## 🎨 Estilos y Diseño

### Paleta de Colores
- **Primario**: `#38e078` (Verde)
- **Secundario**: `#648771` (Verde oscuro)
- **Oscuro**: `#111714` (Negro)
- **Claro**: `#f0f4f2` (Gris claro)

### Componentes
- **Tarjetas**: Sombras suaves y hover effects
- **Botones**: Transiciones y estados
- **Formularios**: Validación visual
- **Navegación**: Estados activos/inactivos

## 🔄 Flujo de Trabajo

1. **Cargar jugadores** desde Supabase
2. **Mostrar estadísticas** calculadas automáticamente
3. **Registrar partido** con validación completa
4. **Guardar en base de datos** con confirmación
5. **Actualizar estadísticas** en tiempo real
6. **Ver historial** en página separada

## 🚀 Próximas Mejoras

- [ ] Sistema de autenticación
- [ ] Gestión de torneos
- [ ] Estadísticas avanzadas
- [ ] Exportación de datos
- [ ] Notificaciones push
- [ ] Modo offline

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

---

¡Disfruta organizando tus torneos de pádel! 🎾 