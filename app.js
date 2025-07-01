// Aplicación principal de Torneos de Pádel
class PadelApp {
  constructor() {
    this.supabaseService = new SupabaseService(SUPABASE_CONFIG);
    this.isProcessing = false;
    this.ordenActual = 'victorias'; // 'victorias' o 'elo'
    this.jugadores = []; // Almacenar jugadores para ordenar localmente
    this.init();
  }

  init(showLoadingScreen = true) {
    if (!this.supabaseService.isConnected()) {
      this.showError(MESSAGES.ERROR_CONFIG + 'No se pudo conectar a Supabase');
      return;
    }

    this.hideConfigMessage();
    this.setupEventListeners();
    
    if (showLoadingScreen) {
      this.startLoadingScreen();
    } else {
      this.showMainContent();
      this.loadJugadores();
    }
  }

  showMainContent() {
    const loadingScreen = DOMUtils.getElement('loading-screen');
    const mainContent = DOMUtils.getElement('main-content');
    
    // Ocultar pantalla de carga si existe
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    
    // Mostrar contenido principal sin animación
    if (mainContent) {
      mainContent.classList.remove('hidden');
    }
  }

  startLoadingScreen() {
    // Mostrar pantalla de carga
    const loadingScreen = DOMUtils.getElement('loading-screen');
    const mainContent = DOMUtils.getElement('main-content');
    
    if (loadingScreen) {
      loadingScreen.style.display = 'block';
    }
    
    if (mainContent) {
      mainContent.classList.add('hidden');
    }

    // Cargar datos en segundo plano
    this.loadJugadores().then(() => {
      // Esperar al menos 2 segundos
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 2000);
    }).catch((error) => {
      console.error('Error durante la carga:', error);
      // Si hay error, mostrar pantalla principal después de 2 segundos
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 2000);
    });
  }

  hideLoadingScreen() {
    const loadingScreen = DOMUtils.getElement('loading-screen');
    const mainContent = DOMUtils.getElement('main-content');
    
    // Ocultar pantalla de carga
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    
    // Mostrar contenido principal
    if (mainContent) {
      mainContent.classList.remove('hidden');
    }
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

    // Event listeners para los botones de ordenación
    const botonVictorias = DOMUtils.getElement('ordenar-victorias');
    const botonELO = DOMUtils.getElement('ordenar-elo');
    const botonProgresion = DOMUtils.getElement('ordenar-progresion');
    
    if (botonVictorias) {
      botonVictorias.addEventListener('click', () => {
        this.cambiarOrden('victorias');
      });
    }
    
    if (botonELO) {
      botonELO.addEventListener('click', () => {
        this.cambiarOrden('elo');
      });
    }
    
    if (botonProgresion) {
      botonProgresion.addEventListener('click', () => {
        this.cambiarOrden('progresion');
      });
    }
  }

  async loadJugadores() {
    try {
      // Siempre obtener estadísticas con ELO
      const result = await this.supabaseService.getEstadisticasConELO();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Guardar jugadores para ordenar localmente
      this.jugadores = result.data;
      
      // Ordenar por defecto por victorias
      this.ordenarJugadores('victorias');
      
      this.displayJugadores(this.jugadores);
      this.fillPlayerSelectors(this.jugadores);
      this.actualizarBotonesOrdenacion();
      
      return result;
    } catch (error) {
      console.error('Error cargando jugadores:', error);
      this.showError(MESSAGES.ERROR_LOADING + error.message);
      throw error;
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
          <p class="text-[#64748b] text-2xl sm:text-2xl font-medium">${MESSAGES.NO_PLAYERS}</p>
          <p class="text-[#64748b] text-lg sm:text-lg mt-4">${MESSAGES.ADD_PLAYERS}</p>
        </div>
      `;
      return;
    }

    // Guardar estadísticas anteriores para comparar
    const estadisticasAnteriores = this.getEstadisticasAnteriores();
    
    container.innerHTML = '';
    jugadores.forEach((jugador, index) => {
      const posicion = index + 1;
      const jugadorHTML = this.createJugadorHTML(jugador, estadisticasAnteriores, posicion);
      container.innerHTML += jugadorHTML;
    });
    
    // Guardar estadísticas actuales para la próxima comparación
    this.guardarEstadisticasActuales(jugadores);
    
    // Añadir event listeners para el destacado de tarjetas
    this.setupPlayerCardListeners();
    
    // Detener animaciones después de 3 segundos
    setTimeout(() => {
      this.detenerAnimaciones();
    }, 3000);
  }

  createJugadorHTML(jugador, estadisticasAnteriores, posicion) {
    const statsAnteriores = estadisticasAnteriores[jugador.id] || { victorias: 0, derrotas: 0 };
    const victoriasCambiaron = statsAnteriores.victorias !== jugador.estadisticas.victorias;
    const derrotasCambiaron = statsAnteriores.derrotas !== jugador.estadisticas.derrotas;
    const tieneCambios = victoriasCambiaron || derrotasCambiaron;
    
    const claseAnimacion = tieneCambios ? 'animate-pulse bg-green-50' : '';
    
    // Siempre mostrar victorias, derrotas y ELO
    const ratingColor = EloUtils.getRatingColor(jugador.rating_elo || 1200);
    const ratingTitle = EloUtils.getRatingTitle(jugador.rating_elo || 1200);
    const totalPartidos = jugador.estadisticas.victorias + jugador.estadisticas.derrotas;
    
    const estadisticasHTML = `
      <div class="flex items-center gap-6">
        <span class="text-[#64748b] text-3xl font-normal leading-normal ${victoriasCambiaron ? 'text-green-600 font-bold' : ''}">
          W:${jugador.estadisticas.victorias}
        </span>
        <span class="text-[#64748b] text-3xl font-normal leading-normal ${derrotasCambiaron ? 'text-red-600 font-bold' : ''}">
          L:${jugador.estadisticas.derrotas}
        </span>
        <span class="text-[#64748b] text-2xl font-normal leading-normal">
          (${totalPartidos} partidos)
        </span>
      </div>
      <div class="flex items-center gap-6 mt-3">
        <span class="text-[#64748b] text-2xl font-normal leading-normal">
          ELO: <span style="color: ${ratingColor}; font-weight: bold;">${jugador.rating_elo || 1200}</span>
        </span>
        <span class="text-[#64748b] text-xl font-normal leading-normal">
          ${ratingTitle}
        </span>
      </div>
      <div class="flex items-center gap-6 mt-3">
        <span class="text-[#64748b] text-xl font-normal leading-normal">
          Progresión: <span style="color: ${jugador.progresion_elo >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
            ${jugador.progresion_elo >= 0 ? '+' : ''}${jugador.progresion_elo || 0}
          </span>
        </span>
      </div>
    `;
    
    return `
      <div class="flex items-center gap-12 bg-white p-12 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 player-card ${claseAnimacion} cursor-pointer" data-jugador-id="${jugador.id}">
        <div class="flex items-center justify-center w-20 h-20 bg-[#111714] text-white text-4xl font-bold rounded-full flex-shrink-0">
          ${posicion}
        </div>
        <div class="bg-[#2563eb] bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 flex-shrink-0 flex items-center justify-center text-white text-4xl font-bold">
          ${StringUtils.capitalize(jugador.nombre.charAt(0))}
        </div>
        <div class="flex flex-col justify-center min-w-0">
          <p class="text-[#1e293b] text-5xl font-medium leading-normal truncate">${jugador.nombre}</p>
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
    
    botonEnviar.innerHTML = `<span class="truncate">Enviando...</span>`;
    botonEnviar.disabled = true;

    try {
      const datosPartido = this.getFormData();
      const result = await this.supabaseService.createPartido(datosPartido);
      
      if (result.success) {
        this.resetForm();
        // Actualizar automáticamente la clasificación
        await this.loadJugadores();
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
        DOMUtils.setStyle(campo, 'borderColor', '#dbeafe');
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

  setupPlayerCardListeners() {
    const playerCards = DOMUtils.getElements('.player-card');
    
    playerCards.forEach(card => {
      card.addEventListener('click', () => {
        // Remover destacado de todas las tarjetas
        playerCards.forEach(c => {
          DOMUtils.removeClass(c, 'ring-4');
          DOMUtils.removeClass(c, 'ring-blue-500');
          DOMUtils.removeClass(c, 'ring-opacity-50');
          DOMUtils.removeClass(c, 'scale-105');
          DOMUtils.removeClass(c, 'shadow-lg');
        });
        
        // Añadir destacado a la tarjeta clickeada
        DOMUtils.addClass(card, 'ring-4');
        DOMUtils.addClass(card, 'ring-blue-500');
        DOMUtils.addClass(card, 'ring-opacity-50');
        DOMUtils.addClass(card, 'scale-105');
        DOMUtils.addClass(card, 'shadow-lg');
      });
    });
  }

  // Ordenar jugadores según el criterio especificado
  ordenarJugadores(criterio) {
    this.ordenActual = criterio;
    
    if (criterio === 'victorias') {
      // Ordenar por victorias (descendente), en caso de empate por menos partidos jugados
      this.jugadores.sort((a, b) => {
        const victoriasA = a.estadisticas.victorias;
        const victoriasB = b.estadisticas.victorias;
        const totalA = a.estadisticas.victorias + a.estadisticas.derrotas;
        const totalB = b.estadisticas.victorias + b.estadisticas.derrotas;
        
        if (victoriasA !== victoriasB) {
          return victoriasB - victoriasA; // Más victorias primero
        } else {
          return totalA - totalB; // Menos partidos jugados primero en caso de empate
        }
      });
    } else if (criterio === 'elo') {
      // Ordenar por ELO (descendente)
      this.jugadores.sort((a, b) => {
        return (b.rating_elo || 1200) - (a.rating_elo || 1200);
      });
    } else if (criterio === 'progresion') {
      // Ordenar por progresión de ELO (descendente)
      this.jugadores.sort((a, b) => {
        return (b.progresion_elo || 0) - (a.progresion_elo || 0);
      });
    }
    
    // Actualizar la visualización
    this.displayJugadores(this.jugadores);
    this.actualizarBotonesOrdenacion();
  }

  // Cambiar orden de clasificación
  cambiarOrden(criterio) {
    this.ordenarJugadores(criterio);
  }

  // Actualizar el estado visual de los botones de ordenación
  actualizarBotonesOrdenacion() {
    const botonVictorias = DOMUtils.getElement('ordenar-victorias');
    const botonELO = DOMUtils.getElement('ordenar-elo');
    const botonProgresion = DOMUtils.getElement('ordenar-progresion');
    
    if (botonVictorias && botonELO && botonProgresion) {
      // Resetear todos los botones al estado inactivo
      const botones = [botonVictorias, botonELO, botonProgresion];
      botones.forEach(boton => {
        boton.className = 'px-8 py-4 text-[#64748b] rounded-xl transition-all duration-200 text-2xl font-medium whitespace-nowrap hover:text-[#1e293b]';
      });
      
      // Activar el botón correspondiente al orden actual
      if (this.ordenActual === 'victorias') {
        botonVictorias.className = 'px-8 py-4 bg-white text-[#1e293b] rounded-xl shadow-sm transition-all duration-200 text-2xl font-medium whitespace-nowrap';
      } else if (this.ordenActual === 'elo') {
        botonELO.className = 'px-8 py-4 bg-white text-[#1e293b] rounded-xl shadow-sm transition-all duration-200 text-2xl font-medium whitespace-nowrap';
      } else if (this.ordenActual === 'progresion') {
        botonProgresion.className = 'px-8 py-4 bg-white text-[#1e293b] rounded-xl shadow-sm transition-all duration-200 text-2xl font-medium whitespace-nowrap';
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
    DOMUtils.setStyle(input, 'backgroundColor', '#dbeafe');
    DOMUtils.setStyle(input, 'borderColor', '#2563eb');
  } else {
    DOMUtils.setStyle(input, 'backgroundColor', '#ffffff');
    DOMUtils.setStyle(input, 'borderColor', '#dbeafe');
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Verificar si ya existe una instancia
  if (window.padelApp) {
    return;
  }
  
  // Detectar si es una nueva sesión (primera carga de la página)
  // Si no existe sessionStorage o si es una recarga de página
  const isNewSession = !sessionStorage.getItem('padelAppSession') || 
                      performance.navigation.type === 1; // 1 = recarga de página
  
  // Marcar que la sesión está activa
  sessionStorage.setItem('padelAppSession', 'true');
  
  window.padelApp = new PadelApp();
  window.padelApp.init(isNewSession);
}); 