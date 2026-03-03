import { h } from '@/utils/dom';
import { toggleTheme, getTheme } from '@/utils/theme';

export class Header {
  private el: HTMLElement;
  private clockInterval: ReturnType<typeof setInterval>;
  private clockEl: HTMLElement;
  private themeBtn: HTMLButtonElement;

  constructor(container: HTMLElement, onCopilotToggle: () => void) {
    // Logo
    const logo = h('div', { className: 'header-logo' },
      h('span', { className: 'header-logo-dot' }),
      h('span', { className: 'header-logo-text' }, 'MarketPulse'),
    );

    // Search
    const search = h('input', {
      type: 'text',
      className: 'header-search',
      placeholder: 'Search panels...',
    });
    search.addEventListener('input', () => {
      const event = new CustomEvent('panel-search', { detail: { query: search.value } });
      window.dispatchEvent(event);
    });

    // Clock
    this.clockEl = h('div', { className: 'header-clock' });
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Theme toggle
    this.themeBtn = h('button', { className: 'header-btn' }) as HTMLButtonElement;
    this.updateThemeIcon();
    this.themeBtn.addEventListener('click', () => {
      toggleTheme();
      this.updateThemeIcon();
    });

    // Copilot button
    const copilotBtn = h('button', { className: 'header-btn header-btn-accent' }, 'AI Copilot');
    copilotBtn.addEventListener('click', onCopilotToggle);

    // Assemble header
    this.el = h('header', { className: 'header-bar' },
      logo,
      search,
      this.clockEl,
      this.themeBtn,
      copilotBtn,
    );

    container.prepend(this.el);
  }

  private updateClock(): void {
    const now = new Date();
    const fmt = (tz: string): string =>
      now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    this.clockEl.innerHTML =
      `<span class="header-tz"><b>NY</b> ${fmt('America/New_York')}</span>` +
      `<span class="header-tz"><b>LDN</b> ${fmt('Europe/London')}</span>` +
      `<span class="header-tz"><b>TYO</b> ${fmt('Asia/Tokyo')}</span>`;
  }

  private updateThemeIcon(): void {
    this.themeBtn.textContent = getTheme() === 'dark' ? '\u2600' : '\u263E';
  }

  destroy(): void {
    clearInterval(this.clockInterval);
    this.el.remove();
  }
}
