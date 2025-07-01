// Configuración de Supabase
const SUPABASE_CONFIG = {
  URL: 'https://renhtzglxihiqqvirlui.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbmh0emdseGloaXFxdmlybHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxOTMzMTMsImV4cCI6MjA2MTc2OTMxM30.TIXnK8QjBpml3l9tqeP2f7p6NJVseHQ8ziEVo7RT0Hs'
};

// Configuración de la aplicación
const APP_CONFIG = {
  MAX_SETS: 99,
  MIN_SETS: 0,
  DEFAULT_PLAYER_IMAGE: 'https://via.placeholder.com/128x128/38e078/ffffff?text=J',
  ANIMATION_DURATION: 2000,
  LOADING_TIMEOUT: 10000
};

// Configuración de validación
const VALIDATION_CONFIG = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 4,
  REQUIRED_SETS: 1
};

// Configuración de colores
const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  dark: '#1e293b',
  light: '#f0f4f2',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6'
};

// Configuración de mensajes
const MESSAGES = {
  LOADING: 'Cargando...',
  ERROR_CONFIG: 'Error de configuración: ',
  ERROR_LOADING: 'Error cargando datos: ',
  ERROR_SAVING: 'Error al guardar: ',
  VALIDATION_PLAYERS: 'Por favor selecciona todos los jugadores',
  VALIDATION_DUPLICATES: 'No puede haber jugadores duplicados',
  VALIDATION_SETS: 'Por favor ingresa al menos la puntuación del primer set',
  NO_PLAYERS: 'No hay jugadores registrados aún.',
  NO_MATCHES: 'No hay partidos registrados aún.',
  ADD_PLAYERS: 'Agrega algunos jugadores a tu base de datos de Supabase.',
  PLAY_MATCHES: 'Juega algunos partidos para ver el historial aquí.'
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_CONFIG,
    APP_CONFIG,
    VALIDATION_CONFIG,
    COLORS,
    MESSAGES
  };
} 