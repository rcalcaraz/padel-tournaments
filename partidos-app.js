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
      const result = await this.supabaseService.getPartidos();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      this.hideLoading();
      this.displayPartidos(result.data);
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
          
          <!-- Jugadores -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div class="text-center lg:text-left">
              <h4 class="text-[#111714] text-xl sm:text-2xl font-bold mb-3 ${partido.ganador_pareja === 1 ? 'text-[#38e078]' : 'text-[#648771]'}">
                Pareja 1
              </h4>
              <p class="text-[#111714] text-lg sm:text-xl mb-2 font-medium">${partido.pareja1_jugador1?.nombre || 'Jugador 1'}</p>
              <p class="text-[#111714] text-lg sm:text-xl mb-4">${partido.pareja1_jugador2?.nombre || 'Jugador 2'}</p>
              <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 1: ${partido.pareja1_set1 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 2: ${partido.pareja1_set2 || '-'}</span>
                <span class="text-[#648771] text-lg sm:text-xl font-medium">Set 3: ${partido.pareja1_set3 || '-'}</span>
              </div>
            </div>
            
            <div class="text-center lg:text-left">
              <h4 class="text-[#111714] text-xl sm:text-2xl font-bold mb-3 ${partido.ganador_pareja === 2 ? 'text-[#38e078]' : 'text-[#648771]'}">
                Pareja 2
              </h4>
              <p class="text-[#111714] text-lg sm:text-xl mb-2 font-medium">${partido.pareja2_jugador1?.nombre || 'Jugador 3'}</p>
              <p class="text-[#111714] text-lg sm:text-xl mb-4">${partido.pareja2_jugador2?.nombre || 'Jugador 4'}</p>
              <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
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
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.partidosApp = new PartidosApp();
}); 