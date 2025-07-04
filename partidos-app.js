// Aplicación para la página de partidos
class PartidosApp {
  constructor() {
    this.supabaseService = new SupabaseService(SUPABASE_CONFIG);
    this.init();
  }

  init() {
    if (!this.supabaseService.isConnected()) {
      this.showError(MESSAGES.ERROR_CONFIG + 'No se pudo conectar a Supabase');
      return;
    }

    this.hideConfigMessage();
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
              <h3 class="text-[#1e293b] text-4xl sm:text-5xl font-bold mb-3">Partido #${partido.id}</h3>
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
                    <p class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3">${partido.pareja1_jugador1?.nombre || 'Jugador 1'}</p>
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
                    <p class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3">${partido.pareja1_jugador2?.nombre || 'Jugador 2'}</p>
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
                    <p class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3">${partido.pareja2_jugador1?.nombre || 'Jugador 3'}</p>
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
                    <p class="text-[#1e293b] text-2xl sm:text-3xl font-medium mb-3">${partido.pareja2_jugador2?.nombre || 'Jugador 4'}</p>
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
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.partidosApp = new PartidosApp();
}); 