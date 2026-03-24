import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

const algoliaReqs = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('algolia') || url.includes('algolianet')) {
    algoliaReqs.push({ url, method: req.method(), postData: req.postData()?.substring(0, 1000) });
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if (url.includes('algolia') || url.includes('algolianet')) {
    try {
      const text = await resp.text();
      console.log(`\n=== ALGOLIA RESPONSE ${resp.status()} ${url} ===`);
      console.log(text.substring(0, 2000));
    } catch(e) {}
  }
});

console.log('Loading weekly auction page to capture Algolia calls...');
try {
  await page.goto('https://www.fanaticscollect.com/weekly-auction?type=WEEKLY&auction=WEEKLY%3A54994f48-7ce3-11f0-a16b-0a58a9feac02', { 
    waitUntil: 'networkidle0', 
    timeout: 45000 
  });
} catch(e) {
  console.log('Timeout:', e.message);
}

await new Promise(r => setTimeout(r, 5000));

console.log('\n=== ALGOLIA REQUESTS ===');
for (const r of algoliaReqs) {
  console.log(`\n${r.method} ${r.url}`);
  if (r.postData) console.log('Body:', r.postData.substring(0, 500));
}

await browser.close();
