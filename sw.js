/* =========================================================
   ANIME ARCADE — service worker
   ---------------------------------------------------------
   Keeps the game's own images, audio, fonts and data in the
   browser cache so repeat visits load fast, while the page
   itself always comes from the network first so new versions
   of the game show up as soon as you deploy them.

   Bump CACHE_VERSION (here AND assetVersion in index.html)
   to throw away every cached asset and download fresh ones.
========================================================= */

const CACHE_VERSION = 'v1';
const ASSET_CACHE = 'aa-assets-' + CACHE_VERSION;   // must match ARCADE_CONFIG.cacheName in index.html
const PAGE_CACHE  = 'aa-pages-' + CACHE_VERSION;

const ASSET_PATH = /\/(images|sounds|audio)\//;
const ASSET_EXT  = /\.(png|jpe?g|webp|gif|svg|avif|mp3|ogg|wav|m4a|woff2?)$/i;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keep = [ASSET_CACHE, PAGE_CACHE];
        const names = await caches.keys();
        await Promise.all(names.filter(n => n.startsWith('aa-') && !keep.includes(n)).map(n => caches.delete(n)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    /* Fonts: cross-origin but CORS-enabled, so they can be cached safely. */
    if (FONT_HOSTS.includes(url.hostname)) {
        event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
        return;
    }

    /* Everything else we handle is same-origin. Firebase, the AniList API and
       any other cross-origin request go straight to the network, untouched. */
    if (url.origin !== self.location.origin) return;

    /* The page itself and packs.json: network first, cache only as an offline fallback. */
    if (req.mode === 'navigate' || url.pathname.endsWith('/packs.json')) {
        event.respondWith(networkFirst(req, PAGE_CACHE));
        return;
    }

    /* Game assets: serve from cache, check for a newer copy in the background. */
    if (ASSET_PATH.test(url.pathname) || ASSET_EXT.test(url.pathname)) {
        if (req.headers.has('range')) { event.respondWith(rangeFromCache(req)); return; }
        event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
    }
});

async function networkFirst(req, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
    } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
        if (hit) return hit;
        throw err;
    }
}

async function staleWhileRevalidate(req, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(req);

    /* A conditional request: the server answers "not modified" for unchanged
       files, so only missing or changed resources are actually downloaded. */
    const refresh = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
        return res;
    }).catch(() => null);

    if (hit) return hit;
    const res = await refresh;
    if (res) return res;
    return Response.error();
}

/* <audio> asks for byte ranges. The Cache API can't store 206 answers, so when we
   hold the whole file we cut the requested slice ourselves; otherwise go to the network. */
async function rangeFromCache(req) {
    const cache = await caches.open(ASSET_CACHE);
    const url = req.url;
    const hit = await cache.match(url);
    if (!hit) return fetch(req);

    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
    if (!m) return hit;
    const blob = await hit.blob();
    const size = blob.size;
    const start = m[1] ? parseInt(m[1], 10) : 0;
    const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    return new Response(blob.slice(start, end + 1), {
        status: 206,
        headers: {
            'Content-Type': hit.headers.get('content-type') || 'application/octet-stream',
            'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes'
        }
    });
}
