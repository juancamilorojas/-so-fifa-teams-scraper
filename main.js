const fs = require('fs');
const {getTeamDetailsCsvRow, getTeamHeaderRow} = require('./services/parser');
const {loadTeamUrlsFile, loadSpecificTeam} = require('./services/team-urls-loader');
const assert = require('assert');

const teamUrlsFullFile = './files/team-urls-full.csv';
const teamUrlsTestFile = './files/team-urls-test.csv';
const teamUrlsSpecificFile = './files/team-urls-specific.csv';

const teamDataFullFile = './output/team-data-full.csv';
const teamDataTestFile = './output/team-data-test.csv';
const teamDataSpecificFile = './output/team-data-specific.csv';

const scanType = process.argv[2];
const specificTeamId = process.argv[3];

const TEAM_URL_PATTERN = /\/team\/\d+\//;

// Lista de equipos para pruebas
const testTeams = [
    'https://sofifa.com/team/243/real-madrid/',
    'https://sofifa.com/team/10/manchester-city/',
    // 'https://sofifa.com/team/241/bayern-munchen/',
    // 'https://sofifa.com/team/11/manchester-united/',
    // 'https://sofifa.com/team/1/arsenal/',
    // 'https://sofifa.com/team/73/psg/',
    // 'https://sofifa.com/team/18/liverpool/',
    // 'https://sofifa.com/team/240/borussia-dortmund/',
    // 'https://sofifa.com/team/45/inter/',
    // 'https://sofifa.com/team/44/juventus/'
];

/**
 * Descarga datos de equipos a partir de una lista de URLs
 * @param {string} fileToRead - Archivo con URLs a procesar
 * @param {string} fileToWrite - Archivo para guardar resultados
 * @param {boolean} includeVersionHistory - Si se debe incluir el historial de versiones
 */
async function download(fileToRead, fileToWrite, includeVersionHistory = true) {
    let teamUrlList;
    
    if (scanType === 'test') {
        teamUrlList = testTeams;
    } else {
        if (!fs.existsSync(fileToRead)) {
            console.error(`El archivo ${fileToRead} no existe. Ejecuta primero 'npm run download-urls'.`);
            return;
        }
        teamUrlList = fs.readFileSync(fileToRead).toString().trim().split('\n');
    }
    
    // Escribir encabezado CSV
    fs.writeFileSync(fileToWrite, getTeamHeaderRow(), {flag: 'w'});

    let count = 0;
    console.time('Escaneo completo');

    for (let url of teamUrlList) {
        if (!TEAM_URL_PATTERN.test(url)) {
            console.warn(`URL inválida omitida: ${url}`);
            continue;
        }
        try {
            console.log(`Procesando equipo (${++count}/${teamUrlList.length}): ${url}`);
            let rows = await getTeamDetailsCsvRow(url, includeVersionHistory);
            fs.writeFileSync(fileToWrite, rows + '\n', {flag: 'a'});
        } catch (error) {
            console.error(`Error procesando ${url}:`, error);
        }
    }
    
    console.timeEnd('Escaneo completo');
}

/**
 * Inicia el proceso de scraping según el tipo especificado
 */
(async function start() {
    try {
        if (scanType === 'full') {
            console.log('Ejecutando escaneo completo.');
            await download(teamUrlsFullFile, teamDataFullFile);
        } else if (scanType === 'test') {
            console.log('Ejecutando escaneo de prueba.');
            await download(teamUrlsTestFile, teamDataTestFile);
            const content = fs.readFileSync(teamDataTestFile).toString();
            assert(content.includes('Arsenal'), 'Arsenal no está presente en los datos de prueba.');
            console.log('Todas las pruebas pasaron ✅');
        } else if (scanType === 'specific') {
            console.log('Ejecutando escaneo específico.');
            await download(teamUrlsSpecificFile, teamDataSpecificFile);
            console.log('Escaneo específico completado ✅');
        } else if (scanType === 'download-urls') {
            console.log('Iniciando descarga de URLs de equipos...');
            await loadTeamUrlsFile('full');
        } else if (scanType === 'download-urls-test') {
            console.log('Iniciando descarga de URLs de equipos de prueba...');
            await loadTeamUrlsFile('test');
        } else if (scanType === 'specific-team' && specificTeamId) {
            console.log(`Configurando escaneo para equipo específico ID ${specificTeamId}...`);
            await loadSpecificTeam(specificTeamId);
            console.log(`Para escanear el equipo, ejecuta: npm run specific`);
        } else {
            console.log(`
Uso: node main.js <comando> [argumentos]

Comandos disponibles:
  download-urls         - Descarga URLs de todos los equipos
  download-urls-test    - Descarga URLs de equipos (solo para prueba)
  full                  - Ejecuta escaneo completo de todos los equipos
  test                  - Ejecuta escaneo de prueba (pocas URLs)
  specific              - Escanea equipos específicos desde files/team-urls-specific.csv
  specific-team <id>    - Configura un equipo específico por ID para escaneo (ej. 1 para Arsenal)
            `);
        }
    } catch (error) {
        console.error('Error en el proceso principal:', error);
    }
}()); 