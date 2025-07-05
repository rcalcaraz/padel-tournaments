// Script para recalcular ELO en Supabase
// Ejecutar este script en la consola del navegador cuando sea necesario

class EloRecalculator {
  constructor(supabaseService) {
    this.supabaseService = supabaseService;
  }

  // Recalcular ELO de todos los partidos existentes
  async recalcularTodoELO() {
    try {
    
      
      // Ejecutar la función SQL de recálculo
      const { data, error } = await this.supabaseService.supabase.rpc('recalcular_elo_partidos_existentes');
      
      if (error) {
        console.error('❌ Error en recálculo:', error);
        throw error;
      }
      

      
      // Recargar la página para mostrar los nuevos valores
      setTimeout(() => {
  
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error durante el recálculo:', error);
      alert('Error durante el recálculo: ' + error.message);
    }
  }

  // Verificar el estado actual del ELO
  async verificarEstadoELO() {
    try {
    
      
      // Obtener jugadores con sus ratings
      const { data: jugadores, error: jugadoresError } = await this.supabaseService.supabase
        .from('jugadores')
        .select('id, nombre, rating_elo')
        .order('rating_elo', { ascending: false });
      
      if (jugadoresError) throw jugadoresError;
      

      
      // Obtener historial reciente
      const { data: historial, error: historialError } = await this.supabaseService.supabase
        .from('historial_elo')
        .select(`
          jugador_id,
          rating_anterior,
          rating_nuevo,
          partido_id,
          fecha_cambio,
          jugadores!inner(nombre)
        `)
        .order('fecha_cambio', { ascending: false })
        .limit(10);
      
      if (historialError) throw historialError;
      

      
    } catch (error) {
      console.error('❌ Error verificando estado:', error);
    }
  }

  // Recalcular ELO de un partido específico
  async recalcularPartidoELO(partidoId) {
    try {

      
      const { data, error } = await this.supabaseService.supabase.rpc('recalcular_elo_partido', {
        partido_id_param: partidoId
      });
      
      if (error) {
        console.error('❌ Error recalculando partido:', error);
        throw error;
      }
      

      
    } catch (error) {
      console.error('❌ Error durante el recálculo del partido:', error);
    }
  }

  // Verificar triggers de la tabla partidos
  async verificarTriggers() {
    try {
      console.log('🔍 Verificando triggers de la tabla partidos...');
      
      // Intentar obtener información de triggers (esto puede no funcionar en Supabase)
      const { data, error } = await this.supabaseService.supabase
        .from('information_schema.triggers')
        .select('*')
        .eq('event_object_table', 'partidos');
      
      if (error) {
        console.log('⚠️ No se pudieron verificar triggers (normal en Supabase):', error);
        return;
      }
      
      console.log('📋 Triggers encontrados:', data);
      
    } catch (error) {
      console.log('⚠️ Error verificando triggers:', error);
    }
  }
}

// Función global para usar desde la consola
window.recalcularELO = async () => {
  if (!window.supabaseService) {
    console.error('❌ SupabaseService no está disponible');
    return;
  }
  
  const recalculator = new EloRecalculator(window.supabaseService);
  
  // Verificar estado actual
  await recalculator.verificarEstadoELO();
  
  // Preguntar si quiere proceder
  const proceder = confirm('¿Deseas proceder con el recálculo completo de ELO? Esto puede tomar varios minutos.');
  
  if (proceder) {
    await recalculator.recalcularTodoELO();
  }
};

// Función para verificar estado
window.verificarEstadoELO = async () => {
  if (!window.supabaseService) {
    console.error('❌ SupabaseService no está disponible');
    return;
  }
  
  const recalculator = new EloRecalculator(window.supabaseService);
  await recalculator.verificarEstadoELO();
};

// Función para recalcular un partido específico
window.recalcularPartidoELO = async (partidoId) => {
  if (!window.supabaseService) {
    console.error('❌ SupabaseService no está disponible');
    return;
  }
  
  const recalculator = new EloRecalculator(window.supabaseService);
  await recalculator.recalcularPartidoELO(partidoId);
};

 