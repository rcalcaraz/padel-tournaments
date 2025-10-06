// Sistema de caché global para datos compartidos entre páginas
class DataCache {
  constructor() {
    this.cache = {
      jugadores: null,
      partidos: null,
      estadisticas: null,
      lastUpdated: null,
      isLoading: false
    };
    
    // Tiempo de vida del caché (5 minutos)
    this.CACHE_LIFETIME = 5 * 60 * 1000;
  }

  // Verificar si el caché es válido
  isCacheValid() {
    if (!this.cache.lastUpdated) return false;
    return (Date.now() - this.cache.lastUpdated) < this.CACHE_LIFETIME;
  }

  // Obtener datos del caché si están disponibles y son válidos
  getCachedData(type) {
    if (this.isCacheValid() && this.cache[type]) {
      console.log(`✅ Datos de ${type} obtenidos del caché`);
      return this.cache[type];
    }
    return null;
  }

  // Guardar datos en el caché
  setCachedData(type, data) {
    this.cache[type] = data;
    this.cache.lastUpdated = Date.now();
    console.log(`💾 Datos de ${type} guardados en caché`);
  }

  // Cargar todos los datos necesarios en paralelo
  async loadAllData(supabaseService) {
    // Si ya se están cargando datos, esperar a que termine
    if (this.cache.isLoading) {
      console.log('⏳ Esperando a que terminen las cargas en curso...');
      while (this.cache.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Si el caché es válido, no cargar nada
    if (this.isCacheValid() && this.cache.jugadores && this.cache.partidos) {
      console.log('✅ Todos los datos ya están en caché');
      return;
    }

    this.cache.isLoading = true;
    console.log('🚀 Iniciando carga paralela de datos...');

    try {
      const startTime = Date.now();
      
      // Cargar datos en paralelo
      const [estadisticasResult, partidosResult] = await Promise.all([
        supabaseService.getEstadisticasConELO(),
        supabaseService.getPartidos()
      ]);

      const loadTime = Date.now() - startTime;
      console.log(`⚡ Datos cargados en paralelo en ${loadTime}ms`);

      // Verificar resultados
      if (!estadisticasResult.success) {
        throw new Error(`Error cargando estadísticas: ${estadisticasResult.error}`);
      }

      // Guardar en caché
      this.setCachedData('estadisticas', estadisticasResult.data);
      this.setCachedData('jugadores', estadisticasResult.data);
      this.setCachedData('partidos', partidosResult);

      console.log(`✅ Caché actualizado: ${estadisticasResult.data.length} jugadores, ${partidosResult.length} partidos`);
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      throw error;
    } finally {
      this.cache.isLoading = false;
    }
  }

  // Obtener jugadores (con estadísticas ELO)
  async getJugadores(supabaseService) {
    let jugadores = this.getCachedData('jugadores');
    
    if (!jugadores) {
      await this.loadAllData(supabaseService);
      jugadores = this.cache.jugadores;
    }
    
    return jugadores;
  }

  // Obtener partidos
  async getPartidos(supabaseService) {
    let partidos = this.getCachedData('partidos');
    
    if (!partidos) {
      await this.loadAllData(supabaseService);
      partidos = this.cache.partidos;
    }
    
    return partidos;
  }

  // Obtener estadísticas
  async getEstadisticas(supabaseService) {
    let estadisticas = this.getCachedData('estadisticas');
    
    if (!estadisticas) {
      await this.loadAllData(supabaseService);
      estadisticas = this.cache.estadisticas;
    }
    
    return estadisticas;
  }

  // Forzar recarga de datos
  async refreshData(supabaseService) {
    console.log('🔄 Forzando recarga de datos...');
    this.cache.lastUpdated = null;
    await this.loadAllData(supabaseService);
  }

  // Limpiar caché
  clearCache() {
    console.log('🗑️ Limpiando caché...');
    this.cache = {
      jugadores: null,
      partidos: null,
      estadisticas: null,
      lastUpdated: null,
      isLoading: false
    };
  }

  // Obtener información del caché
  getCacheInfo() {
    return {
      hasJugadores: !!this.cache.jugadores,
      hasPartidos: !!this.cache.partidos,
      hasEstadisticas: !!this.cache.estadisticas,
      lastUpdated: this.cache.lastUpdated,
      isValid: this.isCacheValid(),
      isLoading: this.cache.isLoading
    };
  }
}

// Crear instancia global del caché
window.dataCache = new DataCache();

// Hacer disponible globalmente
window.DataCache = DataCache;

// Función para inicializar el caché global automáticamente
window.initializeDataCache = async function(supabaseService) {
  if (!window.dataCacheInitialized) {
    console.log('🚀 Inicializando caché global...');
    try {
      await window.dataCache.loadAllData(supabaseService);
      window.dataCacheInitialized = true;
      console.log('✅ Caché global inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando caché global:', error);
      throw error;
    }
  }
  return window.dataCache;
};
