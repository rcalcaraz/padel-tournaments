-- Funciones SQL para el sistema ELO de Pádel
-- Ejecutar estas funciones en el SQL Editor de Supabase

-- 1. Agregar columna rating_elo a la tabla jugadores (si no existe)
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS rating_elo INTEGER DEFAULT 1200;

-- 2. Crear tabla de historial ELO (opcional)
CREATE TABLE IF NOT EXISTS historial_elo (
  id BIGSERIAL PRIMARY KEY,
  jugador_id BIGINT REFERENCES jugadores(id),
  rating_anterior INTEGER NOT NULL,
  rating_nuevo INTEGER NOT NULL,
  partido_id BIGINT REFERENCES partidos(id),
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Función para calcular la probabilidad esperada de victoria
CREATE OR REPLACE FUNCTION calcular_probabilidad_esperada(rating_a INTEGER, rating_b INTEGER)
RETURNS DECIMAL AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10.0, (rating_b - rating_a) / 400.0));
END;
$$ LANGUAGE plpgsql;

-- 4. Función para calcular nuevo rating ELO
CREATE OR REPLACE FUNCTION calcular_nuevo_rating(rating_actual INTEGER, probabilidad_esperada DECIMAL, resultado_real DECIMAL)
RETURNS INTEGER AS $$
DECLARE
  k_factor INTEGER := 32;
  nuevo_rating INTEGER;
BEGIN
  nuevo_rating := rating_actual + k_factor * (resultado_real - probabilidad_esperada);
  RETURN GREATEST(100, ROUND(nuevo_rating));
END;
$$ LANGUAGE plpgsql;

-- 5. Función principal para calcular ELO después de un partido
CREATE OR REPLACE FUNCTION calcular_elo_partido()
RETURNS TRIGGER AS $$
DECLARE
  jugador1_rating INTEGER;
  jugador2_rating INTEGER;
  jugador3_rating INTEGER;
  jugador4_rating INTEGER;
  pareja1_rating INTEGER;
  pareja2_rating INTEGER;
  prob_esperada_pareja1 DECIMAL;
  prob_esperada_pareja2 DECIMAL;
  resultado_pareja1 DECIMAL;
  resultado_pareja2 DECIMAL;
  nuevo_rating_pareja1 INTEGER;
  nuevo_rating_pareja2 INTEGER;
  diferencia1 INTEGER;
  diferencia2 INTEGER;
BEGIN
  -- Solo procesar si hay un ganador
  IF NEW.ganador_pareja IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener ratings actuales de los jugadores
  SELECT rating_elo INTO jugador1_rating FROM jugadores WHERE id = NEW.pareja1_jugador1_id;
  SELECT rating_elo INTO jugador2_rating FROM jugadores WHERE id = NEW.pareja1_jugador2_id;
  SELECT rating_elo INTO jugador3_rating FROM jugadores WHERE id = NEW.pareja2_jugador1_id;
  SELECT rating_elo INTO jugador4_rating FROM jugadores WHERE id = NEW.pareja2_jugador2_id;

  -- Calcular rating promedio de cada pareja
  pareja1_rating := (jugador1_rating + jugador2_rating) / 2;
  pareja2_rating := (jugador3_rating + jugador4_rating) / 2;

  -- Calcular probabilidades esperadas
  prob_esperada_pareja1 := calcular_probabilidad_esperada(pareja1_rating, pareja2_rating);
  prob_esperada_pareja2 := calcular_probabilidad_esperada(pareja2_rating, pareja1_rating);

  -- Determinar resultado real
  IF NEW.ganador_pareja = 1 THEN
    resultado_pareja1 := 1.0;
    resultado_pareja2 := 0.0;
  ELSIF NEW.ganador_pareja = 2 THEN
    resultado_pareja1 := 0.0;
    resultado_pareja2 := 1.0;
  ELSE
    -- Empate
    resultado_pareja1 := 0.5;
    resultado_pareja2 := 0.5;
  END IF;

  -- Calcular nuevos ratings
  nuevo_rating_pareja1 := calcular_nuevo_rating(pareja1_rating, prob_esperada_pareja1, resultado_pareja1);
  nuevo_rating_pareja2 := calcular_nuevo_rating(pareja2_rating, prob_esperada_pareja2, resultado_pareja2);

  -- Calcular diferencias
  diferencia1 := nuevo_rating_pareja1 - pareja1_rating;
  diferencia2 := nuevo_rating_pareja2 - pareja2_rating;

  -- Actualizar ratings de los jugadores
  UPDATE jugadores SET rating_elo = GREATEST(100, rating_elo + diferencia1) 
  WHERE id IN (NEW.pareja1_jugador1_id, NEW.pareja1_jugador2_id);
  
  UPDATE jugadores SET rating_elo = GREATEST(100, rating_elo + diferencia2) 
  WHERE id IN (NEW.pareja2_jugador1_id, NEW.pareja2_jugador2_id);

  -- Registrar cambios en el historial (opcional)
  INSERT INTO historial_elo (jugador_id, rating_anterior, rating_nuevo, partido_id)
  VALUES 
    (NEW.pareja1_jugador1_id, jugador1_rating, jugador1_rating + diferencia1, NEW.id),
    (NEW.pareja1_jugador2_id, jugador2_rating, jugador2_rating + diferencia1, NEW.id),
    (NEW.pareja2_jugador1_id, jugador3_rating, jugador3_rating + diferencia2, NEW.id),
    (NEW.pareja2_jugador2_id, jugador4_rating, jugador4_rating + diferencia2, NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para ejecutar la función después de insertar un partido
DROP TRIGGER IF EXISTS trigger_calcular_elo ON partidos;
CREATE TRIGGER trigger_calcular_elo
  AFTER INSERT ON partidos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_elo_partido();

-- 7. Función para recalcular todos los ELO desde el principio
CREATE OR REPLACE FUNCTION recalcular_todos_elo()
RETURNS VOID AS $$
DECLARE
  partido_record RECORD;
BEGIN
  -- Resetear todos los ratings a 1200
  UPDATE jugadores SET rating_elo = 1200;
  
  -- Limpiar historial
  DELETE FROM historial_elo;
  
  -- Recalcular basado en todos los partidos en orden cronológico
  FOR partido_record IN 
    SELECT * FROM partidos 
    WHERE ganador_pareja IS NOT NULL 
    ORDER BY fecha_partido ASC
  LOOP
    -- Simular inserción para recalcular ELO
    PERFORM calcular_elo_partido() FROM (SELECT partido_record.*) AS temp;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Función para obtener estadísticas ELO de un jugador
CREATE OR REPLACE FUNCTION obtener_estadisticas_elo(jugador_id_param BIGINT)
RETURNS TABLE(
  jugador_id BIGINT,
  nombre TEXT,
  rating_actual INTEGER,
  rating_maximo INTEGER,
  rating_minimo INTEGER,
  partidos_jugados BIGINT,
  victorias BIGINT,
  derrotas BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.nombre,
    j.rating_elo,
    COALESCE(MAX(h.rating_nuevo), j.rating_elo) as rating_maximo,
    COALESCE(MIN(h.rating_nuevo), j.rating_elo) as rating_minimo,
    COUNT(DISTINCT p.id) as partidos_jugados,
    COUNT(CASE WHEN 
      (p.pareja1_jugador1_id = jugador_id_param OR p.pareja1_jugador2_id = jugador_id_param) AND p.ganador_pareja = 1
      OR (p.pareja2_jugador1_id = jugador_id_param OR p.pareja2_jugador2_id = jugador_id_param) AND p.ganador_pareja = 2
    THEN 1 END) as victorias,
    COUNT(CASE WHEN 
      (p.pareja1_jugador1_id = jugador_id_param OR p.pareja1_jugador2_id = jugador_id_param) AND p.ganador_pareja = 2
      OR (p.pareja2_jugador1_id = jugador_id_param OR p.pareja2_jugador2_id = jugador_id_param) AND p.ganador_pareja = 1
    THEN 1 END) as derrotas
  FROM jugadores j
  LEFT JOIN partidos p ON 
    j.id IN (p.pareja1_jugador1_id, p.pareja1_jugador2_id, p.pareja2_jugador1_id, p.pareja2_jugador2_id)
  LEFT JOIN historial_elo h ON j.id = h.jugador_id
  WHERE j.id = jugador_id_param
  GROUP BY j.id, j.nombre, j.rating_elo;
END;
$$ LANGUAGE plpgsql; 