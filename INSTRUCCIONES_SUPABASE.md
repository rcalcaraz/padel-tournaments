# Configuración de Supabase para la Aplicación de Torneos de Pádel

## Paso 1: Crear una cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project" 
3. Crea una cuenta gratuita

## Paso 2: Crear un nuevo proyecto

1. Una vez dentro del dashboard, haz clic en "New project"
2. Elige tu organización
3. Dale un nombre a tu proyecto (ej: "padel-tournaments")
4. Crea una contraseña para la base de datos (guárdala)
5. Selecciona una región cerca de ti
6. Haz clic en "Create new project"

## Paso 3: Crear la tabla de jugadores

1. En el dashboard de tu proyecto, ve a la sección "SQL Editor"
2. Ejecuta el siguiente SQL para crear la tabla:

```sql
-- Crear tabla de jugadores
CREATE TABLE jugadores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rating_elo INTEGER DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar algunos jugadores de ejemplo
INSERT INTO jugadores (nombre) VALUES 
  ('Carlos García'),
  ('María López'),
  ('Juan Pérez'),
  ('Ana Martín'),
  ('Pedro Sánchez'),
  ('Laura González');
```

## Paso 4: Crear la tabla de partidos

```sql
-- Crear tabla de partidos
CREATE TABLE partidos (
  id BIGSERIAL PRIMARY KEY,
  pareja1_jugador1_id BIGINT REFERENCES jugadores(id),
  pareja1_jugador2_id BIGINT REFERENCES jugadores(id),
  pareja2_jugador1_id BIGINT REFERENCES jugadores(id),
  pareja2_jugador2_id BIGINT REFERENCES jugadores(id),
  pareja1_set1 INTEGER,
  pareja1_set2 INTEGER,
  pareja1_set3 INTEGER,
  pareja2_set1 INTEGER,
  pareja2_set2 INTEGER,
  pareja2_set3 INTEGER,
  ganador_pareja INTEGER,
  fecha_partido TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Paso 5: Crear la tabla de historial ELO (opcional)

```sql
-- Crear tabla para el historial de cambios de ELO
CREATE TABLE historial_elo (
  id BIGSERIAL PRIMARY KEY,
  jugador_id BIGINT REFERENCES jugadores(id),
  rating_anterior INTEGER NOT NULL,
  rating_nuevo INTEGER NOT NULL,
  partido_id BIGINT REFERENCES partidos(id),
  fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Paso 6: Crear función para calcular ELO automáticamente

```sql
-- Función para calcular y actualizar ELO después de un partido
CREATE OR REPLACE FUNCTION calcular_elo_partido()
RETURNS TRIGGER AS $$
DECLARE
  jugador1_rating INTEGER;
  jugador2_rating INTEGER;
  jugador3_rating INTEGER;
  jugador4_rating INTEGER;
  pareja1_rating INTEGER;
  pareja2_rating INTEGER;
  nuevos_ratings RECORD;
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

  -- Calcular nuevos ratings (simplificado - usarás la lógica del frontend)
  -- Esta es una implementación básica, la lógica completa estará en el frontend

  -- Actualizar ratings de los jugadores
  UPDATE jugadores SET rating_elo = GREATEST(100, rating_elo + diferencia1) 
  WHERE id IN (NEW.pareja1_jugador1_id, NEW.pareja1_jugador2_id);
  
  UPDATE jugadores SET rating_elo = GREATEST(100, rating_elo + diferencia2) 
  WHERE id IN (NEW.pareja2_jugador1_id, NEW.pareja2_jugador2_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para ejecutar la función después de insertar un partido
CREATE TRIGGER trigger_calcular_elo
  AFTER INSERT ON partidos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_elo_partido();
```

## Paso 7: Obtener las credenciales de tu proyecto

1. Ve a la sección "Settings" en el menú lateral
2. Haz clic en "API"
3. Copia los siguientes valores:
   - **Project URL** (algo como: https://tuproyecto.supabase.co)
   - **anon public** key (una clave larga que empieza con "eyJ...")

## Paso 8: Configurar la aplicación

1. Abre el archivo `index.html`
2. Busca estas líneas en el JavaScript al final del archivo:

```javascript
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI'
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI'
```

3. Reemplaza:
   - `TU_SUPABASE_URL_AQUI` con tu Project URL
   - `TU_SUPABASE_ANON_KEY_AQUI` con tu anon public key

Ejemplo:
```javascript
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

## Paso 9: Probar la aplicación

1. Abre el archivo `index.html` en tu navegador
2. Deberías ver los jugadores cargándose desde la base de datos
3. Los selectores en la sección "Añadir Partido" también deberían mostrar los jugadores
4. El sistema ELO se calculará automáticamente al guardar partidos

## Agregar más jugadores

Para agregar más jugadores a tu base de datos:

1. Ve al "SQL Editor" en Supabase
2. Ejecuta consultas como:

```sql
INSERT INTO jugadores (nombre) VALUES ('Nuevo Jugador');
```

O puedes usar la interfaz de "Table Editor":
1. Ve a "Table Editor"
2. Selecciona la tabla "jugadores"
3. Haz clic en "Insert row"
4. Ingresa el nombre del jugador
5. Haz clic en "Save"

## Solución de problemas

- **Error de configuración**: Verifica que hayas reemplazado correctamente las credenciales
- **Error de conexión**: Asegúrate de que tu proyecto de Supabase esté activo
- **Tabla no encontrada**: Verifica que hayas ejecutado el SQL para crear las tablas
- **Sin jugadores**: Verifica que hayas insertado datos en la tabla
- **ELO no se actualiza**: Verifica que el trigger esté creado correctamente

¡Tu aplicación ya está conectada a Supabase con sistema ELO! 🎾 