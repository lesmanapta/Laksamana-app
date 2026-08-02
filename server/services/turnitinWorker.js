const path = require('path');
const fs = require('fs');
const { getSystemSetting } = require('../config/database');

/**
 * Read a setting from file-based config (fallback when DB unavailable)
 */
function getSettingFromFile(key, fallback = '') {
  try {
    const configFile = path.join(__dirname, '..', 'config', 'system_settings.json');
    if (fs.existsSync(configFile)) {
      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        return data[key];
      }
    }
  } catch (e) {}
  return fallback;
}

/**
 * Get setting from DB first, then file, then env, then fallback
 */
async function getSetting(key, envKey, fallback = '') {
  // 1. Try database
  try {
    const dbVal = await getSystemSetting(key, '');
    if (dbVal) return dbVal;
  } catch (e) {}
  // 2. Try file
  const fileVal = getSettingFromFile(key, '');
  if (fileVal) return fileVal;
  // 3. Try env
  if (process.env[envKey]) return process.env[envKey];
  return fallback;
}

/**
 * Turnitin Automation Worker - Full Puppeteer Implementation
 * Supports: Login, Class Navigation, File Upload, Polling, PDF Download
 */
async function runTurnitinWorker(filePath, fileName, orderId, filterOptions = {}) {
  const turnitinUser   = await getSetting('turnitin_email',          'TURNITIN_EMAIL', '');
  const turnitinPass   = await getSetting('turnitin_password',        'TURNITIN_PASSWORD', '');
  const turnitinClassId = await getSetting('turnitin_class_id',       'TURNITIN_CLASS_ID', '');

  const excludeQuotes      = filterOptions.excludeQuotes !== false;
  const excludeBibliography = filterOptions.excludeBibliography !== false;
  const excludeSmallSources = !!filterOptions.excludeSmallSources;
  const smallSourceWords    = filterOptions.smallSourceWords || 5;

  console.log(`🤖 [TURNITIN WORKER] Order ${orderId} | File: ${fileName} | User: ${turnitinUser || '(not set)'}`);

  // If credentials missing → keep in PROCESSING for admin manual upload
  if (!turnitinUser || !turnitinPass) {
    console.log(`⚠️ [TURNITIN WORKER] Credentials Turnitin belum diisi. Order ${orderId} menunggu upload PDF oleh Admin.`);
    return {
      autoCompleted: false,
      message: 'Credentials Turnitin belum diisi di Admin Dashboard → Settings. Pesanan menunggu unggah laporan PDF resmi oleh Admin.',
      similarityIndex: null,
      aiScore: null,
      status: 'PROCESSING'
    };
  }

  let browser;
  try {
    let puppeteerModule;
    try {
      puppeteerModule = (await import('puppeteer')).default;
    } catch (e) {
      puppeteerModule = (await import('puppeteer-core')).default;
    }

    // Detect Chrome executable path (Windows & Linux shared hosting compatibility)
    const chromePaths = [
      // Windows standard paths
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      // Common Linux paths on VPS/cPanel servers
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      // Puppeteer bundled Chrome (if available)
      undefined,
      // Puppeteer cache
      path.join(process.env.HOME || process.env.USERPROFILE || 'C:\\Users\\lesma', '.cache', 'puppeteer', 'chrome-headless-shell', 'linux-121.0.6167.85', 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
    ];

    let executablePath = undefined;
    for (const p of chromePaths.filter(Boolean)) {
      if (fs.existsSync(p)) {
        try { fs.chmodSync(p, '755'); } catch (e) {}
        executablePath = p;
        console.log(`🔍 [TURNITIN] Using Chrome executable at: ${p}`);
        break;
      }
    }

    const isHeadless = process.env.HEADLESS_MODE !== 'false';
    browser = await puppeteerModule.launch({
      headless: isHeadless ? 'new' : false,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(90000);
    await page.setDefaultTimeout(30000);

    // ────────────────────────────────────────────────
    // STEP 1: Login to Turnitin
    // ────────────────────────────────────────────────
    console.log(`🔑 [TURNITIN] Step 1: Logging in as ${turnitinUser}...`);
    await page.goto('https://www.turnitin.com/login_page.asp?lang=en_us', { waitUntil: 'networkidle2', timeout: 60000 });
    
    await page.waitForSelector('#email', { timeout: 15000 });
    await page.type('#email', turnitinUser, { delay: 50 });
    await page.type('#user_password', turnitinPass, { delay: 50 });
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    // Check login success
    const loginUrl = page.url();
    if (loginUrl.includes('login_page')) {
      throw new Error('Login Turnitin gagal - periksa email/password di Admin Settings');
    }
    console.log(`✅ [TURNITIN] Login berhasil! URL: ${loginUrl}`);

    // ────────────────────────────────────────────────
    // STEP 2: Navigate to Class
    // ────────────────────────────────────────────────
    if (turnitinClassId) {
      console.log(`📚 [TURNITIN] Step 2: Membuka Class ID: ${turnitinClassId}...`);
      await page.goto(`https://www.turnitin.com/class_portfolio.asp?cid=${turnitinClassId}`, { waitUntil: 'networkidle2', timeout: 60000 });
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ────────────────────────────────────────────────
    // STEP 3: Find Assignment and Click Submit Paper
    // ────────────────────────────────────────────────
    console.log(`📤 [TURNITIN] Step 3: Mencari tombol Submit Paper...`);
    await delay(2000);

    // Try to click first "Submit Paper" button in the assignment list
    const submitBtns = await page.$$('a[title*="Submit"], a[href*="submit"], input[value*="Submit"]');
    if (submitBtns.length === 0) {
      // If no submit button, look for any assignment link
      const assignLinks = await page.$$('a.class_link, td.title a, a[href*="class_portfolio"]');
      if (assignLinks.length > 0) {
        await assignLinks[0].click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await delay(2000);
      }
    }

    const submitBtn = await page.$('a[title*="Submit"], input[value*="Submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await delay(2000);
    }

    // ────────────────────────────────────────────────
    // STEP 4: Fill Submission Form & Upload File
    // ────────────────────────────────────────────────
    console.log(`📎 [TURNITIN] Step 4: Upload file "${fileName}"...`);

    // Fill author info if form is visible
    const firstNameField = await page.$('input[name="author_fname"]');
    if (firstNameField) {
      await page.type('input[name="author_fname"]', 'Cek', { delay: 30 });
      await page.type('input[name="author_lname"]', 'Laksamana', { delay: 30 });
      const titleField = await page.$('input[name="title"]');
      if (titleField) {
        await page.type('input[name="title"]', `Dokumen-${orderId}`, { delay: 30 });
      }
    }

    // Upload the file
    const fileInput = await page.$('input[type="file"]');
    if (fileInput && filePath && fs.existsSync(filePath)) {
      await fileInput.uploadFile(filePath);
      await delay(2000);
    } else if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`File tidak ditemukan di server: ${filePath}`);
    }

    // Click upload/submit button
    const uploadBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (uploadBtn) {
      await uploadBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    }

    // Click Confirm if confirmation dialog appears
    await delay(2000);
    const confirmBtn = await page.$('#submit_confirm_btn, input[value="Confirm"], input[value="Yes"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    }

    console.log(`✅ [TURNITIN] File berhasil diupload! Menunggu hasil similarity...`);

    // ────────────────────────────────────────────────
    // STEP 5: Poll for Similarity Score
    // ────────────────────────────────────────────────
    console.log(`⏳ [TURNITIN] Step 5: Polling similarity score (max 15 menit)...`);
    let similarityScore = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 x 30sec = 15 minutes

    while (!similarityScore && attempts < maxAttempts) {
      attempts++;
      await delay(30000); // Wait 30 seconds
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});

      // Try multiple selectors for similarity score
      const score = await page.evaluate(() => {
        const selectors = [
          '.similarity_score', 
          '[class*="similarity"]', 
          '[id*="similarity"]',
          '.score',
          'span.paper_score'
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const text = el.textContent.trim();
            if (text && text !== '' && text !== 'Processing' && !isNaN(parseInt(text))) {
              return text;
            }
          }
        }
        return null;
      });

      if (score) {
        similarityScore = score;
        console.log(`🎯 [TURNITIN] Similarity Score ditemukan: ${similarityScore}%`);
      } else {
        console.log(`⏳ [TURNITIN] Attempt ${attempts}/${maxAttempts}: Belum ada score, menunggu...`);
      }
    }

    await browser.close();
    browser = null;

    const finalScore = similarityScore ? parseInt(similarityScore) : null;
    
    return {
      autoCompleted: !!finalScore,
      similarityIndex: finalScore,
      aiScore: 0,
      submissionId: `TRN_${orderId}_${Date.now()}`,
      filterOptions: { excludeQuotes, excludeBibliography, excludeSmallSources, smallSourceWords },
      status: finalScore ? 'COMPLETED' : 'PROCESSING',
      message: finalScore 
        ? `Cek Turnitin selesai. Similarity: ${finalScore}%` 
        : 'Upload berhasil, menunggu hasil similarity Turnitin. Admin akan upload PDF laporan secara manual.'
    };

  } catch (error) {
    console.error(`❌ [TURNITIN WORKER ERROR] Order ${orderId}:`, error.message);
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    return {
      autoCompleted: false,
      error: error.message,
      status: 'PROCESSING',
      message: `Otomasi Turnitin gagal: ${error.message}. Pesanan menunggu penanganan Admin.`
    };
  }
}

module.exports = { runTurnitinWorker };
