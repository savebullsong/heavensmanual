// 배경 소리: ① 올린 음악(Dreamlike Realm) ② 그 자리에서 만드는 방콕 자연음 ③ 끄기
// 단추 하나로 ① → ② → ③ 차례로 바뀐다.
// 음악 파일은 '음악'을 고른 기기만 한 번 받고(서비스 워커가 기기에 남김), 자연음은 파일이 없다.
// 자연음은 방콕 시각을 따른다: 낮 = 바람·잎·작은 새·뻐꾸기류(코엘) 울음·한낮 매미, 밤 = 귀뚜라미·도마뱀붙이(뚝깨) 울음.
import { audioContext, noiseBuffer, onUnlock } from './sfx.ts';
import { bangkokClock } from './clock.ts';

export type BgmMode = 'music' | 'nature' | 'off';
export const MUSIC = { url: 'audio/dreamlike-realm.mp3', title: 'Dreamlike Realm' };
const KEY = 'heavensmanual.bgm';
const installed = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

let mode: BgmMode = (() => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'music' || v === 'nature' || v === 'off') return v;
  } catch { /* 없음 */ }
  // 처음: 설치한 기기는 음악, 브라우저는 파일 없는 자연음
  return installed() ? 'music' : 'nature';
})();
let indoor = false;

export function bgmMode() { return mode; }
export function setBgmMode(m: BgmMode) {
  mode = m;
  try { localStorage.setItem(KEY, m); } catch { /* 그만 */ }
  apply();
}
export function cycleBgm(): BgmMode {
  setBgmMode(mode === 'music' ? 'nature' : mode === 'nature' ? 'off' : 'music');
  return mode;
}
/** 우주새 상점 안: 바깥 소리를 벽 너머처럼 낮고 작게 */
export function setIndoor(v: boolean) {
  indoor = v;
  const c = audioContext();
  if (c && natureOut) {
    natureFilter!.frequency.setTargetAtTime(v ? 700 : 16000, c.currentTime, 0.4);
    natureOut.gain.setTargetAtTime(mode === 'nature' ? (v ? 0.45 : 1) : 0, c.currentTime, 0.4);
  }
}

// ───────────────────────── 음악 ─────────────────────────
let audioEl: HTMLAudioElement | null = null;
let musicGain: GainNode | null = null;
let musicLoading: Promise<void> | null = null;

function loadMusic(c: AudioContext) {
  if (musicLoading) return musicLoading;
  musicLoading = (async () => {
    // 통째로 한 번 받아 기기에 남긴다 (조각 요청이 없어 서비스 워커가 그대로 보관)
    const blob = await fetch(MUSIC.url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); });
    const el = new Audio();
    el.src = URL.createObjectURL(blob);
    el.loop = true;
    el.preload = 'auto';
    audioEl = el;
    musicGain = c.createGain();
    musicGain.gain.value = 0;
    // iOS는 audio.volume을 못 바꿔서 Web Audio 볼륨으로 조절한다
    c.createMediaElementSource(el).connect(musicGain).connect(c.destination);
  })().catch((e) => { musicLoading = null; throw e; });
  return musicLoading;
}

// ───────────────────────── 자연음 ─────────────────────────
let natureOut: GainNode | null = null;
let natureFilter: BiquadFilterNode | null = null;
let natureBus: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let windGain: GainNode | null = null;
let leafGain: GainNode | null = null;
let timer = 0;
const next: Record<string, number> = {};

function buildNature(c: AudioContext) {
  if (natureOut) return;
  natureOut = c.createGain();
  natureOut.gain.value = 0;
  natureFilter = c.createBiquadFilter();
  natureFilter.type = 'lowpass';
  natureFilter.frequency.value = indoor ? 700 : 16000;
  natureBus = c.createGain();
  natureBus.gain.value = 0.9;
  natureBus.connect(natureFilter).connect(natureOut).connect(c.destination);
  // 멀리서 들리는 울림 (감쇠하는 잡음으로 만든 잔향)
  reverb = c.createConvolver();
  const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.5; }
  reverb.buffer = ir;
  const wet = c.createGain(); wet.gain.value = 0.55;
  reverb.connect(wet).connect(natureBus);
  // 바람 (낮은 잡음) + 잎 스치는 소리 (높은 잡음) — 세기가 천천히 오르내린다
  const loop = (type: BiquadFilterType, f: number, q: number) => {
    const src = c.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true; src.playbackRate.value = 0.7 + Math.random() * 0.2;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(fl).connect(g).connect(natureBus!); src.start();
    return { g, fl };
  };
  const w = loop('lowpass', 420, 0.5); windGain = w.g;
  const l = loop('bandpass', 3400, 0.8); leafGain = l.g;
  const hum = loop('lowpass', 140, 0.6); hum.g.gain.value = 0.035; // 아주 먼 도시
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function voice(c: AudioContext, pan: number, gain: number, wet = 0.6) {
  const g = c.createGain(); g.gain.value = gain;
  const p = c.createStereoPanner(); p.pan.value = pan;
  g.connect(p);
  p.connect(natureBus!);
  const send = c.createGain(); send.gain.value = wet;
  p.connect(send).connect(reverb!);
  return g;
}
function env(c: AudioContext, t: number, a: number, peak: number, d: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
function osc(c: AudioContext, type: OscillatorType, t: number, dur: number, f0: number, f1: number, out: AudioNode, peak: number, a = 0.01) {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = env(c, t, a, peak, dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + a + dur + 0.05);
  return o;
}

/** 코엘 (방콕 아침의 "까-우-" 하고 점점 높아지는 울음) */
function koel(c: AudioContext, t: number) {
  const out = voice(c, rnd(-0.8, 0.8), rnd(0.05, 0.1), 0.9);
  const n = Math.floor(rnd(4, 8)); let f = rnd(560, 640);
  for (let k = 0; k < n; k++) {
    osc(c, 'sine', t, 0.12, f, f * 1.02, out, 0.5, 0.02);
    const o = osc(c, 'sine', t + 0.16, 0.34, f * 1.08, f * 1.42, out, 0.7, 0.03);
    const vib = c.createOscillator(); vib.frequency.value = 6; const vg = c.createGain(); vg.gain.value = f * 0.012;
    vib.connect(vg).connect(o.frequency); vib.start(t + 0.16); vib.stop(t + 0.6);
    t += rnd(0.75, 0.95); f *= rnd(1.03, 1.07);
  }
}
/** 작은 새 짹짹 (불불·참새) */
function chirps(c: AudioContext, t: number) {
  const out = voice(c, rnd(-0.9, 0.9), rnd(0.03, 0.07), 0.4);
  const n = Math.floor(rnd(2, 6)), base = rnd(2400, 4200);
  for (let k = 0; k < n; k++) {
    const up = Math.random() < 0.5;
    osc(c, 'sine', t, rnd(0.04, 0.09), base * (up ? 0.85 : 1.2), base * (up ? 1.25 : 0.8), out, 0.6, 0.005);
    t += rnd(0.08, 0.16);
  }
}
/** 한낮 매미: 높은 잡음이 웅웅 떨리며 부풀었다 잦아든다 */
function cicada(c: AudioContext, t: number) {
  const out = voice(c, rnd(-0.7, 0.7), rnd(0.02, 0.045), 0.3);
  const src = c.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(4200, 5600); bp.Q.value = 6;
  const am = c.createGain(); am.gain.value = 0.5;
  const lfo = c.createOscillator(); lfo.frequency.value = rnd(80, 110); const lg = c.createGain(); lg.gain.value = 0.5;
  lfo.connect(lg).connect(am.gain);
  const dur = rnd(5, 9);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.4); g.gain.setValueAtTime(1, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(am).connect(g).connect(out);
  src.start(t, Math.random()); src.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
}
/** 귀뚜라미 한 마리: 짧은 펄스 3~4개가 한 번의 울음 */
function cricket(c: AudioContext, t: number, f: number, pan: number) {
  const out = voice(c, pan, 0.028, 0.25);
  const pulses = Math.random() < 0.5 ? 3 : 4;
  for (let k = 0; k < pulses; k++) osc(c, 'sine', t + k * 0.032, 0.014, f, f * 0.98, out, 0.9, 0.003);
}
/** 도마뱀붙이 '뚝깨' (태국 밤의 "또-깨, 또-깨") */
function tokay(c: AudioContext, t: number) {
  const out = voice(c, rnd(-0.6, 0.6), rnd(0.07, 0.11), 0.8);
  const fm = c.createBiquadFilter(); fm.type = 'bandpass'; fm.frequency.value = 900; fm.Q.value = 2.2;
  const sh = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } sh.curve = curve;
  fm.connect(sh).connect(out);
  // 처음엔 '그르르' 하고 몸을 푼다
  for (let k = 0; k < 4; k++) osc(c, 'sawtooth', t + k * 0.09, 0.04, 180, 150, fm, 0.4, 0.004);
  t += 0.8;
  const n = Math.floor(rnd(5, 9));
  for (let k = 0; k < n; k++) {
    const fade = 1 - (k / n) * 0.55;
    osc(c, 'sawtooth', t, 0.07, 300, 280, fm, 0.7 * fade, 0.006);
    osc(c, 'sawtooth', t + 0.13, 0.2, 430, 360, fm, 0.9 * fade, 0.01);
    t += rnd(1.0, 1.25);
  }
}

function schedule() {
  const c = audioContext();
  if (!c || !natureOut || mode !== 'nature') return;
  const now = c.currentTime;
  const { h, m } = bangkokClock();
  const hh = h + m / 60;
  const day = hh >= 6 && hh < 18.5, dawn = hh >= 5.5 && hh < 9, noon = hh >= 11 && hh < 16;
  // 바람은 천천히 오르내림
  const gust = 0.5 + 0.5 * Math.sin(now / 7) * Math.sin(now / 3.1 + 1);
  windGain!.gain.setTargetAtTime((day ? 0.09 : 0.06) * (0.6 + gust * 0.6), now, 1.5);
  leafGain!.gain.setTargetAtTime(0.012 + gust * 0.03, now, 1.2);
  const due = (k: string, a: number, b: number) => { if ((next[k] ?? 0) <= now) { next[k] = now + rnd(a, b); return true; } return false; };
  if (day) {
    if (due('koel', dawn ? 12 : 28, dawn ? 30 : 70)) koel(c, now + 0.3);
    if (due('chirp', dawn ? 1.5 : 3, dawn ? 4 : 9)) chirps(c, now + rnd(0.1, 0.6));
    if (noon && due('cicada', 9, 22)) cicada(c, now + 0.2);
  } else {
    for (let k = 0; k < 3; k++) if (due(`cr${k}`, 0.55 + k * 0.17, 1.2 + k * 0.2)) cricket(c, now + rnd(0.05, 0.3), 4300 + k * 380, -0.7 + k * 0.7);
    if (due('tokay', 35, 110)) tokay(c, now + 0.5);
  }
}

// ───────────────────────── 켜고 끄기 ─────────────────────────
async function apply() {
  const c = audioContext();
  if (!c || c.state !== 'running') return; // 첫 누름 뒤 onUnlock에서 다시 불림
  const t = c.currentTime;
  // 자연음
  if (mode === 'nature') {
    buildNature(c);
    natureOut!.gain.setTargetAtTime(indoor ? 0.45 : 1, t, 0.6);
    if (!timer) { schedule(); timer = window.setInterval(schedule, 400); }
  } else if (natureOut) {
    natureOut.gain.setTargetAtTime(0, t, 0.3);
    clearInterval(timer); timer = 0;
  }
  // 음악
  if (mode === 'music') {
    try {
      await loadMusic(c);
    } catch {
      return;
    }
    if (mode !== 'music' || !audioEl || !musicGain) return;
    if (audioEl.paused) await audioEl.play().catch(() => undefined);
    musicGain.gain.setTargetAtTime(0.42, c.currentTime, 0.8);
  } else if (audioEl && musicGain) {
    musicGain.gain.setTargetAtTime(0, t, 0.25);
    const el = audioEl;
    setTimeout(() => { if (mode !== 'music') el.pause(); }, 900);
  }
}

onUnlock(() => { void apply(); });
// 다른 앱으로 가면 멈추고, 돌아오면 다시
document.addEventListener('visibilitychange', () => {
  const c = audioContext();
  if (!c) return;
  if (document.hidden) { audioEl?.pause(); void c.suspend(); }
  else void c.resume().then(() => apply());
});
