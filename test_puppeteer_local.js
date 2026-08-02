const path = require('path');
module.paths.push(path.join(__dirname, 'server', 'node_modules'));
require('dotenv').config({ path: './server/.env' });
const fs = require('fs');
const { runTurnitinWorker } = require('./server/services/turnitinWorker');

async function testLocalTurnitin() {
  console.log('========================================================');
  console.log('🧪 TESTING PUPPETEER TURNITIN AUTOMATION LOCALLY');
  console.log('========================================================\n');

  // Check Chrome installation
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromePath)) {
    console.log(`✅ Found local Chrome browser at: ${chromePath}`);
  } else {
    console.log(`⚠️ Chrome not found at standard path, Puppeteer will search secondary paths...`);
  }

  // Sample PDF file for testing
  const samplePdfPath = path.join(__dirname, 'server', 'sample_skripsi.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    fs.writeFileSync(samplePdfPath, '%PDF-1.4 Mock Skripsi Document Content for Turnitin Testing');
  }

  const testOrderId = `LOCAL-TEST-${Date.now().toString().slice(-4)}`;
  console.log(`🚀 Triggering Turnitin worker for Order: ${testOrderId}...`);
  console.log(`💡 Tip: Set HEADLESS_MODE=false in server/.env if you want to watch Chrome open on your screen!\n`);

  try {
    const result = await runTurnitinWorker(
      samplePdfPath,
      'Dokumen_Uji_Laksamana.pdf',
      testOrderId,
      { excludeQuotes: true, excludeBibliography: true }
    );

    console.log('\n========================================================');
    console.log('📊 TEST RESULT SUMMARY:');
    console.log('========================================================');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  }
}

testLocalTurnitin();
