-- Funciones SQL para el sistema ELO de Pádel MEJORADO
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

-- 4. Función para calcular el factor de resultado basado en la diferencia de sets
CREATE OR REPLACE FUNCTION calcular_factor_resultado(
  pareja1_set1 INTEGER, pareja1_set2 INTEGER, pareja1_set3 INTEGER,
  pareja2_set1 INTEGER, pareja2_set2 INTEGER, pareja2_set3 INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  sets_pareja1 INTEGER := 0;
  sets_pareja2 INTEGER := 0;
  diferencia_sets INTEGER;
  factor DECIMAL;
BEGIN
  -- Contar sets ganados por cada pareja
  IF pareja1_set1 > pareja2_set1 THEN sets_pareja1 := sets_pareja1 + 1; END IF;
  IF pareja1_set2 > pareja2_set2 THEN sets_pareja1 := sets_pareja1 + 1; END IF;
  IF pareja1_set3 > pareja2_set3 THEN sets_pareja1 := sets_pareja1 + 1; END IF;
  
  IF pareja2_set1 > pareja1_set1 THEN sets_pareja2 := sets_pareja2 + 1; END IF;
  IF pareja2_set2 > pareja1_set2 THEN sets_pareja2 := sets_pareja2 + 1; END IF;
  IF pareja2_set3 > pareja1_set3 THEN sets_pareja2 := sets_pareja2 + 1; END IF;
  
  -- Calcular diferencia de sets
  diferencia_sets := ABS(sets_pareja1 - sets_pareja2);
  
  -- Factor de resultado: 1.0 para partidos muy ajustados, hasta 1.5 para victorias aplastantes
  IF diferencia_sets = 0 THEN
    factor := 1.0; -- Empate
  ELSIF diferencia_sets = 1 THEN
    factor := 1.0; -- Partido ajustado (2-1, 2-0)
  ELSIF diferencia_sets = 2 THEN
    factor := 1.2; -- Victoria clara (2-0, 3-1)
  ELSE
    factor := 1.5; -- Victoria aplastante (3-0)
  END IF;
  
  RETURN factor;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para calcular el factor de recompensa diferencial
CREATE OR REPLACE FUNCTION calcular_factor_recompensa(
  rating_jugador INTEGER, rating_promedio_pareja INTEGER, es_ganador BOOLEAN
)
RETURNS DECIMAL AS $$
DECLARE
  diferencia INTEGER;
  factor DECIMAL;
BEGIN
  diferencia := rating_promedio_pareja - rating_jugador;
  
  IF es_ganador THEN
    -- Lógica para el equipo GANADOR
    IF diferencia > 0 THEN
      -- Jugador de menor nivel: más recompensa cuando gana (hasta 1.3x)
      factor := 1.0 + (diferencia / 400.0) * 0.3;
      RETURN LEAST(1.3, factor);
    ELSIF diferencia < 0 THEN
      -- Jugador de mayor nivel: menos recompensa cuando gana (hasta 0.7x)
      factor := 1.0 + (diferencia / 400.0) * 0.3;
      RETURN GREATEST(0.7, factor);
    ELSE
      -- Mismo nivel
      RETURN 1.0;
    END IF;
  ELSE
    -- Lógica para el equipo PERDEDOR
    IF diferencia > 0 THEN
      -- Jugador de menor nivel: menos castigo cuando pierde (hasta 0.7x)
      factor := 1.0 - (diferencia / 400.0) * 0.3;
      RETURN GREATEST(0.7, factor);
    ELSIF diferencia < 0 THEN
      -- Jugador de mayor nivel: más castigo cuando pierde (hasta 1.3x)
      factor := 1.0 - (diferencia / 400.0) * 0.3;
      RETURN LEAST(1.3, factor);
    ELSE
      -- Mismo nivel
      RETURN 1.0;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para calcular nuevo rating ELO mejorado
CREATE OR REPLACE FUNCTION calcular_nuevo_rating_mejorado(
  rating_actual INTEGER, 
  probabilidad_esperada DECIMAL, 
  resultado_real DECIMAL,
  factor_resultado DECIMAL,
  factor_recompensa DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
  k_factor INTEGER := 32;
  cambio_base INTEGER;
  cambio_final INTEGER;
BEGIN
  -- Cambio base según resultado
  cambio_base := k_factor * (resultado_real - probabilidad_esperada);
  
  -- Aplicar factores de resultado y recompensa
  cambio_final := ROUND(cambio_base * factor_resultado * factor_recompensa);
  
  RETURN GREATEST(100, rating_actual + cambio_final);
END;
$$ LANGUAGE plpgsql;

-- 7. Función principal para calcular ELO después de un partido (MEJORADA)
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
  factor_resultado DECIMAL;
  factor_recompensa1 DECIMAL;
  factor_recompensa2 DECIMAL;
  factor_recompensa3 DECIMAL;
  factor_recompensa4 DECIMAL;
  nuevo_rating1 INTEGER;
  nuevo_rating2 INTEGER;
  nuevo_rating3 INTEGER;
  nuevo_rating4 INTEGER;
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

  -- Calcular factor de resultado basado en la diferencia de sets
  factor_resultado := calcular_factor_resultado(
    NEW.pareja1_set1, NEW.pareja1_set2, NEW.pareja1_set3,
    NEW.pareja2_set1, NEW.pareja2_set2, NEW.pareja2_set3
  );

  -- Calcular factores de recompensa diferencial para cada jugador
  factor_recompensa1 := calcular_factor_recompensa(jugador1_rating, pareja1_rating, NEW.ganador_pareja = 1);
  factor_recompensa2 := calcular_factor_recompensa(jugador2_rating, pareja1_rating, NEW.ganador_pareja = 1);
  factor_recompensa3 := calcular_factor_recompensa(jugador3_rating, pareja2_rating, NEW.ganador_pareja = 2);
  factor_recompensa4 := calcular_factor_recompensa(jugador4_rating, pareja2_rating, NEW.ganador_pareja = 2);

  -- Calcular nuevos ratings individuales
  nuevo_rating1 := calcular_nuevo_rating_mejorado(
    jugador1_rating, prob_esperada_pareja1, resultado_pareja1, factor_resultado, factor_recompensa1
  );
  nuevo_rating2 := calcular_nuevo_rating_mejorado(
    jugador2_rating, prob_esperada_pareja1, resultado_pareja1, factor_resultado, factor_recompensa2
  );
  nuevo_rating3 := calcular_nuevo_rating_mejorado(
    jugador3_rating, prob_esperada_pareja2, resultado_pareja2, factor_resultado, factor_recompensa3
  );
  nuevo_rating4 := calcular_nuevo_rating_mejorado(
    jugador4_rating, prob_esperada_pareja2, resultado_pareja2, factor_resultado, factor_recompensa4
  );

  -- Actualizar ratings de los jugadores
  UPDATE jugadores SET rating_elo = nuevo_rating1 WHERE id = NEW.pareja1_jugador1_id;
  UPDATE jugadores SET rating_elo = nuevo_rating2 WHERE id = NEW.pareja1_jugador2_id;
  UPDATE jugadores SET rating_elo = nuevo_rating3 WHERE id = NEW.pareja2_jugador1_id;
  UPDATE jugadores SET rating_elo = nuevo_rating4 WHERE id = NEW.pareja2_jugador2_id;

  -- Registrar cambios en el historial
  INSERT INTO historial_elo (jugador_id, rating_anterior, rating_nuevo, partido_id)
  VALUES 
    (NEW.pareja1_jugador1_id, jugador1_rating, nuevo_rating1, NEW.id),
    (NEW.pareja1_jugador2_id, jugador2_rating, nuevo_rating2, NEW.id),
    (NEW.pareja2_jugador1_id, jugador3_rating, nuevo_rating3, NEW.id),
    (NEW.pareja2_jugador2_id, jugador4_rating, nuevo_rating4, NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para ejecutar la función después de insertar un partido
DROP TRIGGER IF EXISTS trigger_calcular_elo ON partidos;
CREATE TRIGGER trigger_calcular_elo
  AFTER INSERT ON partidos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_elo_partido();

-- 9. Función para recalcular todos los ELO desde el principio
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

-- 10. Función para obtener estadísticas ELO de un jugador
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