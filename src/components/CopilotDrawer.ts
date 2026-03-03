import { h, escapeHtml } from '@/utils/dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { chatCompletion, ANALYST_SYSTEM_PROMPT } from '@/services/groq';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = 20;

export class CopilotDrawer {
  private el: HTMLElement;
  private messageList: HTMLElement;
  private input: HTMLInputElement;
  private form: HTMLFormElement;
  private messages: Message[] = [];
  private getMarketContext: () => string;
  private isThinking = false;

  constructor(container: HTMLElement, getMarketContext: () => string) {
    this.getMarketContext = getMarketContext;

    // Header
    const drawerHeader = h('div', { className: 'copilot-header' },
      h('span', null, 'AI Copilot'),
      (() => {
        const btn = h('button', { className: 'copilot-close' }, '\u00D7');
        btn.addEventListener('click', () => this.close());
        return btn;
      })(),
    );

    // Message list
    this.messageList = h('div', { className: 'copilot-messages' });

    // Input form
    this.input = h('input', {
      type: 'text',
      className: 'copilot-input',
      placeholder: 'Ask about markets...',
    });

    const sendBtn = h('button', { type: 'submit', className: 'copilot-send' }, 'Send');

    this.form = h('form', { className: 'copilot-form' },
      this.input,
      sendBtn,
    ) as HTMLFormElement;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Assemble drawer
    this.el = h('div', { className: 'copilot-drawer' },
      drawerHeader,
      this.messageList,
      this.form,
    );

    container.appendChild(this.el);
  }

  open(): void {
    this.el.classList.add('open');
    this.input.focus();
  }

  close(): void {
    this.el.classList.remove('open');
  }

  toggle(): void {
    if (this.el.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  private async handleSubmit(): Promise<void> {
    const text = this.input.value.trim();
    if (!text || this.isThinking) return;

    this.input.value = '';
    this.addMessage('user', text);
    this.messages.push({ role: 'user', content: text });
    this.trimHistory();

    // Show thinking indicator
    const thinkingEl = h('div', { className: 'copilot-msg copilot-thinking' }, 'Thinking...');
    this.messageList.appendChild(thinkingEl);
    this.scrollToBottom();
    this.isThinking = true;

    try {
      const context = this.getMarketContext();
      const systemPrompt = `${ANALYST_SYSTEM_PROMPT}\n\nCurrent market snapshot:\n${context}`;

      const chatMessages = this.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await chatCompletion(chatMessages, systemPrompt);

      thinkingEl.remove();
      this.messages.push({ role: 'assistant', content: response });
      this.trimHistory();
      this.addMessage('assistant', response);
    } catch {
      thinkingEl.remove();
      this.addMessage('assistant', 'Sorry, something went wrong. Please try again.');
    } finally {
      this.isThinking = false;
    }
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    const msgEl = h('div', { className: `copilot-msg copilot-msg-${role}` });

    if (role === 'assistant') {
      const rawHtml = marked.parse(content) as string;
      msgEl.innerHTML = DOMPurify.sanitize(rawHtml);
    } else {
      msgEl.textContent = content;
    }

    this.messageList.appendChild(msgEl);
    this.scrollToBottom();
  }

  private trimHistory(): void {
    while (this.messages.length > MAX_HISTORY) {
      this.messages.shift();
    }
  }

  private scrollToBottom(): void {
    this.messageList.scrollTop = this.messageList.scrollHeight;
  }
}
