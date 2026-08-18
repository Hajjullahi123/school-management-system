const fs = require('fs');
const path = require('path');
const { puppeteerPool } = require('./puppeteerPool');
const { pdfCache } = require('./pdfCacheManager');
const { PDFDocument } = require('pdf-lib');

let cachedProductionCss = null;

function getProductionCss() {
  if (cachedProductionCss !== null) return cachedProductionCss;
  
  cachedProductionCss = '';
  const possiblePaths = [
    path.join(__dirname, '../../client/dist/assets'),
    path.join(process.cwd(), 'client/dist/assets'),
    path.join(process.cwd(), 'dist/assets')
  ];

  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.css') && file.startsWith('index-')) {
            console.log(`[PDFService] Loaded production stylesheet: ${file}`);
            cachedProductionCss += fs.readFileSync(path.join(dir, file), 'utf8') + '\n';
          }
        }
        if (cachedProductionCss) break;
      } catch (e) {
        console.warn('[PDFService] Error reading production CSS directory:', e.message);
      }
    }
  }

  return cachedProductionCss;
}

class PDFService {
  /**
   * Generates or retrieves cached PDF from HTML payload
   */
  async generatePdf({ html, title = 'report', cacheKey = null, forceRefresh = false }) {
    if (!html || typeof html !== 'string') {
      throw new Error('HTML content is required for PDF generation');
    }

    // 1. Inject production CSS if available to guarantee 100% Tailwind CSS parity
    const prodCss = getProductionCss();
    let finalHtml = html;
    if (prodCss && !finalHtml.includes('/* PROD_CSS_INJECTED */')) {
      const injectedStyle = `\n<style>/* PROD_CSS_INJECTED */\n${prodCss}\n</style>\n`;
      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${injectedStyle}</head>`);
      } else {
        finalHtml = `${injectedStyle}${finalHtml}`;
      }
    }

    // 2. Calculate cache key on the final complete HTML
    const key = cacheKey || pdfCache.generateKey(finalHtml, 'v2_report');

    // 3. Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await pdfCache.get(key);
      if (cached && cached.length > 0) {
        return {
          buffer: cached,
          fromCache: true,
          cacheKey: key
        };
      }
    }

    // 4. Render PDF via warm Puppeteer Pool
    const buffer = await puppeteerPool.renderHtmlToPdf(finalHtml);

    // 5. Save to multi-tiered cache
    await pdfCache.set(key, buffer);

    return {
      buffer,
      fromCache: false,
      cacheKey: key
    };
  }

  /**
   * Stitches multiple PDF buffers into a single combined multi-page PDF bundle
   * using pdf-lib in milliseconds
   */
  async mergePdfs(pdfBuffers) {
    if (!Array.isArray(pdfBuffers) || pdfBuffers.length === 0) {
      throw new Error('No PDF buffers provided for merging');
    }

    if (pdfBuffers.length === 1) {
      return pdfBuffers[0];
    }

    const mergedDoc = await PDFDocument.create();

    for (const buf of pdfBuffers) {
      if (!buf || buf.length === 0) continue;
      const doc = await PDFDocument.load(buf);
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    return Buffer.from(mergedBytes);
  }

  getCacheStats() {
    return pdfCache.getStats();
  }

  async invalidateCache(keyPattern) {
    return await pdfCache.invalidate(keyPattern);
  }
}

const pdfService = new PDFService();
module.exports = { PDFService, pdfService };
