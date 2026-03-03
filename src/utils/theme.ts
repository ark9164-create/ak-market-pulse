const THEME_KEY = 'mp-theme';

export type Theme = 'dark' | 'light';

let current: Theme = (localStorage.getItem(THEME_KEY) as Theme) || 'dark';

export function getTheme(): Theme {
  return current;
}

export function setTheme(t: Theme): void {
  current = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(THEME_KEY, t);
}

export function toggleTheme(): Theme {
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function initTheme(): void {
  setTheme(current);
}
