const cheerio = require('cheerio');
const {getPageContent} = require('./scraper');
const {formatDate, escapeStr} = require('./utils');

/**
 * Escanea en el siguiente orden:
 * 1. team_id,version,name,overall_rating,attack,midfield,defence,
 * 2. league_id,league_name,league_logo,
 * 3. team_type,formation,coach_id,coach_name,coach_image,
 * 4. rivals,
 * 5. home_stadium,alternate_stadiums,
 * 6. team_color_home_primary,team_color_home_secondary,team_color_away_primary,team_color_away_secondary,
 * 7. Jersey de local y visitante
 * 8. Estadísticas del equipo
 * 9. Jugadores del plantel
 */
async function getTeamDetailsCsvRow(url, includeVersionHistory = true) {
    console.log('Iniciando getTeamDetailsCsvRow para:', url);
    // Obtener la página principal del equipo
    const rosterId = '250029'; // Versión actual del juego
    const urlWithRoster = `${url}${rosterId}/`;
    console.log(`Descargando contenido de: ${urlWithRoster}`);
    const html = await getPageContent(urlWithRoster);
    const $ = cheerio.load(html);
    
    // Si necesitamos incluir el historial de versiones, procesar cada versión
    if (includeVersionHistory) {
        return await processVersionHistory(url, html);
    } else {
        // Si solo necesitamos la versión actual, procesar solo la página actual
        const team_id = url.split('/')[4];
        const title = $('title').text();
        const dateMatch = title.match(/([A-Za-z]+ \d+, \d{4})/);
        const version = dateMatch ? dateMatch[1] : '';
        return await processTeamData(html, team_id, version);
    }
}

/**
 * Procesa el historial de versiones de un equipo
 * @param {string} baseUrl - URL base del equipo
 * @param {string} initialHtml - HTML ya descargado de la página principal
 * @returns {Promise<string>} - Filas de datos CSV para cada versión
 */
async function processVersionHistory(baseUrl, initialHtml) {
    const team_id = baseUrl.split('/')[4];
    const $initial = cheerio.load(initialHtml); // Renombrado para claridad
    
    // Extraer las versiones disponibles (ahora con URL)
    const versions = parseTeamVersions($initial);
    
    console.log(`Encontradas ${versions.length} versiones para el equipo ${team_id}`);
    
    // Si no hay historial de versiones, procesar solo la versión actual
    if (versions.length === 0) {
        const title = $initial('title').text();
        const dateMatch = title.match(/([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})/); // Regex más específico para fecha
        const currentDate = dateMatch ? dateMatch[1] : ''; // Extraer del título si es posible
        console.log(`No se encontró historial de versiones. Usando versión actual: ${currentDate}`);
        return await processTeamData(initialHtml, team_id, currentDate);
    }
    
    // Procesar cada versión
    let results = [];
    
    for (const version of versions) {
        // Loguear el texto extraído del dropdown y la URL
        console.log(`Procesando versión del equipo ${team_id}: ${version.date} desde ${version.url}`); 
        try {
            // ****** NUEVO: Descargar HTML para la URL específica de la versión ******
            console.log(`Descargando contenido de: ${version.url}`);
            const versionHtml = await getPageContent(version.url);
            const $versionPage = cheerio.load(versionHtml);

            // ****** NUEVO: Extraer fecha del título de la página específica ******
            const versionPageTitle = $versionPage('title').text();
            const dateMatch = versionPageTitle.match(/([A-Za-z]{3,}\s+\d{1,2},\s+\d{4})/); // Buscar formato 'Mes dia, año'
            const actualVersionDate = dateMatch ? dateMatch[1] : version.date; // Usar fecha del título, o el texto del dropdown como fallback
            
            console.log(`Fecha extraída del título de la página de versión: ${actualVersionDate}`);

            // ****** MODIFICADO: Pasar el HTML específico y la fecha confirmada ******
            const versionData = await processTeamData(versionHtml, team_id, actualVersionDate);
            results.push(versionData);
        } catch (error) {
            console.error(`Error al procesar versión ${version.date} (URL: ${version.url}) para equipo ${team_id}:`, error);
        }
    }
    
    return results.join('\n');
}

/**
 * Procesa los datos de equipo de una página HTML
 * @param {string} html - Contenido HTML de la página
 * @param {string} team_id - ID del equipo
 * @param {string} version - Versión/fecha de los datos
 * @returns {string} - Fila de datos CSV
 */
async function processTeamData(html, team_id, version) {
    console.log('Iniciando processTeamData para team_id:', team_id, 'version:', version);
    const $ = cheerio.load(html);
    
    // Extraer la información del equipo
    const teamInfo = await parseTeamInfo($);
    
    // Crear una fila CSV con todos los datos recopilados
    const row = [
        escapeStr(team_id),
        escapeStr(version),
        escapeStr(teamInfo.name),
        escapeStr(teamInfo.overall_rating),
        escapeStr(teamInfo.attack),
        escapeStr(teamInfo.midfield),
        escapeStr(teamInfo.defence),
        escapeStr(teamInfo.league_id),
        escapeStr(teamInfo.league_name),
        escapeStr(teamInfo.league_logo),
        escapeStr(teamInfo.team_type),
        escapeStr(teamInfo.formation),
        escapeStr(teamInfo.coach_id),
        escapeStr(teamInfo.coach_name),
        escapeStr(teamInfo.coach_image),
        escapeStr(teamInfo.rival_team),
        escapeStr(teamInfo.home_stadium),
        escapeStr(teamInfo.alternate_stadiums),
        escapeStr(teamInfo.team_color_home_primary),
        escapeStr(teamInfo.team_color_home_secondary),
        escapeStr(teamInfo.team_color_away_primary),
        escapeStr(teamInfo.team_color_away_secondary),
        escapeStr(teamInfo.starting_xi_average_age),
        escapeStr(teamInfo.whole_team_average_age),
        escapeStr(teamInfo.average_potential),
        escapeStr(teamInfo.players_on_loan),
        escapeStr(teamInfo.squad_size),
        escapeStr(teamInfo.foreign_players),
        escapeStr(teamInfo.contract_left),
        escapeStr(teamInfo.team_chemistry),
        escapeStr(teamInfo.transfer_budget),
        escapeStr(teamInfo.wage_budget),
        escapeStr(teamInfo.on_loan_players),
        escapeStr(teamInfo.international_prestige),
        escapeStr(teamInfo.domestic_prestige),
        escapeStr(teamInfo.youth_academy),
        escapeStr(teamInfo.short_free_kick),
        escapeStr(teamInfo.long_free_kick),
        escapeStr(teamInfo.left_short_free_kick),
        escapeStr(teamInfo.right_short_free_kick),
        escapeStr(teamInfo.penalties),
        escapeStr(teamInfo.left_corner),
        escapeStr(teamInfo.right_corner),
        escapeStr(teamInfo.captain),
        escapeStr(teamInfo.club_worth),
        escapeStr(version)
    ];
    
    return row.join(',');
}

/**
 * Genera el encabezado de columnas CSV para los datos de equipos
 * @returns {string} - Encabezado CSV
 */
function getTeamHeaderRow() {
    const headers = [
        "team_id", "version", "name", "overall_rating", "attack", "midfield", "defence",
        "league_id", "league_name", "league_logo",
        "team_type", "formation", "coach_id", "coach_name", "coach_image", 
        "rivals", "home_stadium", "alternate_stadiums",
        "team_color_home_primary", "team_color_home_secondary", 
        "team_color_away_primary", "team_color_away_secondary",
        "average_age", "average_overall", "average_potential", "players_on_loan",
        "squad_size", "foreign_players", "contract_left", "team_chemistry",
        "transfer_budget", "wage_budget", "on_loan_players", "international_prestige", 
        "domestic_prestige", "youth_academy", "attacking", "passing", "defending",
        "goalkeeper_ability", "tactical_awareness", "finishing_ability", "crossing",
        "aerial_ability", "set_pieces", "version_date"
    ];
    
    return headers.map(h => `"${h}"`).join(',') + '\n';
}

function parseTeamVersions($) {
    const versions = [];
    // ****** NUEVO: Obtener URL base para construir URLs absolutas ******
    const canonicalLink = $('link[rel="canonical"]').attr('href');
    if (!canonicalLink) {
        console.error("No se pudo determinar la URL base desde el link canónico.");
        return [];
    }
    const domain = new URL(canonicalLink).origin; // e.g., "https://sofifa.com"
    
    // Buscar las versiones en el elemento <select> con name='version'
    $('select[name="version"] option').each((i, el) => {
        const versionText = $(el).text().trim(); // Texto mostrado (puede ser fecha o nombre)
        const relativeLink = $(el).attr('value'); // Enlace relativo (e.g., /team/73/250028/...)

        if (versionText && relativeLink && relativeLink.startsWith('/team/')) { // Asegurar que es un enlace válido
             // ****** NUEVO: Construir URL absoluta ******
            const versionUrl = domain + relativeLink;
            versions.push({
                date: versionText, // Guardar texto (fecha o nombre)
                url: versionUrl    // Guardar URL absoluta
            });
        } else {
             console.warn(`Opción omitida: Texto='${versionText}', Link='${relativeLink}'`);
        }
    });
    
    return versions;
}

function parseTeamInfo($) {
    console.log('Iniciando parseTeamInfo');
    const teamInfo = {
        name: '',
        overall_rating: '',
        attack: '',
        midfield: '',
        defence: '',
        league_id: '', 
        league_name: '', 
        league_logo: '',
        team_type: '', 
        formation: '', 
        coach_id: '', 
        coach_name: '', 
        coach_image: '',
        home_stadium: '',
        rival_team: '',
        alternate_stadiums: '',
        team_color_home_primary: '', 
        team_color_home_secondary: '',
        team_color_away_primary: '', 
        team_color_away_secondary: '',
        starting_xi_average_age: '',
        whole_team_average_age: '',
        average_overall: '',
        average_potential: '',
        players_on_loan: '',
        squad_size: '',
        foreign_players: '',
        contract_left: '',
        team_chemistry: '',
        transfer_budget: '',
        wage_budget: '',
        club_worth: '',
        on_loan_players: '',
        international_prestige: '',
        domestic_prestige: '',
        youth_academy: '',
        short_free_kick: '',
        long_free_kick: '',
        left_short_free_kick: '',
        right_short_free_kick: '',
        penalties: '',
        left_corner: '',
        right_corner: '',
        captain: ''
    };

    // Extraer nombre del equipo
    teamInfo.name = $('h1').first().text().trim();

    console.log('Nombre del equipo extraído:', teamInfo.name);

    // ****** NUEVO: Extraer información de la Liga ******
    const leagueLinkElement = $('.info > .meta a[href*="/league/"]').first(); // Buscar el primer enlace de liga en .meta
    if (leagueLinkElement.length > 0) {
        const leagueHref = leagueLinkElement.attr('href');
        const leagueName = leagueLinkElement.text().trim();
        const leagueLogo = leagueLinkElement.find('img.team-league-logo').attr('src'); // Buscar logo dentro del enlace

        // Extraer ID de la liga del href (ej: /league/53/laliga... -> 53)
        const idMatch = leagueHref.match(/\/league\/(\d+)\//);
        if (idMatch && idMatch[1]) {
            teamInfo.league_id = idMatch[1];
            console.log(`  -> Mapeando [league_id]: ${teamInfo.league_id}`);
        }

        teamInfo.league_name = leagueName;
        console.log(`  -> Mapeando [league_name]: ${teamInfo.league_name}`);
        
        if (leagueLogo) {
             teamInfo.league_logo = leagueLogo;
             console.log(`  -> Mapeando [league_logo]: ${teamInfo.league_logo}`);
        }

    } else {
        console.warn("No se encontró el enlace de la liga.");
    }
    // ****** FIN NUEVO ******

    // Extraer estadísticas generales
    $('.grid .col').each(function() {
        const label = $(this).find('.sub').text().trim().toLowerCase();
        const value = $(this).find('em').attr('title');
        
        switch(label) {
            case 'overall':
                teamInfo.overall_rating = value;
                break;
            case 'attack':
                teamInfo.attack = value;
                break;
            case 'midfield':
                teamInfo.midfield = value;
                break;
            case 'defence':
                teamInfo.defence = value;
                break;
        }
    });

    // Extraer información adicional
    // Intentar un enfoque más robusto para la segunda sección de datos.
    // Seleccionar todos los <li> dentro del contenedor principal de detalles (asumiendo que existe un div con clase 'meta' o similar, 
    // pero por ahora mantenemos una selección amplia como '.block-quarter ul li' o '.content ul li' o el original '.nowrap li')
    // Vamos a mantener '.nowrap li' por ahora y refinar la extracción interna.
    $('.nowrap li').each(function() { 
        const element = $(this);
        let label = '';
        let value = '';

        // Intento 1: Buscar una etiqueta <label> explícita y luego el valor
        const labelTag = element.find('label');
        if (labelTag.length > 0) {
            label = labelTag.text().trim();
            // Intentar obtener el valor de un span/a/strong después de la etiqueta, o el texto restante
            const valueTag = labelTag.next('span, a, strong');
            if (valueTag.length > 0) {
                value = valueTag.text().trim();
            } else {
                 // Obtener todo el texto del li y quitar el texto de la label
                value = element.text().replace(labelTag.text(), '').trim();
            }
        } else {
            // Intento 2: Si no hay <label>, dividir texto basado en ':' o tomar texto antes/después de un span/a
            const valueTag = element.find('span, a, strong').first(); // Buscar primer span/a/strong
            if (valueTag.length > 0) {
                 // Asumir que el texto ANTES del span/a es la etiqueta, y el texto DENTRO es el valor
                 // Clonar el elemento, remover el span/a, obtener el texto restante como etiqueta
                 label = element.clone().find('span, a, strong').remove().end().text().trim(); 
                 value = valueTag.text().trim();
            } else {
                // Intento 3: Tomar todo el texto y dividir si no hay estructura clara (menos fiable)
                const fullText = element.text().trim();
                const parts = fullText.split(':'); // Dividir por dos puntos si existe
                if (parts.length >= 2) {
                    label = parts[0].trim();
                    value = parts.slice(1).join(':').trim();
                } else {
                     // Si no hay :, no podemos determinar etiqueta/valor fácilmente
                     // Podríamos asignar todo a un campo genérico o ignorar
                     console.warn(`No se pudo extraer etiqueta/valor de: ${fullText}`);
                     return; // Saltar este li
                }
            }
        }

        // Limpiar y normalizar la etiqueta para que coincida con las claves de teamInfo
        const cleanLabel = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); // Remover caracteres no alfanuméricos también

        // Limpiar el valor (eliminar espacios extra)
        value = value.replace(/^\s+|\s+$/g, '');

        // Asignar el valor al campo correspondiente si la clave existe
        if (teamInfo.hasOwnProperty(cleanLabel)) {
            console.log(`  -> Mapeando [${cleanLabel}]: ${value}`); // Log para depuración
            teamInfo[cleanLabel] = value;
        } else {
             console.warn(`  -> Etiqueta no reconocida: [${cleanLabel}] para valor: ${value}`); // Log si la etiqueta no coincide
        }
    });

    return teamInfo;
}

async function parseTeam(html, version) {
    const $ = cheerio.load(html);
    
    // Extraer información del equipo
    const teamInfo = await parseTeamInfo($);
    
    // Extraer jugadores
    const players = await parseTeamPlayers($);
    
    // Asignar la fecha a cada jugador
    players.forEach(player => {
        player.date = teamInfo.version_date;
    });

    return {
        teamInfo,
        players
    };
}

module.exports = {
    getTeamDetailsCsvRow,
    getTeamHeaderRow,
    parseTeamInfo
}; 