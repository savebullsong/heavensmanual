// 대화창: 주요 인물은 일본 RPG처럼 인물 그림을 크게 세우고, 일반 NPC는 글상자만 쓴다
import { portraitUrl, type PortraitSlot } from './portraits.ts';

export interface Speaker {
  name: string;
  portrait?: PortraitSlot; // 주요 인물만
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
  private advance: (() => void) | null = null;
  private speakerKey = '';
  private typing: ReturnType<typeof setInterval> | undefined;
  private release: (() => void) | null = null;

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
    box.append(this.nameEl, this.textEl, this.nextEl, this.choicesEl);
    this.el.append(this.portraitBox, this.panelEl, box);
    host.appendChild(this.el);
    // 화면 어디를 눌러도 다음 줄로 (버튼과 상품 창은 제외)
    this.el.addEventListener('pointerup', (e) => {
      const tgt = e.target as HTMLElement;
      if (tgt.closest('button, .dlg-panel')) return;
      this.advance?.();
    });
    window.addEventListener('keydown', (e) => {
      if (this.el.hidden || !(e.key === 'Enter' || e.key === ' ')) return;
      e.preventDefault();
      this.advance?.();
    });
  }

  get isOpen() {
    return !this.el.hidden;
  }

  /** 말하는 사람을 정한다. 주요 인물이면 그림을 세운다 */
  open(speaker: Speaker) {
    this.el.hidden = false;
    this.nameEl.textContent = speaker.name;
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
  choose(options: string[]): Promise<number> {
    this.nextEl.hidden = true;
    if (this.typing) { clearInterval(this.typing); this.typing = undefined; }
    this.advance = null;
    this.release = null;
    this.choicesEl.innerHTML = '';
    return new Promise((resolve) => {
      options.forEach((label, k) => {
        const b = document.createElement('button');
        b.textContent = label;
        if (k === 0) b.className = 'primary';
        b.onclick = () => {
          this.choicesEl.innerHTML = '';
          resolve(k);
        };
        this.choicesEl.appendChild(b);
      });
    });
  }

  /** 상품 목록처럼 대화와 함께 띄우는 창 */
  setPanel(content: HTMLElement | null) {
    this.panelEl.innerHTML = '';
    this.panelEl.hidden = !content;
    if (content) this.panelEl.appendChild(content);
  }

  close() {
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
