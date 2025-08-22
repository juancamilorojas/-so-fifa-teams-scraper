const {getPageContent} = require('./scraper');
const cheerio = require('cheerio');
const fs = require('fs');

const SOFIFA_BASE_URL = 'https://sofifa.com';
const TEAM_IDS_SOFIFA_URL = `https://sofifa.com/teams?type=all&lg%5B0%5D=13&lg%5B1%5D=53&lg%5B2%5D=19&lg%5B3%5D=31&lg%5B4%5D=16&lg%5B5%5D=10&lg%5B6%5D=14&lg%5B7%5D=4&lg%5B8%5D=20&lg%5B9%5D=32&lg%5B10%5D=83&lg%5B11%5D=17&lg%5B12%5D=39&lg%5B13%5D=308&lg%5B14%5D=341&lg%5B15%5D=335&lg%5B16%5D=336&lg%5B17%5D=350&lg%5B18%5D=351&offset=`;
const teamUrlsFullFile = './files/team-urls-full.csv';
const teamUrlsTestFile = './files/team-urls-test.csv';
const teamUrlsSpecificFile = './files/team-urls-specific.csv';

const TEAM_URL_PATTERN = /\/team\/\d+\//;

/**
 * Este método obtiene todas las URLs de páginas de equipos de sofifa.com
 * @returns {Promise<void>}
 */
async function loadTeamUrlsFile(scanType = 'full') {
    const teamUrlsFileToWrite = scanType === 'full' ? teamUrlsFullFile : 
                               (scanType === 'test' ? teamUrlsTestFile : teamUrlsSpecificFile);
    
    fs.writeFileSync(teamUrlsFileToWrite, '');
    let currentOffset = 0;
    let totalTeams = 0;
    
    while (true) {
        console.log(`Descargando página de equipos con offset=${currentOffset}...`);
        let content = await getPageContent(TEAM_IDS_SOFIFA_URL + currentOffset);
        const $ = cheerio.load(content);
        
        // Buscar enlaces de equipos en la nueva estructura
        const teams = [];
        $('a[href*="/team/"]').each((i, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const fullUrl = SOFIFA_BASE_URL + href;
            if (TEAM_URL_PATTERN.test(fullUrl)) {
                if (!teams.includes(fullUrl)) {
                    teams.push(fullUrl);
                }
            } else {
                console.warn(`URL inválida encontrada y omitida: ${fullUrl}`);
            }
        });

        if (teams.length > 0) {
            const validTeams = teams.filter(url => TEAM_URL_PATTERN.test(url));
            const teamIds = validTeams.join('\n') + '\n';
            fs.appendFileSync(teamUrlsFileToWrite, teamIds);
            totalTeams += validTeams.length;
            console.log(`Descargadas URLs de equipos: ${validTeams.length} (total=${totalTeams})`);
        }
        
        // Verificar si hay más páginas
        const nextButton = $('a.bp3-button:contains("Next")');
        if (!nextButton.length) {
            console.log('No hay más páginas. Deteniendo escaneo.');
            break;
        }
        
        currentOffset += 60;
        
        if (scanType === 'test' && totalTeams >= 3) {
            console.log('Carga de prueba de URLs completada.');
            break;
        }
        
        // Esperar un poco entre páginas para evitar bloqueos
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    }
    
    console.log(`Total de URLs de equipos descargadas: ${totalTeams}`);
}

/**
 * Carga un equipo específico para pruebas
 * @param {string} teamId - ID del equipo
 */
async function loadSpecificTeam(teamId) {
    const url = `${SOFIFA_BASE_URL}/team/${teamId}`;
    fs.writeFileSync(teamUrlsSpecificFile, url);
    console.log(`URL del equipo ${teamId} guardada para escaneo específico`);
}

module.exports = {
    loadTeamUrlsFile,
    loadSpecificTeam
}; 