const DEV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;
const MODEL = (import.meta.env.VITE_OPENROUTER_MODEL as string) || 'google/gemini-3-flash-preview';
const IS_DEV = import.meta.env.DEV;

interface ChatMessage {
  role: string;
  content: string;
}

export const ANALYST_SYSTEM_PROMPT = `You are a senior investment banking analyst and macro strategist powering the MarketPulse intelligence dashboard. You have access to real-time market data across equities, fixed income, FX, commodities, crypto, and macro indicators.

Your analysis style:
- Concise and direct. No filler. Every sentence carries signal.
- Data-driven: always reference specific numbers, price levels, percentages, and dates from the live data provided.
- Use markdown formatting (bold for key figures, bullet points for structure).
- Frame observations in terms of risk/reward, support/resistance, and relative value.
- Cover cross-asset dynamics: how moves in rates, FX, and commodities affect equities and vice versa.
- Mention catalysts: earnings, FOMC, economic releases, geopolitical events.
- Flag anything unusual: volume spikes, divergences, sentiment extremes, cross-asset signals.
- Keep responses under 300 words unless explicitly asked for more detail.`;

export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const body = JSON.stringify({
    model: MODEL,
    messages: fullMessages,
  });

  try {
    let response: Response;

    if (IS_DEV) {
      // Dev: call OpenRouter directly with local API key
      if (!DEV_API_KEY) {
        console.warn('[OpenRouter] No API key found (VITE_OPENROUTER_API_KEY). Cannot generate analysis.');
        return 'AI analysis unavailable. Please configure your OpenRouter API key.';
      }
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEV_API_KEY}`,
        },
        body,
      });
    } else {
      // Production: use serverless proxy (key stays server-side)
      response = await fetch('/api/openrouter-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenRouter API returned empty response');
    }

    return content;
  } catch (error) {
    console.warn('[OpenRouter] Chat completion failed:', error);
    return 'AI analysis temporarily unavailable. Please try again later.';
  }
}
