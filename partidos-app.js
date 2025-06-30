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
      const partidos = await this.supabaseService.getPartidos();
      
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
        <div class="inline-flex items-center px-6 py-3 sm:px-4 sm:py-2 font-semibold leading-6 text-lg sm:text-sm shadow rounded-md text-white bg-[#38e078] transition ease-in-out duration-150">
          <svg class="animate-spin -ml-1 mr-3 h-6 w-6 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando partidos...
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
        <div class="text-center py-10">
          <p class="text-[#648771] text-2xl sm:text-2xl font-medium">${MESSAGES.NO_MATCHES}</p>
          <p class="text-[#648771] text-lg sm:text-lg mt-4">${MESSAGES.PLAY_MATCHES}</p>
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
      <div class="bg-white p-6 sm:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow match-card">
        <div class="flex flex-col gap-6">
          <!-- Encabezado del partido -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 class="text-[#111714] text-2xl sm:text-3xl font-bold mb-2">Partido #${partido.id}</h3>
              <p class="text-[#648771] text-lg sm:text-xl">${fecha}</p>
            </div>
            <div class="text-center sm:text-right">
              <span class="inline-block px-4 py-2 rounded-full text-white text-lg sm:text-xl font-bold bg-[#38e078]">
                Ganador: Pareja ${partido.ganador_pareja || 'No determinado'}
              </span>
            </div>
          </div>
          
          <!-- Jugadores con cambios de ELO -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div class="text-center lg:text-left">
              <h4 class="text-[#111714] text-xl sm:text-2xl font-bold mb-3 ${partido.ganador_pareja === 1 ? 'text-[#38e078]' : 'text-[#648771]'}">
                Pareja 1
              </h4>
              <div class="space-y-3">
                <div class="flex items-center justify-center lg:justify-start gap-3">
                  <p class="text-[#111714] text-lg sm:text-xl font-medium">${partido.pareja1_jugador1?.nombre || 'Jugador 1'}</p>
                  <span class="text-xs px-2 py-1 rounded-full font-bold ${cambiosELO.jugador1 >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${cambiosELO.jugador1 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador1 >= 0 ? '+' : ''}${cambiosELO.jugador1}
                  </span>
                </div>
                <div class="flex items-center justify-center lg:justify-start gap-3">
                  <p class="text-[#111714] text-lg sm:text-xl font-medium">${partido.pareja1_jugador2?.nombre || 'Jugador 2'}</p>
                  <span class="text-xs px-2 py-1 rounded-full font-bold ${cambiosELO.jugador2 >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${cambiosELO.jugador2 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador2 >= 0 ? '+' : ''}${cambiosELO.jugador2}
                  </span>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 mt-4">
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 1: ${partido.pareja1_set1 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 2: ${partido.pareja1_set2 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 3: ${partido.pareja1_set3 || '-'}</span>
              </div>
            </div>
            
            <div class="text-center lg:text-left">
              <h4 class="text-[#111714] text-xl sm:text-2xl font-bold mb-3 ${partido.ganador_pareja === 2 ? 'text-[#38e078]' : 'text-[#648771]'}">
                Pareja 2
              </h4>
              <div class="space-y-3">
                                <div class="flex items-center justify-center lg:justify-start gap-3">
                  <p class="text-[#111714] text-lg sm:text-xl font-medium">${partido.pareja2_jugador1?.nombre || 'Jugador 3'}</p>
                  <span class="text-xs px-2 py-1 rounded-full font-bold ${cambiosELO.jugador3 >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${cambiosELO.jugador3 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador3 >= 0 ? '+' : ''}${cambiosELO.jugador3}
                  </span>
                </div>
                <div class="flex items-center justify-center lg:justify-start gap-3">
                  <p class="text-[#111714] text-lg sm:text-xl font-medium">${partido.pareja2_jugador2?.nombre || 'Jugador 4'}</p>
                  <span class="text-xs px-2 py-1 rounded-full font-bold ${cambiosELO.jugador4 >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${cambiosELO.jugador4 >= 0 ? '↗' : '↘'} ${cambiosELO.jugador4 >= 0 ? '+' : ''}${cambiosELO.jugador4}
                  </span>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4 mt-4">
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 1: ${partido.pareja2_set1 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 2: ${partido.pareja2_set2 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 3: ${partido.pareja2_set3 || '-'}</span>
              </div>
            </div>
          </div>
          
          <!-- Resultado final -->
          <div class="text-center border-t pt-4">
            <p class="text-[#111714] text-xl sm:text-2xl font-bold mb-2">
              Resultado Final
            </p>
            <p class="text-[#38e078] text-lg sm:text-xl font-semibold">
              🏆 ${ganador}
            </p>
            <p class="text-[#648771] text-lg sm:text-xl mt-2">
              Puntuación: ${puntuacion}
            </p>
            <div class="mt-3 text-xs text-gray-500">
              <span class="inline-flex items-center gap-1 mr-4">
                <span class="w-3 h-3 bg-green-100 rounded-full"></span>
                ↗ Ganancia ELO
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="w-3 h-3 bg-red-100 rounded-full"></span>
                ↘ Pérdida ELO
              </span>
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
      return `Pareja 1 (${partido.pareja1_jugador1?.nombre || 'Jugador 1'} & ${partido.pareja1_jugador2?.nombre || 'Jugador 2'})`;
    } else {
      return `Pareja 2 (${partido.pareja2_jugador1?.nombre || 'Jugador 3'} & ${partido.pareja2_jugador2?.nombre || 'Jugador 4'})`;
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