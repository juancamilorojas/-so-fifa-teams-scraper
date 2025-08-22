const Humanoid = require('humanoid-js');
const humanoid = new Humanoid({
    headers: {
        // El User-Agent debe lucir como un navegador moderno
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Referer': 'https://sofifa.com/'
    }
});
const fs = require('fs');

const asyncWait = ms => new Promise(resolve => setTimeout(resolve, ms))

// ----- Gestión de proxies y encabezados -----

// Lista de proxies a utilizar (formato host:puerto) definida por variable de entorno
const proxyList = (process.env.PROXIES || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
        const [host, port] = p.split(':');
        return { host, port: parseInt(port, 10) };
    });

let proxyIndex = 0;
const getNextProxy = () => {
    if (!proxyList.length) return null;
    const proxy = proxyList[proxyIndex % proxyList.length];
    proxyIndex += 1;
    return proxy;
};

// Lista de user agents modernos para rotar
const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

const refreshHeaders = () => {
    humanoid.config.headers = {
        ...humanoid.config.headers,
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Accept-Language': 'en-US,en;q=0.9'
    };
};

/**
 * Este método leerá el contenido de cualquier página web.
 * @param url
 * @returns {Promise<String>}
 */
const getPageContent = async (url) => {
    let attempts = 5;
    let lastError = null;
    let proxy = getNextProxy();

    while (attempts > 0) {
        try {
            refreshHeaders();
            const options = proxy ? { proxy } : {};
            const response = await humanoid.get(url, options);

            if (response.statusCode === 403) {
                console.log('Detectado bloqueo de acceso (403), cambiando proxy...');
                proxy = getNextProxy();
                const delay = Math.pow(2, 5 - attempts) * 1000; // backoff exponencial
                await asyncWait(delay);
                attempts -= 1;
                continue;
            }

            if (response.statusCode !== 200) {
                console.log(`reintentando ... intento=${attempts}, statusCode=${response.statusCode}`);
                const delay = Math.pow(2, 5 - attempts) * 1000;
                await asyncWait(delay);
                attempts -= 1;
                continue;
            }

            if (attempts < 5) {
                console.log(`reintento exitoso ... intento=${attempts}`);
            }

            // Verificar que el contenido sea HTML válido
            if (!response.body.includes('<!DOCTYPE html>')) {
                console.log('Respuesta no válida, reintentando...');
                const delay = Math.pow(2, 5 - attempts) * 1000;
                await asyncWait(delay);
                attempts -= 1;
                continue;
            }

            // Guardar el HTML para análisis
            fs.writeFileSync('debug_response.html', response.body);
            console.log('HTML guardado en debug_response.html para análisis');

            // Esperar un tiempo aleatorio entre 1 y 3 segundos antes de la siguiente petición
            await asyncWait(1000 + Math.random() * 2000);

            return response.body;
        } catch (error) {
            lastError = error;
            console.error(`Error en intento ${6 - attempts}:`, error.message);
            const delay = Math.pow(2, 5 - attempts) * 1000;
            await asyncWait(delay);
            attempts -= 1;
        }
    }

    throw new Error(`Error leyendo página=${url}: ${lastError?.message || 'Error desconocido'}`);
};

module.exports = {
    getPageContent
};
