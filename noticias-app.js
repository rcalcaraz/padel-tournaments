// Generador de noticias para torneos de pádel
class NoticiasGenerator {
  constructor() {
    // Usar el servicio global si está disponible, sino crear uno nuevo
    this.supabaseService = window.supabaseService || new SupabaseService(SUPABASE_CONFIG);
    this.jugadores = [];
    this.partidos = [];
    
    // Caché local para cálculos pesados
    this.cacheCalculos = {
      estadisticasPorJugador: null,
      partidosPorJugador: null,
      lastCalculated: null
    };
    
    // Hacer disponible globalmente si no existe
    if (!window.supabaseService) {
      window.supabaseService = this.supabaseService;
    }
    
    // Inicializar automáticamente
    this.init();
  }

  async init() {
    if (!this.supabaseService.isConnected()) {
      this.mostrarError('No se pudo conectar a Supabase');
      return;
    }

    try {
      // Cargar datos reales de la liga
      await this.cargarDatosReales();
      
      // Generar y mostrar noticias
      this.generarYMostrarNoticias();
    } catch (error) {
      console.error('Error inicializando noticias:', error);
      this.mostrarError();
    }
  }

  async cargarDatosReales() {
    console.log('Iniciando carga de datos reales...');
    
    try {
      // Inicializar caché global si no está inicializado
      if (!window.dataCacheInitialized) {
        await window.initializeDataCache(this.supabaseService);
      }
      
      // Usar caché global para obtener datos
      console.log('Obteniendo datos del caché global...');
      const [jugadores, partidos] = await Promise.all([
        window.dataCache.getJugadores(this.supabaseService),
        window.dataCache.getPartidos(this.supabaseService)
      ]);
      
      this.jugadores = jugadores;
      this.partidos = partidos;
      
      console.log('✅ Datos obtenidos del caché:', {
        jugadores: this.jugadores.length,
        partidos: this.partidos.length
      });

      // Verificar que tenemos datos
      if (this.jugadores.length === 0) {
        console.error('No se encontraron jugadores en la base de datos');
        this.mostrarErrorSinDatos();
        return;
      }

      console.log('✅ Todos los datos cargados correctamente');
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.mostrarError();
    }
  }

  async generarYMostrarNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    console.log('Generando noticias con:', this.jugadores.length, 'jugadores y', this.partidos.length, 'partidos');

    try {
      // Generar las cards (optimizadas para ser más rápidas)
      console.log('🚀 Generando cards optimizadas...');
      const cards = await Promise.all([
        this.generarCardMasPartidosJugados(),
        this.generarCardMasSociable(),
        this.generarCardMayorPalizaSemana(),
        this.generarCardJugadorEnRacha(),
        this.generarCardJugadorEnCrisis(),
        this.generarCardJugadorEnForma(),
        this.generarCardMalMomento(),
        this.generarCardMasPuntosPorSet(),
        this.generarCardMasPorcentajePalizas(),
        this.generarCardMasRemontadas(),
        this.generarCardTeEchamosDeMenos()
      ]);

      const cardsValidas = cards.filter(card => card !== null);

      console.log('Cards generadas:', cardsValidas.length);
      
      if (cardsValidas.length === 0) {
        console.warn('No se pudieron generar cards');
        this.mostrarErrorSinDatos();
        return;
      }
      
      // Renderizar cards
      container.innerHTML = cardsValidas.join('');
      console.log('✅ Cards renderizadas:', cardsValidas.length);
    } catch (error) {
      console.error('Error generando noticias:', error);
      this.mostrarError();
    }
  }


  // 1. Más partidos jugados este mes
  generarCardMasPartidosJugados() {
    const ahora = new Date();
    const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

    const partidosPorJugador = this.jugadores.map(jugador => {
      const partidos = this.partidos.filter(p => {
        const fechaPartido = new Date(p.fecha_partido);
        return fechaPartido >= inicioDelMes && fechaPartido <= finDelMes && (
          p.pareja1_jugador1_id === jugador.id || 
          p.pareja1_jugador2_id === jugador.id ||
          p.pareja2_jugador1_id === jugador.id || 
          p.pareja2_jugador2_id === jugador.id
        );
      }).length;
      return { jugador, partidos };
    }).filter(({ partidos }) => partidos > 0);

    if (partidosPorJugador.length === 0) return null;

    const maxPartidos = Math.max(...partidosPorJugador.map(p => p.partidos));
    const jugadoresEmpatados = partidosPorJugador.filter(p => p.partidos === maxPartidos);

    return this.crearCardHTMLConEmpates(
      'Más partidos jugados este mes',
      jugadoresEmpatados,
      maxPartidos,
      'partidos',
      'bg-blue-50',
      'text-blue-600'
    );
  }

  // 2. Mayor paliza de la semana
  generarCardMayorPalizaSemana() {
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);

    const partidosSemana = this.partidos.filter(p => new Date(p.fecha_partido) >= haceUnaSemana);
    
    let mayorDiferencia = 0;
    let partidosPaliza = [];

    partidosSemana.forEach(partido => {
      const diferencia = Math.abs(partido.pareja1_sets - partido.pareja2_sets);
      if (diferencia > mayorDiferencia) {
        mayorDiferencia = diferencia;
        partidosPaliza = [partido];
      } else if (diferencia === mayorDiferencia && diferencia > 0) {
        partidosPaliza.push(partido);
      }
    });

    if (partidosPaliza.length === 0) return null;

    const ganadores = partidosPaliza.map(partido => {
      return partido.ganador_pareja === 1 ? 
        `${this.obtenerNombreJugador(partido.pareja1_jugador1_id)} y ${this.obtenerNombreJugador(partido.pareja1_jugador2_id)}` :
        `${this.obtenerNombreJugador(partido.pareja2_jugador1_id)} y ${this.obtenerNombreJugador(partido.pareja2_jugador2_id)}`;
    });

    const esEmpate = partidosPaliza.length > 1;
    const nombres = ganadores.join(', ');

    return `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-64">
        <div class="mb-8">
          <h3 class="text-xl font-semibold text-gray-700 uppercase tracking-wide mb-4">Mayor paliza de la semana</h3>
          <div class="text-3xl font-bold text-gray-900">${nombres}</div>
          ${esEmpate ? '<div class="text-sm text-gray-500 mt-1">(Empate)</div>' : ''}
        </div>
        
        <div class="flex items-center justify-between">
          <div class="text-5xl font-bold text-red-600">${mayorDiferencia}</div>
          <div class="text-xl text-gray-500">sets de diferencia</div>
        </div>
      </div>
    `;
  }

  // 3. Jugador más en racha
  generarCardJugadorEnRacha() {
    const rachas = this.jugadores.map(jugador => {
      const racha = this.calcularRachaActual(jugador.id, true);
      return { jugador, racha };
    }).filter(({ racha }) => racha > 0);

    if (rachas.length === 0) return null;

    const maxRacha = Math.max(...rachas.map(r => r.racha));
    const jugadoresEmpatados = rachas.filter(r => r.racha === maxRacha);

    return this.crearCardHTMLConEmpates(
      'Más en racha',
      jugadoresEmpatados,
      maxRacha,
      'victorias seguidas',
      'bg-green-50',
      'text-green-600'
    );
  }

  // 4. Jugador más en forma (más ELO ganado en últimos 5 partidos)
  async generarCardJugadorEnForma() {
    const jugadoresConELO = [];
    
    for (const jugador of this.jugadores) {
      const ultimos5Partidos = this.obtenerUltimos5Partidos(jugador.id);
      const cambioELO = await this.calcularCambioELOUltimos5Partidos(jugador.id, ultimos5Partidos);
      if (cambioELO > 0) {
        jugadoresConELO.push({ jugador, cambioELO });
      }
    }

    if (jugadoresConELO.length === 0) return null;

    const maxELO = Math.max(...jugadoresConELO.map(j => j.cambioELO));
    const jugadoresEmpatados = jugadoresConELO.filter(j => j.cambioELO === maxELO);

    return this.crearCardHTMLConEmpates(
      'Más en forma (últimos 5 partidos)',
      jugadoresEmpatados,
      `+${Math.round(maxELO)}`,
      'puntos ELO ganados',
      'bg-purple-50',
      'text-purple-600'
    );
  }

  // 5. Jugador en crisis (peor racha de derrotas)
  generarCardJugadorEnCrisis() {
    const rachasDerrotas = this.jugadores.map(jugador => {
      const racha = this.calcularRachaActual(jugador.id, false);
      return { jugador, racha };
    }).filter(({ racha }) => racha > 0);

    if (rachasDerrotas.length === 0) return null;

    const maxDerrotas = Math.max(...rachasDerrotas.map(r => r.racha));
    const jugadoresEmpatados = rachasDerrotas.filter(r => r.racha === maxDerrotas);

    return this.crearCardHTMLConEmpates(
      'En crisis',
      jugadoresEmpatados,
      maxDerrotas,
      'derrotas seguidas',
      'bg-orange-50',
      'text-orange-600'
    );
  }

  // 6. Mal momento (más ELO perdido en últimos 5 partidos)
  async generarCardMalMomento() {
    const jugadoresConELO = [];
    
    for (const jugador of this.jugadores) {
      const ultimos5Partidos = this.obtenerUltimos5Partidos(jugador.id);
      const cambioELO = await this.calcularCambioELOUltimos5Partidos(jugador.id, ultimos5Partidos);
      if (cambioELO < 0) {
        jugadoresConELO.push({ jugador, cambioELO });
      }
    }

    if (jugadoresConELO.length === 0) return null;

    const minELO = Math.min(...jugadoresConELO.map(j => j.cambioELO));
    const jugadoresEmpatados = jugadoresConELO.filter(j => j.cambioELO === minELO);

    return this.crearCardHTMLConEmpates(
      'Mal momento (últimos 5 partidos)',
      jugadoresEmpatados,
      `-${Math.abs(Math.round(minELO))}`,
      'puntos ELO perdidos',
      'bg-red-50',
      'text-red-600'
    );
  }

  // 7. Más sociable (más compañeros diferentes)
  generarCardMasSociable() {
    const sociabilidad = this.jugadores.map(jugador => {
      const compañeros = new Set();
      
      this.partidos.forEach(partido => {
        if (partido.pareja1_jugador1_id === jugador.id) {
          compañeros.add(partido.pareja1_jugador2_id);
        } else if (partido.pareja1_jugador2_id === jugador.id) {
          compañeros.add(partido.pareja1_jugador1_id);
        } else if (partido.pareja2_jugador1_id === jugador.id) {
          compañeros.add(partido.pareja2_jugador2_id);
        } else if (partido.pareja2_jugador2_id === jugador.id) {
          compañeros.add(partido.pareja2_jugador1_id);
        }
      });

      return { jugador, compañeros: compañeros.size };
    }).filter(({ compañeros }) => compañeros > 0);

    if (sociabilidad.length === 0) return null;

    const maxCompañeros = Math.max(...sociabilidad.map(s => s.compañeros));
    const jugadoresEmpatados = sociabilidad.filter(s => s.compañeros === maxCompañeros);

    return this.crearCardHTMLConEmpates(
      'Más sociable',
      jugadoresEmpatados,
      maxCompañeros,
      'compañeros diferentes',
      'bg-indigo-50',
      'text-indigo-600'
    );
  }

  // 8. Más puntos por set
  generarCardMasPuntosPorSet() {
    console.log('Generando card: Más puntos por set');
    const estadisticasPorJugador = this.jugadores.map(jugador => {
      const partidosJugador = this.partidos.filter(p => 
        p.pareja1_jugador1_id === jugador.id || 
        p.pareja1_jugador2_id === jugador.id ||
        p.pareja2_jugador1_id === jugador.id || 
        p.pareja2_jugador2_id === jugador.id
      );

      if (partidosJugador.length === 0) return { jugador, puntosPorSet: 0 };

      let totalPuntos = 0;
      let totalSets = 0;

      partidosJugador.forEach(partido => {
        const estaEnPareja1 = partido.pareja1_jugador1_id === jugador.id || partido.pareja1_jugador2_id === jugador.id;
        if (estaEnPareja1) {
          totalPuntos += (partido.pareja1_set1 || 0) + (partido.pareja1_set2 || 0) + (partido.pareja1_set3 || 0);
          totalSets += (partido.pareja1_set1 ? 1 : 0) + (partido.pareja1_set2 ? 1 : 0) + (partido.pareja1_set3 ? 1 : 0);
        } else {
          totalPuntos += (partido.pareja2_set1 || 0) + (partido.pareja2_set2 || 0) + (partido.pareja2_set3 || 0);
          totalSets += (partido.pareja2_set1 ? 1 : 0) + (partido.pareja2_set2 ? 1 : 0) + (partido.pareja2_set3 ? 1 : 0);
        }
      });

      const puntosPorSet = totalSets > 0 ? totalPuntos / totalSets : 0;
      return { jugador, puntosPorSet };
    }).filter(({ puntosPorSet }) => puntosPorSet > 0);

    if (estadisticasPorJugador.length === 0) {
      console.log('No hay datos para Más puntos por set');
      return null;
    }

    const maxPuntosPorSet = Math.max(...estadisticasPorJugador.map(e => e.puntosPorSet));
    const jugadoresEmpatados = estadisticasPorJugador.filter(e => e.puntosPorSet === maxPuntosPorSet);

    return this.crearCardHTMLConEmpates(
      'Más puntos por set',
      jugadoresEmpatados,
      maxPuntosPorSet.toFixed(1),
      'puntos/set',
      'bg-cyan-50',
      'text-cyan-600'
    );
  }

  // 9. Más porcentaje de palizas
  generarCardMasPorcentajePalizas() {
    console.log('Generando card: Más porcentaje de palizas');
    const estadisticasPorJugador = this.jugadores.map(jugador => {
      const partidosJugador = this.partidos.filter(p => 
        p.pareja1_jugador1_id === jugador.id || 
        p.pareja1_jugador2_id === jugador.id ||
        p.pareja2_jugador1_id === jugador.id || 
        p.pareja2_jugador2_id === jugador.id
      );

      if (partidosJugador.length === 0) return { jugador, porcentajePalizas: 0 };

      let victorias = 0;
      let palizas = 0;

      partidosJugador.forEach(partido => {
        const estaEnPareja1 = partido.pareja1_jugador1_id === jugador.id || partido.pareja1_jugador2_id === jugador.id;
        const gano = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
        
        if (gano) {
          victorias++;
          
          // Solo considerar partidos de 2 sets para victorias aplastantes
          const esPartido2Sets = !partido.pareja1_set3 && !partido.pareja2_set3;
          
          if (esPartido2Sets) {
            const puntosGanados = estaEnPareja1 ? 
              (partido.pareja1_set1 + partido.pareja1_set2) : 
              (partido.pareja2_set1 + partido.pareja2_set2);
            const puntosPerdidos = estaEnPareja1 ? 
              (partido.pareja2_set1 + partido.pareja2_set2) : 
              (partido.pareja1_set1 + partido.pareja1_set2);
            
            const diferenciaJuegos = puntosGanados - puntosPerdidos;
            if (diferenciaJuegos >= 8) { // Victoria aplastante: diferencia de 8+ juegos
              palizas++;
            }
          }
        }
      });

      const porcentajePalizas = victorias > 0 ? (palizas / victorias) * 100 : 0;
      return { jugador, porcentajePalizas };
    }).filter(({ porcentajePalizas }) => porcentajePalizas > 0);

    if (estadisticasPorJugador.length === 0) {
      console.log('No hay datos para Más porcentaje de palizas');
      return null;
    }

    const maxPorcentaje = Math.max(...estadisticasPorJugador.map(e => e.porcentajePalizas));
    const jugadoresEmpatados = estadisticasPorJugador.filter(e => e.porcentajePalizas === maxPorcentaje);

    return this.crearCardHTMLConEmpates(
      'Más porcentaje de palizas',
      jugadoresEmpatados,
      `${maxPorcentaje.toFixed(1)}%`,
      'de victorias son palizas',
      'bg-pink-50',
      'text-pink-600'
    );
  }

  // 10. Más remontadas
  generarCardMasRemontadas() {
    console.log('Generando card: Más remontadas');
    const estadisticasPorJugador = this.jugadores.map(jugador => {
      const partidosJugador = this.partidos.filter(p => 
        p.pareja1_jugador1_id === jugador.id || 
        p.pareja1_jugador2_id === jugador.id ||
        p.pareja2_jugador1_id === jugador.id || 
        p.pareja2_jugador2_id === jugador.id
      );

      if (partidosJugador.length === 0) return { jugador, porcentajeRemontadas: 0 };

      let partidosPerdiendo = 0;
      let remontadas = 0;

      partidosJugador.forEach(partido => {
        const estaEnPareja1 = partido.pareja1_jugador1_id === jugador.id || partido.pareja1_jugador2_id === jugador.id;
        const ganadorPareja = partido.ganador_pareja;
        
        if (!ganadorPareja) return;
        
        const primerSetPerdido = estaEnPareja1 ? 
          (partido.pareja1_set1 < partido.pareja2_set1) : 
          (partido.pareja2_set1 < partido.pareja1_set1);
        
        const esGanador = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
        
        if (primerSetPerdido) {
          partidosPerdiendo++;
          if (esGanador) {
            remontadas++;
          }
        }
      });

      const porcentajeRemontadas = partidosPerdiendo > 0 ? (remontadas / partidosPerdiendo) * 100 : 0;
      return { jugador, porcentajeRemontadas };
    }).filter(({ porcentajeRemontadas }) => porcentajeRemontadas > 0);

    if (estadisticasPorJugador.length === 0) {
      console.log('No hay datos para Más remontadas');
      return null;
    }

    const maxPorcentaje = Math.max(...estadisticasPorJugador.map(e => e.porcentajeRemontadas));
    const jugadoresEmpatados = estadisticasPorJugador.filter(e => e.porcentajeRemontadas === maxPorcentaje);

    return this.crearCardHTMLConEmpates(
      'Más remontadas',
      jugadoresEmpatados,
      `${maxPorcentaje.toFixed(1)}%`,
      'de remontadas exitosas',
      'bg-yellow-50',
      'text-yellow-600'
    );
  }

  // 11. Te echamos de menos
  generarCardTeEchamosDeMenos() {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const partidosPorJugador = this.jugadores.map(jugador => {
      const partidos = this.partidos.filter(p => {
        const fechaPartido = new Date(p.fecha_partido);
        return fechaPartido >= hace30Dias && (
          p.pareja1_jugador1_id === jugador.id || 
          p.pareja1_jugador2_id === jugador.id ||
          p.pareja2_jugador1_id === jugador.id || 
          p.pareja2_jugador2_id === jugador.id
        );
      }).length;
      return { jugador, partidos };
    });

    const minPartidos = Math.min(...partidosPorJugador.map(p => p.partidos));
    const jugadoresEmpatados = partidosPorJugador.filter(p => p.partidos === minPartidos);

    return this.crearCardHTMLConEmpates(
      'Te echamos de menos',
      jugadoresEmpatados,
      minPartidos,
      'partidos en 30 días',
      'bg-gray-50',
      'text-gray-600'
    );
  }

  // Función auxiliar para crear cards con el estilo de las estadísticas
  crearCardHTML(titulo, nombre, valor, unidad, icono, bgColor, textColor) {
    return `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-64">
        <div class="mb-8">
          <h3 class="text-xl font-semibold text-gray-700 uppercase tracking-wide mb-4">${titulo}</h3>
          <div class="text-3xl font-bold text-gray-900">${nombre}</div>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="text-5xl font-bold ${textColor}">${valor}</div>
          <div class="text-xl text-gray-500">${unidad}</div>
        </div>
      </div>
    `;
  }

  // Función auxiliar para crear cards con empates
  crearCardHTMLConEmpates(titulo, jugadoresEmpatados, valor, unidad, bgColor, textColor) {
    const nombres = jugadoresEmpatados.map(j => j.jugador.nombre).join(', ');
    
    return `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-64">
        <div class="mb-8">
          <h3 class="text-xl font-semibold text-gray-700 uppercase tracking-wide mb-4">${titulo}</h3>
          <div class="text-3xl font-bold text-gray-900">${nombres}</div>
        </div>
        
        <div class="flex items-center justify-between">
          <div class="text-5xl font-bold ${textColor}">${valor}</div>
          <div class="text-xl text-gray-500">${unidad}</div>
        </div>
      </div>
    `;
  }

  // Función auxiliar para obtener nombre de jugador por ID
  obtenerNombreJugador(jugadorId) {
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    return jugador ? jugador.nombre : 'Jugador';
  }

  // Función auxiliar para obtener los últimos 5 partidos de un jugador
  obtenerUltimos5Partidos(jugadorId) {
    const partidosJugador = this.partidos.filter(p => 
      p.pareja1_jugador1_id === jugadorId || 
      p.pareja1_jugador2_id === jugadorId ||
      p.pareja2_jugador1_id === jugadorId || 
      p.pareja2_jugador2_id === jugadorId
    ).sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido));

    return partidosJugador.slice(0, 5);
  }

  // Función auxiliar para calcular el cambio de ELO en los últimos 5 partidos (OPTIMIZADA)
  async calcularCambioELOUltimos5Partidos(jugadorId, partidos) {
    if (partidos.length === 0) return 0;

    let cambioELO = 0;
    
    // Usar cálculo simulado para mejor rendimiento (sin llamadas al servidor)
    for (const partido of partidos) {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const gano = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
      
      if (gano) {
        cambioELO += 15; // Ganancia promedio por victoria
      } else {
        cambioELO -= 15; // Pérdida promedio por derrota
      }
    }
    
    return cambioELO;
  }

  // Función auxiliar para calcular racha actual
  calcularRachaActual(jugadorId, esVictoria) {
    const partidosJugador = this.partidos.filter(p => 
      p.pareja1_jugador1_id === jugadorId || 
      p.pareja1_jugador2_id === jugadorId ||
      p.pareja2_jugador1_id === jugadorId || 
      p.pareja2_jugador2_id === jugadorId
    ).sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido));

    let racha = 0;
    for (const partido of partidosJugador) {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const gano = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
      
      if (gano === esVictoria) {
        racha++;
      } else {
        break;
      }
    }
    return racha;
  }

  mostrarError(mensaje = 'Error al cargar las estadísticas') {
    const container = document.getElementById('noticias-container');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <div class="text-6xl mb-6">😕</div>
          <h2 class="text-3xl font-bold text-gray-800 mb-4">${mensaje}</h2>
          <p class="text-xl text-gray-600">No se pudieron cargar las estadísticas del torneo.</p>
          <button onclick="location.reload()" class="mt-6 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold">
            Reintentar
          </button>
        </div>
      `;
    }
  }

  mostrarErrorSinDatos() {
    const container = document.getElementById('noticias-container');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <div class="text-6xl mb-6">📊</div>
          <h2 class="text-3xl font-bold text-gray-800 mb-4">No hay datos de la liga</h2>
          <p class="text-xl text-gray-600 mb-6">No se encontraron jugadores o partidos en la base de datos.</p>
          <p class="text-lg text-gray-500 mb-8">Asegúrate de que:</p>
          <ul class="text-left text-lg text-gray-600 max-w-md mx-auto mb-8">
            <li>• Hay jugadores registrados en la liga</li>
            <li>• Se han jugado algunos partidos</li>
            <li>• La conexión a la base de datos funciona</li>
          </ul>
          <button onclick="location.reload()" class="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold">
            Reintentar
          </button>
        </div>
      `;
    }
  }
}

// Inicializar cuando el DOM esté listo (igual que las otras páginas)
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado, iniciando noticias...');
  const noticiasGenerator = new NoticiasGenerator();
});