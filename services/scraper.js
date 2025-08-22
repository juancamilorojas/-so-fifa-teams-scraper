const Humanoid = require('humanoid-js');
const humanoid = new Humanoid({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

/**
 * Este método leerá el contenido de cualquier página web.
 * @param url
 * @returns {Promise<String>}
 */
const getPageContent = async (url) => {
    let attempts = 5;
    let lastError = null;
    
    while (attempts > 0) {
        try {
            const response = await humanoid.get(url);
            
            if (response.statusCode === 403) {
                console.log('Detectado bloqueo de acceso (403), esperando más tiempo...');
                await asyncWait(5000); // Esperar 5 segundos antes de reintentar
                attempts -= 1;
                continue;
            }
            
            if (response.statusCode !== 200) {
                console.log(`reintentando ... intento=${attempts}, statusCode=${response.statusCode}`);
                await asyncWait(2000); // Esperar 2 segundos entre intentos
                attempts -= 1;
                continue;
            }
            
            if (attempts < 5) {
                console.log(`reintento exitoso ... intento=${attempts}`);
            }
            
            // Verificar que el contenido sea HTML válido
            if (!response.body.includes('<!DOCTYPE html>')) {
                console.log('Respuesta no válida, reintentando...');
                await asyncWait(2000);
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
            console.error(`Error en intento ${6-attempts}:`, error.message);
            await asyncWait(2000);
            attempts -= 1;
        }
    }
    
    throw new Error(`Error leyendo página=${url}: ${lastError?.message || 'Error desconocido'}`);
};

module.exports = {
    getPageContent
}; 