import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Intercept all requests
const apiCalls = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('api') || url.includes('graphql') || url.includes('search') || url.includes('listing') || url.includes('marketplace')) {
    apiCalls.push({ url, method: req.method(), headers: req.headers(), postData: req.postData() });
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if ((url.includes('api') || url.includes('graphql')) && resp.status() === 200) {
    try {
      const text = await resp.text();
      if (text && text.length < 5000 && (text.startsWith('{') || text.startsWith('['))) {
        console.log(`\n=== RESPONSE from ${url} ===`);
        console.log(text.substring(0, 500));
      }
    } catch(e) {}
  }
});

console.log('Loading search page...');
try {
  await page.goto('https://www.fanaticscollect.com/search?q=pokemon+psa+10&sort=price_desc', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  });
} catch(e) {
  console.log('Navigation timeout, checking results...');
}

await new Promise(r => setTimeout(r, 3000));

console.log('\n=== API CALLS INTERCEPTED ===');
for (const call of apiCalls) {
  console.log(`${call.method} ${call.url}`);
  if (call.postData) console.log('  body:', call.postData.substring(0, 200));
}

await browser.close();
