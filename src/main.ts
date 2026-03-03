import 'maplibre-gl/dist/maplibre-gl.css';
import '@/styles/main.css';
import { App } from './App';
import { initTooltips } from '@/utils/tooltip';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

initTooltips();

const app = new App(root);
app.init().catch(console.error);
