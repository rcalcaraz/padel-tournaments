// Aplicación para la página de partidos
class PartidosApp {
  constructor() {
    this.supabaseService = new SupabaseService(SUPABASE_CONFIG);
    this.currentJugadorId = null; // Para el modal de estadísticas
    this.jugadores = []; // Array para almacenar los jugadores
    this.init();
  }

  init() {
    if (!this.supabaseService.isConnected()) {
      this.showError(MESSAGES.ERROR_CONFIG + 'No se pudo conectar a Supabase');
      return;
    }

    this.hideConfigMessage();
    this.setupEventListeners();
    this.loadPartidos();
  }

  hideConfigMessage() {
    const configMessage = DOMUtils.getElement('config-message');
    if (configMessage) {
      DOMUtils.hideElement(configMessage);
    }
  }

  async loadPartidos() {
    try {
      this.showLoading();
      
      // Guardar el tiempo de inicio
      const startTime = Date.now();
      
      // Cargar los partidos
      const partidos = await this.supabaseService.getPartidos();
      
      // Calcular cuánto tiempo ha pasado
      const elapsedTime = Date.now() - startTime;
      const minLoadTime = 1000; // 1 segundo mínimo
      
      // Si ha pasado menos de 2 segundos, esperar el tiempo restante
      if (elapsedTime < minLoadTime) {
        const remainingTime = minLoadTime - elapsedTime;
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      this.hideLoading();
      this.displayPartidos(partidos);
    } catch (error) {
      console.error('Error cargando partidos:', error);
      this.showError(MESSAGES.ERROR_LOADING + error.message);
    }
  }

  showLoading() {
    const loading = DOMUtils.getElement('loading');
    if (loading) {
      loading.innerHTML = `
        <div class="grid grid-cols-1 gap-6 max-w-full mx-auto">
          <!-- Skeleton 1 -->
          <div class="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
            <div class="flex flex-col gap-6">
              <!-- Encabezado del partido -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div class="h-8 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                  <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
                <div class="h-10 bg-gray-200 rounded-full animate-pulse w-32"></div>
              </div>
              
              <!-- Jugadores con cambios de ELO en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Pareja A -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Pareja B -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Resultado final -->
              <div class="text-center border-t pt-6">
                <div class="bg-gray-200 rounded-lg p-6 mb-4 animate-pulse">
                  <div class="h-8 bg-gray-300 rounded animate-pulse mb-2 w-48 mx-auto"></div>
                  <div class="h-6 bg-gray-300 rounded animate-pulse w-32 mx-auto"></div>
                </div>
                <div class="flex justify-center gap-4">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Skeleton 2 -->
          <div class="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
            <div class="flex flex-col gap-6">
              <!-- Encabezado del partido -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div class="h-8 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                  <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
                <div class="h-10 bg-gray-200 rounded-full animate-pulse w-32"></div>
              </div>
              
              <!-- Jugadores con cambios de ELO en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Pareja A -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Pareja B -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Resultado final -->
              <div class="text-center border-t pt-6">
                <div class="bg-gray-200 rounded-lg p-6 mb-4 animate-pulse">
                  <div class="h-8 bg-gray-300 rounded animate-pulse mb-2 w-48 mx-auto"></div>
                  <div class="h-6 bg-gray-300 rounded animate-pulse w-32 mx-auto"></div>
                </div>
                <div class="flex justify-center gap-4">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Skeleton 3 -->
          <div class="bg-white p-6 sm:p-8 rounded-lg shadow-sm">
            <div class="flex flex-col gap-6">
              <!-- Encabezado del partido -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div class="h-8 bg-gray-200 rounded animate-pulse mb-2 w-32"></div>
                  <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
                <div class="h-10 bg-gray-200 rounded-full animate-pulse w-32"></div>
              </div>
              
              <!-- Jugadores con cambios de ELO en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Pareja A -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Pareja B -->
                <div class="bg-gray-50 rounded-lg p-6">
                  <div class="h-6 bg-gray-200 rounded animate-pulse mb-4 w-20 mx-auto"></div>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                    <div class="flex items-center justify-between">
                      <div class="h-6 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div class="h-6 bg-gray-200 rounded-full animate-pulse w-12"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Resultado final -->
              <div class="text-center border-t pt-6">
                <div class="bg-gray-200 rounded-lg p-6 mb-4 animate-pulse">
                  <div class="h-8 bg-gray-300 rounded animate-pulse mb-2 w-48 mx-auto"></div>
                  <div class="h-6 bg-gray-300 rounded animate-pulse w-32 mx-auto"></div>
                </div>
                <div class="flex justify-center gap-4">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      DOMUtils.showElement(loading);
    }
  }

  hideLoading() {
    const loading = DOMUtils.getElement('loading');
    if (loading) {
      DOMUtils.hideElement(loading);
    }
  }

  showError(message) {
    const errorMessage = DOMUtils.getElement('error-message');
    const errorText = DOMUtils.getElement('error-text');
    
    if (errorMessage && errorText) {
      errorText.textContent = message;
      errorText.className = 'text-lg sm:text-base';
      DOMUtils.removeClass(errorMessage, 'hidden');
    }
  }

  displayPartidos(partidos) {
    const container = DOMUtils.getElement('partidos-container');
    if (!container) return;

    if (!partidos || partidos.length === 0) {
      container.innerHTML = `
        <div class="flex items-center justify-center min-h-[60vh] text-center">
          <div>
            <p class="text-[#64748b] text-4xl sm:text-5xl font-bold mb-6">${MESSAGES.NO_MATCHES}</p>
            <p class="text-[#64748b] text-2xl sm:text-3xl font-medium">${MESSAGES.PLAY_MATCHES}</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    partidos.forEach(partido => {
      const partidoHTML = this.createPartidoHTML(partido);
      container.innerHTML += partidoHTML;
    });
  }

  createPartidoHTML(partido) {
    const fecha = DateUtils.formatDate(partido.fecha_partido);
    const ganador = this.determinarGanador(partido);
    const puntuacion = this.formatearPuntuacion(partido);
    
    // Calcular cambios de ELO para cada jugador
    const cambiosELO = this.calcularCambiosELO(partido);

    return `
      <div class="bg-white p-8 sm:p-10 rounded-lg shadow-sm hover:shadow-md transition-shadow match-card">
        <div class="flex flex-col gap-8">
          <!-- Encabezado del partido -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h3 class="text-[#1e293b] text-4xl sm:text-5xl font-bold mb-3">Partido</h3>
              <p class="text-[#64748b] text-2xl sm:text-3xl">${fecha}</p>
            </div>
            <div class="text-center sm:text-right">
              <span class="inline-block px-8 py-4 rounded-full text-white text-2xl sm:text-3xl font-bold bg-[#2563eb]">
                Ganador: ${partido.ganador_pareja === 1 ? 'Pareja A' : partido.ganador_pareja === 2 ? 'Pareja B' : 'No determinado'}
              </span>
            </div>
          </div>
          
          <!-- Jugadores con cambios de ELO en dos columnas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <!-- Pareja A -->
            <div class="bg-gray-50 rounded-lg p-8">
              <h4 class="text-[#1e293b] text-3xl sm:text-4xl font-bold mb-8 text-center ${partido.ganador_pareja === 1 ? 'text-[#2563eb]' : 'text-[#64748b]'}">
                Pareja A
              </h4>
              <div class="space-y-8">
                <div class="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm">
                  <div class="flex-1">
                    <button 
                      class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3 hover:text-[#2563eb] transition-colors cursor-pointer text-left w-full"
                      onclick="window.partidosApp.abrirModalEstadisticas(${partido.pareja1_jugador1?.id || 0})"
                      ${!partido.pareja1_jugador1?.id ? 'disabled' : ''}
                    >
                      ${partido.pareja1_jugador1?.nombre || 'Jugador 1'}
                    </button>
                    <p class="text-[#64748b] text-xl sm:text-2xl">ELO: ${partido.pareja1_jugador1?.rating_elo || 1200}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl sm:text-4xl font-bold ${cambiosELO.jugador1 >= 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                      ${cambiosELO.jugador1 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador1 >= 0 ? '+' : ''}${cambiosELO.jugador1}
                    </div>
                    <div class="text-base text-[#64748b] font-medium">
                      ${cambiosELO.jugador1 >= 0 ? 'Ganancia' : 'Pérdida'} ELO
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm">
                  <div class="flex-1">
                    <button 
                      class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3 hover:text-[#2563eb] transition-colors cursor-pointer text-left w-full"
                      onclick="window.partidosApp.abrirModalEstadisticas(${partido.pareja1_jugador2?.id || 0})"
                      ${!partido.pareja1_jugador2?.id ? 'disabled' : ''}
                    >
                      ${partido.pareja1_jugador2?.nombre || 'Jugador 2'}
                    </button>
                    <p class="text-[#64748b] text-xl sm:text-2xl">ELO: ${partido.pareja1_jugador2?.rating_elo || 1200}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl sm:text-4xl font-bold ${cambiosELO.jugador2 >= 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                      ${cambiosELO.jugador2 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador2 >= 0 ? '+' : ''}${cambiosELO.jugador2}
                    </div>
                    <div class="text-base text-[#64748b] font-medium">
                      ${cambiosELO.jugador2 >= 0 ? 'Ganancia' : 'Pérdida'} ELO
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Pareja B -->
            <div class="bg-gray-50 rounded-lg p-8">
              <h4 class="text-[#1e293b] text-3xl sm:text-4xl font-bold mb-8 text-center ${partido.ganador_pareja === 2 ? 'text-[#2563eb]' : 'text-[#64748b]'}">
                Pareja B
              </h4>
              <div class="space-y-8">
                <div class="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm">
                  <div class="flex-1">
                    <button 
                      class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3 hover:text-[#2563eb] transition-colors cursor-pointer text-left w-full"
                      onclick="window.partidosApp.abrirModalEstadisticas(${partido.pareja2_jugador1?.id || 0})"
                      ${!partido.pareja2_jugador1?.id ? 'disabled' : ''}
                    >
                      ${partido.pareja2_jugador1?.nombre || 'Jugador 3'}
                    </button>
                    <p class="text-[#64748b] text-xl sm:text-2xl">ELO: ${partido.pareja2_jugador1?.rating_elo || 1200}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl sm:text-4xl font-bold ${cambiosELO.jugador3 >= 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                      ${cambiosELO.jugador3 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador3 >= 0 ? '+' : ''}${cambiosELO.jugador3}
                    </div>
                    <div class="text-base text-[#64748b] font-medium">
                      ${cambiosELO.jugador3 >= 0 ? 'Ganancia' : 'Pérdida'} ELO
                    </div>
                  </div>
                </div>
                <div class="flex items-center justify-between bg-white p-6 rounded-lg shadow-sm">
                  <div class="flex-1">
                    <button 
                      class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3 hover:text-[#2563eb] transition-colors cursor-pointer text-left w-full"
                      onclick="window.partidosApp.abrirModalEstadisticas(${partido.pareja2_jugador2?.id || 0})"
                      ${!partido.pareja2_jugador2?.id ? 'disabled' : ''}
                    >
                      ${partido.pareja2_jugador2?.nombre || 'Jugador 4'}
                    </button>
                    <p class="text-[#64748b] text-xl sm:text-2xl">ELO: ${partido.pareja2_jugador2?.rating_elo || 1200}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-3xl sm:text-4xl font-bold ${cambiosELO.jugador4 >= 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                      ${cambiosELO.jugador4 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador4 >= 0 ? '+' : ''}${cambiosELO.jugador4}
                    </div>
                    <div class="text-base text-[#64748b] font-medium">
                      ${cambiosELO.jugador4 >= 0 ? 'Ganancia' : 'Pérdida'} ELO
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Resultado final -->
          <div class="text-center border-t pt-8">
            <div class="bg-[#2563eb] text-white rounded-lg p-10 mb-8">
              <p class="text-4xl sm:text-5xl font-bold mb-4">
              🏆 ${ganador}
            </p>
              <p class="text-2xl sm:text-3xl opacity-90">
                ${puntuacion}
            </p>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  determinarGanador(partido) {
    if (!partido.ganador_pareja) {
      return 'No determinado';
    }

    if (partido.ganador_pareja === 1) {
      return `Pareja A (${partido.pareja1_jugador1?.nombre || 'Jugador 1'} & ${partido.pareja1_jugador2?.nombre || 'Jugador 2'})`;
    } else {
      return `Pareja B (${partido.pareja2_jugador1?.nombre || 'Jugador 3'} & ${partido.pareja2_jugador2?.nombre || 'Jugador 4'})`;
    }
  }

  formatearPuntuacion(partido) {
    const sets = [];
    
    // Set 1
    if (partido.pareja1_set1 !== null && partido.pareja2_set1 !== null) {
      sets.push(`${partido.pareja1_set1}-${partido.pareja2_set1}`);
    }
    
    // Set 2
    if (partido.pareja1_set2 !== null && partido.pareja2_set2 !== null) {
      sets.push(`${partido.pareja1_set2}-${partido.pareja2_set2}`);
    }
    
    // Set 3
    if (partido.pareja1_set3 !== null && partido.pareja2_set3 !== null) {
      sets.push(`${partido.pareja1_set3}-${partido.pareja2_set3}`);
    }
    
    return sets.length > 0 ? sets.join(' | ') : 'Sin puntuación';
  }

  // Calcular cambios de ELO para un partido
  calcularCambiosELO(partido) {
    if (!partido.ganador_pareja) {
      return { jugador1: 0, jugador2: 0, jugador3: 0, jugador4: 0 };
    }

    try {
      // Obtener ratings actuales de los jugadores desde la base de datos
      const jugador1Rating = partido.pareja1_jugador1?.rating_elo || 1200;
      const jugador2Rating = partido.pareja1_jugador2?.rating_elo || 1200;
      const jugador3Rating = partido.pareja2_jugador1?.rating_elo || 1200;
      const jugador4Rating = partido.pareja2_jugador2?.rating_elo || 1200;

      // Debug: mostrar ratings actuales
      console.log('📊 Ratings actuales:', {
        jugador1: { nombre: partido.pareja1_jugador1?.nombre, rating: jugador1Rating },
        jugador2: { nombre: partido.pareja1_jugador2?.nombre, rating: jugador2Rating },
        jugador3: { nombre: partido.pareja2_jugador1?.nombre, rating: jugador3Rating },
        jugador4: { nombre: partido.pareja2_jugador2?.nombre, rating: jugador4Rating }
      });

      // Contar sets ganados
      const sets = EloUtils.countSetsWon(
        partido.pareja1_set1, partido.pareja1_set2, partido.pareja1_set3,
        partido.pareja2_set1, partido.pareja2_set2, partido.pareja2_set3
      );

      // Calcular nuevos ratings individuales
      const nuevosRatings = EloUtils.calculateMatchRatingsImproved(
        jugador1Rating, jugador2Rating,
        jugador3Rating, jugador4Rating,
        partido.ganador_pareja,
        sets.pareja1, sets.pareja2
      );

      // Debug: mostrar nuevos ratings
      console.log('🎯 Nuevos ratings:', nuevosRatings);

      // Calcular diferencias individuales
      const cambios = {
        jugador1: Math.round(nuevosRatings.pareja1_jugador1 - jugador1Rating),
        jugador2: Math.round(nuevosRatings.pareja1_jugador2 - jugador2Rating),
        jugador3: Math.round(nuevosRatings.pareja2_jugador1 - jugador3Rating),
        jugador4: Math.round(nuevosRatings.pareja2_jugador2 - jugador4Rating)
      };

      // Debug: mostrar cambios
      console.log('📈 Cambios de ELO:', cambios);

      return cambios;
    } catch (error) {
      console.error('Error calculando cambios de ELO:', error);
      return { jugador1: 0, jugador2: 0, jugador3: 0, jugador4: 0 };
    }
  }

  // Event listeners para el modal de estadísticas
  setupEventListeners() {
    // Cerrar modal de estadísticas al hacer clic fuera de ella
    const modalEstadisticas = DOMUtils.getElement('modal-estadisticas');
    if (modalEstadisticas) {
      modalEstadisticas.addEventListener('click', (e) => {
        if (e.target === modalEstadisticas) {
          this.cerrarModalEstadisticas();
        }
      });
    }

    // Botón de cerrar modal de estadísticas
    const btnCerrarEstadisticas = DOMUtils.getElement('cerrar-modal-estadisticas');
    if (btnCerrarEstadisticas) {
      btnCerrarEstadisticas.addEventListener('click', () => {
        this.cerrarModalEstadisticas();
      });
    }

    // Botón de reintentar estadísticas
    const btnReintentarEstadisticas = DOMUtils.getElement('reintentar-estadisticas');
    if (btnReintentarEstadisticas) {
      btnReintentarEstadisticas.addEventListener('click', () => {
        if (this.currentJugadorId) {
          this.cargarEstadisticasJugador(this.currentJugadorId);
        }
      });
    }

    // Event listeners para navegación de pestañas
    document.addEventListener('click', (e) => {
      // Buscar el botón de pestaña más cercano (el botón mismo o un elemento hijo)
      const tabButton = e.target.closest('.tab-button');
      if (tabButton) {
        this.cambiarPestana(tabButton.dataset.tab);
      }
    });
  }

  // Abrir modal de estadísticas del jugador
  abrirModalEstadisticas(jugadorId) {
    // Guardar el jugadorId actual
    this.currentJugadorId = jugadorId;
    
    // Mostrar modal
    DOMUtils.getElement('modal-estadisticas').classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Mostrar pantalla de carga
    DOMUtils.getElement('loading-estadisticas').classList.remove('hidden');
    DOMUtils.getElement('error-message-estadisticas').classList.add('hidden');
    DOMUtils.getElement('main-content-estadisticas').classList.add('hidden');
    
    // Cargar datos del jugador
    this.cargarEstadisticasJugador(jugadorId);
  }

  cerrarModalEstadisticas() {
    DOMUtils.getElement('modal-estadisticas').classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // Limpiar gráfica si existe
    if (window.eloChart && typeof window.eloChart.destroy === 'function') {
      window.eloChart.destroy();
      window.eloChart = null;
    }
    
    // Limpiar jugadorId actual
    this.currentJugadorId = null;
  }

  async cargarEstadisticasJugador(jugadorId) {
    try {
      // Obtener datos del jugador con ELO calculado (igual que en la clasificación)
      const estadisticasResult = await this.supabaseService.getEstadisticasConELO();
      
      if (!estadisticasResult.success) {
        throw new Error(estadisticasResult.error);
      }
      
      // Guardar los jugadores en la propiedad de la clase
      this.jugadores = estadisticasResult.data;
      
      // Buscar el jugador en los datos de la clasificación
      console.log('Buscando jugador con ID:', jugadorId, 'Tipo:', typeof jugadorId);
      console.log('Jugadores disponibles:', estadisticasResult.data.map(j => ({ id: j.id, nombre: j.nombre })));
      
      const jugadorConELO = estadisticasResult.data.find(j => j.id === jugadorId);
      
      if (!jugadorConELO) {
        console.error('Jugador no encontrado. ID buscado:', jugadorId);
        console.error('IDs disponibles:', estadisticasResult.data.map(j => j.id));
        throw new Error('Jugador no encontrado');
      }
      
      // Obtener partidos del jugador
      const partidosResult = await this.supabaseService.getPartidosJugador(jugadorId);
      const partidos = partidosResult.success ? partidosResult.data : [];

      // Mostrar información del jugador usando los datos de la clasificación
      this.displayJugadorInfo(jugadorConELO, partidos);
      
      // Crear gráfica ELO
      this.createEloChart(partidos, jugadorId);
      
      // Calcular y mostrar estadísticas detalladas
      this.calcularEstadisticasDetalladas(partidos, jugadorId);
      
      // Mostrar últimos partidos
      this.displayRecentMatches(partidos, jugadorId);
      
      // Ocultar pantalla de carga y mostrar contenido
      DOMUtils.getElement('loading-estadisticas').classList.add('hidden');
      DOMUtils.getElement('main-content-estadisticas').classList.remove('hidden');
      
    } catch (error) {
      console.error('Error cargando estadísticas del jugador:', error);
      DOMUtils.getElement('loading-estadisticas').classList.add('hidden');
      DOMUtils.getElement('error-message-estadisticas').classList.remove('hidden');
      DOMUtils.getElement('error-text-estadisticas').textContent = error.message;
    }
  }

  displayJugadorInfo(jugador, partidos) {
    // Nombre del jugador
    DOMUtils.getElement('player-name').textContent = jugador.nombre;
    
    // Calcular y mostrar nivel del jugador
    const rating = jugador.rating_elo || 1200;
    const level = window.EloUtils ? window.EloUtils.getRatingTitle(rating) : this.getRatingTitle(rating);
    const levelElement = DOMUtils.getElement('player-level');
    if (levelElement) {
      levelElement.textContent = level;
    }
    
    // ELO actual (usar rating_elo como en la clasificación)
    const eloActual = jugador.rating_elo || 1500;
    DOMUtils.getElement('player-elo').textContent = eloActual;
    
    // Usar estadísticas del jugador (ya calculadas en la clasificación)
    const stats = jugador.estadisticas || { victorias: 0, derrotas: 0, total: 0 };
    
    // Victorias y derrotas
    DOMUtils.getElement('player-wins').textContent = stats.victorias;
    DOMUtils.getElement('player-losses').textContent = stats.derrotas;
    
    // Porcentaje de victoria
    const winRate = stats.total > 0 ? Math.round((stats.victorias / stats.total) * 100) : 0;
    DOMUtils.getElement('player-winrate').textContent = winRate + '%';
    
    // Calcular racha actual
    const rachaActual = this.calcularRachaActual(partidos, jugador.id);
    DOMUtils.getElement('player-streak').textContent = rachaActual;
    
    // Calcular progresión total del ELO (usar progresion_elo de la clasificación)
    const progresionElo = jugador.progresion_elo || 0;
    const progresionTexto = progresionElo >= 0 ? `+${Math.round(progresionElo)}` : `${Math.round(progresionElo)}`;
    DOMUtils.getElement('player-progression').textContent = progresionTexto;
    
    // Calcular y mostrar estadísticas de parejas
    this.displayParejaStats(jugador.id, partidos);
  }

  createEloChart(partidos, jugadorId) {
    const ctx = document.getElementById('eloChart').getContext('2d');
    
    // Preparar datos para la gráfica
    const chartData = this.prepareChartData(partidos, jugadorId);
    
    // Destruir gráfica anterior si existe
    if (window.eloChart && typeof window.eloChart.destroy === 'function') {
      window.eloChart.destroy();
    }
    
    window.eloChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'ELO',
          data: chartData.eloValues,
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
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#2563eb',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(context) {
                return `Partido #${context[0].label}`;
              },
              label: function(context) {
                return `ELO: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Partidos',
              color: '#64748b',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'ELO',
              color: '#64748b',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            grid: {
              display: false
            },
            ticks: {
              color: '#64748b',
              font: {
                size: 12
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  // Función para calcular y mostrar estadísticas detalladas
  calcularEstadisticasDetalladas(partidos, jugadorId) {
    if (!partidos || partidos.length === 0) {
      // Mostrar valores por defecto si no hay partidos
      DOMUtils.getElement('elo-ultimos-5').textContent = '0';
      DOMUtils.getElement('media-puntos-set').textContent = '0';
      DOMUtils.getElement('porcentaje-remontadas').textContent = '0%';
      DOMUtils.getElement('porcentaje-victorias-aplastantes').textContent = '0%';
      DOMUtils.getElement('porcentaje-derrotas-aplastantes').textContent = '0%';
      return;
    }

    // Ordenar partidos por fecha (más recientes primero)
    const partidosOrdenados = partidos.sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido));

    // 1. ELO últimos 5 partidos
    const ultimos5Partidos = partidosOrdenados.slice(0, 5);
    let progresionELOUltimos5 = 0;
    ultimos5Partidos.forEach(partido => {
      progresionELOUltimos5 += this.calcularCambioELOPartido(partido, jugadorId);
    });
    DOMUtils.getElement('elo-ultimos-5').textContent = progresionELOUltimos5 >= 0 ? `+${progresionELOUltimos5}` : `${progresionELOUltimos5}`;

    // 2. Media de puntos por set
    let totalPuntos = 0;
    let totalSets = 0;
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      if (estaEnPareja1) {
        totalPuntos += (partido.pareja1_set1 || 0) + (partido.pareja1_set2 || 0) + (partido.pareja1_set3 || 0);
        totalSets += (partido.pareja1_set1 ? 1 : 0) + (partido.pareja1_set2 ? 1 : 0) + (partido.pareja1_set3 ? 1 : 0);
      } else {
        totalPuntos += (partido.pareja2_set1 || 0) + (partido.pareja2_set2 || 0) + (partido.pareja2_set3 || 0);
        totalSets += (partido.pareja2_set1 ? 1 : 0) + (partido.pareja2_set2 ? 1 : 0) + (partido.pareja2_set3 ? 1 : 0);
      }
    });
    const mediaPuntosSet = totalSets > 0 ? (totalPuntos / totalSets).toFixed(1) : '0.0';
    DOMUtils.getElement('media-puntos-set').textContent = mediaPuntosSet;

    // 3. Porcentaje de remontadas
    let partidosConRemontada = 0;
    let partidosConPrimerSetPerdido = 0;
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) return;
      
      const primerSetPerdido = estaEnPareja1 ? 
        (partido.pareja1_set1 < partido.pareja2_set1) : 
        (partido.pareja2_set1 < partido.pareja1_set1);
      
      const esGanador = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
      
      if (primerSetPerdido) {
        partidosConPrimerSetPerdido++;
        if (esGanador) {
          partidosConRemontada++;
        }
      }
    });
    const porcentajeRemontadas = partidosConPrimerSetPerdido > 0 ? 
      Math.round((partidosConRemontada / partidosConPrimerSetPerdido) * 100) : 0;
    DOMUtils.getElement('porcentaje-remontadas').textContent = `${porcentajeRemontadas}%`;
    DOMUtils.getElement('porcentaje-remontadas').innerHTML = `${porcentajeRemontadas}% <span class="text-sm sm:text-base lg:text-lg text-gray-500">(${partidosConRemontada} de ${partidosConPrimerSetPerdido})</span>`;

    // 4. Porcentaje de victorias aplastantes
    let victoriasAplastantes = 0;
    let totalVictorias = 0;
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) return;
      
      const esGanador = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
      
      if (esGanador) {
        totalVictorias++;
        
        // Solo considerar partidos de 2 sets para victorias aplastantes
        if (!partido.pareja1_set3 && !partido.pareja2_set3) {
          const puntosGanados = estaEnPareja1 ? 
            (partido.pareja1_set1 + partido.pareja1_set2) : 
            (partido.pareja2_set1 + partido.pareja2_set2);
          const puntosPerdidos = estaEnPareja1 ? 
            (partido.pareja2_set1 + partido.pareja2_set2) : 
            (partido.pareja1_set1 + partido.pareja1_set2);
          
          if ((puntosGanados - puntosPerdidos) > 7) {
            victoriasAplastantes++;
          }
        }
      }
    });
    const porcentajeVictoriasAplastantes = totalVictorias > 0 ? 
      Math.round((victoriasAplastantes / totalVictorias) * 100) : 0;
    DOMUtils.getElement('porcentaje-victorias-aplastantes').textContent = `${porcentajeVictoriasAplastantes}%`;
    DOMUtils.getElement('porcentaje-victorias-aplastantes').innerHTML = `${porcentajeVictoriasAplastantes}% <span class="text-sm sm:text-base lg:text-lg text-gray-500">(${victoriasAplastantes} de ${totalVictorias})</span>`;

    // 5. Porcentaje de derrotas aplastantes
    let derrotasAplastantes = 0;
    let totalDerrotas = 0;
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) return;
      
      const esPerdedor = !((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2));
      
      if (esPerdedor) {
        totalDerrotas++;
        
        // Solo considerar partidos de 2 sets para derrotas aplastantes
        if (!partido.pareja1_set3 && !partido.pareja2_set3) {
          const puntosGanados = estaEnPareja1 ? 
            (partido.pareja1_set1 + partido.pareja1_set2) : 
            (partido.pareja2_set1 + partido.pareja2_set2);
          const puntosPerdidos = estaEnPareja1 ? 
            (partido.pareja2_set1 + partido.pareja2_set2) : 
            (partido.pareja1_set1 + partido.pareja1_set2);
          
          if ((puntosPerdidos - puntosGanados) > 7) {
            derrotasAplastantes++;
          }
        }
      }
    });
    const porcentajeDerrotasAplastantes = totalDerrotas > 0 ? 
      Math.round((derrotasAplastantes / totalDerrotas) * 100) : 0;
    DOMUtils.getElement('porcentaje-derrotas-aplastantes').textContent = `${porcentajeDerrotasAplastantes}%`;
    DOMUtils.getElement('porcentaje-derrotas-aplastantes').innerHTML = `${porcentajeDerrotasAplastantes}% <span class="text-sm sm:text-base lg:text-lg text-gray-500">(${derrotasAplastantes} de ${totalDerrotas})</span>`;
  }

  prepareChartData(partidos, jugadorId) {
    // Ordenar partidos por fecha
    const partidosOrdenados = partidos.sort((a, b) => new Date(a.fecha_partido) - new Date(b.fecha_partido));
    
    const labels = [];
    const eloValues = [];
    let eloActual = 1200; // ELO inicial
    
    partidosOrdenados.forEach((partido, index) => {
      // Calcular el ELO después de este partido
      const cambiosELO = this.calcularCambiosELO(partido);
      
      // Determinar qué cambio aplicar según el jugador
      let cambioELO = 0;
      if (partido.pareja1_jugador1_id === jugadorId) {
        cambioELO = cambiosELO.jugador1;
      } else if (partido.pareja1_jugador2_id === jugadorId) {
        cambioELO = cambiosELO.jugador2;
      } else if (partido.pareja2_jugador1_id === jugadorId) {
        cambioELO = cambiosELO.jugador3;
      } else if (partido.pareja2_jugador2_id === jugadorId) {
        cambioELO = cambiosELO.jugador4;
      }
      
      eloActual += cambioELO;
      
      labels.push(`#${partido.id}`);
      eloValues.push(eloActual);
    });
    
    return { labels, eloValues };
  }

  displayParejaStats(jugadorId, partidos) {
    // Obtener todos los jugadores para calcular estadísticas de parejas
    this.supabaseService.getEstadisticasConELO().then(result => {
      if (result.success) {
        const jugadores = result.data;
        const parejaStats = this.calculateParejaStats(jugadorId, partidos, jugadores);
        
        // Actualizar elementos del DOM
        DOMUtils.getElement('pareja-favorita').textContent = parejaStats.parejaFavorita.nombre || '-';
        DOMUtils.getElement('pareja-favorita-partidos').textContent = `${parejaStats.parejaFavorita.partidos} partidos`;
        
        DOMUtils.getElement('pareja-optima').textContent = parejaStats.parejaOptima.nombre || '-';
        DOMUtils.getElement('pareja-optima-wins').textContent = `${parejaStats.parejaOptima.victorias} victorias`;
        
        DOMUtils.getElement('victima-favorita').textContent = parejaStats.victimaFavorita.nombre || '-';
        DOMUtils.getElement('victima-favorita-wins').textContent = `${parejaStats.victimaFavorita.victorias} victorias`;
        
        DOMUtils.getElement('nemesis').textContent = parejaStats.nemesis.nombre || '-';
        DOMUtils.getElement('nemesis-losses').textContent = `${parejaStats.nemesis.derrotas} derrotas`;
      }
    });
  }

  calculateParejaStats(jugadorId, partidos, jugadores) {
    const parejas = {};
    const oponentes = {};
    
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      // Identificar pareja actual
      let parejaId = null;
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
        const jugador = jugadores.find(j => j.id === parseInt(parejaId));
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
        const jugador = jugadores.find(j => j.id === parseInt(parejaId));
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
        const jugador = jugadores.find(j => j.id === parseInt(oponenteId));
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
        const jugador = jugadores.find(j => j.id === parseInt(oponenteId));
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

  displayRecentMatches(partidos, jugadorId) {
    const recentMatchesContainer = DOMUtils.getElement('recent-matches');
    
    if (!partidos || partidos.length === 0) {
      recentMatchesContainer.innerHTML = `
        <div class="text-center py-6 sm:py-8">
          <div class="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">🏓</div>
          <p class="text-gray-600 text-base sm:text-lg">No hay partidos registrados aún.</p>
          <p class="text-gray-500 text-sm sm:text-base">Juega algunos partidos para ver el historial aquí.</p>
        </div>
      `;
      return;
    }
    
    // Ordenar partidos por fecha (más recientes primero) y mostrar solo los últimos 10
    const partidosOrdenados = partidos
      .sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido))
      .slice(0, 10);
    
    const matchesHTML = partidosOrdenados.map(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      const esGanador = ganadorPareja && ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2));
      
      const pareja1Names = `${partido.pareja1_jugador1?.nombre || 'N/A'} y ${partido.pareja1_jugador2?.nombre || 'N/A'}`;
      const pareja2Names = `${partido.pareja2_jugador1?.nombre || 'N/A'} y ${partido.pareja2_jugador2?.nombre || 'N/A'}`;
      
      // Calcular cambio de ELO
      const cambioELO = this.calcularCambioELOPartido(partido, jugadorId);
      const cambioELOTexto = cambioELO >= 0 ? `+${cambioELO}` : `${cambioELO}`;
      const cambioELOColor = cambioELO >= 0 ? 'text-green-600' : 'text-red-600';
      
      const fecha = new Date(partido.fecha_partido).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <!-- Información principal -->
            <div class="flex-1">
              <!-- Fecha y resultado -->
              <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                <span class="text-xl sm:text-2xl lg:text-3xl text-gray-500 font-medium">${fecha}</span>
                <div class="flex items-center space-x-3">
                  ${esGanador 
                    ? '<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xl sm:text-2xl lg:text-3xl font-bold">Victoria</span>' 
                    : '<span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xl sm:text-2xl lg:text-3xl font-bold">Derrota</span>'
                  }
                  <span class="text-xl sm:text-2xl lg:text-3xl font-bold ${cambioELOColor} flex items-center">
                    ${cambioELO >= 0 ? '↗' : '↘'} ${cambioELOTexto} ELO
                  </span>
                </div>
              </div>
              
              <!-- Parejas -->
              <div class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-blue-600 mb-3">
                ${pareja1Names} vs ${pareja2Names}
              </div>
              
              <!-- Resultado detallado -->
              <div class="text-xl sm:text-2xl lg:text-3xl text-gray-600 font-medium">
                ${partido.pareja1_set1}-${partido.pareja2_set1} | ${partido.pareja1_set2}-${partido.pareja2_set2}${partido.pareja1_set3 ? ` | ${partido.pareja1_set3}-${partido.pareja2_set3}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    recentMatchesContainer.innerHTML = matchesHTML;
  }

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

  // Función fallback para obtener el título del rating ELO
  getRatingTitle(rating) {
    if (rating >= 2000) return 'Maestro';
    if (rating >= 1800) return 'Experto';
    if (rating >= 1600) return 'Avanzado';
    if (rating >= 1400) return 'Intermedio';
    if (rating >= 1200) return 'Principiante';
    return 'Novato';
  }

  // Calcular cambio de ELO en un partido específico
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
    if (tabName === 'elo' && window.eloChart) {
      setTimeout(() => {
        window.eloChart.resize();
      }, 100);
    }
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.partidosApp = new PartidosApp();
}); 