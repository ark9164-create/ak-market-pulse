/**
 * Lightweight floating tooltip for deck.gl map hover events.
 */
export class MapPopup {
  private el: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'map-popup';
    this.el.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: rgba(18, 18, 24, 0.92);
      color: #e0e0e0;
      font-size: 12px;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      white-space: nowrap;
      z-index: 1000;
      display: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    `;
    container.appendChild(this.el);
  }

  show(x: number, y: number, html: string): void {
    this.el.innerHTML = html;
    this.el.style.left = `${x + 10}px`;
    this.el.style.top = `${y + 10}px`;
    this.el.style.display = 'block';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
