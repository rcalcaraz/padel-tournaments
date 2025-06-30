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

## Paso 4: Obtener las credenciales de tu proyecto

1. Ve a la sección "Settings" en el menú lateral
2. Haz clic en "API"
3. Copia los siguientes valores:
   - **Project URL** (algo como: https://tuproyecto.supabase.co)
   - **anon public** key (una clave larga que empieza con "eyJ...")

## Paso 5: Configurar la aplicación

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

## Paso 6: Probar la aplicación

1. Abre el archivo `index.html` en tu navegador
2. Deberías ver los jugadores cargándose desde la base de datos
3. Los selectores en la sección "Añadir Partido" también deberían mostrar los jugadores

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
- **Tabla no encontrada**: Verifica que hayas ejecutado el SQL para crear la tabla
- **Sin jugadores**: Verifica que hayas insertado datos en la tabla

¡Tu aplicación ya está conectada a Supabase! 🎾 