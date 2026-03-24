/**
 * Fanatics Collect scraper
 *
 * Strategy:
 *   1. Fetch a short-lived Algolia search key via the public GraphQL endpoint
 *      (no auth required for anonymous key)
 *   2. Query Algolia index `prod_item_state_v1` directly — fast, paginated,
 *      supports full-text + filters
 *   3. For auction listings, hydrate `endsAt` from the GraphQL auctions query
 *
 * Algolia App ID:  3XT9C4X62I
 * Index:          prod_item_state_v1
 * GraphQL:        https://app.fanaticscollect.com/graphql (public, no auth needed for search key + auctions)
 */

const ALGOLIA_APP_ID = '3XT9C4X62I';
const ALGOLIA_INDEX  = 'prod_item_state_v1';
const GRAPHQL_URL    = 'https://app.fanaticscollect.com/graphql';
const ALGOLIA_BASE   = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`;

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Origin':       'https://www.fanaticscollect.com',
  'Referer':      'https://www.fanaticscollect.com/',
};

// Cache the search key within a scrape run (it has a ~15 min TTL)
let _searchKeyCache = null;
let _searchKeyCachedAt = 0;

async function getSearchKey() {
  const now = Date.now();
  if (_searchKeyCache && now - _searchKeyCachedAt < 10 * 60 * 1000) return _searchKeyCache;

  const resp = await fetch(GRAPHQL_URL + '?webSearchKeyQuery', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      operationName: 'webSearchKeyQuery',
      variables: {},
      query: 'query webSearchKeyQuery { collectSearchKey }',
    }),
  });
  if (!resp.ok) throw new Error(`GraphQL key fetch failed: ${resp.status}`);
  const data = await resp.json();
  const key = data?.data?.collectSearchKey;
  if (!key) throw new Error('No collectSearchKey in response');
  _searchKeyCache = key;
  _searchKeyCachedAt = now;
  return key;
}

// Cache active auction end times (keyed by auctionUrn)
let _auctionCache = null;
let _auctionCachedAt = 0;

async function getAuctionEndTimes() {
  const now = Date.now();
  if (_auctionCache && now - _auctionCachedAt < 5 * 60 * 1000) return _auctionCache;

  try {
    const resp = await fetch(GRAPHQL_URL + '?webGlobalAuctionsQuery', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        operationName: 'webGlobalAuctionsQuery',
        variables: {},
        query: `query webGlobalAuctionsQuery {
          collectGlobalAuctions {
            __typename
            ... on CollectWeeklyAuction  { id name endsAt status }
            ... on CollectPremierAuction { id name endsAt status }
          }
        }`,
      }),
    });
    if (!resp.ok) throw new Error(`Auction query failed: ${resp.status}`);
    const data = await resp.json();
    const auctions = data?.data?.collectGlobalAuctions || [];
    const map = {};
    for (const a of auctions) {
      // auctionUrn format: "WEEKLY:54994f48-..." or "PREMIER:..."
      const type = a.__typename === 'CollectWeeklyAuction' ? 'WEEKLY' : 'PREMIER';
      map[`${type}:${a.id}`] = a.endsAt;
    }
    _auctionCache = map;
    _auctionCachedAt = now;
    return map;
  } catch (e) {
    console.error('[Fanatics] Auction end times fetch failed:', e.message);
    return {};
  }
}

/**
 * Search Algolia for live listings matching the query.
 *
 * @param {string} query        - text to search (e.g. "pokemon psa 10")
 * @param {object} opts
 * @param {number} opts.hitsPerPage  - results per page (default 48)
 * @param {number} opts.page         - 0-indexed page (default 0)
 * @param {string} opts.marketplaces - comma-separated: FIXED,WEEKLY,PREMIER (default all)
 * @param {number} opts.minPrice     - minimum currentPrice in USD (optional)
 * @returns {Promise<Array>}    - raw Algolia hits
 */
async function algoliaSearch(query, { hitsPerPage = 48, page = 0, marketplaces, minPrice } = {}) {
  const searchKey = await getSearchKey();

  const filters = ['status:Live'];
  if (marketplaces) {
    const mp = marketplaces.split(',').map(m => `marketplace:${m.trim()}`);
    filters.push(`(${mp.join(' OR ')})`);
  }
  if (minPrice && minPrice > 0) {
    filters.push(`currentPrice >= ${minPrice}`);
  }

  const url = new URL(ALGOLIA_BASE);
  url.searchParams.set('x-algolia-agent', 'Algolia for JavaScript (5.13.0)');
  url.searchParams.set('x-algolia-api-key', searchKey);
  url.searchParams.set('x-algolia-application-id', ALGOLIA_APP_ID);

  const body = {
    requests: [{
      indexName: ALGOLIA_INDEX,
      query,
      type: 'default',
      page,
      hitsPerPage,
      attributesToRetrieve: [
        'listingUuid', 'marketplace', 'marketplaceSource',
        'title', 'subtitle', 'currentPrice', 'askingPrice',
        'status', 'images', 'lotNumber', 'bidCount',
        'auctionUrn', 'gradingService', 'grade', 'gradeValue',
        'currency', 'serial', 'categoryParent', 'year',
        'listedAt', 'createdAt',
      ],
      attributesToHighlight: [],
      filters: filters.join(' AND '),
    }],
  };

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Algolia search failed: ${resp.status}`);
  const data = await resp.json();
  return data?.results?.[0] || { hits: [], nbHits: 0, nbPages: 0 };
}

/**
 * Build a listing URL from its UUID and marketplace type.
 */
function buildListingUrl(listingUuid, marketplace) {
  if (marketplace === 'FIXED') {
    return `https://www.fanaticscollect.com/listing/${listingUuid}`;
  }
  // WEEKLY / PREMIER — link to the listing detail page
  return `https://www.fanaticscollect.com/listing/${listingUuid}`;
}

/**
 * Map Algolia hit to our standard listing object.
 */
function mapHit(hit, auctionEndTimes) {
  const marketplace = hit.marketplace || 'FIXED';
  const listingType = marketplace === 'FIXED' ? 'buy_now' : 'auction';

  // Determine auction end time
  let endsAt = null;
  if (marketplace !== 'FIXED' && hit.auctionUrn) {
    endsAt = auctionEndTimes[hit.auctionUrn] || null;
  }

  // Grading info: Algolia has `grade` (number) and `gradingService` (string)
  const gradingService = hit.gradingService || null;
  const gradeValue = hit.grade != null ? String(hit.grade) : (hit.gradeValue || null);

  const price = typeof hit.currentPrice === 'number' ? hit.currentPrice : (hit.askingPrice || 0);

  return {
    id:             `fanatics-${hit.listingUuid}`,
    title:          hit.title || hit.productTitle || 'Unknown',
    price:          price,
    currency:       hit.currency || 'USD',
    url:            buildListingUrl(hit.listingUuid, marketplace),
    platform:       'fanatics',
    listingType,
    endsAt,
    gradingService,
    gradeValue,
    marketplace,
    lotNumber:      hit.lotNumber || null,
    bidCount:       hit.bidCount || 0,
    imageUrl:       hit.images?.primary?.small || hit.images?.primary?.thumbnail || null,
    auctionUrn:     hit.auctionUrn || null,
    listedAt:       hit.listedAt ? new Date(hit.listedAt * 1000).toISOString() : null,
  };
}

/**
 * Main export: scrape Fanatics Collect for listings matching `searchTerms`.
 *
 * @param {string[]} searchTerms  - array of search queries (e.g. ["pokemon psa 10", "charizard psa 10"])
 * @param {number}   minPrice     - minimum price in USD (default 2500)
 * @param {object}   opts
 * @param {boolean}  opts.buyNowOnly    - only return buy-now (FIXED) listings
 * @param {boolean}  opts.auctionOnly   - only return auction listings
 * @param {number}   opts.maxPerTerm    - max results per search term (default 48)
 * @returns {Promise<Array>} deduplicated listings sorted by price desc
 */
export async function scrapeFanaticsCollect(searchTerms, minPrice = 2500, opts = {}) {
  const {
    buyNowOnly   = false,
    auctionOnly  = false,
    maxPerTerm   = 48,
  } = opts;

  // Determine which marketplaces to query
  let marketplaces;
  if (buyNowOnly) marketplaces = 'FIXED';
  else if (auctionOnly) marketplaces = 'WEEKLY,PREMIER';
  // else: query all (no filter → include FIXED + WEEKLY + PREMIER)

  // Fetch auction end times up front (single request shared across all terms)
  const auctionEndTimes = await getAuctionEndTimes();

  const seen = new Set();
  const results = [];

  for (const term of searchTerms) {
    try {
      const { hits, nbHits } = await algoliaSearch(term, {
        hitsPerPage: Math.min(maxPerTerm, 96),
        page: 0,
        marketplaces,
        minPrice,
      });

      console.log(`  [Fanatics] "${term}" → ${nbHits} live listings (showing ${hits.length})`);

      for (const hit of hits) {
        const id = `fanatics-${hit.listingUuid}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const listing = mapHit(hit, auctionEndTimes);
        if (listing.price < minPrice) continue;

        results.push(listing);
      }
    } catch (e) {
      console.error(`  [Fanatics] Search failed for "${term}":`, e.message);
    }
  }

  // Sort by price descending
  results.sort((a, b) => b.price - a.price);
  return results;
}

/**
 * Convenience: fetch currently live auction listings only.
 */
export async function scrapeFanaticsAuctions(searchTerms, minPrice = 2500) {
  return scrapeFanaticsCollect(searchTerms, minPrice, { auctionOnly: true });
}

/**
 * Convenience: fetch buy-now listings only.
 */
export async function scrapeFanaticsBuyNow(searchTerms, minPrice = 2500) {
  return scrapeFanaticsCollect(searchTerms, minPrice, { buyNowOnly: true });
}
