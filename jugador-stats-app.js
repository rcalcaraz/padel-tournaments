class JugadorStatsApp {
  constructor() {
    this.supabase = null;
    this.jugadorId = null;
    this.jugador = null;
    this.partidos = [];
    this.eloChart = null;
  }

  init() {
    // Obtener el ID del jugador de la URL
    const urlParams = new URLSearchParams(window.location.search);
    this.jugadorId = urlParams.get('id');
    
    if (!this.jugadorId) {
      this.showError('ID de jugador no especificado');
      return;
    }

    // Inicializar Supabase
    this.initSupabase();
    
    // Configurar navegación
    this.setupNavigation();
    
    // Cargar datos del jugador
    this.loadJugadorData();
  }

  initSupabase() {
    try {
      // IMPORTANTE: Reemplaza estas credenciales con las de tu proyecto de Supabase
      const SUPABASE_URL = 'https://renhtzglxihiqqvirlui.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbmh0emdseGloaXFxdmlybHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxOTMzMTMsImV4cCI6MjA2MTc2OTMxM30.TIXnK8QjBpml3l9tqeP2f7p6NJVseHQ8ziEVo7RT0Hs'
      
      if (SUPABASE_URL === 'TU_SUPABASE_URL_AQUI' || SUPABASE_ANON_KEY === 'TU_SUPABASE_ANON_KEY_AQUI') {
        throw new Error('Por favor configura las credenciales de Supabase');
      }
      this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      document.getElementById('config-message').style.display = 'none';
    } catch (error) {
      console.error('Error de configuración:', error);
      this.showError('Error de configuración: ' + error.message);
    }
  }

  setupNavigation() {
    // La navegación ahora se maneja con enlaces directos en el HTML
    // No necesitamos JavaScript para la navegación
  }

  async loadJugadorData() {
    try {
      // Cargar datos del jugador y sus partidos en paralelo
      const [jugadorResult, partidosResult] = await Promise.all([
        this.getJugador(),
        this.getPartidosJugador()
      ]);

      if (!jugadorResult.success) {
        throw new Error(jugadorResult.error);
      }

      this.jugador = jugadorResult.data;
      this.partidos = partidosResult.success ? partidosResult.data : [];

      // Mostrar información del jugador
      this.displayJugadorInfo();
      
      // Crear gráfica ELO
      this.createEloChart();
      
      // Mostrar últimos partidos
      this.displayRecentMatches();
      
      // Ocultar pantalla de carga
      this.hideLoading();
      
    } catch (error) {
      console.error('Error cargando datos del jugador:', error);
      this.showError('Error cargando datos: ' + error.message);
    }
  }

  async getJugador() {
    try {
      const { data, error } = await this.supabase
        .from('jugadores')
        .select('*')
        .eq('id', this.jugadorId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo jugador:', error);
      return { success: false, error: error.message };
    }
  }

  async getPartidosJugador() {
    try {
      const { data, error } = await this.supabase
        .from('partidos')
        .select(`
          *,
          pareja1_jugador1:jugadores!partidos_pareja1_jugador1_id_fkey(nombre),
          pareja1_jugador2:jugadores!partidos_pareja1_jugador2_id_fkey(nombre),
          pareja2_jugador1:jugadores!partidos_pareja2_jugador1_id_fkey(nombre),
          pareja2_jugador2:jugadores!partidos_pareja2_jugador2_id_fkey(nombre)
        `)
        .or(`pareja1_jugador1_id.eq.${this.jugadorId},pareja1_jugador2_id.eq.${this.jugadorId},pareja2_jugador1_id.eq.${this.jugadorId},pareja2_jugador2_id.eq.${this.jugadorId}`)
        .order('fecha_partido', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo partidos del jugador:', error);
      return { success: false, error: error.message };
    }
  }

  displayJugadorInfo() {
    if (!this.jugador) return;

    // Nombre del jugador
    document.getElementById('player-name').textContent = this.jugador.nombre;
    
    // Avatar (primera letra del nombre)
    const avatar = document.getElementById('player-avatar');
    avatar.textContent = this.jugador.nombre.charAt(0).toUpperCase();
    
    // ELO actual
    const eloActual = this.jugador.elo || 1500;
    document.getElementById('player-elo').textContent = eloActual;
    
    // Calcular estadísticas
    const stats = this.calculateStats();
    
    // Victorias y derrotas
    document.getElementById('player-wins').textContent = stats.victorias;
    document.getElementById('player-losses').textContent = stats.derrotas;
    
    // Porcentaje de victoria
    const winRate = stats.total > 0 ? Math.round((stats.victorias / stats.total) * 100) : 0;
    document.getElementById('player-winrate').textContent = winRate + '%';
    
    // Calcular progresión total del ELO
    const eloInicial = 1500;
    const progresionElo = eloActual - eloInicial;
    const progresionTexto = progresionElo >= 0 ? `+${progresionElo}` : `${progresionElo}`;
    const progresionColor = progresionElo >= 0 ? 'text-green-600' : 'text-red-600';
    
    // Añadir la progresión ELO al HTML
    const statsContainer = document.querySelector('.grid.grid-cols-2.sm\\:grid-cols-5');
    if (statsContainer) {
      // Crear el elemento de progresión ELO
      const progresionElement = document.createElement('div');
      progresionElement.className = 'text-center';
      progresionElement.innerHTML = `
        <div class="text-xl sm:text-2xl lg:text-3xl font-bold ${progresionColor}">${progresionTexto}</div>
        <div class="text-xs sm:text-sm text-gray-500">Progresión ELO</div>
      `;
      
      // Insertar después del primer elemento (ELO actual)
      const eloElement = statsContainer.children[0];
      statsContainer.insertBefore(progresionElement, eloElement.nextSibling);
    }
  }

  calculateStats() {
    let victorias = 0;
    let derrotas = 0;

    this.partidos.forEach(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === this.jugadorId || partido.pareja1_jugador2_id === this.jugadorId;
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

  createEloChart() {
    const ctx = document.getElementById('eloChart').getContext('2d');
    
    // Preparar datos para la gráfica
    const chartData = this.prepareChartData();
    
    this.eloChart = new Chart(ctx, {
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
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: '#6b7280'
            }
          },
          y: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: '#6b7280'
            },
            min: 1000,
            max: 2200,
            beginAtZero: false
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  prepareChartData() {
    // Ordenar partidos por fecha
    const sortedPartidos = [...this.partidos].sort((a, b) => 
      new Date(a.fecha_partido) - new Date(b.fecha_partido)
    );

    const labels = [];
    const eloValues = [];
    let currentElo = 1500; // ELO inicial

    // Simular progresión ELO (en una implementación real, esto vendría de la base de datos)
    sortedPartidos.forEach((partido, index) => {
      labels.push(`P${index + 1}`);
      
      // Simular cambio de ELO basado en el resultado
      const estaEnPareja1 = partido.pareja1_jugador1_id === this.jugadorId || partido.pareja1_jugador2_id === this.jugadorId;
      const ganadorPareja = partido.ganador_pareja;
      
      if (ganadorPareja) {
        if ((estaEnPareja1 && ganadorPareja === 1) || (!estaEnPareja1 && ganadorPareja === 2)) {
          // Victoria: +15 ELO
          currentElo += 15;
        } else {
          // Derrota: -10 ELO
          currentElo -= 10;
        }
      }
      
      eloValues.push(currentElo);
    });

    // Asegurar que el eje X tenga al menos 5 divisiones
    const minDivisiones = 5;
    while (labels.length < minDivisiones) {
      labels.push(`P${labels.length + 1}`);
      // No añadir valores para partidos futuros, solo las etiquetas del eje X
    }

    return { labels, eloValues };
  }

  displayRecentMatches() {
    const container = document.getElementById('recent-matches');
    
    if (this.partidos.length === 0) {
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
    const recentPartidos = this.partidos.slice(0, 10);
    
    container.innerHTML = recentPartidos.map(partido => {
      const estaEnPareja1 = partido.pareja1_jugador1_id === this.jugadorId || partido.pareja1_jugador2_id === this.jugadorId;
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
                <span class="text-xs sm:text-sm text-gray-500">${fecha}</span>
                ${esGanador ? '<span class="text-green-600 font-semibold text-sm sm:text-base">🏆 Victoria</span>' : '<span class="text-red-600 font-semibold text-sm sm:text-base">❌ Derrota</span>'}
              </div>
              <div class="text-sm sm:text-base lg:text-lg font-medium">
                ${pareja1Names} vs ${pareja2Names}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 mt-1">
                ${partido.pareja1_set1}-${partido.pareja2_set1}, ${partido.pareja1_set2}-${partido.pareja2_set2}${partido.pareja1_set3 ? `, ${partido.pareja1_set3}-${partido.pareja2_set3}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-message').classList.remove('hidden');
    document.getElementById('error-text').textContent = message;
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').classList.remove('hidden');
  }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  window.jugadorStatsApp = new JugadorStatsApp();
  window.jugadorStatsApp.init();
}); 