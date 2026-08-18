const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PDFCacheManager {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.maxMemoryItems = options.maxMemoryItems || 50; // Keep up to 50 PDFs in RAM
    this.ttlMs = options.ttlMs || 7 * 24 * 60 * 60 * 1000; // 7 days default
    
    // Directory on disk for persistent caching
    this.cacheDir = path.join(process.cwd(), 'uploads/pdf-cache');
    this.ensureCacheDir();

    this.stats = {
      hits: 0,
      misses: 0,
      memoryHits: 0,
      diskHits: 0
    };
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      try {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        console.log(`[PDFCache] Created cache directory at ${this.cacheDir}`);
      } catch (e) {
        console.warn(`[PDFCache] Warning creating cache directory:`, e.message);
      }
    }
  }

  generateKey(content, prefix = 'pdf') {
    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 32);
    return `${prefix}_${hash}`;
  }

  /**
   * Retrieve PDF buffer from memory or disk cache
   */
  async get(key) {
    // 1. Check in-memory cache (Ultra-fast < 1ms)
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (Date.now() < item.expiresAt) {
        this.stats.hits++;
        this.stats.memoryHits++;
        return Buffer.isBuffer(item.buffer) ? item.buffer : Buffer.from(item.buffer);
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 2. Check disk cache (Fast ~5ms, survives restarts)
    try {
      const filePath = path.join(this.cacheDir, `${key}.pdf`);
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (Date.now() - stat.mtimeMs < this.ttlMs) {
          const buffer = fs.readFileSync(filePath);
          if (buffer && buffer.length > 0) {
            this.stats.hits++;
            this.stats.diskHits++;
            const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            this.setMemory(key, nodeBuf);
            return nodeBuf;
          }
        } else {
          // Expired file
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    } catch (err) {
      console.warn(`[PDFCache] Disk read error for ${key}:`, err.message);
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Save PDF buffer to memory and disk cache
   */
  async set(key, buffer) {
    if (!buffer || buffer.length === 0) return;
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    // 1. Save to Memory (LRU eviction)
    this.setMemory(key, nodeBuf);

    // 2. Save to Disk asynchronously
    try {
      this.ensureCacheDir();
      const filePath = path.join(this.cacheDir, `${key}.pdf`);
      fs.writeFile(filePath, nodeBuf, (err) => {
        if (err) console.warn(`[PDFCache] Disk write warning for ${key}:`, err.message);
      });
    } catch (err) {
      console.warn(`[PDFCache] Failed to queue disk write for ${key}:`, err.message);
    }
  }

  setMemory(key, buffer) {
    if (this.memoryCache.size >= this.maxMemoryItems) {
      // Evict oldest entry
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      buffer,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  /**
   * Invalidate a single key or pattern
   */
  async invalidate(keyPattern) {
    // Invalidate from memory
    for (const k of this.memoryCache.keys()) {
      if (k.includes(keyPattern)) {
        this.memoryCache.delete(k);
      }
    }

    // Invalidate from disk
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.includes(keyPattern)) {
            try { fs.unlinkSync(path.join(this.cacheDir, file)); } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn(`[PDFCache] Invalidation error for ${keyPattern}:`, err.message);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : '0%',
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.maxMemoryItems
    };
  }
}

const pdfCache = new PDFCacheManager();
module.exports = { PDFCacheManager, pdfCache };
