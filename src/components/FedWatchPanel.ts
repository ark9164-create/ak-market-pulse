import { Panel } from './Panel';
import { escapeHtml } from '@/utils/dom';

interface FOMCMeeting {
  date: string;
  impliedRate: number;
  cutProb: number;
  holdProb: number;
  hikeProb: number;
}

const FOMC_MEETINGS: FOMCMeeting[] = [
  { date: 'Mar 18-19', impliedRate: 4.33, cutProb: 15, holdProb: 82, hikeProb: 3 },
  { date: 'May 6-7',   impliedRate: 4.18, cutProb: 42, holdProb: 55, hikeProb: 3 },
  { date: 'Jun 17-18', impliedRate: 4.08, cutProb: 55, holdProb: 42, hikeProb: 3 },
  { date: 'Jul 29-30', impliedRate: 3.95, cutProb: 58, holdProb: 38, hikeProb: 4 },
  { date: 'Sep 16-17', impliedRate: 3.83, cutProb: 62, holdProb: 34, hikeProb: 4 },
  { date: 'Nov 4-5',   impliedRate: 3.70, cutProb: 65, holdProb: 30, hikeProb: 5 },
  { date: 'Dec 16-17', impliedRate: 3.58, cutProb: 68, holdProb: 27, hikeProb: 5 },
];

const CURRENT_RATE = 4.33;

export class FedWatchPanel extends Panel {
  constructor() {
    super('fedWatch', 'Fed Watch');
    // Render static data after a short delay to allow panel to mount
    setTimeout(() => this.render(), 100);
  }

  private render(): void {
    const currentRow = `<div style="padding:6px 0;margin-bottom:4px;border-bottom:1px solid var(--border);font-size:12px">
      <span style="color:var(--text-muted)">Current Fed Funds Rate:</span>
      <span style="font-weight:700;margin-left:6px">${CURRENT_RATE.toFixed(2)}%</span>
    </div>`;

    const headerRow = `<div class="panel-row" style="display:flex;gap:4px;padding:4px 0;border-bottom:1px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:600">
      <span style="flex:0 0 75px">Meeting</span>
      <span style="flex:0 0 55px;text-align:right">Implied</span>
      <span style="flex:1;text-align:center">Probability</span>
      <span style="flex:0 0 40px;text-align:right">Cut</span>
      <span style="flex:0 0 40px;text-align:right">Hold</span>
    </div>`;

    const rows = FOMC_MEETINGS.map(m => {
      const rateChange = m.impliedRate - CURRENT_RATE;
      const rateColor = rateChange < -0.1 ? 'var(--green)' : rateChange > 0.1 ? 'var(--red)' : 'var(--text)';

      // Probability distribution bar
      const barSvg = `<svg style="width:100%;height:16px" viewBox="0 0 100 16">
        <rect x="0" y="2" width="${m.cutProb}" height="12" rx="1" fill="var(--green)" opacity="0.7" />
        <rect x="${m.cutProb}" y="2" width="${m.holdProb}" height="12" rx="0" fill="var(--text-muted)" opacity="0.3" />
        <rect x="${m.cutProb + m.holdProb}" y="2" width="${m.hikeProb}" height="12" rx="1" fill="var(--red)" opacity="0.7" />
      </svg>`;

      return `<div class="panel-row" style="display:flex;gap:4px;align-items:center;padding:3px 0;font-size:11px">
        <span style="flex:0 0 75px;font-weight:500">${escapeHtml(m.date)}</span>
        <span style="flex:0 0 55px;text-align:right;color:${rateColor};font-weight:600">${m.impliedRate.toFixed(2)}%</span>
        <span style="flex:1">${barSvg}</span>
        <span style="flex:0 0 40px;text-align:right;color:var(--green)">${m.cutProb}%</span>
        <span style="flex:0 0 40px;text-align:right;color:var(--text-muted)">${m.holdProb}%</span>
      </div>`;
    }).join('');

    const legend = `<div style="display:flex;gap:12px;padding-top:6px;margin-top:4px;border-top:1px solid var(--border);font-size:10px;color:var(--text-muted)">
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--green);opacity:0.7;margin-right:3px"></span>Cut</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--text-muted);opacity:0.3;margin-right:3px"></span>Hold</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:var(--red);opacity:0.7;margin-right:3px"></span>Hike</span>
    </div>`;

    this.setContent(currentRow + headerRow + rows + legend);
    this.setCount(FOMC_MEETINGS.length);
  }
}
