// 효과음: 파일 없이 Web Audio로 그 자리에서 만든다 (저작권·용량 걱정 없음).
// 휘두르는 바람 소리, 맨손·둔기·칼날 타격음, 총소리, 쓰러지는 소리.
// 소리는 내 캐릭터에서 멀수록 작게, 화면 왼쪽·오른쪽에 따라 좌우로 나뉜다.

export type HitKind = 'fist' | 'blunt' | 'blade' | 'gun';

const BLADES = new Set(['knife', 'dagger', 'sword', 'hatchet', 'needle']);
export function hitKind(weapon: string | null | undefined, ranged = false): HitKind {
  if (ranged || weapon === 'pistol') return 'gun';
  if (!weapon) return 'fist';
  return BLADES.has(weapon) ? 'blade' : 'blunt';
}

const KEY = 'heavensmanual.sfx';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = (() => { try { return localStorage.getItem(KEY) === 'off'; } catch { return false; } })();

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch { /* 저장 못 해도 그만 */ }
  if (master) master.gain.value = m ? 0 : 0.55;
}

/** 브라우저는 사용자가 한 번 누른 뒤에야 소리를 허락한다 */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    // 한꺼번에 여러 소리가 겹쳐도 찢어지지 않게
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, n);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

interface Spot { pan: number; vol: number }
/** 화면에서의 위치(내 캐릭터 기준 픽셀)로 좌우·크기를 정한다 */
export function spot(dx: number, dy: number): Spot {
  const d = Math.hypot(dx, dy * 2);
  return { pan: Math.max(-0.8, Math.min(0.8, dx / 320)), vol: 1 / (1 + d / 220) };
}

function out(s: Spot, gain: number) {
  const g = ctx!.createGain();
  g.gain.value = gain * s.vol;
  const p = ctx!.createStereoPanner();
  p.pan.value = s.pan;
  g.connect(p).connect(master!);
  return g;
}
function noise(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, q: number, peak: number, attack = 0.004) {
  const src = ctx!.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = ctx!.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}
function tone(dest: AudioNode, t: number, dur: number, type: OscillatorType, f0: number, f1: number, peak: number) {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
}
const ready = () => !!ctx && ctx.state === 'running' && !muted;
const jit = (x: number, r = 0.08) => x * (1 - r + Math.random() * r * 2);

/** 휘두르는 바람 소리 (맨손은 짧고 가볍게, 둔기는 낮고 굵게, 칼은 높고 날카롭게) */
export function swing(kind: HitKind, s: Spot) {
  if (!ready() || kind === 'gun') return;
  const t = ctx!.currentTime, o = out(s, 1);
  if (kind === 'fist') noise(o, t, 0.12, 'bandpass', jit(700), jit(1500), 1.2, 0.25, 0.03);
  else if (kind === 'blunt') noise(o, t, 0.22, 'bandpass', jit(350), jit(900), 1.6, 0.45, 0.08);
  else noise(o, t, 0.18, 'bandpass', jit(1600), jit(4200), 2.2, 0.35, 0.06);
}

/** 맞는 소리 (치명타는 한 겹 더 묵직하게) */
export function impact(kind: HitKind, s: Spot, crit = false) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, crit ? 1.25 : 1);
  if (kind === 'fist') {
    tone(o, t, 0.13, 'sine', jit(150), 55, 0.9);
    noise(o, t, 0.06, 'lowpass', 1400, 400, 0.7, 0.5);
  } else if (kind === 'blunt') {
    tone(o, t, 0.16, 'triangle', jit(210), 70, 0.8);
    noise(o, t, 0.09, 'bandpass', jit(950), 500, 1.4, 0.8);
    tone(o, t, 0.05, 'square', jit(620), 300, 0.08);
  } else if (kind === 'blade') {
    noise(o, t, 0.1, 'highpass', jit(3200), 2000, 0.8, 0.55);
    tone(o, t, 0.2, 'sine', jit(2600), 2300, 0.07);
    tone(o, t, 0.16, 'sine', jit(3900), 3500, 0.05);
    tone(o, t, 0.09, 'sine', jit(130), 60, 0.5);
  } else {
    tone(o, t, 0.1, 'sine', jit(120), 50, 0.6);
  }
  if (crit) { tone(o, t + 0.01, 0.22, 'sine', 90, 38, 0.9); noise(o, t, 0.05, 'highpass', 2500, 1500, 0.7, 0.3); }
}

/** 총소리 */
export function gunshot(s: Spot) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, 1.1);
  noise(o, t, 0.28, 'highpass', jit(900), 300, 0.6, 1.0, 0.002);
  noise(o, t, 0.45, 'lowpass', 1800, 200, 0.7, 0.5, 0.002);
  tone(o, t, 0.2, 'sine', 95, 38, 0.9);
}

/** 쓰러지는 소리 */
export function thud(s: Spot) {
  if (!ready()) return;
  const t = ctx!.currentTime, o = out(s, 1);
  noise(o, t, 0.32, 'lowpass', 420, 120, 0.8, 0.7, 0.01);
  tone(o, t, 0.26, 'sine', 75, 38, 0.8);
  noise(o, t + 0.12, 0.18, 'lowpass', 300, 100, 0.8, 0.35, 0.01);
}
