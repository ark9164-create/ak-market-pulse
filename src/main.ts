import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/main.css';
import { App } from './App';
import { initTooltips } from '@/utils/tooltip';
import { StockDetailPage } from '@/components/StockDetailPage';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

initTooltips();

const app = new App(root);
app.init().then(() => {
  // Stock detail page — lives outside main layout, shares the header
  const stockDetailPage = new StockDetailPage(root);

  // Find the main layout element (map + panels grid)
  const mainLayout = root.querySelector('.main-layout') as HTMLElement | null;

  function handleRoute(): void {
    const hash = window.location.hash;
    const stockMatch = hash.match(/^#\/stock\/(.+)$/);
    if (stockMatch && mainLayout) {
      const symbol = decodeURIComponent(stockMatch[1]);
      mainLayout.style.display = 'none';
      stockDetailPage.show(symbol);
    } else {
      stockDetailPage.hide();
      if (mainLayout) mainLayout.style.display = '';
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // handle initial load with hash

  // Global click handler for stock symbol navigation (event delegation)
  document.addEventListener('click', (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-stock-symbol]');
    if (target) {
      e.preventDefault();
      const symbol = target.getAttribute('data-stock-symbol');
      if (symbol) window.location.hash = `#/stock/${encodeURIComponent(symbol)}`;
    }
  });
}).catch(console.error);
