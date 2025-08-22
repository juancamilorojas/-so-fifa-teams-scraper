const format = require('date-format');

/**
 * Formatea una cadena de fecha en formato consistente.
 * @param dateString
 * @returns {string}
 */
const formatDate = (dateString) => {
    if (!dateString) {
        return '';
    }
    const month_map = {
        'Jan': '01',
        'Feb': '02',
        'Mar': '03',
        'Apr': '04',
        'May': '05',
        'Jun': '06',
        'Jul': '07',
        'Aug': '08',
        'Sep': '09',
        'Oct': '10',
        'Nov': '11',
        'Dec': '12'
    };
    
    try {
        const parts = dateString.match(/([a-zA-Z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
        if (parts && parts.length === 4) {
            const month = month_map[parts[1]];
            const day = parts[2].padStart(2, '0');
            const year = parts[3];
            return `${year}-${month}-${day}`;
        }
        
        // Si no coincide con el formato anterior, intentar con formato simple de año
        if (dateString.trim().match(/^\d{4}$/)) {
            return dateString.trim();
        }
    } catch (e) {
        console.log(`Error al formatear fecha: ${dateString}`);
    }
    return '';
};

/**
 * Escapa comillas dobles en una cadena para CSV.
 * @param str
 * @returns {string}
 */
const escapeStr = (str) => {
    if (!str) return '';
    return `"${String(str).replace(/"/g, '""')}"`;
};

module.exports = {
    formatDate,
    escapeStr
}; 