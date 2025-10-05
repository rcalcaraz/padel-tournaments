// Aplicación principal de Torneos de Pádel
class PadelApp {
  constructor() {
    this.supabaseService = new SupabaseService(SUPABASE_CONFIG);
    this.isProcessing = false;
    this.ordenActual = 'victorias'; // 'victorias' o 'elo'
    this.jugadores = []; // Almacenar jugadores para ordenar localmente
    this.currentJugadorId = null; // Para el modal de estadísticas
    
    // Hacer disponible globalmente para el script de recálculo
    window.supabaseService = this.supabaseService;
    
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
      // Esperar al menos 1 segundo
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 1000);
    }).catch((error) => {
      console.error('Error durante la carga:', error);
      // Si hay error, mostrar pantalla principal después de 1 segundo
      setTimeout(() => {
        this.hideLoadingScreen();
      }, 1000);
    });
  }

  hideLoadingScreen() {
    const loadingScreen = DOMUtils.getElement('loading-screen');
    const mainContent = DOMUtils.getElement('main-content');
    
    // Añadir transición de fade out a la pantalla de carga
    if (loadingScreen) {
      loadingScreen.style.transition = 'opacity 0.5s ease-out';
      loadingScreen.style.opacity = '0';
      
      // Ocultar completamente después de la transición
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
    
    // Mostrar contenido principal con fade in
    if (mainContent) {
      mainContent.classList.remove('hidden');
      mainContent.style.opacity = '0';
      mainContent.style.transition = 'opacity 0.5s ease-in';
      
      // Trigger reflow para que la transición funcione
      mainContent.offsetHeight;
      
      // Aplicar opacidad completa
      mainContent.style.opacity = '1';
    }
  }

  hideConfigMessage() {
    const configMessage = DOMUtils.getElement('config-message');
    if (configMessage) {
      DOMUtils.hideElement(configMessage);
    }
  }

  setupEventListeners() {
    // Event listeners para ordenación
    DOMUtils.getElement('ordenar-victorias').addEventListener('click', () => this.ordenarJugadores('victorias'));
    DOMUtils.getElement('ordenar-elo').addEventListener('click', () => this.ordenarJugadores('elo'));
    DOMUtils.getElement('ordenar-progresion').addEventListener('click', () => this.ordenarJugadores('progresion'));
    
    // Event listeners para la modal
    DOMUtils.getElement('abrir-modal-partido').addEventListener('click', () => this.abrirModal());
    DOMUtils.getElement('cerrar-modal').addEventListener('click', () => this.cerrarModal());
    
    // Cerrar modal al hacer clic fuera de ella
    DOMUtils.getElement('modal-partido').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.cerrarModal();
      }
    });
    
    // Event listeners para el modal de estadísticas
    DOMUtils.getElement('cerrar-modal-estadisticas').addEventListener('click', () => this.cerrarModalEstadisticas());
    
    // Cerrar modal de estadísticas al hacer clic fuera de ella
    DOMUtils.getElement('modal-estadisticas').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.cerrarModalEstadisticas();
      }
    });
    
    // Botón de reintentar estadísticas
    DOMUtils.getElement('reintentar-estadisticas').addEventListener('click', () => {
      // Obtener el jugadorId del modal actual (necesitamos almacenarlo)
      if (this.currentJugadorId) {
        this.cargarEstadisticasJugador(this.currentJugadorId);
      }
    });
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOMUtils.getElement('modal-partido').classList.contains('show')) {
        this.cerrarModal();
      }
    });
    
    // Event listener para el formulario
    DOMUtils.getElement('form-partido').addEventListener('submit', (e) => this.handleSubmitPartido(e));
    
    // Event listeners para los selectores de jugadores
    const selectores = ['jugador1', 'jugador2', 'jugador3', 'jugador4'];
    selectores.forEach(selectorId => {
      const selector = DOMUtils.getElement(selectorId);
      if (selector) {
        selector.addEventListener('change', () => {
          this.updateAvailableOptions();
          this.checkFormCompletion();
        });
      }
    });

    // Event listeners para el wizard
    this.setupWizardListeners();

    // Event listeners para navegación de pestañas
    document.addEventListener('click', (e) => {
      // Buscar el botón de pestaña más cercano (el botón mismo o un elemento hijo)
      const tabButton = e.target.closest('.tab-button');
      if (tabButton) {
        this.cambiarPestana(tabButton.dataset.tab);
      }
    });
  }

  async loadJugadores() {
    try {
      this.showLoading();
      
      // Guardar el tiempo de inicio
      const startTime = Date.now();
      
      // Obtener estadísticas con ELO (incluye progresión calculada desde la base de datos)
      const estadisticasResult = await this.supabaseService.getEstadisticasConELO();
      
      if (!estadisticasResult.success) {
        throw new Error(estadisticasResult.error);
      }
      

      
      const result = estadisticasResult;

      // Calcular cuánto tiempo ha pasado
      const elapsedTime = Date.now() - startTime;
      const minLoadTime = 1000; // 1 segundo mínimo
      
      // Si ha pasado menos de 1 segundo, esperar el tiempo restante
      if (elapsedTime < minLoadTime) {
        const remainingTime = minLoadTime - elapsedTime;
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      // Guardar jugadores para ordenar localmente
      this.jugadores = result.data;
      
      // Ordenar por defecto por victorias
      this.ordenarJugadores('victorias');
      
      this.hideLoading();
      this.displayJugadores(this.jugadores);
      this.fillPlayerSelectors(this.jugadores);
      this.actualizarBotonesOrdenacion();
      
      return result;
    } catch (error) {
      console.error('Error cargando jugadores:', error);
      this.hideLoading();
      this.showError(MESSAGES.ERROR_LOADING + error.message);
      throw error;
    }
  }

  showLoading() {
    const container = DOMUtils.getElement('jugadores-container');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 gap-10 max-w-full mx-auto">
        <!-- Skeleton 1 -->
        <div class="bg-gray-50 p-8 rounded-lg shadow-sm">
          <div class="flex items-center gap-8">
            <!-- Posición -->
            <div class="w-20 h-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            
            <!-- Información del Jugador -->
            <div class="flex-1">
              <div class="h-16 bg-gray-200 rounded animate-pulse mb-8 w-full"></div>
              
              <!-- Estadísticas en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Columna 1: Estadísticas de partidos -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Columna 2: Información ELO -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton 2 -->
        <div class="bg-gray-50 p-8 rounded-lg shadow-sm">
          <div class="flex items-center gap-8">
            <!-- Posición -->
            <div class="w-20 h-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            
            <!-- Información del Jugador -->
            <div class="flex-1">
              <div class="h-16 bg-gray-200 rounded animate-pulse mb-8 w-full"></div>
              
              <!-- Estadísticas en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Columna 1: Estadísticas de partidos -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Columna 2: Información ELO -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton 3 -->
        <div class="bg-gray-50 p-8 rounded-lg shadow-sm">
          <div class="flex items-center gap-8">
            <!-- Posición -->
            <div class="w-20 h-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            
            <!-- Información del Jugador -->
            <div class="flex-1">
              <div class="h-16 bg-gray-200 rounded animate-pulse mb-8 w-full"></div>
              
              <!-- Estadísticas en dos columnas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Columna 1: Estadísticas de partidos -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-56"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Columna 2: Información ELO -->
                <div class="bg-white p-8 rounded-lg shadow-sm">
                  <div class="space-y-6">
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-60"></div>
                      <div class="h-8 bg-gray-200 rounded animate-pulse w-28"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  hideLoading() {
    // Esta función se llama después de cargar los datos
    // El contenido se reemplaza automáticamente en displayJugadores
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

  calcularEstadisticasJugador(jugadorId) {
    // Obtener todos los partidos del jugador
    const partidos = this.partidos || [];
    let victorias = 0;
    let derrotas = 0;
    
    partidos.forEach(partido => {
      if (!partido.ganador_pareja) return;
      
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const esGanador = (estaEnPareja1 && partido.ganador_pareja === 1) || (!estaEnPareja1 && partido.ganador_pareja === 2);
      
      if (esGanador) {
        victorias++;
      } else {
        derrotas++;
      }
    });
    
    return { victorias, derrotas };
  }

  createJugadorHTML(jugador, estadisticasAnteriores, posicion) {
    // Usar estadísticas ya calculadas en el objeto jugador
    const estadisticas = jugador.estadisticas || { victorias: 0, derrotas: 0, total: 0 };
    const statsAnteriores = estadisticasAnteriores[jugador.id] || { victorias: 0, derrotas: 0 };
    const victoriasCambiaron = statsAnteriores.victorias !== estadisticas.victorias;
    const derrotasCambiaron = statsAnteriores.derrotas !== estadisticas.derrotas;
    const tieneCambios = victoriasCambiaron || derrotasCambiaron;
    
    const claseAnimacion = tieneCambios ? 'animate-pulse bg-green-50' : '';
    
    // Siempre mostrar victorias, derrotas y ELO
    const ratingColor = EloUtils.getRatingColor(jugador.rating_elo || 1200);
    const ratingTitle = EloUtils.getRatingTitle(jugador.rating_elo || 1200);
    const totalPartidos = estadisticas.total || (estadisticas.victorias + estadisticas.derrotas);
    
    // Determinar qué dato resaltar según el criterio de ordenación
    const criterioActual = this.ordenActual || 'victorias';
    const claseDestacado = 'bg-blue-100 px-3 py-1 rounded-lg border-2 border-blue-300';
    
    return `
      <div class="bg-gray-50 p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 player-card ${claseAnimacion} cursor-pointer" data-jugador-id="${jugador.id}">
        <div class="flex items-center gap-8">
          <!-- Información del Jugador -->
          <div class="flex-1">
            <div class="flex items-center gap-6 mb-8">
              <!-- Posición -->
              <div class="flex items-center justify-center w-16 h-16 bg-[#111714] text-white text-3xl font-bold rounded-full flex-shrink-0">
                ${posicion}
              </div>
              <h3 class="text-[#1e293b] text-5xl sm:text-[2.75rem] font-bold">${jugador.nombre}</h3>
            </div>
            
            <!-- Estadísticas en dos columnas -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Columna 1: Estadísticas de partidos -->
              <div class="bg-white p-8 rounded-lg shadow-sm">
                <div class="space-y-6">
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">% Victorias:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold ${victoriasCambiaron ? 'text-green-600' : ''} ${criterioActual === 'victorias' ? claseDestacado : ''}">
                      ${totalPartidos > 0 ? Math.round((estadisticas.victorias / totalPartidos) * 100) : 0}%
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Derrotas:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold ${derrotasCambiaron ? 'text-red-600' : ''}">
                      ${estadisticas.derrotas}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Victorias:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold">
                      ${estadisticas.victorias}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Columna 2: Información ELO -->
              <div class="bg-white p-8 rounded-lg shadow-sm">
                <div class="space-y-6">
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Rating ELO:</span>
                    <span class="text-3xl sm:text-4xl font-bold ${criterioActual === 'elo' ? claseDestacado : ''}" style="color: ${ratingColor};">
                      ${jugador.rating_elo || 1200}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Nivel:</span>
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-bold">
                      ${ratingTitle}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Progresión:</span>
                    <span class="text-3xl sm:text-4xl font-bold ${criterioActual === 'progresion' ? claseDestacado : ''}" style="color: ${jugador.progresion_elo >= 0 ? '#10b981' : '#ef4444'};">
                      ${jugador.progresion_elo >= 0 ? '+' : ''}${jugador.progresion_elo || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      const stats = jugador.estadisticas || { victorias: 0, derrotas: 0 };
      estadisticas[jugador.id] = {
        victorias: stats.victorias,
        derrotas: stats.derrotas
      };
    });
    StorageUtils.set('estadisticas_anteriores', estadisticas);
  }

  fillPlayerSelectors(jugadores) {
    const selectores = ['jugador1', 'jugador2', 'jugador3', 'jugador4'];
    
    selectores.forEach(selectorId => {
      const selector = DOMUtils.getElement(selectorId);
      if (!selector) return;

      // Limpiar opciones existentes excepto la primera
      selector.innerHTML = '<option value="">Seleccionar ' + selectorId.replace('jugador', 'Jugador ') + '</option>';
      
      jugadores.forEach(jugador => {
        const option = DOMUtils.createElement('option', '', jugador.nombre);
        option.value = jugador.id;
        selector.appendChild(option);
      });
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
    const pareja1_set3_value = parseInt(DOMUtils.getElement('pareja1-set3').value) || 0;
    const pareja2_set3_value = parseInt(DOMUtils.getElement('pareja2-set3').value) || 0;
    
    return {
      pareja1_jugador1_id: parseInt(DOMUtils.getElement('jugador1').value),
      pareja1_jugador2_id: parseInt(DOMUtils.getElement('jugador2').value),
      pareja2_jugador1_id: parseInt(DOMUtils.getElement('jugador3').value),
      pareja2_jugador2_id: parseInt(DOMUtils.getElement('jugador4').value),
      pareja1_set1: parseInt(DOMUtils.getElement('pareja1-set1').value) || 0,
      pareja1_set2: parseInt(DOMUtils.getElement('pareja1-set2').value) || 0,
      pareja1_set3: (pareja1_set3_value > 0 || pareja2_set3_value > 0) ? pareja1_set3_value : null,
      pareja2_set1: parseInt(DOMUtils.getElement('pareja2-set1').value) || 0,
      pareja2_set2: parseInt(DOMUtils.getElement('pareja2-set2').value) || 0,
      pareja2_set3: (pareja1_set3_value > 0 || pareja2_set3_value > 0) ? pareja2_set3_value : null
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
    
    try {
      const formData = this.getFormData();
      
      // Mostrar loading en el botón
      const botonEnviar = DOMUtils.getElement('enviar-partido');
      const textoOriginal = botonEnviar.innerHTML;
      botonEnviar.innerHTML = 'Enviando...';
      botonEnviar.disabled = true;
      
      // Enviar partido
      const resultado = await this.supabaseService.createPartido(formData);
      
      if (resultado.success) {
        // Mostrar mensaje de éxito
        alert('¡Partido añadido exitosamente!');
        
        // Cerrar modal
        this.cerrarModal();
        
        // Recargar datos
        await this.loadJugadores();
      } else {
        throw new Error(resultado.error || 'Error desconocido');
      }
      
    } catch (error) {
      console.error('❌ Error enviando partido:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        stack: error.stack
      });
      alert('Error al enviar el partido: ' + error.message);
    } finally {
      // Restaurar botón
      const botonEnviar = DOMUtils.getElement('enviar-partido');
      botonEnviar.innerHTML = 'Enviar Partido';
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
    
    // Verificar estado del botón siguiente
    this.checkFormCompletion();
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
        const jugadorId = card.dataset.jugadorId;
        if (jugadorId) {
          // Abrir modal de estadísticas del jugador
          this.abrirModalEstadisticas(parseInt(jugadorId));
        }
      });
    });
  }

  // Ordenar jugadores según el criterio especificado
  ordenarJugadores(criterio) {
    this.ordenActual = criterio;
    

    
    if (criterio === 'victorias') {
      // Ordenar por porcentaje de victorias (descendente), en caso de empate por más partidos jugados
      this.jugadores.sort((a, b) => {
        const statsA = a.estadisticas || { victorias: 0, derrotas: 0, total: 0 };
        const statsB = b.estadisticas || { victorias: 0, derrotas: 0, total: 0 };
        const totalA = statsA.total || (statsA.victorias + statsA.derrotas);
        const totalB = statsB.total || (statsB.victorias + statsB.derrotas);
        
        // Calcular porcentaje de victorias
        const porcentajeA = totalA > 0 ? (statsA.victorias / totalA) * 100 : 0;
        const porcentajeB = totalB > 0 ? (statsB.victorias / totalB) * 100 : 0;
        
        if (Math.abs(porcentajeA - porcentajeB) < 0.01) { // Empate en porcentaje (tolerancia de 0.01%)
          return totalB - totalA; // Más partidos jugados primero en caso de empate
        } else {
          return porcentajeB - porcentajeA; // Mayor porcentaje primero
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

  // Funciones para la modal
  abrirModal() {
    DOMUtils.getElement('modal-partido').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    DOMUtils.getElement('modal-partido').classList.remove('show');
    document.body.style.overflow = 'auto';
    this.resetForm();
    this.resetWizard();
  }

  // Funciones para el wizard
  setupWizardListeners() {
    // Botón siguiente
    const btnSiguiente = DOMUtils.getElement('btn-siguiente');
    if (btnSiguiente) {
      btnSiguiente.addEventListener('click', () => this.nextStep());
    }

    // Botón anterior (flecha)
    const btnAnteriorFlecha = DOMUtils.getElement('btn-anterior-flecha');
    if (btnAnteriorFlecha) {
      btnAnteriorFlecha.addEventListener('click', () => this.previousStep());
    }
  }

  nextStep() {
    // Actualizar nombres de las parejas
    this.updateParejaNames();

    // Ocultar paso 1 y mostrar paso 2
    DOMUtils.getElement('step1').classList.add('hidden');
    DOMUtils.getElement('step2').classList.remove('hidden');

    // Mostrar flecha de volver atrás
    const btnAnteriorFlecha = DOMUtils.getElement('btn-anterior-flecha');
    if (btnAnteriorFlecha) {
      btnAnteriorFlecha.style.display = 'flex';
    }

    // Actualizar indicadores
    this.updateStepIndicators(2);
  }

  checkFormCompletion() {
    const jugador1 = DOMUtils.getElement('jugador1').value;
    const jugador2 = DOMUtils.getElement('jugador2').value;
    const jugador3 = DOMUtils.getElement('jugador3').value;
    const jugador4 = DOMUtils.getElement('jugador4').value;
    
    const btnSiguiente = DOMUtils.getElement('btn-siguiente');
    
    if (jugador1 && jugador2 && jugador3 && jugador4) {
      // Habilitar botón
      btnSiguiente.disabled = false;
      btnSiguiente.className = 'flex min-w-[300px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-20 px-12 bg-[#2563eb] text-white text-3xl font-bold leading-normal tracking-[0.015em] hover:bg-[#1d4ed8] transition-colors';
    } else {
      // Deshabilitar botón
      btnSiguiente.disabled = true;
      btnSiguiente.className = 'flex min-w-[300px] items-center justify-center overflow-hidden rounded-lg h-20 px-12 bg-gray-100 text-gray-400 text-3xl font-normal leading-normal tracking-[0.015em] transition-colors cursor-not-allowed';
    }
  }

  previousStep() {
    // Ocultar paso 2 y mostrar paso 1
    DOMUtils.getElement('step2').classList.add('hidden');
    DOMUtils.getElement('step1').classList.remove('hidden');

    // Ocultar flecha de volver atrás
    const btnAnteriorFlecha = DOMUtils.getElement('btn-anterior-flecha');
    if (btnAnteriorFlecha) {
      btnAnteriorFlecha.style.display = 'none';
    }

    // Actualizar indicadores
    this.updateStepIndicators(1);
  }

  updateParejaNames() {
    // Obtener nombres de los jugadores
    const jugador1 = DOMUtils.getElement('jugador1');
    const jugador2 = DOMUtils.getElement('jugador2');
    const jugador3 = DOMUtils.getElement('jugador3');
    const jugador4 = DOMUtils.getElement('jugador4');

    const nombre1 = jugador1.options[jugador1.selectedIndex].text;
    const nombre2 = jugador2.options[jugador2.selectedIndex].text;
    const nombre3 = jugador3.options[jugador3.selectedIndex].text;
    const nombre4 = jugador4.options[jugador4.selectedIndex].text;

    // Actualizar información de parejas
    const parejaANames = DOMUtils.getElement('pareja-a-names');
    const parejaBNames = DOMUtils.getElement('pareja-b-names');
    
    if (parejaANames) {
      parejaANames.textContent = `${nombre1} y ${nombre2}`;
    }
    if (parejaBNames) {
      parejaBNames.textContent = `${nombre3} y ${nombre4}`;
    }
  }

  updateStepIndicators(step) {
    const step1Indicator = DOMUtils.getElement('step1-indicator');
    const step2Indicator = DOMUtils.getElement('step2-indicator');
    const step1Text = step1Indicator.nextElementSibling;
    const step2Text = step2Indicator.nextElementSibling;

    if (step === 1) {
      // Paso 1 activo
      step1Indicator.className = 'w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold';
      step1Text.className = 'ml-3 text-2xl font-medium text-blue-600';
      step2Indicator.className = 'w-12 h-12 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-2xl font-bold';
      step2Text.className = 'ml-3 text-2xl font-medium text-gray-500';
    } else {
      // Paso 2 activo
      step1Indicator.className = 'w-12 h-12 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-2xl font-bold';
      step1Text.className = 'ml-3 text-2xl font-medium text-gray-500';
      step2Indicator.className = 'w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold';
      step2Text.className = 'ml-3 text-2xl font-medium text-blue-600';
    }
  }

  resetWizard() {
    // Volver al paso 1
    DOMUtils.getElement('step1').classList.remove('hidden');
    DOMUtils.getElement('step2').classList.add('hidden');

    // Ocultar flecha de volver atrás
    const btnAnteriorFlecha = DOMUtils.getElement('btn-anterior-flecha');
    if (btnAnteriorFlecha) {
      btnAnteriorFlecha.style.display = 'none';
    }

    // Resetear indicadores
    this.updateStepIndicators(1);

    // Resetear nombres de parejas
    DOMUtils.getElement('pareja-a-names').textContent = 'Selecciona los jugadores';
    DOMUtils.getElement('pareja-b-names').textContent = 'Selecciona los jugadores';
  }

  // Funciones para el modal de estadísticas
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
      
      // Buscar el jugador en los datos de la clasificación
      
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
      await this.createEloChart(partidos, jugadorId);
      
      // Calcular y mostrar estadísticas detalladas
      await this.calcularEstadisticasDetalladas(partidos, jugadorId);
      
      // Mostrar últimos partidos
      await this.displayRecentMatches(partidos, jugadorId);
      
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

  calculateStats(partidos, jugadorId) {
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

    return {
      victorias,
      derrotas,
      total: victorias + derrotas
    };
  }

  async createEloChart(partidos, jugadorId) {
    const ctx = document.getElementById('eloChart').getContext('2d');
    
    // Preparar datos para la gráfica (ahora asíncrono)
    const chartData = await this.prepareChartData(partidos, jugadorId);
    
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
                return `Partido ${context[0].dataIndex + 1}`;
              },
              label: function(context) {
                return `ELO: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280'
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6b7280'
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
  async calcularEstadisticasDetalladas(partidos, jugadorId) {
    if (!partidos || partidos.length === 0) {
      // Mostrar valores por defecto si no hay partidos
      DOMUtils.getElement('elo-ultimos-5').textContent = '0';
      DOMUtils.getElement('media-puntos-set').textContent = '0';
      DOMUtils.getElement('porcentaje-remontadas').textContent = '0%';
      DOMUtils.getElement('porcentaje-victorias-aplastantes').textContent = '0%';
      DOMUtils.getElement('porcentaje-derrotas-aplastantes').textContent = '0%';
      DOMUtils.getElement('porcentaje-victorias-ajustadas').textContent = '0%';
      return;
    }

    // Ordenar partidos por fecha (más recientes primero)
    const partidosOrdenados = partidos.sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido));

    // 1. ELO últimos 5 partidos
    const ultimos5Partidos = partidosOrdenados.slice(0, 5);
    let progresionELOUltimos5 = 0;
    
    // Obtener cambios reales de ELO desde la base de datos para los últimos 5 partidos
    for (const partido of ultimos5Partidos) {
      try {
        const cambiosResult = await this.supabaseService.getCambiosELOPartido(partido.id);
        if (cambiosResult.success) {
          // Buscar el cambio específico para este jugador
          const cambioJugador = cambiosResult.data[`jugador_${jugadorId}`];
          if (cambioJugador !== undefined) {
            progresionELOUltimos5 += cambioJugador;
          }
        }
      } catch (error) {
        console.warn(`Error obteniendo cambios de ELO para partido ${partido.id}:`, error);
        // Fallback al cálculo local si hay error
        progresionELOUltimos5 += this.calcularCambioELOPartido(partido, jugadorId);
      }
    }
    
    DOMUtils.getElement('elo-ultimos-5').textContent = progresionELOUltimos5 >= 0 ? `+${Math.round(progresionELOUltimos5)}` : `${Math.round(progresionELOUltimos5)}`;

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

    // 6. Porcentaje de victorias ajustadas
    let victoriasAjustadas = 0;
    let totalVictoriasParaAjustadas = 0;
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) return;
      
      const esGanador = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
      
      if (esGanador) {
        totalVictoriasParaAjustadas++;
        
        // Una victoria se considera ajustada si:
        // 1. Es un partido de 3 sets, O
        // 2. La diferencia total de juegos no es mayor de 4
        
        const esPartido3Sets = partido.pareja1_set3 || partido.pareja2_set3;
        
        if (esPartido3Sets) {
          // Partido de 3 sets - siempre es victoria ajustada
          victoriasAjustadas++;
        } else {
          // Partido de 2 sets - verificar diferencia de juegos
          const puntosGanados = estaEnPareja1 ? 
            (partido.pareja1_set1 + partido.pareja1_set2) : 
            (partido.pareja2_set1 + partido.pareja2_set2);
          const puntosPerdidos = estaEnPareja1 ? 
            (partido.pareja2_set1 + partido.pareja2_set2) : 
            (partido.pareja1_set1 + partido.pareja1_set2);
          
          const diferenciaJuegos = puntosGanados - puntosPerdidos;
          if (diferenciaJuegos <= 4) {
            victoriasAjustadas++;
          }
        }
      }
    });
    const porcentajeVictoriasAjustadas = totalVictoriasParaAjustadas > 0 ? 
      Math.round((victoriasAjustadas / totalVictoriasParaAjustadas) * 100) : 0;
    DOMUtils.getElement('porcentaje-victorias-ajustadas').textContent = `${porcentajeVictoriasAjustadas}%`;
    DOMUtils.getElement('porcentaje-victorias-ajustadas').innerHTML = `${porcentajeVictoriasAjustadas}% <span class="text-sm sm:text-base lg:text-lg text-gray-500">(${victoriasAjustadas} de ${totalVictoriasParaAjustadas})</span>`;
  }

  async prepareChartData(partidos, jugadorId) {
    // Ordenar partidos por fecha
    const sortedPartidos = [...partidos].sort((a, b) => 
      new Date(a.fecha_partido) - new Date(b.fecha_partido)
    );

    const labels = [];
    const eloValues = [];
    
    // Obtener ELO inicial desde la base de datos
    let currentElo = 1200; // ELO inicial por defecto
    try {
      const eloInicialResult = await this.supabaseService.getELOInicialJugador(jugadorId);
      if (eloInicialResult.success) {
        currentElo = eloInicialResult.data;
      }
    } catch (error) {
      console.warn('Error obteniendo ELO inicial, usando 1200 por defecto:', error);
    }

    // Obtener progresión ELO real desde la base de datos
    for (let i = 0; i < sortedPartidos.length; i++) {
      const partido = sortedPartidos[i];
      labels.push(`P${i + 1}`);
      
      // Obtener cambio de ELO real desde la base de datos
      let cambioELO = 0;
      try {
        const cambiosResult = await this.supabaseService.getCambiosELOPartido(partido.id);
        if (cambiosResult.success) {
          const cambioJugador = cambiosResult.data[`jugador_${jugadorId}`];
          if (cambioJugador !== undefined) {
            cambioELO = cambioJugador;
          }
        }
      } catch (error) {
        console.warn(`Error obteniendo cambios de ELO para partido ${partido.id}:`, error);
        // Fallback al cálculo local si hay error
        cambioELO = this.calcularCambioELOPartido(partido, jugadorId);
      }
      
      currentElo += cambioELO;
      eloValues.push(currentElo);
    }

    // Asegurar que el eje X tenga al menos 5 divisiones
    const minDivisiones = 5;
    while (labels.length < minDivisiones) {
      labels.push(`P${labels.length + 1}`);
      // No añadir valores para partidos futuros, solo las etiquetas del eje X
    }

    return { labels, eloValues };
  }

  displayParejaStats(jugadorId, partidos) {
    if (partidos.length === 0) {
      // Si no hay partidos, mostrar valores por defecto
      DOMUtils.getElement('pareja-favorita').textContent = 'Sin datos';
      DOMUtils.getElement('pareja-favorita-partidos').textContent = '0 partidos';
      DOMUtils.getElement('pareja-optima').textContent = 'Sin datos';
      DOMUtils.getElement('pareja-optima-wins').textContent = '0 victorias';
      DOMUtils.getElement('victima-favorita').textContent = 'Sin datos';
      DOMUtils.getElement('victima-favorita-wins').textContent = '0 victorias';
      DOMUtils.getElement('nemesis').textContent = 'Sin datos';
      DOMUtils.getElement('nemesis-losses').textContent = '0 derrotas';
      return;
    }

    // Obtener todos los jugadores para poder buscar nombres
    const jugadores = this.jugadores || [];
    
    // Calcular estadísticas de parejas
    const parejaStats = this.calculateParejaStats(jugadorId, partidos, jugadores);
    
    // Mostrar pareja favorita (más partidos jugados)
    if (parejaStats.parejaFavorita) {
      DOMUtils.getElement('pareja-favorita').textContent = parejaStats.parejaFavorita.nombre;
      DOMUtils.getElement('pareja-favorita-partidos').textContent = `${parejaStats.parejaFavorita.partidos} partidos`;
    } else {
      DOMUtils.getElement('pareja-favorita').textContent = 'Sin datos';
      DOMUtils.getElement('pareja-favorita-partidos').textContent = '0 partidos';
    }
    
    // Mostrar pareja óptima (más victorias)
    if (parejaStats.parejaOptima) {
      DOMUtils.getElement('pareja-optima').textContent = parejaStats.parejaOptima.nombre;
      DOMUtils.getElement('pareja-optima-wins').textContent = `${parejaStats.parejaOptima.victorias} victorias`;
    } else {
      DOMUtils.getElement('pareja-optima').textContent = 'Sin datos';
      DOMUtils.getElement('pareja-optima-wins').textContent = '0 victorias';
    }
    
    // Mostrar víctima favorita (jugador al que más ha ganado)
    if (parejaStats.victimaFavorita) {
      DOMUtils.getElement('victima-favorita').textContent = parejaStats.victimaFavorita.nombre;
      DOMUtils.getElement('victima-favorita-wins').textContent = `${parejaStats.victimaFavorita.victorias} victorias`;
    } else {
      DOMUtils.getElement('victima-favorita').textContent = 'Sin datos';
      DOMUtils.getElement('victima-favorita-wins').textContent = '0 victorias';
    }
    
    // Mostrar némesis (jugador que más le ha ganado)
    if (parejaStats.nemesis) {
      DOMUtils.getElement('nemesis').textContent = parejaStats.nemesis.nombre;
      DOMUtils.getElement('nemesis-losses').textContent = `${parejaStats.nemesis.derrotas} derrotas`;
    } else {
      DOMUtils.getElement('nemesis').textContent = 'Sin datos';
      DOMUtils.getElement('nemesis-losses').textContent = '0 derrotas';
    }
  }

  calculateParejaStats(jugadorId, partidos, jugadores) {
    const parejas = new Map(); // Map para contar partidos por pareja
    const victoriasPorPareja = new Map(); // Map para contar victorias por pareja
    const victoriasPorJugador = new Map(); // Map para contar victorias contra jugadores específicos
    const derrotasPorJugador = new Map(); // Map para contar derrotas contra jugadores específicos
    
    partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (!ganadorPareja) return;
      
      // Determinar compañero de pareja
      let compañeroId;
      if (estaEnPareja1) {
        compañeroId = partido.pareja1_jugador1_id === jugadorId ? partido.pareja1_jugador2_id : partido.pareja1_jugador1_id;
      } else {
        compañeroId = partido.pareja2_jugador1_id === jugadorId ? partido.pareja2_jugador2_id : partido.pareja2_jugador1_id;
      }
      
      // Contar partidos por pareja
      parejas.set(compañeroId, (parejas.get(compañeroId) || 0) + 1);
      
      // Contar victorias por pareja
      const esGanador = (estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2);
      if (esGanador) {
        victoriasPorPareja.set(compañeroId, (victoriasPorPareja.get(compañeroId) || 0) + 1);
      }
      
      // Contar victorias y derrotas contra jugadores específicos
      const jugadoresRivales = estaEnPareja1 
        ? [partido.pareja2_jugador1_id, partido.pareja2_jugador2_id]
        : [partido.pareja1_jugador1_id, partido.pareja1_jugador2_id];
      
      jugadoresRivales.forEach(rivalId => {
        if (esGanador) {
          victoriasPorJugador.set(rivalId, (victoriasPorJugador.get(rivalId) || 0) + 1);
        } else {
          derrotasPorJugador.set(rivalId, (derrotasPorJugador.get(rivalId) || 0) + 1);
        }
      });
    });
    
    // Encontrar pareja favorita (más partidos)
    let parejaFavorita = null;
    let maxPartidos = 0;
    for (const [compañeroId, partidos] of parejas) {
      if (partidos > maxPartidos) {
        maxPartidos = partidos;
        const compañero = jugadores.find(j => j.id === compañeroId);
        parejaFavorita = compañero ? { id: compañeroId, nombre: compañero.nombre, partidos } : null;
      }
    }
    
    // Encontrar pareja óptima (más victorias)
    let parejaOptima = null;
    let maxVictorias = 0;
    for (const [compañeroId, victorias] of victoriasPorPareja) {
      if (victorias > maxVictorias) {
        maxVictorias = victorias;
        const compañero = jugadores.find(j => j.id === compañeroId);
        parejaOptima = compañero ? { id: compañeroId, nombre: compañero.nombre, victorias } : null;
      }
    }
    
    // Encontrar víctima favorita (jugador al que más ha ganado)
    let victimaFavorita = null;
    let maxVictoriasContra = 0;
    for (const [rivalId, victorias] of victoriasPorJugador) {
      if (victorias > maxVictoriasContra) {
        maxVictoriasContra = victorias;
        const rival = jugadores.find(j => j.id === rivalId);
        victimaFavorita = rival ? { id: rivalId, nombre: rival.nombre, victorias } : null;
      }
    }
    
    // Encontrar némesis (jugador que más le ha ganado)
    let nemesis = null;
    let maxDerrotasContra = 0;
    for (const [rivalId, derrotas] of derrotasPorJugador) {
      if (derrotas > maxDerrotasContra) {
        maxDerrotasContra = derrotas;
        const rival = jugadores.find(j => j.id === rivalId);
        nemesis = rival ? { id: rivalId, nombre: rival.nombre, derrotas } : null;
      }
    }
    
    return {
      parejaFavorita,
      parejaOptima,
      victimaFavorita,
      nemesis
    };
  }

  async displayRecentMatches(partidos, jugadorId) {
    const container = DOMUtils.getElement('recent-matches');
    
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
    
    // Generar HTML con placeholders para los cambios de ELO
    let html = '';
    
    for (const partido of recentPartidos) {
      const estaEnPareja1 = partido.pareja1_jugador1_id === jugadorId || partido.pareja1_jugador2_id === jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      const esGanador = ganadorPareja && ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2));
      
      const pareja1Names = `${partido.pareja1_jugador1?.nombre || 'N/A'} y ${partido.pareja1_jugador2?.nombre || 'N/A'}`;
      const pareja2Names = `${partido.pareja2_jugador1?.nombre || 'N/A'} y ${partido.pareja2_jugador2?.nombre || 'N/A'}`;
      
      // Obtener cambio de ELO real desde la base de datos
      let cambioELO = 0;
      try {
        const cambiosResult = await this.supabaseService.getCambiosELOPartido(partido.id);
        if (cambiosResult.success) {
          const cambioJugador = cambiosResult.data[`jugador_${jugadorId}`];
          if (cambioJugador !== undefined) {
            cambioELO = cambioJugador;
          }
        }
      } catch (error) {
        console.warn(`Error obteniendo cambios de ELO para partido ${partido.id}:`, error);
        // Fallback al cálculo local si hay error
        cambioELO = this.calcularCambioELOPartido(partido, jugadorId);
      }
      
      const cambioELOTexto = cambioELO >= 0 ? `+${Math.round(cambioELO)}` : `${Math.round(cambioELO)}`;
      const cambioELOColor = cambioELO >= 0 ? 'text-green-600' : 'text-red-600';
      
      const fecha = new Date(partido.fecha_partido).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      html += `
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
    }
    
    container.innerHTML = html;
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

  // Función fallback para obtener el título del rating ELO
  getRatingTitle(rating) {
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
    if (tabName === 'elo' && window.eloChart) {
      setTimeout(() => {
        window.eloChart.resize();
      }, 100);
    }
  }
}

// Función global para validar inputs de sets
function validarInputSet(input) {
  
  let valor = input.value;
  
  // Si el campo está vacío, no hacer nada y salir
  if (valor === '') {
    return;
  }
  
  // Remover caracteres no numéricos
  valor = valor.replace(/[^0-9]/g, '');
  
  // Si después de remover caracteres no numéricos está vacío, limpiar el campo
  if (valor === '') {
    input.value = '';
    return;
  }
  
  // Convertir a número
  let numero = parseInt(valor);
  
  // Verificar que sea un número válido
  if (isNaN(numero)) {
    input.value = '';
    return;
  }
  
  // Aplicar límites (el navegador ya maneja max="7", pero por seguridad)
  if (numero < 0) numero = 0;
  if (numero > 7) numero = 7;
  
  // Actualizar el valor del input
  input.value = numero;
  
  // Obtener el set correspondiente
  const setId = input.id.split('-')[2]; // pareja1-set1 -> set1
  const pareja1Input = document.getElementById(`pareja1-${setId}`);
  const pareja2Input = document.getElementById(`pareja2-${setId}`);
  

  
  // Aplicar sombreado a ambos inputs del set
  if (pareja1Input && pareja2Input) {
    const valor1 = parseInt(pareja1Input.value) || 0;
    const valor2 = parseInt(pareja2Input.value) || 0;
    

    
    // Color base para inputs con valor (mismo que bg-gray-50)
    const colorBase = '#f9fafb'; // Equivalente a bg-gray-50
    
    // Aplicar color base a ambos inputs si tienen valor
    if (valor1 > 0 || valor2 > 0) {
      pareja1Input.style.backgroundColor = valor1 > 0 ? colorBase : '#ffffff';
      pareja2Input.style.backgroundColor = valor2 > 0 ? colorBase : '#ffffff';
      
      // Si hay un ganador del set, aplicar color más oscuro
      if (valor1 > valor2) {
        pareja1Input.style.backgroundColor = '#e5e7eb'; // bg-gray-200 para ganador
      } else if (valor2 > valor1) {
        pareja2Input.style.backgroundColor = '#e5e7eb'; // bg-gray-200 para ganador
      }
    } else {
      // Resetear colores si no hay valores
      pareja1Input.style.backgroundColor = '#ffffff';
      pareja2Input.style.backgroundColor = '#ffffff';
    }
    

  }
  
  // Calcular ganador del partido y mostrar copita
  calcularGanadorPartido();
}

// Función para calcular el ganador del partido en tiempo real
function calcularGanadorPartido() {
  // Obtener todos los valores de los sets
  const pareja1_set1 = parseInt(document.getElementById('pareja1-set1')?.value) || 0;
  const pareja1_set2 = parseInt(document.getElementById('pareja1-set2')?.value) || 0;
  const pareja1_set3 = parseInt(document.getElementById('pareja1-set3')?.value) || 0;
  const pareja2_set1 = parseInt(document.getElementById('pareja2-set1')?.value) || 0;
  const pareja2_set2 = parseInt(document.getElementById('pareja2-set2')?.value) || 0;
  const pareja2_set3 = parseInt(document.getElementById('pareja2-set3')?.value) || 0;
  
  // Contar sets ganados por cada pareja
  let pareja1_sets = 0;
  let pareja2_sets = 0;
  
  // Contar sets ganados por pareja 1
  if (pareja1_set1 > pareja2_set1) pareja1_sets++;
  if (pareja1_set2 > pareja2_set2) pareja1_sets++;
  if (pareja1_set3 > pareja2_set3) pareja1_sets++;
  
  // Contar sets ganados por pareja 2
  if (pareja2_set1 > pareja1_set1) pareja2_sets++;
  if (pareja2_set2 > pareja1_set2) pareja2_sets++;
  if (pareja2_set3 > pareja1_set3) pareja2_sets++;
  

  
  // Determinar ganador
  let ganador = null;
  if (pareja1_sets > pareja2_sets) {
    ganador = 1;
  } else if (pareja2_sets > pareja1_sets) {
    ganador = 2;
  }
  
  // Actualizar copitas
  actualizarCopitas(ganador);
}

// Función para actualizar las copitas según el ganador
function actualizarCopitas(ganador) {
  const parejaANames = document.getElementById('pareja-a-names');
  const parejaBNames = document.getElementById('pareja-b-names');
  
  // Remover copitas existentes
  const copitasExistentes = document.querySelectorAll('.copita-ganador');
  copitasExistentes.forEach(copita => copita.remove());
  
  // Añadir copita al ganador
  if (ganador === 1 && parejaANames) {
    const copita = document.createElement('span');
    copita.className = 'copita-ganador ml-2 text-yellow-500 text-2xl';
    copita.innerHTML = '🏆';
    copita.title = 'Ganador del partido';
    parejaANames.appendChild(copita);
  } else if (ganador === 2 && parejaBNames) {
    const copita = document.createElement('span');
    copita.className = 'copita-ganador ml-2 text-yellow-500 text-2xl';
    copita.innerHTML = '🏆';
    copita.title = 'Ganador del partido';
    parejaBNames.appendChild(copita);
  }
  

}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Verificar si ya existe una instancia
  if (window.padelApp) {
    return;
  }
  
  // Detectar si es una nueva sesión o recarga de página
  // Mostrar pantalla de bienvenida si es la primera vez o si se recarga la página
  const isNewSession = !sessionStorage.getItem('padelAppSession') || 
                      performance.navigation.type === 1; // 1 = recarga de página
  
  // Marcar que la sesión está activa
  sessionStorage.setItem('padelAppSession', 'true');
  
  window.padelApp = new PadelApp();
  window.padelApp.init(isNewSession);
}); 