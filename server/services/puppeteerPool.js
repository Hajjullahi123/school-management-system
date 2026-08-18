let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('[PuppeteerPool] Puppeteer module load warning:', e.message);
}

class PuppeteerPool {
  constructor(options = {}) {
    this.maxBrowsers = options.maxBrowsers || 1; // 1 warm instance is optimal for low-RAM VPS
    this.browser = null;
    this.jobCount = 0;
    this.maxJobsBeforeRecycle = options.maxJobsBeforeRecycle || 50;
    this.isInitializing = false;
    this.isShuttingDown = false;
    this.initPromise = null;
  }

  async getCommonArgs() {
    return [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--font-render-hinting=none'
    ];
  }

  async launchNewBrowser() {
    if (!puppeteer) {
      throw new Error('Puppeteer is not installed on the server');
    }

    const args = await this.getCommonArgs();

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      try {
        return await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
          headless: true,
          args
        });
      } catch (e) {
        console.warn('[PuppeteerPool] Failed custom PUPPETEER_EXECUTABLE_PATH, falling back:', e.message);
      }
    }

    try {
      return await puppeteer.launch({
        headless: true,
        args
      });
    } catch (err1) {
      try {
        return await puppeteer.launch({
          channel: 'chrome',
          headless: true,
          args
        });
      } catch (err2) {
        return await puppeteer.launch({
          channel: 'msedge',
          headless: true,
          args
        });
      }
    }
  }

  async getBrowser() {
    if (this.isShuttingDown) throw new Error('Puppeteer pool is shutting down');

    // If browser is running and connected, return it
    if (this.browser && this.browser.connected) {
      // Recycle after N jobs to avoid long-term Chromium memory bloat
      if (this.jobCount >= this.maxJobsBeforeRecycle) {
        console.log(`[PuppeteerPool] Recycling browser after ${this.jobCount} jobs...`);
        this.recycleBrowser();
      } else {
        return this.browser;
      }
    }

    // Initialize if needed
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          if (this.browser) {
            try { await this.browser.close(); } catch (e) {}
          }
          console.log('[PuppeteerPool] Launching warm Chromium instance...');
          this.browser = await this.launchNewBrowser();
          this.jobCount = 0;
          
          this.browser.on('disconnected', () => {
            console.warn('[PuppeteerPool] Browser disconnected');
            this.browser = null;
          });

          console.log('[PuppeteerPool] Warm Chromium instance ready!');
          return this.browser;
        } finally {
          this.initPromise = null;
        }
      })();
    }

    return await this.initPromise;
  }

  async recycleBrowser() {
    const oldBrowser = this.browser;
    this.browser = null;
    this.jobCount = 0;
    if (oldBrowser) {
      try { await oldBrowser.close(); } catch (e) {}
    }
  }

  /**
   * Generates a PDF buffer from a full HTML string using a fresh tab
   */
  async renderHtmlToPdf(html, options = {}) {
    const browser = await this.getBrowser();
    this.jobCount++;

    let page = null;
    try {
      page = await browser.newPage();

      // Optimize viewport for standard A4
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Load HTML with safe timeout
      await page.setContent(html, {
        waitUntil: options.waitUntil || 'load',
        timeout: options.timeout || 45000
      });

      // Wait for fonts if present
      try {
        await page.evaluateHandle('document.fonts.ready');
      } catch (e) {}

      // Emulate print media type
      await page.emulateMediaType('print');

      // Generate standard A4 PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });

      return pdfBuffer;
    } finally {
      if (page) {
        try { await page.close(); } catch (e) {}
      }
    }
  }

  async shutdown() {
    this.isShuttingDown = true;
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('[PuppeteerPool] Closed all browser instances');
      } catch (e) {}
      this.browser = null;
    }
  }
}

const puppeteerPool = new PuppeteerPool();
module.exports = { PuppeteerPool, puppeteerPool };
