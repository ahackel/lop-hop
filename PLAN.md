# Plan: one night, home at dawn

The goal of a run is one thing: get through the night and reach the den at dawn. The animal that chased it joins
(the first time). No suns, no days counter. What keeps a player running with an animal after that: its score, and
the treats it brings home.

## 1. The core loop: home at dawn (done)

- A run is one day and one night, DAY and NIGHT in big letters as they come. Over the last 8 s or so of the night the
  sky pales through the morning colours, the stars fade and a white sun comes up behind the hills (gone into the sky
  as the day comes).
- At dawn the run ends, home (HOME!, worth 100): nothing in the way for a screen and more before it, the world comes to
  a stop and the animal runs off to the right, back to the title; the first time, the chaser, unlocked, runs up to
  the middle of the screen and stays there. Then the high scores as after a knock-out.
- Each animal runs in a land of its own (round the six lands).
- Gone: the suns, DAY n at the top right, day 2 and later, ESCAPED! +n, the land's name at the start.
- The balance page: the chance to get home (at each skill) is the main number; runs that got home end in "dawn".
- (Tried and dropped: a den to run into at the end; it looked like a hut.)

## 1b. Polish (done)

- Starting a run: the picked animal runs off to the right edge of the title while the screen fades out quickly, then
  the run fades in (run again: only the fade in).
- A newly unlocked animal comes onto the title running in from the left, and stops behind the others: the row goes
  from right to left, the first on the right.

## 2. Treats (done)

- Food eaten with a full energy bar is a treat for this animal, carried for the rest of the run: a small counter by
  the bars, and the eat burst different (it goes into the bag, not into the bar).
- Reaching the den banks them (kept per animal, lop.treats). A knock-out loses them all.
- As built: a treat is food eaten with more than there is room for in the energy (it still fills it); on the title
  the treats are over the picked animal (in place of its arrow), not in a basket (the den is gone).
- On the title, a basket by the den with the picked animal's treats (its count). Drag one from it: the animal looks at
  it and stretches toward it (as petting leans); let go near it and it takes it and eats it, hearts float up. Let go
  elsewhere and the treat goes back to the basket.
- Treats do nothing else (for now): they are for the animal.
- An animal has at most 5: food eaten with no room for one more is only food.
- As built: it goes after one held out in tries, as an idle animation: looks at it, stretches toward it (for one held high:
  up on its hind legs, as far as its legs against its body let it (the round, short-legged ones only lean back; the
  cheetah, the dromedary only half up), the hind legs straightened, the front paws held out in front of its belly; the
  elephant reaches with its trunk; floppy ears hang down; two little sniffs once stretched out),
  strains a moment, sinks back, rests a second or two still eyeing it, and tries again; its head stays on its body (no
  further from its chest than at rest; one with a neck, at its end). Let go: after it at once. With none out, now and
  then (every 4 to 10 s) it tries once for its treats over it, begging.

## 3. The full moon: where the special ones come from (built, then taken out: parked)

- Taken out for now: the cheetah, the gorilla, the elephant and the dino are ordinary animals again, each chased by
  the next (the wolf a little more food, a little less tiring, for its land). The full moon's code is in git (cd2d1f4
  and before), its art (fullMoon) still in art.js.

- A special one joins only by being got away from, on a full-moon night: it chases instead of the usual animal, and
  faster than it.
- When a full moon comes: once every animal before the special one is unlocked, on every third run or so (any
  animal), announced on the title by the full moon in its sky, so the player picks when to try (open: whether it
  should be tied to treats instead, e.g. it is lured by an animal carrying enough of them).
- Not got home: the full moon stays till it is.
- As built: every third run once the animals before the special one are unlocked (counting only those runs), the full
  moon on the title meaning the next run is one; not got home, it comes back two runs later (it does not stay, so the
  other animals can still be got meanwhile). Faster: the world 8% faster again while it chases, and it takes half
  again as long to fall back after a bump. FULL MOON in big letters at dusk, a full moon in the night sky.

## Parked

- Longer trips (each trip home makes the next one a day longer): it would bring the days counter back.
- Dragging the animals into an order that means something (who chases whom): only meaningful once all are unlocked.
- The animal pack (in-app purchase): the first three free, the rest bought, still unlocked by playing; Restore
  Purchases, and a parental gate if in the Kids category. Built so far: the next one shown as a shadow only once it has
  chased (lop.met), no "?"; the dog (and any after the third) joins at dawn as before, padlocked on the title till the
  pack is bought (lop.packs, the BUY cheat): it can be picked, not run with, fed or moved, last in the row. Built too: in the iOS app only
  (on the web every animal is free; ?shop to try it), a tap on the padlock opens the shop behind a parental gate (a
  sum in words for a grown-up, answered on keys), the pack's animals running by, BUY and RESTORE PURCHASES; the
  StoreKit bridge (app/ios/App/App/StorePlugin.swift, StoreKit 2: the price, the purchase, Ask to Buy, restoring,
  what is owned as the App Store says at each start), packs by product id (PACKS: de.andreashackel.lophop.animals01,
  the 4th to the 21st animal; a later pack: one more line), prices in the font (, € $ £ ¥; other money: BUY alone),
  and Products.storekit to try it in Xcode. Still to do: the Paid Apps agreement and the product in App Store
  Connect, a sandbox tester, and the first purchase sent for review with an app version. With a second pack, the
  shop's "one purchase - nothing else to buy" is no longer true.
