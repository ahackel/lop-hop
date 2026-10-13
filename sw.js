// The service worker: keeps every file of the game (and of its engine) so it starts and plays offline, installed or not.
// Online, every request goes to the network (revalidated, so all files are of the same version) and the answer is kept;
// offline, the kept files answer. (Answering from the cache first mixed an old game.js with a new index.html after an
// update.)
const CACHE = 'lop-hop-6'; // (a new name clears what the last one kept: the engine's recordings, before song.zip)
const GAME = ['./', 'index.html', 'game.js', 'level.js', 'music.js', 'version.js', 'lang.js', 'lang/en.txt', 'lang/de.txt', 'art.js', 'font.js', 'icons.js', 'asset.js', 'assets/palette.js', 'assets/animals.js', 'assets/rabbit.js', 'assets/cat.js', 'assets/dog.js', 'assets/fox.js', 'assets/hedgehog.js', 'assets/squirrel.js', 'assets/otter.js', 'assets/skunk.js', 'assets/wolf.js', 'assets/boar.js', 'assets/bear.js', 'assets/cheetah.js', 'assets/rhino.js', 'assets/elephant.js', 'assets/dino.js', 'assets/guineapig.js', 'assets/pig.js', 'assets/yak.js', 'assets/ostrich.js', 'assets/dromedary.js', 'assets/gorilla.js', 'assets/food/acorn.js', 'assets/food/apple.js', 'assets/food/beetle.js', 'assets/food/berries.js', 'assets/food/bone.js', 'assets/food/carrot.js', 'assets/food/cucumber.js', 'assets/food/date.js', 'assets/food/drumstick.js', 'assets/food/fig.js', 'assets/food/fish.js', 'assets/food/grapes.js', 'assets/food/hay.js', 'assets/food/leaf.js', 'assets/food/melon.js', 'assets/food/mushroom.js', 'assets/food/peanut.js', 'assets/food/roast.js', 'assets/food/sausage.js', 'assets/food/shell.js', 'assets/food/truffle.js', 'assets/food/index.js', 'assets/obstacles/autumnbranch.js', 'assets/obstacles/autumnbranch2.js', 'assets/obstacles/barrel.js', 'assets/obstacles/barrel2.js', 'assets/obstacles/barrel3.js', 'assets/obstacles/boulders.js', 'assets/obstacles/boulders2.js', 'assets/obstacles/boulders3.js', 'assets/obstacles/branch.js', 'assets/obstacles/branch2.js', 'assets/obstacles/bush.js', 'assets/obstacles/bush2.js', 'assets/obstacles/bush3.js', 'assets/obstacles/cactusbranch.js', 'assets/obstacles/cactusbranch2.js', 'assets/obstacles/crowdown.js', 'assets/obstacles/crowup.js', 'assets/obstacles/ice.js', 'assets/obstacles/ice2.js', 'assets/obstacles/ice3.js', 'assets/obstacles/index.js', 'assets/obstacles/log.js', 'assets/obstacles/log2.js', 'assets/obstacles/log3.js', 'assets/obstacles/pear.js', 'assets/obstacles/pear2.js', 'assets/obstacles/pear3.js', 'assets/obstacles/pine.js', 'assets/obstacles/pine2.js', 'assets/obstacles/pine3.js', 'assets/obstacles/pinebranch.js', 'assets/obstacles/pinebranch2.js', 'assets/obstacles/redrock.js', 'assets/obstacles/redrock2.js', 'assets/obstacles/redrock3.js', 'assets/obstacles/rock.js', 'assets/obstacles/rock2.js', 'assets/obstacles/rock3.js', 'assets/obstacles/saguaro.js', 'assets/obstacles/saguaro2.js', 'assets/obstacles/saguaro3.js', 'assets/obstacles/sandrock.js', 'assets/obstacles/sandrock2.js', 'assets/obstacles/sandrock3.js', 'assets/obstacles/snowman.js', 'assets/obstacles/snowman2.js', 'assets/obstacles/snowybranch.js', 'assets/obstacles/snowybranch2.js', 'assets/obstacles/snowylog.js', 'assets/obstacles/snowylog2.js', 'assets/obstacles/snowylog3.js', 'assets/obstacles/snowypine.js', 'assets/obstacles/snowypine2.js', 'assets/obstacles/snowypine3.js', 'assets/obstacles/snowyrock.js', 'assets/obstacles/snowyrock2.js', 'assets/obstacles/snowyrock3.js', 'assets/obstacles/spire.js', 'assets/obstacles/spire2.js', 'assets/obstacles/spire3.js', 'assets/obstacles/sprout.js', 'assets/obstacles/sprout2.js', 'assets/obstacles/sprout3.js', 'assets/obstacles/stump.js', 'assets/obstacles/stump2.js', 'assets/obstacles/stump3.js', 'assets/obstacles/sunflower.js', 'assets/obstacles/sunflower2.js', 'assets/obstacles/sunflower3.js', 'assets/obstacles/toadstool.js', 'assets/obstacles/toadstool2.js', 'assets/obstacles/toadstool3.js', 'assets/obstacles/tumbleweed.js', 'assets/obstacles/tumbleweed2.js', 'song.zip', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const engine = await (await fetch('engine/files.json', { cache: 'no-cache' })).json();
    const files = [...GAME, ...engine.map((f) => `engine/${f}`)]; // (the recordings the song plays are in song.zip)
    await (await caches.open(CACHE)).addAll(files.map((f) => new Request(f, { cache: 'no-cache' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name); // older versions' files
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' });
      if (res.ok) await cache.put(url.pathname, res.clone()); // without the query (?auto), like the match below
      return res;
    } catch {
      return (await cache.match(url.pathname)) || Response.error();
    }
  })());
});
