class EstadisticasModal {
  constructor() {
    this.supabaseService = window.supabaseService;
    this.jugadores = [];
    this.partidos = [];
    this.chart = null;
  }

  // Inicializar el modal
  init() {
    this.setupEventListeners();
  }

  // Configurar event listeners
  setupEventListeners() {
    // Event listener para cerrar modal
    document.addEventListener('click', (e) => {
      if (e.target.id === 'cerrar-modal-estadisticas' || e.target.classList.contains('modal')) {
        this.cerrarModal();
      }
    });

    // Event listener para reintentar
    document.addEventListener('click', (e) => {
      if (e.target.id === 'reintentar-estadisticas') {
        this.reintentarCarga();
      }
    });

    // Event listener para navegación de pestañas
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-button')) {
        this.cambiarPestana(e.target.dataset.tab);
      }
    });
  }

  // Abrir modal de estadísticas
  abrirModal(jugadorId) {
    const modal = document.getElementById('modal-estadisticas');
    if (modal) {
      modal.classList.add('show');
      this.cargarEstadisticasJugador(jugadorId);
    }
  }

  // Cerrar modal
  cerrarModal() {
    const modal = document.getElementById('modal-estadisticas');
    if (modal) {
      modal.classList.remove('show');
      this.limpiarModal();
    }
  }

  // Limpiar contenido del modal
  limpiarModal() {
    // Destruir gráfica si existe
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Ocultar contenido principal y mostrar loading
    document.getElementById('main-content-estadisticas').classList.add('hidden');
    document.getElementById('loading-estadisticas').classList.remove('hidden');
    document.getElementById('error-message-estadisticas').classList.add('hidden');
  }

  // Cargar estadísticas del jugador
  async cargarEstadisticasJugador(jugadorId) {
    try {
      // Mostrar loading
      document.getElementById('loading-estadisticas').classList.remove('hidden');
      document.getElementById('main-content-estadisticas').classList.add('hidden');
      document.getElementById('error-message-estadisticas').classList.add('hidden');

      // Cargar jugadores si no están cargados
      if (this.jugadores.length === 0) {
        const jugadoresResult = await this.supabaseService.getJugadores();
        if (jugadoresResult.success) {
          this.jugadores = jugadoresResult.data;
        } else {
          throw new Error('Error cargando jugadores');
        }
      }

      // Cargar partidos si no están cargados
      if (this.partidos.length === 0) {
        const partidosResult = await this.supabaseService.getPartidos();
        if (partidosResult.success) {
          this.partidos = partidosResult.data;
        } else {
          throw new Error('Error cargando partidos');
        }
      }

      // Buscar jugador
      const jugador = this.jugadores.find(j => j.id === jugadorId);
      if (!jugador) {
        throw new Error('Jugador no encontrado');
      }

      // Filtrar partidos del jugador
      const partidosJugador = this.partidos.filter(partido => 
        partido.pareja1_jugador1_id === jugadorId ||
        partido.pareja1_jugador2_id === jugadorId ||
        partido.pareja2_jugador1_id === jugadorId ||
        partido.pareja2_jugador2_id === jugadorId
      );

      // Mostrar información del jugador
      this.displayJugadorInfo(jugador, partidosJugador);

      // Mostrar estadísticas de parejas
      this.displayParejaStats(jugadorId, partidosJugador);

      // Crear gráfica de progresión ELO
      this.createEloChart(partidosJugador, jugadorId);

      // Mostrar últimos partidos
      this.displayRecentMatches(partidosJugador, jugadorId);

      // Ocultar loading y mostrar contenido
      document.getElementById('loading-estadisticas').classList.add('hidden');
      document.getElementById('main-content-estadisticas').classList.remove('hidden');

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      this.mostrarError(error.message);
    }
  }

  // Mostrar información del jugador
  displayJugadorInfo(jugador, partidos) {
    // Calcular estadísticas
    const stats = this.calculateStats(partidos, jugador.id);
    
    // Calcular nivel del jugador
    const rating = jugador.rating_elo || 1200;
    const level = this.getRatingTitle(rating);
    
    // Actualizar información básica
    document.getElementById('player-name').textContent = jugador.nombre;
    document.getElementById('player-level').textContent = level;
    
    // Actualizar estadísticas
    document.getElementById('player-elo').textContent = jugador.rating_elo || 1200;
    document.getElementById('player-wins').textContent = stats.victorias;
    document.getElementById('player-losses').textContent = stats.derrotas;
    document.getElementById('player-winrate').textContent = stats.porcentajeVictoria + '%';
    document.getElementById('player-streak').textContent = this.calcularRachaActual(partidos, jugador.id);
    document.getElementById('player-progression').textContent = jugador.progresion_elo || 0;
  }

  // Calcular estadísticas básicas
  calculateStats(partidos, jugadorId) {
    let victorias = 0;
    let derrotas = 0;

    partidos.forEach(partido => {
      if (partido.ganador_pareja) {
        const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
        const esVictoria = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
        
        if (esVictoria) {
          victorias++;
        } else {
          derrotas++;
        }
      }
    });

    const total = victorias + derrotas;
    const porcentajeVictoria = total > 0 ? Math.round((victorias / total) * 100) : 0;

    return { victorias, derrotas, porcentajeVictoria };
  }

  // Crear gráfica de progresión ELO
  createEloChart(partidos, jugadorId) {
    const ctx = document.getElementById('eloChart');
    if (!ctx) return;

    // Destruir gráfica existente
    if (this.chart) {
      this.chart.destroy();
    }

    const chartData = this.prepareChartData(partidos, jugadorId);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'ELO',
          data: chartData.data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              color: '#e5e7eb'
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 14
              }
            }
          },
          y: {
            grid: {
              color: '#e5e7eb'
            },
            ticks: {
              color: '#6b7280',
              font: {
                size: 14
              }
            }
          }
        }
      }
    });
  }

  // Preparar datos para la gráfica
  prepareChartData(partidos, jugadorId) {
    // Ordenar partidos por fecha
    const partidosOrdenados = partidos.sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido));
    
    const labels = [];
    const data = [];
    let eloActual = 1200; // ELO inicial

    partidosOrdenados.forEach((partido, index) => {
      // Calcular cambio de ELO para este partido
      const cambioELO = this.calcularCambioELOPartido(partido, jugadorId);
      eloActual += cambioELO;

      // Usar fecha del partido como etiqueta
      const fecha = new Date(partido.fecha_partido).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
      
      labels.push(fecha);
      data.push(eloActual);
    });

    return { labels, data };
  }

  // Calcular cambio de ELO para un partido específico
  calcularCambioELOPartido(partido, jugadorId) {
    if (!partido.ganador_pareja) return 0;

    // Obtener ratings de los jugadores
    const jugador1 = this.jugadores.find(j => j.id === partido.pareja1_jugador1_id);
    const jugador2 = this.jugadores.find(j => j.id === partido.pareja1_jugador2_id);
    const jugador3 = this.jugadores.find(j => j.id === partido.pareja2_jugador1_id);
    const jugador4 = this.jugadores.find(j => j.id === partido.pareja2_jugador2_id);

    const rating1 = jugador1?.rating_elo || 1200;
    const rating2 = jugador2?.rating_elo || 1200;
    const rating3 = jugador3?.rating_elo || 1200;
    const rating4 = jugador4?.rating_elo || 1200;

    // Calcular rating promedio de cada pareja
    const ratingPareja1 = (rating1 + rating2) / 2;
    const ratingPareja2 = (rating3 + rating4) / 2;

    // Determinar en qué pareja está el jugador
    const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
    const ratingJugador = estaEnPareja1 ? ratingPareja1 : ratingPareja2;
    const ratingOponente = estaEnPareja1 ? ratingPareja2 : ratingPareja1;

    // Calcular probabilidad esperada
    const probabilidadEsperada = 1 / (1 + Math.pow(10, (ratingOponente - ratingJugador) / 400));

    // Determinar resultado
    const esVictoria = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
    const resultado = esVictoria ? 1 : 0;

    // Calcular cambio de ELO (K-factor = 32)
    const K = 32;
    const cambioELO = Math.round(K * (resultado - probabilidadEsperada));

    return cambioELO;
  }

  // Mostrar estadísticas de parejas
  displayParejaStats(jugadorId, partidos) {
    const stats = this.calculateParejaStats(jugadorId, partidos);
    
    document.getElementById('pareja-favorita').textContent = stats.parejaFavorita.nombre;
    document.getElementById('pareja-favorita-partidos').textContent = `${stats.parejaFavorita.partidos} partidos`;
    
    document.getElementById('pareja-optima').textContent = stats.parejaOptima.nombre;
    document.getElementById('pareja-optima-wins').textContent = `${stats.parejaOptima.victorias} victorias`;
    
    document.getElementById('victima-favorita').textContent = stats.victimaFavorita.nombre;
    document.getElementById('victima-favorita-wins').textContent = `${stats.victimaFavorita.victorias} victorias`;
    
    document.getElementById('nemesis').textContent = stats.nemesis.nombre;
    document.getElementById('nemesis-losses').textContent = `${stats.nemesis.derrotas} derrotas`;
  }

  // Calcular estadísticas de parejas
  calculateParejaStats(jugadorId, partidos) {
    const parejas = {};
    const oponentes = {};

    partidos.forEach(partido => {
      if (!partido.ganador_pareja) return;

      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;

      // Identificar pareja
      let parejaId;
      if (estaEnPareja1) {
        parejaId = partido.pareja1_jugador1_id === jugadorId ? partido.pareja1_jugador2_id : partido.pareja1_jugador1_id;
      } else {
        parejaId = partido.pareja2_jugador1_id === jugadorId ? partido.pareja2_jugador2_id : partido.pareja2_jugador1_id;
      }

      // Identificar oponentes
      const oponente1Id = estaEnPareja1 ? partido.pareja2_jugador1_id : partido.pareja1_jugador1_id;
      const oponente2Id = estaEnPareja1 ? partido.pareja2_jugador2_id : partido.pareja1_jugador2_id;

      // Contar partidos con pareja
      if (parejaId) {
        if (!parejas[parejaId]) {
          parejas[parejaId] = { partidos: 0, victorias: 0 };
        }
        parejas[parejaId].partidos++;
        if (ganadorPareja && ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2))) {
          parejas[parejaId].victorias++;
        }
      }

      // Contar enfrentamientos con oponentes
      [oponente1Id, oponente2Id].forEach(oponenteId => {
        if (oponenteId) {
          if (!oponentes[oponenteId]) {
            oponentes[oponenteId] = { victorias: 0, derrotas: 0 };
          }
          if (ganadorPareja && ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2))) {
            oponentes[oponenteId].victorias++;
          } else if (ganadorPareja) {
            oponentes[oponenteId].derrotas++;
          }
        }
      });
    });

    // Encontrar pareja favorita (más partidos jugados)
    let parejaFavorita = { nombre: '-', partidos: 0 };
    Object.keys(parejas).forEach(parejaId => {
      const pareja = parejas[parejaId];
      if (pareja.partidos > parejaFavorita.partidos) {
        const jugador = this.jugadores.find(j => j.id === parseInt(parejaId));
        parejaFavorita = {
          nombre: jugador ? jugador.nombre : 'Jugador desconocido',
          partidos: pareja.partidos
        };
      }
    });

    // Encontrar pareja óptima (más victorias)
    let parejaOptima = { nombre: '-', victorias: 0 };
    Object.keys(parejas).forEach(parejaId => {
      const pareja = parejas[parejaId];
      if (pareja.victorias > parejaOptima.victorias) {
        const jugador = this.jugadores.find(j => j.id === parseInt(parejaId));
        parejaOptima = {
          nombre: jugador ? jugador.nombre : 'Jugador desconocido',
          victorias: pareja.victorias
        };
      }
    });

    // Encontrar víctima favorita (más victorias contra)
    let victimaFavorita = { nombre: '-', victorias: 0 };
    Object.keys(oponentes).forEach(oponenteId => {
      const oponente = oponentes[oponenteId];
      if (oponente.victorias > victimaFavorita.victorias) {
        const jugador = this.jugadores.find(j => j.id === parseInt(oponenteId));
        victimaFavorita = {
          nombre: jugador ? jugador.nombre : 'Jugador desconocido',
          victorias: oponente.victorias
        };
      }
    });

    // Encontrar némesis (más derrotas contra)
    let nemesis = { nombre: '-', derrotas: 0 };
    Object.keys(oponentes).forEach(oponenteId => {
      const oponente = oponentes[oponenteId];
      if (oponente.derrotas > nemesis.derrotas) {
        const jugador = this.jugadores.find(j => j.id === parseInt(oponenteId));
        nemesis = {
          nombre: jugador ? jugador.nombre : 'Jugador desconocido',
          derrotas: oponente.derrotas
        };
      }
    });

    return {
      parejaFavorita,
      parejaOptima,
      victimaFavorita,
      nemesis
    };
  }

  // Mostrar últimos partidos
  displayRecentMatches(partidos, jugadorId) {
    const container = document.getElementById('recent-matches');
    
    if (partidos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 sm:py-8">
          <div class="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">🏓</div>
          <p class="text-gray-600 text-base sm:text-lg">No hay partidos registrados aún.</p>
          <p class="text-gray-500 text-sm sm:text-base">Juega algunos partidos para ver el historial aquí.</p>
        </div>
      `;
      return;
    }

    // Mostrar solo los últimos 10 partidos
    const recentPartidos = partidos.slice(0, 10);
    
    container.innerHTML = recentPartidos.map(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      const esGanador = ganadorPareja && ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2));
      
      const pareja1Names = `${partido.pareja1_jugador1?.nombre || 'N/A'} y ${partido.pareja1_jugador2?.nombre || 'N/A'}`;
      const pareja2Names = `${partido.pareja2_jugador1?.nombre || 'N/A'} y ${partido.pareja2_jugador2?.nombre || 'N/A'}`;
      
      const fecha = new Date(partido.fecha_partido).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="bg-gray-50 rounded-lg p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div class="flex-1">
              <div class="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mb-2">
                <span class="text-base sm:text-lg text-gray-500">${fecha}</span>
                ${esGanador ? '<span class="text-green-600 font-semibold text-base sm:text-lg">🏆 Victoria</span>' : '<span class="text-red-600 font-semibold text-base sm:text-lg">❌ Derrota</span>'}
              </div>
              <div class="text-base sm:text-lg lg:text-xl font-medium">
                ${pareja1Names} vs ${pareja2Names}
              </div>
              <div class="text-sm sm:text-base text-gray-600 mt-1">
                ${partido.pareja1_set1}-${partido.pareja2_set1}, ${partido.pareja1_set2}-${partido.pareja2_set2}${partido.pareja1_set3 ? `, ${partido.pareja1_set3}-${partido.pareja2_set3}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Calcular racha actual
  calcularRachaActual(partidos, jugadorId) {
    if (!partidos || partidos.length === 0) {
      return '0';
    }

    // Ordenar partidos por fecha (más recientes primero)
    const partidosOrdenados = partidos.sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido));
    
    let racha = 0;
    let esVictoria = null;
    
    for (const partido of partidosOrdenados) {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) continue; // Saltar partidos sin resultado
      
      const partidoEsVictoria = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
      
      // Si es el primer partido, establecer el tipo de resultado
      if (esVictoria === null) {
        esVictoria = partidoEsVictoria;
        racha = 1;
      } 
      // Si el resultado es del mismo tipo, incrementar racha
      else if (esVictoria === partidoEsVictoria) {
        racha++;
      } 
      // Si el resultado es diferente, romper la racha
      else {
        break;
      }
    }
    
    // Formatear la racha
    if (racha === 0) {
      return '0';
    } else if (esVictoria) {
      return `${racha}V`;
    } else {
      return `${racha}D`;
    }
  }

  // Mostrar error
  mostrarError(mensaje) {
    document.getElementById('loading-estadisticas').classList.add('hidden');
    document.getElementById('main-content-estadisticas').classList.add('hidden');
    document.getElementById('error-message-estadisticas').classList.remove('hidden');
    document.getElementById('error-text-estadisticas').textContent = mensaje;
  }

  // Reintentar carga
  reintentarCarga() {
    const jugadorId = this.currentJugadorId;
    if (jugadorId) {
      this.cargarEstadisticasJugador(jugadorId);
    }
  }

  // Obtener el título del rating ELO usando la función de utils.js
  getRatingTitle(rating) {
    if (window.EloUtils && window.EloUtils.getRatingTitle) {
      return window.EloUtils.getRatingTitle(rating);
    }
    // Fallback si no está disponible
    if (rating >= 2000) return 'Maestro';
    if (rating >= 1800) return 'Experto';
    if (rating >= 1600) return 'Avanzado';
    if (rating >= 1400) return 'Intermedio';
    if (rating >= 1200) return 'Principiante';
    return 'Novato';
  }

  // Función para cambiar entre pestañas
  cambiarPestana(tabName) {
    // Remover clase active de todos los botones
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
    });

    // Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      content.classList.add('hidden');
    });

    // Activar el botón seleccionado
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }

    // Mostrar el contenido de la pestaña seleccionada
    const activeContent = document.getElementById(`tab-${tabName}-content`);
    if (activeContent) {
      activeContent.classList.remove('hidden');
      activeContent.classList.add('active');
    }

    // Si es la pestaña de ELO, asegurar que la gráfica se renderice correctamente
    if (tabName === 'elo' && this.chart) {
      setTimeout(() => {
        this.chart.resize();
      }, 100);
    }
  }
}

// Exportar para uso global
window.EstadisticasModal = EstadisticasModal; 