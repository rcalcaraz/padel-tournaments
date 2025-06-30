// Aplicación principal de Torneos de Pádel
class PadelApp {
  constructor() {
    this.supabaseService = new SupabaseService(SUPABASE_CONFIG);
    this.isProcessing = false;
    this.clasificacionMode = 'victorias'; // 'victorias' o 'elo'
    this.init();
  }

  init() {
    if (!this.supabaseService.isConnected()) {
      this.showError(MESSAGES.ERROR_CONFIG + 'No se pudo conectar a Supabase');
      return;
    }

    this.hideConfigMessage();
    this.setupEventListeners();
    this.loadJugadores();
    this.actualizarBotonClasificacion();
  }

  hideConfigMessage() {
    const configMessage = DOMUtils.getElement('config-message');
    if (configMessage) {
      DOMUtils.hideElement(configMessage);
    }
  }

  setupEventListeners() {
    // Event listener para el botón de enviar partido
    const botonEnviar = DOMUtils.getElement('enviar-partido');
    if (botonEnviar) {
      // Remover event listeners anteriores para evitar duplicados
      const nuevoBoton = botonEnviar.cloneNode(true);
      botonEnviar.parentNode.replaceChild(nuevoBoton, botonEnviar);
      
      // Agregar event listener
      nuevoBoton.addEventListener('click', (e) => this.handleSubmitPartido(e));
    }

    // Event listener para el botón de cambiar clasificación
    const botonClasificacion = DOMUtils.getElement('cambiar-clasificacion');
    if (botonClasificacion) {
      botonClasificacion.addEventListener('click', () => {
        const nuevoMode = this.clasificacionMode === 'victorias' ? 'elo' : 'victorias';
        this.cambiarClasificacion(nuevoMode);
      });
    }
  }

  async loadJugadores(showFullLoading = true) {
    try {
      if (showFullLoading) {
        this.showLoading();
      }
      
      let result;
      if (this.clasificacionMode === 'elo') {
        result = await this.supabaseService.getEstadisticasPorELO();
      } else {
        result = await this.supabaseService.getEstadisticasGenerales();
      }
      
      if (!result.success) {
        throw new Error(result.error);
      }

      if (showFullLoading) {
        this.hideLoading();
      }
      
      this.displayJugadores(result.data);
      this.fillPlayerSelectors(result.data);
    } catch (error) {
      console.error('Error cargando jugadores:', error);
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
          Cargando jugadores...
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

  displayJugadores(jugadores) {
    const container = DOMUtils.getElement('jugadores-container');
    if (!container) return;

    if (!jugadores || jugadores.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <p class="text-[#648771] text-2xl sm:text-2xl font-medium">${MESSAGES.NO_PLAYERS}</p>
          <p class="text-[#648771] text-lg sm:text-lg mt-4">${MESSAGES.ADD_PLAYERS}</p>
        </div>
      `;
      return;
    }

    // Guardar estadísticas anteriores para comparar
    const estadisticasAnteriores = this.getEstadisticasAnteriores();
    
    container.innerHTML = '';
    jugadores.forEach(jugador => {
      const jugadorHTML = this.createJugadorHTML(jugador, estadisticasAnteriores);
      container.innerHTML += jugadorHTML;
    });
    
    // Guardar estadísticas actuales para la próxima comparación
    this.guardarEstadisticasActuales(jugadores);
    
    // Detener animaciones después de 3 segundos
    setTimeout(() => {
      this.detenerAnimaciones();
    }, 3000);
  }

  createJugadorHTML(jugador, estadisticasAnteriores) {
    const statsAnteriores = estadisticasAnteriores[jugador.id] || { victorias: 0, derrotas: 0 };
    const victoriasCambiaron = statsAnteriores.victorias !== jugador.estadisticas.victorias;
    const derrotasCambiaron = statsAnteriores.derrotas !== jugador.estadisticas.derrotas;
    const tieneCambios = victoriasCambiaron || derrotasCambiaron;
    
    const claseAnimacion = tieneCambios ? 'animate-pulse bg-green-50' : '';
    
    // Mostrar ELO o victorias/derrotas según el modo
    let estadisticasHTML = '';
    if (this.clasificacionMode === 'elo') {
      const ratingColor = EloUtils.getRatingColor(jugador.rating_elo || 1200);
      const ratingTitle = EloUtils.getRatingTitle(jugador.rating_elo || 1200);
      estadisticasHTML = `
        <div class="flex items-center gap-4">
          <span class="text-[#648771] text-3xl font-normal leading-normal">
            ELO: <span style="color: ${ratingColor}; font-weight: bold;">${jugador.rating_elo || 1200}</span>
          </span>
          <span class="text-[#648771] text-xl font-normal leading-normal">
            ${ratingTitle}
          </span>
        </div>
        <div class="flex items-center gap-4 mt-2">
          <span class="text-[#648771] text-2xl font-normal leading-normal ${victoriasCambiaron ? 'text-green-600 font-bold' : ''}">
            W:${jugador.estadisticas.victorias}
          </span>
          <span class="text-[#648771] text-2xl font-normal leading-normal ${derrotasCambiaron ? 'text-red-600 font-bold' : ''}">
            L:${jugador.estadisticas.derrotas}
          </span>
        </div>
      `;
    } else {
      estadisticasHTML = `
        <div class="flex items-center gap-4">
          <span class="text-[#648771] text-3xl font-normal leading-normal ${victoriasCambiaron ? 'text-green-600 font-bold' : ''}">
            W:${jugador.estadisticas.victorias}
          </span>
          <span class="text-[#648771] text-3xl font-normal leading-normal ${derrotasCambiaron ? 'text-red-600 font-bold' : ''}">
            L:${jugador.estadisticas.derrotas}
          </span>
        </div>
      `;
    }
    
    return `
      <div class="flex items-center gap-10 bg-white p-10 rounded-lg shadow-sm hover:shadow-md transition-shadow player-card ${claseAnimacion}">
        <div class="bg-[#38e078] bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 flex-shrink-0 flex items-center justify-center text-white text-4xl font-bold">
          ${StringUtils.capitalize(jugador.nombre.charAt(0))}
        </div>
        <div class="flex flex-col justify-center min-w-0">
          <p class="text-[#111714] text-4xl font-medium leading-normal truncate">${jugador.nombre}</p>
          ${estadisticasHTML}
        </div>
      </div>
    `;
  }

  getEstadisticasAnteriores() {
    const stats = StorageUtils.get('estadisticas_anteriores', {});
    return stats;
  }

  guardarEstadisticasActuales(jugadores) {
    const estadisticas = {};
    jugadores.forEach(jugador => {
      estadisticas[jugador.id] = {
        victorias: jugador.estadisticas.victorias,
        derrotas: jugador.estadisticas.derrotas
      };
    });
    StorageUtils.set('estadisticas_anteriores', estadisticas);
  }

  fillPlayerSelectors(jugadores) {
    const selectores = ['jugador1', 'jugador2', 'jugador3', 'jugador4'];
    
    selectores.forEach(selectorId => {
      const selector = DOMUtils.getElement(selectorId);
      if (!selector) return;

      // Remover event listeners anteriores para evitar duplicados
      const nuevoSelector = selector.cloneNode(true);
      selector.parentNode.replaceChild(nuevoSelector, selector);

      // Limpiar opciones existentes excepto la primera
      nuevoSelector.innerHTML = nuevoSelector.innerHTML.split('</option>')[0] + '</option>';
      
      jugadores.forEach(jugador => {
        const option = DOMUtils.createElement('option', '', jugador.nombre);
        option.value = jugador.id;
        nuevoSelector.appendChild(option);
      });
      
      // Agregar event listener para actualizar opciones
      nuevoSelector.addEventListener('change', () => this.updateAvailableOptions());
    });
    
    // Aplicar validación inicial
    this.updateAvailableOptions();
  }

  updateAvailableOptions() {
    const selectores = ['jugador1', 'jugador2', 'jugador3', 'jugador4'];
    const valoresSeleccionados = selectores.map(id => DOMUtils.getElement(id)?.value);
    
    selectores.forEach((selectorId, indexSelector) => {
      const selector = DOMUtils.getElement(selectorId);
      if (!selector) return;

      const valorActual = selector.value;
      
      Array.from(selector.options).forEach(option => {
        if (option.value === '') {
          option.disabled = false;
        } else {
          const estaSeleccionadoEnOtro = valoresSeleccionados.some((valor, index) => 
            valor === option.value && index !== indexSelector
          );
          
          option.disabled = estaSeleccionadoEnOtro;
          
          if (estaSeleccionadoEnOtro && option.value === valorActual) {
            selector.value = '';
          }
        }
      });
    });
  }

  validateForm() {
    const jugadores = [
      DOMUtils.getElement('jugador1')?.value,
      DOMUtils.getElement('jugador2')?.value,
      DOMUtils.getElement('jugador3')?.value,
      DOMUtils.getElement('jugador4')?.value
    ];

    // Verificar que todos los jugadores estén seleccionados
    if (jugadores.some(j => !j)) {
      alert(MESSAGES.VALIDATION_PLAYERS);
      return false;
    }

    // Verificar que no haya jugadores duplicados
    if (ValidationUtils.hasDuplicates(jugadores)) {
      alert(MESSAGES.VALIDATION_DUPLICATES);
      return false;
    }

    // Verificar que al menos un set tenga puntuación
    const sets = [
      DOMUtils.getElement('pareja1-set1')?.value,
      DOMUtils.getElement('pareja1-set2')?.value,
      DOMUtils.getElement('pareja1-set3')?.value,
      DOMUtils.getElement('pareja2-set1')?.value,
      DOMUtils.getElement('pareja2-set2')?.value,
      DOMUtils.getElement('pareja2-set3')?.value
    ];

    if (sets.every(s => !s)) {
      alert(MESSAGES.VALIDATION_SETS);
      return false;
    }

    return true;
  }

  getFormData() {
    return {
      pareja1_jugador1_id: parseInt(DOMUtils.getElement('jugador1').value),
      pareja1_jugador2_id: parseInt(DOMUtils.getElement('jugador2').value),
      pareja2_jugador1_id: parseInt(DOMUtils.getElement('jugador3').value),
      pareja2_jugador2_id: parseInt(DOMUtils.getElement('jugador4').value),
      pareja1_set1: DOMUtils.getElement('pareja1-set1').value ? parseInt(DOMUtils.getElement('pareja1-set1').value) : null,
      pareja1_set2: DOMUtils.getElement('pareja1-set2').value ? parseInt(DOMUtils.getElement('pareja1-set2').value) : null,
      pareja1_set3: DOMUtils.getElement('pareja1-set3').value ? parseInt(DOMUtils.getElement('pareja1-set3').value) : null,
      pareja2_set1: DOMUtils.getElement('pareja2-set1').value ? parseInt(DOMUtils.getElement('pareja2-set1').value) : null,
      pareja2_set2: DOMUtils.getElement('pareja2-set2').value ? parseInt(DOMUtils.getElement('pareja2-set2').value) : null,
      pareja2_set3: DOMUtils.getElement('pareja2-set3').value ? parseInt(DOMUtils.getElement('pareja2-set3').value) : null
    };
  }

  async handleSubmitPartido(e) {
    e.preventDefault();
    
    // Evitar múltiples envíos simultáneos
    if (this.isProcessing) {
      return;
    }
    
    if (!this.validateForm()) {
      return;
    }

    this.isProcessing = true;
    const botonEnviar = DOMUtils.getElement('enviar-partido');
    const originalText = botonEnviar.innerHTML;
    
    botonEnviar.innerHTML = `<span class="truncate">${MESSAGES.LOADING}</span>`;
    botonEnviar.disabled = true;

    try {
      const datosPartido = this.getFormData();
      const result = await this.supabaseService.createPartido(datosPartido);
      
      if (result.success) {
        this.resetForm();
        // Actualizar automáticamente la clasificación
        await this.loadJugadores(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error en el proceso:', error);
      alert(MESSAGES.ERROR_SAVING + error.message);
    } finally {
      botonEnviar.innerHTML = originalText;
      botonEnviar.disabled = false;
      this.isProcessing = false;
    }
  }

  resetForm() {
    // Resetear selectores de jugadores
    const selectores = ['jugador1', 'jugador2', 'jugador3', 'jugador4'];
    selectores.forEach(selectorId => {
      const selector = DOMUtils.getElement(selectorId);
      if (selector) {
        selector.value = '';
      }
    });

    // Resetear campos de puntuación
    const camposPuntuacion = [
      'pareja1-set1', 'pareja1-set2', 'pareja1-set3',
      'pareja2-set1', 'pareja2-set2', 'pareja2-set3'
    ];
    camposPuntuacion.forEach(campoId => {
      const campo = DOMUtils.getElement(campoId);
      if (campo) {
        campo.value = '';
        DOMUtils.setStyle(campo, 'backgroundColor', '#ffffff');
        DOMUtils.setStyle(campo, 'borderColor', '#dce5df');
      }
    });

    // Actualizar opciones disponibles
    this.updateAvailableOptions();
  }

  detenerAnimaciones() {
    // Obtener todas las tarjetas de jugadores con animación
    const tarjetasAnimadas = DOMUtils.getElements('.player-card.animate-pulse');
    
    tarjetasAnimadas.forEach(tarjeta => {
      // Remover clases de animación
      DOMUtils.removeClass(tarjeta, 'animate-pulse');
      DOMUtils.removeClass(tarjeta, 'bg-green-50');
      
      // Remover colores destacados de las estadísticas
      const spans = tarjeta.querySelectorAll('span');
      
      spans.forEach(span => {
        if (span.textContent.includes('W:')) {
          DOMUtils.removeClass(span, 'text-green-600');
          DOMUtils.removeClass(span, 'font-bold');
        }
        
        if (span.textContent.includes('L:')) {
          DOMUtils.removeClass(span, 'text-red-600');
          DOMUtils.removeClass(span, 'font-bold');
        }
      });
    });
  }

  // Cambiar modo de clasificación
  async cambiarClasificacion(mode) {
    this.clasificacionMode = mode;
    await this.loadJugadores(true);
    this.actualizarBotonClasificacion();
  }

  // Actualizar el botón de clasificación
  actualizarBotonClasificacion() {
    const boton = DOMUtils.getElement('cambiar-clasificacion');
    if (boton) {
      if (this.clasificacionMode === 'elo') {
        boton.innerHTML = 'Ver por Victorias/Derrotas';
        boton.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
      } else {
        boton.innerHTML = 'Ver por ELO';
        boton.className = 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors';
      }
    }
  }
}

// Función global para validar inputs de sets
function validarInputSet(input) {
  let valor = input.value;
  
  // Remover caracteres no numéricos
  valor = valor.replace(/[^0-9]/g, '');
  
  // Convertir a número
  let numero = parseInt(valor) || 0;
  
  // Aplicar límites
  if (numero < APP_CONFIG.MIN_SETS) numero = APP_CONFIG.MIN_SETS;
  if (numero > APP_CONFIG.MAX_SETS) numero = APP_CONFIG.MAX_SETS;
  
  // Actualizar el valor del input
  input.value = numero;
  
  // Cambiar estilo según si tiene valor (incluyendo 0) o está vacío
  if (input.value !== '') {
    DOMUtils.setStyle(input, 'backgroundColor', '#f0f9ff');
    DOMUtils.setStyle(input, 'borderColor', COLORS.primary);
  } else {
    DOMUtils.setStyle(input, 'backgroundColor', '#ffffff');
    DOMUtils.setStyle(input, 'borderColor', '#dce5df');
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Verificar si ya existe una instancia
  if (window.padelApp) {
    return;
  }
  
  window.padelApp = new PadelApp();
}); 