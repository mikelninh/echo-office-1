import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Capture all XHR/fetch requests and responses
const apiCalls = [];
page.on('request', req => {
  const url = req.url();
  const ct = req.headers()['content-type'] || '';
  if (url.includes('app.fanaticscollect') || url.includes('graphql') || 
      url.includes('marketplace') || url.includes('search') || 
      (ct.includes('json') && !url.includes('split') && !url.includes('stripe') && !url.includes('datagrail'))) {
    apiCalls.push({ url, method: req.method(), postData: req.postData()?.substring(0, 300) });
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if (url.includes('app.fanaticscollect') || url.includes('graphql')) {
    try {
      const text = await resp.text();
      console.log(`\n=== RESPONSE ${resp.status()} ${url} ===`);
      console.log(text.substring(0, 2000));
    } catch(e) {}
  }
});

console.log('Loading buy-now marketplace...');
try {
  await page.goto('https://www.fanaticscollect.com/buy-now', { 
    waitUntil: 'networkidle0', 
    timeout: 45000 
  });
} catch(e) {
  console.log('Timeout:', e.message);
}

await new Promise(r => setTimeout(r, 3000));
const title = await page.title();
console.log('\nPage title:', title);
const bodyPreview = await page.evaluate(() => document.body.innerText.substring(0, 500));
console.log('Body:', bodyPreview);

console.log('\n=== ALL API CALLS ===');
for (const c of apiCalls) {
  console.log(`${c.method} ${c.url}`);
  if (c.postData) console.log('  body:', c.postData);
}

await browser.close();
