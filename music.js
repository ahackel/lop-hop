// A song for every animal: the game's song (song.zip) in the animal's own colours. It stays the same song (its theme,
// its sections, chords and moods, its stingers, the same three recordings) in the animal's key and mode, at its pace
// and swing, with its own voices (the lead, the bells, the bass, a kick for the heavy ones) and a motif of its own the
// lead plays now and then while it runs, between the theme and the rest. The rabbit's is the song as it is.
// Only modes the song's chords stay sweet in: major, mixolydian, minor and harmonic minor (dorian, lydian and phrygian
// would make a chord of I V vi IV diminished). The sections that bring their own mode (the chase, the super power,
// night) keep it, in the animal's key.
// The menu (the title) is always happy: in major, whatever the animal's mode (its chords, in the key).
//   songFor(song, kind) → the animal's song (a new object; the song is left as it is)

// voices: instruments for a track (lead, bell, bass); kick: a kick drum for the kit (the song's own is a soft click)
const FM = (ratio, index, d, more = {}) => ({ type: 'fm', fm: { ratio, index, env: 1 }, env: { a: 0.001, d, s: 0, r: d }, cutoff: 6000, poly: 3, ...more });
const PULSE = (duty, d, more = {}) => ({ type: 'pulse', duty, env: { a: 0.001, d, s: 0.25, r: 0.06 }, cutoff: 4500, poly: 3, ...more });
const KICK = (f0, decay, amp = 0.9) => ({ tones: [{ amp, f0, f1: 45, sweep: 0.035, decay }], click: 0.12, len: 0.4 });
const BASS = (bright, decay = 2.5) => ({ type: 'string', string: { decay, bright, mute: 0 }, env: { a: 0.002, d: 1, s: 1, r: 0.08 }, cutoff: 420, resonance: 0.5, gain: 1.07 });

export const STYLES = {
  rabbit: {},
  // squeaky: a thin square wave, high up, wheeking
  guineapig: {
    key: 'F', bpm: 156, swing: 0.1, octaves: { lead: 6 },
    voices: { lead: PULSE(0.25, 0.09, { gain: 0.7 }) },
    motif: '0 2 4 . 4 . 4 . 7 - 4 . 2 . 0 . | 0 2 4 . 7 . 7 . 9 - 7 . 4 . . .',
  },
  // sly and smooth: a swung vibraphone, slinking down by half steps
  cat: {
    key: 'Eb', scale: 'minor', bpm: 138, swing: 0.4,
    voices: { lead: FM(4, 1.4, 0.7, { tremolo: { depth: 0.25, rate: 5 }, gain: 0.83 }), bass: BASS(0.5, 3) },
    motif: '4 . . 3# 3 . . . 2 . 1 . 0 - - . | .*8 4 . 2 . 0 - - .',
  },
  // eager: a square wave barking on repeated notes
  dog: {
    key: 'G', bpm: 158, swing: 0.1,
    voices: { lead: PULSE(0.5, 0.14, { gain: 0.74 }) },
    motif: '0 0 4 . 0 0 5 . 4 . 2 . 0 . . . | 0 0 4 . 0 0 7 . 5 . 4 . 2 - - .',
  },  // bouncy: a tuba, oom-pah, low
  pig: {
    key: 'F', bpm: 140, swing: 0.3, octaves: { lead: 4 },
    voices: { lead: { type: 'fm', fm: { ratio: 1, index: 1.6, env: 1 }, swell: 0.6, scoop: 0.5, env: { a: 0.02, d: 0.25, s: 0.4, r: 0.1 }, cutoff: 2200, poly: 2, gain: 0.8 } },
    motif: '0 . 4, . 0 . 4, . 2 . 3 . 4 - - . | 0 . 4, . 0 . 4, . 6, . 1 . 0 - - .',
  },

  // sneaky: plucked, on tiptoe, in minor
  fox: {
    key: 'D', scale: 'minor', bpm: 152, swing: 0.25,
    voices: { lead: { type: 'string', string: { decay: 0.9, bright: 0.8, mute: 0.2 }, env: { a: 0.001, d: 1, s: 1, r: 0.1 }, cutoff: 5000, gain: 1.04 } },
    motif: '0 . . 2 . . 4 . 3 . 2 . 1 . . . | 0 . . 2 . . 4 . 6 - - . 4 . . .',
  },
  // small and careful: a music box, high up, in little steps
  hedgehog: {
    key: 'A', bpm: 146, octaves: { lead: 6 },
    voices: { lead: FM(7, 0.8, 0.9, { gain: 0.56 }) },
    motif: '0 1 2 . 1 2 3 . 2 3 4 . 2 . 0 . | 4 3 2 . 3 2 1 . 2 . 1 . 0 - - .',
  },
  // quick and up in the trees: a triangle scurrying high
  squirrel: {
    key: 'Bb', bpm: 164, swing: 0.15, octaves: { lead: 6 },
    voices: { lead: { type: 'triangle', env: { a: 0.001, d: 0.12, s: 0.3, r: 0.05 }, cutoff: 7000, poly: 2, gain: 1.2 } },
    motif: '0 2 4 7 4 2 0 . 0 2 4 7 9 . 7 . | 4 . 7 . 4 . 2 . 0 2 0 . . . . .',
  },
  // playful in the water: sliding from note to note, swung
  otter: {
    key: 'C', scale: 'mixolydian', bpm: 148, swing: 0.35,
    voices: { lead: { type: 'wave', wave: 'hollow', smooth: true, glide: 0.06, env: { a: 0.01, d: 0.4, s: 0.5, r: 0.2 }, cutoff: 3500, poly: 1, gain: 0.55 } },
    motif: '0 - 4 - 7 - 4 . 2 - 0 - . . . . | 0 - 2 - 4 - 7 - 9 - 7 . 4 . . .',
  },
  // funky: a thin pulse, wobbling (its width swaying)
  skunk: {
    key: 'Db', scale: 'mixolydian', bpm: 144, swing: 0.3,
    voices: { lead: PULSE(0.15, 0.2, { pwm: { depth: 0.3, rate: 3 }, gain: 0.77 }) },
    motif: '0 . 0 6, . 0 . 2 . 2 . 0 . . . . | 0 . 0 6, . 0 . 4 . 2 . 0 . . . .',
  },
  // howling: a bowed voice on long notes, in minor
  wolf: {
    key: 'A', scale: 'minor', bpm: 150, swing: 0.2,
    voices: { lead: { type: 'bowed', bow: { pressure: 0.7, position: 0.3 }, env: { a: 0.08, d: 1, s: 0.9, r: 0.5 }, vibrato: { depth: 0.12, rate: 5.5, delay: 0.25 }, cutoff: 3500, gain: 1.78 } },
    motif: '4 - - - - - 3 - 2 - - - - - . . | 4 - - - 6 - - - 4 - - - . . . .',
  },
  // heavy and stubborn: a growling saw, low, and a kick
  boar: {
    key: 'Eb', scale: 'mixolydian', bpm: 140, swing: 0.15, octaves: { lead: 4 }, kick: KICK(110, 0.22),
    voices: { lead: { type: 'wave', wave: 'saw', smooth: true, drive: 0.6, env: { a: 0.005, d: 0.3, s: 0.4, r: 0.1 }, cutoff: 1800, poly: 2, gain: 0.61 } },
    motif: '0 . 0 . 0 . 3 . 2 . . . 0 . . . | 0 . 0 . 0 . 4 . 3 . 2 . 0 . . .',
  },
  // lazy and warm: an organ, swung, taking its time
  bear: {
    key: 'Bb', bpm: 128, swing: 0.4, kick: KICK(90, 0.2, 0.6),
    voices: { lead: { type: 'wave', wave: 'organ', smooth: true, env: { a: 0.02, d: 0.5, s: 0.6, r: 0.25 }, cutoff: 2600, poly: 3, gain: 0.76 } },
    motif: '0 - - 2 4 - - . 5 - 4 - 2 - . . | 0 - - 2 4 - - . 2 - 1 - 0 - - .',
  },  // from the high mountains: a soft alphorn swelling into long notes, low, in minor, and a kick
  yak: {
    key: 'E', scale: 'minor', bpm: 132, swing: 0.1, octaves: { lead: 4 }, kick: KICK(85, 0.3),
    voices: { lead: { type: 'fm', fm: { ratio: 1, index: 1.1, env: 1 }, swell: 0.8, env: { a: 0.05, d: 0.6, s: 0.6, r: 0.3 }, cutoff: 1500, poly: 2, gain: 0.9 } },
    motif: '0 - - - - - - . 4 - - - 3 - - . | 0 - - - - - - . 2 - - - 0 - - .',
  },
  // long-legged: a flute, quick, on wide strides
  ostrich: {
    key: 'G', scale: 'mixolydian', bpm: 166, swing: 0.1,
    voices: { lead: { type: 'triangle', vibrato: { depth: 0.1, rate: 6, delay: 0.1 }, env: { a: 0.02, d: 0.2, s: 0.6, r: 0.1 }, cutoff: 5000, poly: 1, gain: 1.1 } },
    motif: '0 . 4 . 7 . 4 . 9 . 7 . 4 . 2 . | 0 4 7 4 0 4 7 9 7 . 4 . 0 . . .',
  },

  // fast: a sharp, narrow pulse, running up and down
  cheetah: {
    key: 'E', scale: 'mixolydian', bpm: 170, swing: 0.05,
    voices: { lead: PULSE(0.125, 0.1, { gain: 1.2 }) },
    motif: '0 2 4 5 7 5 4 2 0 2 4 5 7 . . . | 7 5 4 2 0 2 4 2 0 . . . . . . .',
  },  // swaying across the desert: a plucked oud, swung, in harmonic minor
  dromedary: {
    key: 'E', scale: 'harmonicMinor', bpm: 136, swing: 0.35,
    voices: { lead: { type: 'string', string: { decay: 1.4, bright: 0.6, mute: 0.1 }, env: { a: 0.001, d: 1, s: 1, r: 0.1 }, cutoff: 4000, gain: 1.04 } },
    motif: '4 . 3 . 2 - 1 . 2 - - . . . . . | 4 . 3 . 2 - 1 . 0 - - . . . . .',
  },

  // charging: brass that scoops into its notes, in minor, and a kick
  rhino: {
    key: 'C', scale: 'minor', bpm: 140, swing: 0.1, octaves: { lead: 4 }, kick: KICK(100, 0.25),
    voices: { lead: { type: 'fm', fm: { ratio: 1, index: 3, env: 1 }, scoop: 1, swell: 1, env: { a: 0.03, d: 0.4, s: 0.6, r: 0.15 }, cutoff: 3000, poly: 2, gain: 0.72 } },
    motif: '0 . . 0 . . 0 . 3 - - . 2 . . . | 0 . . 0 . . 0 . 4 - - . 3 - 2 .',
  },  // drumming on its chest: a deep thump, like taiko, in minor, and a kick
  gorilla: {
    key: 'G', scale: 'minor', bpm: 138, swing: 0.15, octaves: { lead: 4 }, kick: KICK(60, 0.35),
    voices: { lead: FM(0.5, 3, 0.3, { cutoff: 1800, gain: 1 }) },
    motif: '0 . 0 . 0 0 . . 4 . 3 . 0 . . . | 0 . 0 . 0 0 . . 6, . 0 . 0 . . .',
  },

  // a trumpet call: brass swelling on wide leaps, and a kick
  elephant: {
    key: 'Ab', bpm: 134, swing: 0.2, kick: KICK(80, 0.3),
    voices: { lead: { type: 'wave', wave: 'saw', smooth: true, unison: 2, detune: 8, swell: 1.5, scoop: 0.6, env: { a: 0.06, d: 0.6, s: 0.7, r: 0.2 }, cutoff: 1600, poly: 2, gain: 1.55 } },
    motif: '0 - - 4 7 - - - 7 - - - . . . . | 4 - 7 - 9 - 7 - 4 - - - 0 - - .',
  },
  // the biggest: a wide, driven saw in harmonic minor, and the deepest kick
  dino: {
    key: 'D', scale: 'harmonicMinor', bpm: 144, swing: 0.1, octaves: { lead: 4 }, kick: KICK(70, 0.35),
    voices: { lead: { type: 'wave', wave: 'saw', smooth: true, unison: 3, detune: 14, drive: 0.8, env: { a: 0.01, d: 0.5, s: 0.5, r: 0.2 }, cutoff: 1400, poly: 2, gain: 0.6 } },
    motif: '0 - - . 4 - - . 3 - 2 - 1 - 0 . | 0 - - . 4 - - . 6 - - - 4 - - .',
  },
};

// where the motif plays: while running, between the theme and the rest (not in the chase, the super power, at night,
// on the title or the high scores)
const MOTIF_IN = { hall: 0, nest: 0, intro: 0, burrow: 0, meadow: 1, thicket: 0.75, dash: 1, fox: 0, moonrise: 0, star: 0 };

export function songFor(song, kind) {
  const st = STYLES[kind] || {}, s = JSON.parse(JSON.stringify(song));
  if (!Object.keys(st).length) return s;
  for (const k of ['key', 'scale', 'bpm', 'swing']) if (st[k] !== undefined) s[k] = st[k];
  s.name = `${s.name} (${kind})`;
  for (const [id, def] of Object.entries(st.voices || {})) {
    const tr = s.tracks.find((t) => t.id === id);
    if (!tr) continue;
    const inst = `${id}_${kind}`;
    s.instruments[inst] = { name: `${id} (${kind})`, ...def };
    tr.instrument = inst;
  }
  for (const [id, octave] of Object.entries(st.octaves || {})) { const tr = s.tracks.find((t) => t.id === id); if (tr) tr.octave = octave; }
  if (st.kick) for (const def of Object.values(s.instruments)) if (def.type === 'drums' && def.kit) def.kit.k = st.kick;
  if (s.scale !== 'major') { // the menu's chords (those without a mode of their own) in major, as copies only it plays
    const menu = s.moods.menu?.sections || {};
    for (const p of [...s.progressions]) {
      if (p.scale || !Object.keys(menu).some((id) => (p.sections?.[id] ?? 1) > 0)) continue;
      const only = Object.fromEntries(s.sections.map((x) => [x.id, menu[x.id] ? p.sections?.[x.id] ?? 1 : 0]));
      s.progressions.push({ ...p, id: `${p.id}_menu`, scale: 'major', sections: only });
      p.sections = { ...p.sections, ...Object.fromEntries(Object.keys(menu).map((id) => [id, 0])) };
    }
  }
  if (st.motif) {
    s.blocks.push({ id: 'motif', beats: 8, sections: { ...MOTIF_IN }, pattern: st.motif });
    s.tracks.find((t) => t.id === 'lead').clips.push('motif');
  }
  return s;
}
