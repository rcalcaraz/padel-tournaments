// Sistema de caché global para datos compartidos entre páginas
class DataCache {
  constructor() {
    this.cache = {
      jugadores: null,
      partidos: null,
      estadisticas: null,
      lastUpdated: null,
      isLoading: false,
      lastPartidoId: null, // ID del último partido para verificar cambios
      lastPartidoFecha: null // Fecha del último partido
    };
    
    // Tiempo de vida del caché (30 minutos)
    this.CACHE_LIFETIME = 30 * 60 * 1000;
    
    // Claves para localStorage
    this.STORAGE_KEYS = {
      jugadores: 'padel_cache_jugadores',
      partidos: 'padel_cache_partidos',
      estadisticas: 'padel_cache_estadisticas',
      metadata: 'padel_cache_metadata'
    };
    
    // Cargar datos del localStorage al inicializar
    this.loadFromStorage();
  }

  // Cargar datos del localStorage
  loadFromStorage() {
    try {
      const metadata = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.metadata) || '{}');
      const jugadores = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.jugadores) || 'null');
      const partidos = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.partidos) || 'null');
      const estadisticas = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.estadisticas) || 'null');
      
      if (jugadores && partidos && estadisticas && metadata.lastUpdated) {
        this.cache.jugadores = jugadores;
        this.cache.partidos = partidos;
        this.cache.estadisticas = estadisticas;
        this.cache.lastUpdated = metadata.lastUpdated;
        this.cache.lastPartidoId = metadata.lastPartidoId;
        this.cache.lastPartidoFecha = metadata.lastPartidoFecha;
        
        console.log('📦 Datos cargados desde localStorage:', {
          jugadores: jugadores.length,
          partidos: partidos.length,
          lastUpdated: new Date(metadata.lastUpdated).toLocaleString()
        });
      }
    } catch (error) {
      console.warn('⚠️ Error cargando datos del localStorage:', error);
      this.clearStorage();
    }
  }

  // Guardar datos en localStorage
  saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.jugadores, JSON.stringify(this.cache.jugadores));
      localStorage.setItem(this.STORAGE_KEYS.partidos, JSON.stringify(this.cache.partidos));
      localStorage.setItem(this.STORAGE_KEYS.estadisticas, JSON.stringify(this.cache.estadisticas));
      
      const metadata = {
        lastUpdated: this.cache.lastUpdated,
        lastPartidoId: this.cache.lastPartidoId,
        lastPartidoFecha: this.cache.lastPartidoFecha
      };
      localStorage.setItem(this.STORAGE_KEYS.metadata, JSON.stringify(metadata));
      
      console.log('💾 Datos guardados en localStorage');
    } catch (error) {
      console.warn('⚠️ Error guardando datos en localStorage:', error);
    }
  }

  // Limpiar localStorage
  clearStorage() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🗑️ localStorage limpiado');
    } catch (error) {
      console.warn('⚠️ Error limpiando localStorage:', error);
    }
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

  // Verificar si hay cambios en el servidor
  async checkForChanges(supabaseService) {
    try {
      // Obtener solo el último partido para verificar cambios
      const ultimoPartido = await supabaseService.getUltimoPartido();
      
      if (!ultimoPartido || ultimoPartido.length === 0) {
        console.log('⚠️ No se pudo obtener el último partido del servidor');
        return true; // Forzar recarga si no se puede verificar
      }
      
      const ultimoPartidoServer = ultimoPartido[0];
      const ultimoPartidoLocal = this.cache.partidos ? 
        this.cache.partidos.sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido))[0] : 
        null;
      
      // Si no hay datos locales, hay cambios
      if (!ultimoPartidoLocal) {
        console.log('📥 No hay datos locales, se requiere carga inicial');
        return true;
      }
      
      // Comparar ID y fecha del último partido
      const hayCambios = ultimoPartidoServer.id !== ultimoPartidoLocal.id || 
                        ultimoPartidoServer.fecha_partido !== ultimoPartidoLocal.fecha_partido;
      
      if (hayCambios) {
        console.log('🔄 Se detectaron cambios en el servidor:', {
          servidor: { id: ultimoPartidoServer.id, fecha: ultimoPartidoServer.fecha_partido },
          local: { id: ultimoPartidoLocal.id, fecha: ultimoPartidoLocal.fecha_partido }
        });
      } else {
        console.log('✅ No hay cambios en el servidor, usando datos locales');
      }
      
      return hayCambios;
    } catch (error) {
      console.warn('⚠️ Error verificando cambios, forzando recarga:', error);
      return true; // Forzar recarga si hay error
    }
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

      // Obtener información del último partido
      const ultimoPartido = partidosResult.length > 0 ? 
        partidosResult.sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido))[0] : 
        null;

      // Guardar en caché
      this.setCachedData('estadisticas', estadisticasResult.data);
      this.setCachedData('jugadores', estadisticasResult.data);
      this.setCachedData('partidos', partidosResult);
      
      // Guardar información del último partido
      if (ultimoPartido) {
        this.cache.lastPartidoId = ultimoPartido.id;
        this.cache.lastPartidoFecha = ultimoPartido.fecha_partido;
      }

      // Guardar en localStorage
      this.saveToStorage();

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
    // Si hay datos válidos en caché, devolverlos inmediatamente SIN llamadas al servidor
    if (this.isCacheValid() && this.cache.jugadores) {
      console.log('⚡ Jugadores obtenidos del caché local (sin llamadas al servidor)');
      return this.cache.jugadores;
    }
    
    // Si no hay datos válidos, cargar desde servidor
    console.log('📥 No hay datos en caché, cargando desde servidor...');
    await this.loadAllData(supabaseService);
    return this.cache.jugadores;
  }

  // Obtener partidos
  async getPartidos(supabaseService) {
    // Si hay datos válidos en caché, devolverlos inmediatamente SIN llamadas al servidor
    if (this.isCacheValid() && this.cache.partidos) {
      console.log('⚡ Partidos obtenidos del caché local (sin llamadas al servidor)');
      return this.cache.partidos;
    }
    
    // Si no hay datos válidos, cargar desde servidor
    console.log('📥 No hay datos en caché, cargando desde servidor...');
    await this.loadAllData(supabaseService);
    return this.cache.partidos;
  }

  // Obtener estadísticas
  async getEstadisticas(supabaseService) {
    // Si hay datos válidos en caché, devolverlos inmediatamente SIN llamadas al servidor
    if (this.isCacheValid() && this.cache.estadisticas) {
      console.log('⚡ Estadísticas obtenidas del caché local (sin llamadas al servidor)');
      return this.cache.estadisticas;
    }
    
    // Si no hay datos válidos, cargar desde servidor
    console.log('📥 No hay datos en caché, cargando desde servidor...');
    await this.loadAllData(supabaseService);
    return this.cache.estadisticas;
  }

  // Verificar cambios manualmente (solo cuando se solicite explícitamente)
  async checkForChangesManually(supabaseService) {
    try {
      console.log('🔍 Verificando cambios manualmente...');
      const hayCambios = await this.checkForChanges(supabaseService);
      if (hayCambios) {
        console.log('🔄 Cambios detectados, actualizando caché...');
        await this.loadAllData(supabaseService);
        return true; // Se actualizaron datos
      } else {
        console.log('✅ No hay cambios, datos actualizados');
        return false; // No se actualizaron datos
      }
    } catch (error) {
      console.warn('⚠️ Error verificando cambios manualmente:', error);
      return false;
    }
  }

  // Forzar verificación de cambios y recarga si es necesario
  async forceCheckAndReload(supabaseService) {
    try {
      console.log('🔍 Forzando verificación de cambios...');
      const hayCambios = await this.checkForChanges(supabaseService);
      
      if (hayCambios) {
        console.log('🔄 Cambios detectados, recargando datos...');
        await this.loadAllData(supabaseService);
        return true; // Se recargaron datos
      } else {
        console.log('✅ No hay cambios, usando datos locales');
        return false; // No se recargaron datos
      }
    } catch (error) {
      console.warn('⚠️ Error en verificación forzada:', error);
      return false;
    }
  }

  // Forzar recarga de datos (útil después de cambios importantes)
  async refreshData(supabaseService) {
    console.log('🔄 Forzando recarga de datos...');
    this.cache.lastUpdated = null;
    await this.loadAllData(supabaseService);
  }

  // Refrescar datos después de cambios (más eficiente que recarga completa)
  async refreshAfterChanges(supabaseService) {
    console.log('🔄 Refrescando datos después de cambios...');
    try {
      await this.loadAllData(supabaseService);
      console.log('✅ Datos refrescados correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error refrescando datos:', error);
      return false;
    }
  }

  // Limpiar caché
  clearCache() {
    console.log('🗑️ Limpiando caché...');
    this.cache = {
      jugadores: null,
      partidos: null,
      estadisticas: null,
      lastUpdated: null,
      isLoading: false,
      lastPartidoId: null,
      lastPartidoFecha: null
    };
    this.clearStorage();
  }

  // Forzar recarga de datos (útil después de cambios importantes)
  async forceRefresh(supabaseService) {
    console.log('🔄 Forzando recarga completa de datos...');
    this.clearCache();
    await this.loadAllData(supabaseService);
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
    
    // Verificar si ya hay datos válidos en localStorage
    if (window.dataCache.isCacheValid() && window.dataCache.cache.jugadores && window.dataCache.cache.partidos) {
      console.log('📦 Usando datos del localStorage, sin verificar cambios inicialmente');
      window.dataCacheInitialized = true;
      return window.dataCache;
    }
    
    // Solo cargar desde servidor si no hay datos válidos en localStorage
    console.log('📥 No hay datos válidos en localStorage, cargando desde servidor...');
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
