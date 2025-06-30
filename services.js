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
      const { data, error } = await this.supabase
        .from('partidos')
        .select(`
          *,
          pareja1_jugador1:jugadores!partidos_pareja1_jugador1_id_fkey(nombre),
          pareja1_jugador2:jugadores!partidos_pareja1_jugador2_id_fkey(nombre),
          pareja2_jugador1:jugadores!partidos_pareja2_jugador1_id_fkey(nombre),
          pareja2_jugador2:jugadores!partidos_pareja2_jugador2_id_fkey(nombre)
        `)
        .order('fecha_partido', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo partidos:', error);
      return { success: false, error: error.message };
    }
  }

  async createPartido(datosPartido) {
    try {
      const { data, error } = await this.supabase
        .from('partidos')
        .insert([datosPartido])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error creando partido:', error);
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
      const [jugadoresResult, partidosResult] = await Promise.all([
        this.getJugadores(),
        this.getPartidos()
      ]);

      if (!jugadoresResult.success || !partidosResult.success) {
        throw new Error('Error obteniendo datos para estadísticas');
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

  // Métodos de utilidad
  isConnected() {
    return this.supabase !== null;
  }

  getClient() {
    return this.supabase;
  }
}

// Exportar servicio
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseService;
} 