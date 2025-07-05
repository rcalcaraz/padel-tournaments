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
  }

  async loadJugadores() {
    try {
      this.showLoading();
      
      // Guardar el tiempo de inicio
      const startTime = Date.now();
      
      // Siempre obtener estadísticas con ELO
      const result = await this.supabaseService.getEstadisticasConELO();
      
      if (!result.success) {
        throw new Error(result.error);
      }

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
    
    // Determinar qué dato resaltar según el criterio de ordenación
    const criterioActual = this.ordenActual || 'victorias';
    const claseDestacado = 'bg-blue-100 px-3 py-1 rounded-lg border-2 border-blue-300';
    
    return `
      <div class="bg-gray-50 p-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 player-card ${claseAnimacion} cursor-pointer" data-jugador-id="${jugador.id}">
        <div class="flex items-center gap-8">
          <!-- Posición -->
          <div class="flex items-center justify-center w-20 h-20 bg-[#111714] text-white text-4xl font-bold rounded-full flex-shrink-0">
            ${posicion}
          </div>
          
          <!-- Información del Jugador -->
          <div class="flex-1">
            <h3 class="text-[#1e293b] text-5xl sm:text-[2.75rem] font-bold mb-8">${jugador.nombre}</h3>
            
            <!-- Estadísticas en dos columnas -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Columna 1: Estadísticas de partidos -->
              <div class="bg-white p-8 rounded-lg shadow-sm">
                <div class="space-y-6">
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Victorias:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold ${victoriasCambiaron ? 'text-green-600' : ''} ${criterioActual === 'victorias' ? claseDestacado : ''}">
                      ${jugador.estadisticas.victorias}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Derrotas:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold ${derrotasCambiaron ? 'text-red-600' : ''}">
                      ${jugador.estadisticas.derrotas}
                    </span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-[#64748b] text-2xl sm:text-3xl font-medium">Total partidos:</span>
                    <span class="text-[#64748b] text-3xl sm:text-4xl font-bold">
                      ${totalPartidos}
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
          // Redirigir a la página de estadísticas del jugador
          window.location.href = `jugador-stats.html?id=${jugadorId}`;
        }
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
}

// Función global para validar inputs de sets
function validarInputSet(input) {
  console.log('validarInputSet ejecutada con:', input.id, input.value);
  
  let valor = input.value;
  
  // Remover caracteres no numéricos
  valor = valor.replace(/[^0-9]/g, '');
  
  // Convertir a número
  let numero = parseInt(valor) || 0;
  
  // Aplicar límites
  if (numero < 0) numero = 0;
  if (numero > 99) numero = 99;
  
  // Actualizar el valor del input
  input.value = numero;
  
  // Obtener el set correspondiente
  const setId = input.id.split('-')[2]; // pareja1-set1 -> set1
  const pareja1Input = document.getElementById(`pareja1-${setId}`);
  const pareja2Input = document.getElementById(`pareja2-${setId}`);
  
  console.log('Set ID:', setId, 'Pareja1:', pareja1Input, 'Pareja2:', pareja2Input);
  
  // Aplicar sombreado a ambos inputs del set
  if (pareja1Input && pareja2Input) {
    const valor1 = parseInt(pareja1Input.value) || 0;
    const valor2 = parseInt(pareja2Input.value) || 0;
    
    console.log('Valores:', valor1, valor2);
    
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
    
    console.log('Colores aplicados:', pareja1Input.style.backgroundColor, pareja2Input.style.backgroundColor);
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
  
  console.log('Sets ganados - Pareja 1:', pareja1_sets, 'Pareja 2:', pareja2_sets);
  
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
  
  console.log('Ganador del partido:', ganador === 1 ? 'Pareja A' : ganador === 2 ? 'Pareja B' : 'Empate');
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