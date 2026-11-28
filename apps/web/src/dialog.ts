import { wonify } from './items.ts';
// 대화창: 주요 인물은 일본 RPG처럼 인물 그림을 크게 세우고, 일반 NPC는 글상자만 쓴다
import { portraitUrl, type PortraitSlot } from './portraits.ts';

export interface Speaker {
  name: string;
  portrait?: PortraitSlot; // 주요 인물만
  monologue?: boolean; // 혼잣말 (이름표 없이 기울인 글씨)
  exit?: boolean; // 34차: 오른쪽 위 ✕로 언제든 대화를 그만둘 수 있다 (환전상·환생관)
}

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null;
const glyphs = (s: string) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));

export class Dialog {
  readonly el = document.createElement('div');
  private img = document.createElement('img');
  private portraitBox = document.createElement('div');
  private nameEl = document.createElement('div');
  private textEl = document.createElement('div');
  private nextEl = document.createElement('div');
  private choicesEl = document.createElement('div');
  private panelEl = document.createElement('div');
  private sideEl = document.createElement('div');
  private advance: (() => void) | null = null;
  private speakerKey = '';
  private typing: ReturnType<typeof setInterval> | undefined;
  private release: (() => void) | null = null;
  private exitBtn = document.createElement('button');
  private chooseRes: ((k: number) => void) | null = null;
  private dropped = false;

  constructor(host: HTMLElement) {
    this.el.className = 'dlg';
    this.el.hidden = true;
    this.portraitBox.className = 'dlg-portrait';
    this.img.alt = '';
    this.img.draggable = false;
    this.portraitBox.appendChild(this.img);
    this.panelEl.className = 'dlg-panel';
    this.panelEl.hidden = true;
    const box = document.createElement('div');
    box.className = 'dlg-box';
    this.nameEl.className = 'dlg-name';
    this.textEl.className = 'dlg-text';
    this.nextEl.className = 'dlg-next';
    this.nextEl.textContent = '▼';
    this.choicesEl.className = 'dlg-choices';
    this.exitBtn.className = 'dlg-exit';
    this.exitBtn.textContent = '✕';
    this.exitBtn.hidden = true;
    this.exitBtn.onclick = (e) => { e.stopPropagation(); this.cancel(); };
    this.sideEl.className = 'dlg-side';
    this.sideEl.hidden = true;
    box.append(this.nameEl, this.textEl, this.nextEl, this.choicesEl, this.sideEl, this.exitBtn);
    this.el.append(this.portraitBox, this.panelEl, box);
    host.appendChild(this.el);
    // 화면 어디를 눌러도 다음 줄로 (버튼과 상품 창은 제외)
    this.el.addEventListener('pointerup', (e) => {
      const tgt = e.target as HTMLElement;
      if (tgt.closest('button, .dlg-panel')) return;
      this.advance?.();
    });
    window.addEventListener('resize', () => this.fitPortrait());
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden || !(e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
      this.advance?.();
    });
  }

  get isOpen() {
    return !this.el.hidden;
  }
  /** 34차: ✕로 그만둔 대화 — 남은 줄은 건너뛰고(보이지 않게) 선택은 −1, 대화를 연 쪽이 닫을 때(close) 풀린다 */
  get cancelled() {
    return this.dropped;
  }
  cancel() {
    if (this.el.hidden) return;
    this.dropped = true;
    this.el.hidden = true;
    this.setPanel(null);
    this.choicesEl.innerHTML = '';
    const c = this.chooseRes;
    this.chooseRes = null;
    c?.(-1);
    this.stopLine();
  }

  /** 말하는 사람을 정한다. 주요 인물이면 그림을 세운다 */
  open(speaker: Speaker) {
    this.exitBtn.hidden = !speaker.exit;
    if (this.dropped) return; // 그만둔 대화를 이어 가던 쪽이 다시 열려 해도 감춘 채로
    this.el.hidden = false;
    this.nameEl.textContent = speaker.name;
    this.el.classList.toggle('monologue', !!speaker.monologue);
    const key = `${speaker.name}|${speaker.portrait ?? ''}`;
    if (key === this.speakerKey) return;
    this.speakerKey = key;
    this.portraitBox.classList.remove('show');
    this.el.classList.toggle('has-portrait', false);
    if (!speaker.portrait) return;
    portraitUrl(speaker.portrait).then((url) => {
      if (!url || this.speakerKey !== key) return;
      const show = () => {
        if (this.speakerKey !== key) return;
        this.el.classList.add('has-portrait');
        this.portraitBox.classList.add('show');
      };
      this.img.onload = show;
      this.img.src = url;
      if (this.img.complete && this.img.naturalWidth) show();
    });
  }

  /** 한 줄을 타자 치듯 보여 준다. 누르면 끝까지, 한 번 더 누르면 다음으로 */
  say(text: string): Promise<void> {
    text = wonify(text); // 32차: 서울이면 원화로
    if (this.dropped) return Promise.resolve();
    this.stopLine();
    this.choicesEl.innerHTML = '';
    this.nextEl.hidden = true;
    const g = glyphs(text);
    let n = 0;
    this.textEl.textContent = '';
    return new Promise((resolve) => {
      this.release = resolve;
      const finish = () => {
        if (this.typing) clearInterval(this.typing);
        this.typing = undefined;
        this.textEl.textContent = text;
        this.nextEl.hidden = false;
        this.advance = () => {
          this.advance = null;
          this.release = null;
          this.nextEl.hidden = true;
          resolve();
        };
      };
      this.typing = setInterval(() => {
        n += 1;
        this.textEl.textContent = g.slice(0, n).join('');
        if (n >= g.length) finish();
      }, 26);
      this.advance = finish;
    });
  }

  /** 치던 줄을 멈추고, 그 줄을 기다리던 쪽은 그냥 넘어가게 한다 */
  private stopLine() {
    if (this.typing) clearInterval(this.typing);
    this.typing = undefined;
    this.advance = null;
    const r = this.release;
    this.release = null;
    r?.();
  }

  /** 마지막 줄 아래에 선택지를 띄운다 */
  choose(options: string[], disabled: number[] = []): Promise<number> {
    if (this.dropped) return Promise.resolve(-1);
    options = options.map(wonify);
    this.nextEl.hidden = true;
    if (this.typing) { clearInterval(this.typing); this.typing = undefined; }
    this.advance = null;
    this.release = null;
    this.choicesEl.innerHTML = '';
    const shownAt = performance.now();
    return new Promise((resolve) => {
      this.chooseRes = resolve;
      options.forEach((label, k) => {
        const b = document.createElement('button');
        b.textContent = label;
        if (k === 0) b.className = 'primary';
        if (disabled.includes(k)) { b.disabled = true; b.className = 'off'; } // 34차: 고를 수 없는 선택지도 보여 준다 (조건이 모자람)
        b.onclick = () => {
          // 36차: 선택지가 막 떴을 때의 누르기는 대사를 넘기던 손가락 — 0.35초 동안은 고른 것으로 치지 않는다
          if (performance.now() - shownAt < 350) return;
          this.choicesEl.innerHTML = '';
          this.chooseRes = null;
          resolve(k);
        };
        this.choicesEl.appendChild(b);
      });
    });
  }

  /** 55차: 글상자 왼쪽 아래의 작은 버튼 자리 (상품 창의 '대화하기') — 상품 창이 닫히면 함께 사라진다 */
  setSide(content: HTMLElement | null) {
    this.sideEl.innerHTML = '';
    this.sideEl.hidden = !content;
    if (content) this.sideEl.appendChild(content);
  }
  /** 상품 목록처럼 대화와 함께 띄우는 창 */
  setPanel(content: HTMLElement | null) {
    if (!content) this.setSide(null);
    this.panelEl.innerHTML = '';
    this.panelEl.hidden = !content;
    if (content) this.panelEl.appendChild(content);
    this.el.classList.toggle('has-panel', !!content);
    requestAnimationFrame(() => this.fitPortrait());
  }

  /** 좁은 화면에서 상품 창이 열리면 인물 그림을 창 위로 올려 얼굴(그림 위쪽 ~38%까지)이 창에 가리지 않게 한다.
   *  머리끝(2%)은 위쪽 HUD·가게 이름표 아래에서 시작 */
  private fitPortrait() {
    const st = this.portraitBox.style;
    st.top = st.bottom = st.height = '';
    if (this.el.hidden || this.panelEl.hidden || window.innerWidth > 640) return;
    const panelTop = this.panelEl.getBoundingClientRect().top - 4;
    const hudBottom = Math.min(110, document.getElementById('hud')?.getBoundingClientRect().bottom ?? 0);
    const full = Math.min(window.innerHeight * 0.64, 620);
    const h = Math.min(full, Math.max(220, (panelTop - hudBottom) / 0.36));
    st.height = `${Math.round(h)}px`;
    st.top = `${Math.round(panelTop - h * 0.38)}px`;
    st.bottom = 'auto';
  }

  close() {
    this.dropped = false;
    this.exitBtn.hidden = true;
    const c = this.chooseRes;
    this.chooseRes = null;
    c?.(-1);
    this.stopLine();
    this.el.hidden = true;
    this.speakerKey = '';
    this.setPanel(null);
    this.choicesEl.innerHTML = '';
    this.textEl.textContent = '';
    this.portraitBox.classList.remove('show');
    this.el.classList.remove('has-portrait');
  }
}
