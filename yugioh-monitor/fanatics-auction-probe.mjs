import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

// Capture GraphQL calls
const gqlCalls = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('graphql') || url.includes('app.fanaticscollect')) {
    gqlCalls.push({ url, method: req.method(), postData: req.postData()?.substring(0, 500), headers: req.headers() });
  }
});

page.on('response', async resp => {
  const url = resp.url();
  if (url.includes('graphql') || url.includes('app.fanaticscollect')) {
    try {
      const text = await resp.text();
      console.log(`\n=== GQL RESPONSE ${resp.status()} ${url} ===`);
      console.log(text.substring(0, 3000));
    } catch(e) {}
  }
});

console.log('Loading weekly auction page...');
const auctionUrl = 'https://www.fanaticscollect.com/weekly-auction?type=WEEKLY&auction=WEEKLY%3A54994f48-7ce3-11f0-a16b-0a58a9feac02';
try {
  await page.goto(auctionUrl, { 
    waitUntil: 'networkidle0', 
    timeout: 45000 
  });
} catch(e) {
  console.log('Timeout:', e.message);
}

await new Promise(r => setTimeout(r, 5000));

console.log('\n=== GQL CALLS MADE ===');
for (const c of gqlCalls) {
  console.log(`\n${c.method} ${c.url}`);
  if (c.postData) console.log('  body:', c.postData);
  // Print relevant auth headers
  if (c.headers['authorization']) console.log('  auth:', c.headers['authorization'].substring(0, 50));
  if (c.headers['x-auth-token']) console.log('  x-auth-token:', c.headers['x-auth-token']);
}

await browser.close();
