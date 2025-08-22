// getPageContent.js
const Humanoid = require('humanoid-js');
const fs = require('fs');

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

const asyncWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ----- Gestión de proxies y encabezados -----

// PROXIES="host1:8080,host2:8080"
const proxyList = (process.env.PROXIES || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => {
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

// Backoff exponencial con un poco de jitter
const backoffDelay = (attemptsLeft) => {
  const base = Math.pow(2, 5 - attemptsLeft) * 1000; // 1s, 2s, 4s, 8s, 16s...
  const jitter = Math.floor(Math.random() * 400); // +0-400ms
  return base + jitter;
};

/**
 * Lee el HTML de una URL con rotación de headers/proxies y backoff.
 * @param {string} url
 * @returns {Promise<string>}
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
        lastError = new Error('HTTP 403');
        console.log('Detectado 403: bloqueado. Rotando proxy y aplicando backoff...');
        // Rota proxy si hay lista
        const newProxy = getNextProxy();
        if (newProxy) proxy = newProxy;

        const delay = backoffDelay(attempts);
        await asyncWait(delay);
        attempts -= 1;
        continue;
      }

      if (response.statusCode !== 200) {
        lastError = new Error(`HTTP ${response.statusCode}`);
        console.log(`Status ${response.statusCode}. Reintentando (restan ${attempts - 1})...`);
        const delay = backoffDelay(attempts);
        await asyncWait(delay);
        attempts -= 1;
        continue;
      }

      // Validar contenido HTML
      const body = response.body || '';
      if (!body.includes('<!DOCTYPE html>') && !body.includes('<html')) {
        lastError = new Error('Contenido no válido (no parece HTML)');
        console.log('Respuesta no válida, reintentando...');
        const delay = backoffDelay(attempts);
        await asyncWait(delay);
        attempts -= 1;
        continue;
      }

      // Guardar el HTML para diagnóstico
      try {
        fs.writeFileSync('debug_response.html', body);
        console.log('HTML guardado en debug_response.html para análisis');
      } catch (e) {
        // Si falla el guardado, no detenemos el flujo
        console.warn('No se pudo guardar debug_response.html:', e.message);
      }

      // Esperar 1-3s antes de devolver (reduce patrón de scraping)
      await asyncWait(1000 + Math.random() * 2000);

      if (attempts < 5) {
        console.log(`Reintento exitoso. (Intentos restantes: ${attempts})`);
      }

      return body;
    } catch (error) {
      lastError = error;
      console.error(`Error en intento ${6 - attempts}: ${error.message}`);

      // Si hay proxies, intentar rotar también en errores de red
      const newProxy = getNextProxy();
      if (newProxy) {
        proxy = newProxy;
        console.log('Rotando proxy por error de red...');
      }

      const delay = backoffDelay(attempts);
      await asyncWait(delay);
      attempts -= 1;
    }
  }

  // Lanzar error final preservando la causa (Node 16+)
  throw new Error(`Error leyendo página=${url}: ${lastError?.message || 'Error desconocido'}`, { cause: lastError });
};

module.exports = { getPageContent };
