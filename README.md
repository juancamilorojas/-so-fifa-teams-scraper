# So-FIFA Teams Scraper

Este proyecto permite extraer datos de equipos de fútbol desde [SoFIFA](https://sofifa.com) incluyendo su historial de versiones. Para cada equipo, el scraper recopila:

- Información básica (ID, nombre, rating general, ataque, mediocampo, defensa)
- Liga a la que pertenece
- Tipo de equipo, formación y entrenador
- Rivales
- Estadio y estadios alternativos
- Colores del equipo
- Estadísticas del equipo
- Historial de versiones de cada equipo

## Requisitos

- Node.js (versión 14 o superior)
- npm o yarn

## Instalación

1. Clona el repositorio:
```bash
git clone <URL_DEL_REPOSITORIO>
cd so-fifa-teams-scraper
```

2. Instala las dependencias:
```bash
npm install
```

## Uso

### Descargar URLs de equipos

Antes de extraer los datos, primero necesitas descargar las URLs de los equipos:

```bash
# Descargar todas las URLs de equipos
npm run download-urls

# Descargar solo unas pocas URLs para pruebas
npm run download-urls-test
```

### Extraer datos de equipos

Una vez que tengas las URLs, puedes proceder a extraer los datos:

```bash
# Ejecutar escaneo completo (todas las URLs)
npm run full

# Ejecutar escaneo de prueba (pocas URLs)
npm run test

# Escanear equipos específicos desde files/team-urls-specific.csv
npm run specific
```

### Extraer datos de un equipo específico

Si solo quieres extraer datos de un equipo específico, puedes usar:

```bash
# Configurar un equipo específico por ID (ej. 1 para Arsenal)
npm run specific-team 1

# Luego, ejecutar el escaneo específico
npm run specific
```

## Estructura de datos

Los datos se almacenan en formato CSV en la carpeta `output/`. Cada fila contiene información sobre un equipo y una versión. Si un equipo tiene varias versiones en su historial, se generarán múltiples filas para ese equipo.

Las columnas incluyen:

- `team_id`: ID del equipo en SoFIFA
- `version`: Fecha de la versión
- `name`: Nombre del equipo
- `overall_rating`, `attack`, `midfield`, `defence`: Estadísticas principales
- ... y muchos más campos con información detallada

## Estructura del proyecto

```
.
├── files/                  # Almacena las URLs de equipos
├── output/                 # Resultados del scraper en formato CSV
├── services/
│   ├── parser.js           # Parseo de páginas HTML
│   ├── scraper.js          # Funciones para obtener contenido web
│   ├── team-urls-loader.js # Carga URLs de equipos
│   └── utils.js            # Funciones de utilidad
├── main.js                 # Punto de entrada principal
├── package.json            # Dependencias y scripts
└── README.md               # Este archivo
```

## Consideraciones

- El scraper incluye retrasos entre solicitudes para evitar ser bloqueado por SoFIFA.
- La extracción completa puede llevar mucho tiempo dependiendo del número de equipos y versiones.
- Se recomienda hacer pruebas con un conjunto pequeño de equipos antes de ejecutar el escaneo completo.

## Licencia

Este proyecto es para fines educativos y de investigación. 