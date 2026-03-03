/**
 * Global tooltip system.
 *
 * Usage: add `data-tooltip="HTML content"` to any element.
 * The tooltip appears on hover, positioned near the cursor.
 * Supports rich HTML content for detailed callouts.
 */

let tooltipEl: HTMLDivElement | null = null;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let currentTarget: HTMLElement | null = null;

function getOrCreateTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'mp-tooltip';
    tooltipEl.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      max-width: 360px;
      min-width: 180px;
    `;
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function positionTooltip(e: MouseEvent): void {
  const tip = getOrCreateTooltip();
  const pad = 12;
  const rect = tip.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY + pad;

  // Flip if overflowing right
  if (x + rect.width > window.innerWidth - pad) {
    x = e.clientX - rect.width - pad;
  }
  // Flip if overflowing bottom
  if (y + rect.height > window.innerHeight - pad) {
    y = e.clientY - rect.height - pad;
  }
  // Clamp
  x = Math.max(pad, x);
  y = Math.max(pad, y);

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function showTooltip(target: HTMLElement, e: MouseEvent): void {
  const tip = getOrCreateTooltip();
  const content = target.getAttribute('data-tooltip') ?? '';
  if (!content.trim()) return;

  tip.innerHTML = content;
  tip.style.opacity = '0';
  tip.style.display = 'block';

  // Position after DOM update so we get correct dimensions
  requestAnimationFrame(() => {
    positionTooltip(e);
    tip.style.opacity = '1';
  });
}

function hideTooltip(): void {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (tooltipEl) {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.display = 'none';
  }
  currentTarget = null;
}

function findTooltipTarget(el: HTMLElement | null): HTMLElement | null {
  while (el) {
    if (el.hasAttribute?.('data-tooltip')) return el;
    el = el.parentElement;
  }
  return null;
}

export function initTooltips(): void {
  document.addEventListener('mouseover', (e) => {
    const target = findTooltipTarget(e.target as HTMLElement);
    if (!target) {
      if (currentTarget) hideTooltip();
      return;
    }
    if (target === currentTarget) return;

    hideTooltip();
    currentTarget = target;
    // Small delay to avoid flickering on fast mouse movement
    showTimer = setTimeout(() => showTooltip(target, e), 200);
  });

  document.addEventListener('mousemove', (e) => {
    if (currentTarget && tooltipEl?.style.opacity === '1') {
      positionTooltip(e);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const target = findTooltipTarget(e.target as HTMLElement);
    const related = findTooltipTarget(e.relatedTarget as HTMLElement);
    if (target && target !== related) {
      hideTooltip();
    }
  });

  // Hide on scroll
  document.addEventListener('scroll', hideTooltip, true);
}
