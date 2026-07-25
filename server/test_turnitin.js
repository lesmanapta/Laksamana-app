const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🧪 [TESTING] Starting end-to-end Turnitin Plagiarism Check test...');

// 1. Check Server Health
const healthReq = http.get('http://localhost:5000/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ Server Health:', data);
    runTurnitinTest();
  });
});

healthReq.on('error', (err) => {
  console.log('⚠️ Server not responding on port 5000. Launching server in background...');
});

function runTurnitinTest() {
  const formDataBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const sampleFilePath = path.join(__dirname, 'sample_skripsi.pdf');
  fs.writeFileSync(sampleFilePath, '%PDF-1.4 Mock Skripsi Document Content for Turnitin Testing');

  const postData = [
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="serviceSlug"\r\n\r\ncek-plagiasi\r\n`,
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="serviceName"\r\n\r\nCek Plagiasi No-Repository\r\n`,
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="whatsapp"\r\n\r\n081234567890\r\n`,
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\ntest@laksamana.id\r\n`,
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="price"\r\n\r\n10000\r\n`,
    `--${formDataBoundary}\r\nContent-Disposition: form-data; name="document"; filename="sample_skripsi.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
    fs.readFileSync(sampleFilePath),
    `\r\n--${formDataBoundary}--\r\n`
  ];

  const payload = Buffer.concat(postData.map(item => typeof item === 'string' ? Buffer.from(item) : item));

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders/create',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`,
      'Content-Length': payload.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`📡 Response Status: ${res.statusCode}`);
      console.log(`📄 Response Data:`, body);

      try {
        const json = JSON.parse(body);
        if (json.orderId) {
          console.log(`🎉 [SUCCESS] Turnitin Order Created! Order ID: ${json.orderId}`);
          console.log(`📊 Similarity Index: ${json.order.result.similarityIndex}%`);
          console.log(`🤖 AI Content Score: ${json.order.result.aiScore}%`);
          console.log(`💳 Midtrans Token: ${json.snapToken}`);
          
          // Poll for completion after 4.5 seconds
          setTimeout(() => {
            http.get(`http://localhost:5000/api/orders/track/${json.orderId}`, (trackRes) => {
              let trackBody = '';
              trackRes.on('data', c => trackBody += c);
              trackRes.on('end', () => {
                console.log(`\n🔍 [TRACKING TEST] Order Status Verification:`);
                console.log(trackBody);
              });
            });
          }, 4500);
        }
      } catch (e) {
        console.error('Failed parsing response:', e);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request Error: ${e.message}`);
  });

  req.write(payload);
  req.end();
}
