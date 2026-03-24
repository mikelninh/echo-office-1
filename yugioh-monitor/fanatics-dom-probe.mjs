import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Capture all XHR/fetch responses
const apiResponses = [];
page.on('response', async resp => {
  const url = resp.url();
  const ct = resp.headers()['content-type'] || '';
  if (ct.includes('json') || url.includes('graphql')) {
    try {
      const text = await resp.text();
      if (text && text.length > 10 && text.length < 20000) {
        apiResponses.push({ url, status: resp.status(), body: text.substring(0, 1000) });
      }
    } catch(e) {}
  }
});

console.log('Loading search page...');
try {
  await page.goto('https://www.fanaticscollect.com/search?q=pokemon+psa+10&sort=price_asc', { 
    waitUntil: 'networkidle2', 
    timeout: 45000 
  });
} catch(e) {
  console.log('Timeout, continuing...', e.message);
}

await new Promise(r => setTimeout(r, 5000));

// Get rendered HTML
const title = await page.title();
console.log('Page title:', title);

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
console.log('Body text preview:', bodyText);

const html = await page.content();
console.log('Full HTML size:', html.length);

// Look for card selectors
const cards = await page.$$eval('[class*="card"], [class*="listing"], [class*="product"], [class*="item"]', els => 
  els.slice(0, 5).map(el => ({ tag: el.tagName, class: el.className.substring(0,100), text: el.innerText.substring(0,100) }))
);
console.log('\nCard elements found:', JSON.stringify(cards, null, 2));

// Log API responses
console.log('\n=== JSON API RESPONSES ===');
for (const r of apiResponses) {
  console.log(`\n${r.status} ${r.url}`);
  console.log(r.body.substring(0, 500));
}

await browser.close();
