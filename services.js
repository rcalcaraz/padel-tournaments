// Servicio para manejar operaciones con Supabase
class SupabaseService {
  constructor(config) {
    this.supabase = null;
    this.config = config;
    this.init();
  }

  init() {
    try {
      if (this.config.URL === 'TU_SUPABASE_URL_AQUI' || this.config.ANON_KEY === 'TU_SUPABASE_ANON_KEY_AQUI') {
        throw new Error('Por favor configura las credenciales de Supabase');
      }
      this.supabase = window.supabase.createClient(this.config.URL, this.config.ANON_KEY);
      return true;
    } catch (error) {
      console.error('Error inicializando Supabase:', error);
      return false;
    }
  }

  // Métodos para jugadores
  async getJugadores() {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .order('nombre');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo jugadores:', error);
      return { success: false, error: error.message };
    }
  }

  async createJugador(nombre) {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .insert([{ nombre }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error creando jugador:', error);
      return { success: false, error: error.message };
    }
  }

  async updateJugador(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error actualizando jugador:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteJugador(id) {
    try {
      const { error } = await this.supabase
        .from('jugadores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error eliminando jugador:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos para partidos
  async getPartidos() {
    try {
      const { data: partidos, error } = await this.supabase
        .from('partidos')
        .select(`
          *,
          pareja1_jugador1:jugadores!partidos_pareja1_jugador1_id_fkey(id, nombre, rating_elo),
          pareja1_jugador2:jugadores!partidos_pareja1_jugador2_id_fkey(id, nombre, rating_elo),
          pareja2_jugador1:jugadores!partidos_pareja2_jugador1_id_fkey(id, nombre, rating_elo),
          pareja2_jugador2:jugadores!partidos_pareja2_jugador2_id_fkey(id, nombre, rating_elo)
        `)
        .order('fecha_partido', { ascending: false });

      if (error) throw error;
      return partidos;
    } catch (error) {
      console.error('Error obteniendo partidos:', error);
      throw error;
    }
  }

  // Función para calcular el ganador en el frontend (sin usar trigger)
  calcularGanador(datosPartido) {
    let pareja1_sets = 0;
    let pareja2_sets = 0;
    
    // Contar sets ganados por pareja 1
    if (datosPartido.pareja1_set1 > datosPartido.pareja2_set1) pareja1_sets++;
    if (datosPartido.pareja1_set2 > datosPartido.pareja2_set2) pareja1_sets++;
    if (datosPartido.pareja1_set3 > datosPartido.pareja2_set3) pareja1_sets++;
    
    // Contar sets ganados por pareja 2
    if (datosPartido.pareja2_set1 > datosPartido.pareja1_set1) pareja2_sets++;
    if (datosPartido.pareja2_set2 > datosPartido.pareja1_set2) pareja2_sets++;
    if (datosPartido.pareja2_set3 > datosPartido.pareja1_set3) pareja2_sets++;
    
    // Determinar ganador
    if (pareja1_sets > pareja2_sets) {
      return 1;
    } else if (pareja2_sets > pareja1_sets) {
      return 2;
    } else {
      return null; // Empate
    }
  }

  // Función para obtener información detallada del partido para ELO
  obtenerInfoPartido(datosPartido) {
    const sets = EloUtils.countSetsWon(
      datosPartido.pareja1_set1, datosPartido.pareja1_set2, datosPartido.pareja1_set3,
      datosPartido.pareja2_set1, datosPartido.pareja2_set2, datosPartido.pareja2_set3
    );
    
    const ganador = this.calcularGanador(datosPartido);
    
    return {
      ganador,
      setsPareja1: sets.pareja1,
      setsPareja2: sets.pareja2,
      resultFactor: EloUtils.getResultFactor(sets.pareja1, sets.pareja2)
    };
  }

  async createPartido(datosPartido) {
    try {
  
      
      // Validar que todos los jugadores estén seleccionados
      if (!datosPartido.pareja1_jugador1_id || !datosPartido.pareja1_jugador2_id || 
          !datosPartido.pareja2_jugador1_id || !datosPartido.pareja2_jugador2_id) {
        throw new Error('Todos los jugadores deben estar seleccionados');
      }
      
      // Validar que al menos un set tenga puntuación
      const setsConPuntuacion = [
        datosPartido.pareja1_set1, datosPartido.pareja1_set2, datosPartido.pareja1_set3,
        datosPartido.pareja2_set1, datosPartido.pareja2_set2, datosPartido.pareja2_set3
      ].filter(score => score !== null && score !== undefined);
      
      if (setsConPuntuacion.length === 0) {
        throw new Error('Debe haber al menos un set con puntuación');
      }
      
      // Calcular ganador en el frontend para evitar el trigger
      const ganador = this.calcularGanador(datosPartido);

      
      const datosConGanador = {
        ...datosPartido,
        ganador_pareja: ganador,
        fecha_partido: new Date().toISOString()
      };
      

      
      // Insertar el partido con el ganador ya calculado
      const { data, error } = await this.supabase
        .from('partidos')
        .insert([datosConGanador])
        .select('*');

      if (error) {
        console.error('❌ Error en Supabase:', error);
        throw new Error(`Error en la base de datos: ${error.message}`);
      }
      

      
      // Actualizar ELO de los jugadores después de crear el partido
      try {
        await this.getEstadisticasConELO();
  
      } catch (eloError) {
        console.error('⚠️ Error actualizando ELO:', eloError);
        // No fallar la creación del partido si falla la actualización del ELO
      }
      
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('❌ Error creando partido:', error);
      return { success: false, error: error.message };
    }
  }

  async updatePartido(id, updates) {
    try {
      const { data, error } = await this.supabase
        .from('partidos')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error actualizando partido:', error);
      return { success: false, error: error.message };
    }
  }

  async deletePartido(id) {
    try {
      const { error } = await this.supabase
        .from('partidos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error eliminando partido:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos para estadísticas
  async getEstadisticasJugador(jugadorId) {
    try {
      const { data: partidos, error } = await this.supabase
        .from('partidos')
        .select('*')
        .or(`pareja1_jugador1_id.eq.${jugadorId},pareja1_jugador2_id.eq.${jugadorId},pareja2_jugador1_id.eq.${jugadorId},pareja2_jugador2_id.eq.${jugadorId}`);

      if (error) throw error;

      let victorias = 0;
      let derrotas = 0;

      partidos.forEach(partido => {
        const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
        const ganadorPareja = partido.ganador_pareja;

        if (ganadorPareja) {
          if ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2)) {
            victorias++;
          } else {
            derrotas++;
          }
        }
      });

      return { success: true, data: { victorias, derrotas, total: victorias + derrotas } };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { success: false, error: error.message };
    }
  }

  async getEstadisticasGenerales() {
    try {
      const [jugadoresResult, partidos] = await Promise.all([
        this.getJugadores(),
        this.getPartidos()
      ]);

      if (!jugadoresResult.success) {
        throw new Error('Error obteniendo jugadores');
      }

      const estadisticas = await Promise.all(
        jugadoresResult.data.map(async (jugador) => {
          const stats = await this.getEstadisticasJugador(jugador.id);
          return {
            ...jugador,
            estadisticas: stats.success ? stats.data : { victorias: 0, derrotas: 0, total: 0 }
          };
        })
      );

      return { success: true, data: estadisticas };
    } catch (error) {
      console.error('Error obteniendo estadísticas generales:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener estadísticas ordenadas por ELO
  async getEstadisticasPorELO() {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select(`
          *,
          partidos_pareja1_jugador1:partidos!partidos_pareja1_jugador1_id_fkey(id),
          partidos_pareja1_jugador2:partidos!partidos_pareja1_jugador2_id_fkey(id),
          partidos_pareja2_jugador1:partidos!partidos_pareja2_jugador1_id_fkey(id),
          partidos_pareja2_jugador2:partidos!partidos_pareja2_jugador2_id_fkey(id)
        `)
        .order('rating_elo', { ascending: false });

      if (error) throw error;

      // Calcular estadísticas para cada jugador
      const jugadoresConStats = data.map(jugador => {
        const partidos = [
          ...(jugador.partidos_pareja1_jugador1 || []),
          ...(jugador.partidos_pareja1_jugador2 || []),
          ...(jugador.partidos_pareja2_jugador1 || []),
          ...(jugador.partidos_pareja2_jugador2 || [])
        ];

        let victorias = 0;
        let derrotas = 0;

        partidos.forEach(partido => {
          if (!partido.ganador_pareja) return;

          const estaEnPareja1 = partido.pareja1_jugador1_id === jugador.id || partido.pareja1_jugador2_id === jugador.id;
          
          if ((estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2)) {
            victorias++;
          } else {
            derrotas++;
          }
        });

        return {
          ...jugador,
          estadisticas: { victorias, derrotas, total: victorias + derrotas }
        };
      });

      return { success: true, data: jugadoresConStats };
    } catch (error) {
      console.error('Error obteniendo estadísticas por ELO:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos para el sistema ELO
  async getEstadisticasConELO() {
    try {
      const [jugadoresResult, partidos] = await Promise.all([
        this.getJugadores(),
        this.getPartidos()
      ]);

      if (!jugadoresResult.success) {
        throw new Error('Error obteniendo jugadores');
      }

      // Inicializar ratings ELO para todos los jugadores
      const jugadoresConELO = jugadoresResult.data.map(jugador => ({
        ...jugador,
        rating_elo: jugador.rating_elo || EloUtils.INITIAL_RATING,
        estadisticas: { victorias: 0, derrotas: 0, total: 0 }
      }));

      // Calcular solo las estadísticas de partidos (no el ELO)
  
      for (const partido of partidos) {
        if (!partido.ganador_pareja) continue;

        // Obtener jugadores del partido
        const jugador1 = jugadoresConELO.find(j => j.id === partido.pareja1_jugador1_id);
        const jugador2 = jugadoresConELO.find(j => j.id === partido.pareja1_jugador2_id);
        const jugador3 = jugadoresConELO.find(j => j.id === partido.pareja2_jugador1_id);
        const jugador4 = jugadoresConELO.find(j => j.id === partido.pareja2_jugador2_id);

        if (!jugador1 || !jugador2 || !jugador3 || !jugador4) continue;

        // Actualizar estadísticas
        if (partido.ganador_pareja === 1) {
          jugador1.estadisticas.victorias++;
          jugador2.estadisticas.victorias++;
          jugador3.estadisticas.derrotas++;
          jugador4.estadisticas.derrotas++;
        } else {
          jugador1.estadisticas.derrotas++;
          jugador2.estadisticas.derrotas++;
          jugador3.estadisticas.victorias++;
          jugador4.estadisticas.victorias++;
        }

        jugador1.estadisticas.total++;
        jugador2.estadisticas.total++;
        jugador3.estadisticas.total++;
        jugador4.estadisticas.total++;
      }
      


      // Obtener progresión de ELO real desde la base de datos para cada jugador
      for (const jugador of jugadoresConELO) {
        try {
          const progresionResult = await this.getProgresionELOJugador(jugador.id);
          if (progresionResult.success) {
            jugador.progresion_elo = progresionResult.data;

          } else {
            console.warn(`❌ No se pudo obtener progresión para jugador ${jugador.nombre} (ID: ${jugador.id}):`, progresionResult.error);
            jugador.progresion_elo = 0;
          }
        } catch (error) {
          console.error(`❌ Error obteniendo progresión para jugador ${jugador.nombre} (ID: ${jugador.id}):`, error);
          jugador.progresion_elo = 0;
        }
      }

      // No actualizar los ratings ELO en la base de datos - usar los valores existentes

      return { success: true, data: jugadoresConELO };
    } catch (error) {
      console.error('Error obteniendo estadísticas ELO:', error);
      return { success: false, error: error.message };
    }
  }

  // Actualizar rating ELO de un jugador en la base de datos
  async updateJugadorELO(jugadorId, nuevoRating) {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .update({ rating_elo: nuevoRating })
        .eq('id', jugadorId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error actualizando ELO:', error);
      return { success: false, error: error.message };
    }
  }

  // Métodos de utilidad
  isConnected() {
    return this.supabase !== null;
  }

  getClient() {
    return this.supabase;
  }

  // Método para verificar triggers en la tabla partidos
  async checkTableTriggers() {
    try {
      const { data, error } = await this.supabase
        .rpc('get_table_triggers', { table_name: 'partidos' });
      
      if (error) {
        return;
      }
      
    } catch (error) {
      // Error silencioso
    }
  }

  // Método para verificar la estructura de la tabla
  async checkTableStructure() {
    try {
      const { data, error } = await this.supabase
        .from('partidos')
        .select('*')
        .limit(0);
      
      if (error) {
        return;
      }
      
    } catch (error) {
      // Error silencioso
    }
  }

  // Obtener cambios de ELO de un partido desde la base de datos
  async getCambiosELOPartido(partidoId) {
    try {
      // Obtener el historial de ELO para este partido
      const { data: historial, error } = await this.supabase
        .from('historial_elo')
        .select(`
          jugador_id,
          rating_anterior,
          rating_nuevo,
          jugadores!inner(nombre)
        `)
        .eq('partido_id', partidoId);

      if (error) throw error;

      // Convertir a formato de cambios
      const cambios = {};
      historial.forEach(cambio => {
        const diferencia = cambio.rating_nuevo - cambio.rating_anterior;
        cambios[`jugador_${cambio.jugador_id}`] = diferencia;
      });

      return { success: true, data: cambios };
    } catch (error) {
      console.error('Error obteniendo cambios de ELO:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener progresión total de ELO de un jugador desde la base de datos
  async getProgresionELOJugador(jugadorId) {
    try {
      // Obtener todo el historial de ELO del jugador
      const { data: historial, error } = await this.supabase
        .from('historial_elo')
        .select(`
          rating_anterior,
          rating_nuevo,
          partido_id,
          fecha_cambio
        `)
        .eq('jugador_id', jugadorId)
        .order('fecha_cambio', { ascending: true });

      if (error) throw error;

      // Calcular la progresión total sumando todos los cambios
      let progresionTotal = 0;
      historial.forEach(cambio => {
        const diferencia = cambio.rating_nuevo - cambio.rating_anterior;
        progresionTotal += diferencia;
      });

      return { success: true, data: progresionTotal };
    } catch (error) {
      console.error('Error obteniendo progresión de ELO:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener ELO inicial de un jugador calculándolo desde el ELO actual y el histórico
  async getELOInicialJugador(jugadorId) {
    try {
      // Obtener el ELO actual del jugador
      const { data: jugador, error: jugadorError } = await this.supabase
        .from('jugadores')
        .select('rating_elo')
        .eq('id', jugadorId)
        .single();

      if (jugadorError) throw jugadorError;

      const eloActual = jugador.rating_elo || 1200;

      // Obtener todo el historial de ELO del jugador
      const { data: historial, error: historialError } = await this.supabase
        .from('historial_elo')
        .select(`
          rating_anterior,
          rating_nuevo
        `)
        .eq('jugador_id', jugadorId)
        .order('fecha_cambio', { ascending: true });

      if (historialError) throw historialError;

      // Calcular el ELO inicial restando todos los cambios del histórico al ELO actual
      let eloInicial = eloActual;
      historial.forEach(cambio => {
        const diferencia = cambio.rating_nuevo - cambio.rating_anterior;
        eloInicial -= diferencia; // Restamos la diferencia para "deshacer" cada cambio
      });

      return { success: true, data: eloInicial };
    } catch (error) {
      console.error('Error obteniendo ELO inicial:', error);
      return { success: false, error: error.message };
    }
  }

  // Método para verificar todos los triggers de la tabla partidos
  async checkAllTriggers() {
    try {
      // Consulta para obtener información de triggers
      const { data, error } = await this.supabase
        .from('information_schema.triggers')
        .select('*')
        .eq('event_object_table', 'partidos');
      
      if (error) {
        return;
      }
      
    } catch (error) {
      // Error silencioso
    }
  }

  // Métodos para el modal de estadísticas
  async getJugador(jugadorId) {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('id', jugadorId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo jugador:', error);
      return { success: false, error: error.message };
    }
  }

  async getPartidosJugador(jugadorId) {
    try {
      const { data, error } = await this.supabase
        .from('partidos')
        .select(`
          *,
          pareja1_jugador1:jugadores!partidos_pareja1_jugador1_id_fkey(nombre),
          pareja1_jugador2:jugadores!partidos_pareja1_jugador2_id_fkey(nombre),
          pareja2_jugador1:jugadores!partidos_pareja2_jugador1_id_fkey(nombre),
          pareja2_jugador2:jugadores!partidos_pareja2_jugador2_id_fkey(nombre)
        `)
        .or(`pareja1_jugador1_id.eq.${jugadorId},pareja1_jugador2_id.eq.${jugadorId},pareja2_jugador1_id.eq.${jugadorId},pareja2_jugador2_id.eq.${jugadorId}`)
        .order('fecha_partido', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo partidos del jugador:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exportar servicio
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseService;
} 