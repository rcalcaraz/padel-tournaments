# Instrucciones para Recalcular ELO en Supabase

## Problema Identificado
El ELO no se está calculando correctamente en la base de datos. Los datos en la tabla `historial_elo` están correctos, pero los valores en la tabla `jugadores` no coinciden.

## Solución

### Paso 1: Ejecutar las funciones SQL actualizadas
Primero, ejecuta el archivo `ELO_SQL_FUNCTIONS.sql` completo en el SQL Editor de Supabase para actualizar todas las funciones.

### Paso 2: Recalcular ELO de todos los partidos existentes
Ejecuta la siguiente función en el SQL Editor de Supabase:

```sql
SELECT recalcular_elo_partidos_existentes();
```

Esta función:
- Resetea todos los ratings ELO a 1200
- Limpia el historial ELO
- Recalcula el ELO para todos los partidos con ganador en orden cronológico
- Actualiza la tabla `jugadores` con los valores correctos

### Paso 3: Verificar el resultado
Después de ejecutar la función, verifica que los valores sean correctos:

```sql
-- Ver ratings actuales de los jugadores
SELECT id, nombre, rating_elo FROM jugadores ORDER BY rating_elo DESC;

-- Ver historial de cambios
SELECT 
  j.nombre,
  h.rating_anterior,
  h.rating_nuevo,
  p.id as partido_id,
  h.fecha_cambio
FROM historial_elo h
JOIN jugadores j ON h.jugador_id = j.id
JOIN partidos p ON h.partido_id = p.id
ORDER BY h.fecha_cambio DESC
LIMIT 20;
```

### Paso 4: Verificar que el trigger funcione para nuevos partidos
Para futuros partidos, el trigger `trigger_calcular_elo` se ejecutará automáticamente cuando se inserte un partido con ganador.

## Notas Importantes

1. **Backup**: Antes de ejecutar el recálculo, es recomendable hacer un backup de la tabla `jugadores`:
   ```sql
   CREATE TABLE jugadores_backup AS SELECT * FROM jugadores;
   ```

2. **Tiempo de ejecución**: El recálculo puede tomar varios minutos dependiendo del número de partidos.

3. **Consistencia**: Después del recálculo, los valores en `jugadores.rating_elo` deberían coincidir con los cálculos del frontend.

## Si hay problemas

Si después del recálculo los valores siguen sin coincidir:

1. Verifica que todos los partidos tengan `ganador_pareja` establecido correctamente
2. Verifica que los sets estén completados correctamente
3. Ejecuta la función de recálculo nuevamente

## Función de emergencia

Si necesitas recalcular el ELO de un partido específico:

```sql
SELECT recalcular_elo_partido(123); -- Reemplaza 123 con el ID del partido
``` 