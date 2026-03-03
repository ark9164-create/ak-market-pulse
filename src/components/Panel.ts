import { h } from '@/utils/dom';

export interface FilterDef {
  id: string;
  label: string;
  type: 'toggle' | 'select';
  options?: { value: string; label: string }[];
  default: string; // 'all' for selects, 'true'/'false' for toggles
}

export class Panel {
  readonly id: string;
  readonly title: string;
  readonly el: HTMLElement;
  protected header: HTMLElement;
  protected filterBar: HTMLElement;
  protected content: HTMLElement;
  protected countBadge: HTMLElement;
  protected filters: Map<string, string> = new Map();
  private colSpan: number;

  constructor(id: string, title: string, colSpan = 1) {
    this.id = id;
    this.title = title;
    this.colSpan = colSpan;

    this.countBadge = h('span', { className: 'panel-count' });
    this.header = h('div', { className: 'panel-header' },
      h('span', { className: 'panel-title' }, title),
      this.countBadge,
    );
    this.filterBar = h('div', { className: 'panel-filters' });
    this.content = h('div', { className: 'panel-content' });

    this.el = h('div', {
      className: `panel col-span-${colSpan}`,
      'data-panel-id': id,
    }, this.header, this.filterBar, this.content);

    this.showLoading();
  }

  /** Define filters for this panel. Call in subclass constructor. */
  protected setupFilters(defs: FilterDef[]): void {
    this.filterBar.innerHTML = '';
    for (const def of defs) {
      this.filters.set(def.id, def.default);

      if (def.type === 'toggle') {
        const btn = document.createElement('button');
        btn.className = 'filter-chip' + (def.default === 'true' ? ' active' : '');
        btn.textContent = def.label;
        btn.dataset.filterId = def.id;
        btn.addEventListener('click', () => {
          const cur = this.filters.get(def.id) === 'true';
          this.filters.set(def.id, cur ? 'false' : 'true');
          btn.classList.toggle('active', !cur);
          this.onFilterChange();
        });
        this.filterBar.appendChild(btn);
      } else if (def.type === 'select' && def.options) {
        for (const opt of def.options) {
          const btn = document.createElement('button');
          btn.className = 'filter-chip' + (def.default === opt.value ? ' active' : '');
          btn.textContent = opt.label;
          btn.dataset.filterId = def.id;
          btn.dataset.value = opt.value;
          btn.addEventListener('click', () => {
            this.filters.set(def.id, opt.value);
            // Deactivate siblings
            this.filterBar.querySelectorAll(`[data-filter-id="${def.id}"]`).forEach(
              el => el.classList.toggle('active', (el as HTMLElement).dataset.value === opt.value)
            );
            this.onFilterChange();
          });
          this.filterBar.appendChild(btn);
        }
      }
    }
  }

  /** Override in subclasses to re-render when filters change */
  protected onFilterChange(): void {}

  protected getFilter(id: string): string {
    return this.filters.get(id) ?? 'all';
  }

  protected isFilterActive(id: string): boolean {
    return this.filters.get(id) === 'true';
  }

  showLoading(): void {
    this.content.innerHTML = '<div class="panel-loading"><div class="spinner"></div></div>';
  }

  showError(msg: string): void {
    this.content.innerHTML = `<div class="panel-error">${msg}</div>`;
  }

  setContent(html: string): void {
    this.content.innerHTML = html;
  }

  setCount(n: number): void {
    this.countBadge.textContent = n > 0 ? String(n) : '';
  }

  destroy(): void {
    this.el.remove();
  }
}
