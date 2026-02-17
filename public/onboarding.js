// ═══ ONBOARDING — First-Time User Experience ═══

const Onboarding = {
  steps: [
    {
      title: '🌍 Welcome to Echo Worlds!',
      text: 'You just entered a living pixel world. Walk around, meet people, and explore rooms.',
      highlight: null,
    },
    {
      title: '🚶 Movement',
      text: 'Use WASD or Arrow Keys to walk around. Click rooms in the sidebar to teleport.',
      highlight: '#room-list',
    },
    {
      title: '💬 Chat',
      text: 'Type in the chat bar to talk. Messages sync with Discord — your community sees everything.',
      highlight: '#chat-input-wrap',
    },
    {
      title: '😊 Express Yourself',
      text: 'Click the emote button (or press E) to react. Your avatar shows it to everyone nearby.',
      highlight: '#action-bar',
    },
    {
      title: '🎨 Your Skin',
      text: 'Visit the Marketplace to buy custom skins. Creators earn 70% of every sale.',
      highlight: null,
    },
    {
      title: '🔬 The Lab',
      text: 'Play research games that help cure neurodegenerative diseases. Your playtime has meaning.',
      highlight: null,
    },
    {
      title: "🚀 You're Ready!",
      text: 'Go explore. Walk up to people — proximity voice means you hear whoever is nearby. Have fun!',
      highlight: null,
    },
  ],

  currentStep: 0,
  overlay: null,

  shouldShow() {
    return !localStorage.getItem('echoWorlds_onboarded');
  },

  start() {
    if (!this.shouldShow()) return;
    this.currentStep = 0;
    this._createOverlay();
    this._renderStep();
  },

  _createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'onboarding-overlay';
    this.overlay.innerHTML = `
      <style>
        #onboarding-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Courier New', monospace;
        }
        #onb-card {
          background: #12121e; border: 2px solid #00fff744;
          border-radius: 16px; padding: 32px; max-width: 420px; width: 90%;
          text-align: center; position: relative;
          box-shadow: 0 0 40px rgba(0,255,247,0.1);
        }
        #onb-card h2 { color: #00fff7; font-size: 1.3rem; margin-bottom: 12px; }
        #onb-card p { color: #ccc; font-size: 0.9rem; line-height: 1.6; margin-bottom: 24px; }
        #onb-dots { margin-bottom: 16px; }
        #onb-dots span {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          background: #333; margin: 0 4px; transition: all 0.3s;
        }
        #onb-dots span.active { background: #00fff7; box-shadow: 0 0 8px #00fff7; }
        #onb-next {
          background: linear-gradient(135deg, #00fff7, #0088ff); color: #0a0a14;
          border: none; padding: 10px 32px; border-radius: 50px; cursor: pointer;
          font-weight: bold; font-size: 0.95rem; font-family: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        #onb-next:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,255,247,0.3); }
        #onb-skip {
          position: absolute; top: 12px; right: 16px; background: none;
          border: none; color: #666; cursor: pointer; font-size: 0.8rem;
          font-family: inherit;
        }
        #onb-skip:hover { color: #aaa; }
        .onb-highlight {
          position: relative; z-index: 1001 !important;
          box-shadow: 0 0 0 4px #00fff744, 0 0 20px rgba(0,255,247,0.3) !important;
          border-radius: 8px;
        }
      </style>
      <div id="onb-card">
        <button id="onb-skip">Skip</button>
        <h2 id="onb-title"></h2>
        <p id="onb-text"></p>
        <div id="onb-dots"></div>
        <button id="onb-next">Next →</button>
      </div>
    `;
    document.body.appendChild(this.overlay);

    document.getElementById('onb-next').onclick = () => this.next();
    document.getElementById('onb-skip').onclick = () => this.finish();

    // Keyboard support
    document.addEventListener('keydown', this._keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') this.next();
      if (e.key === 'Escape') this.finish();
    });
  },

  _renderStep() {
    const step = this.steps[this.currentStep];
    document.getElementById('onb-title').textContent = step.title;
    document.getElementById('onb-text').textContent = step.text;

    // Dots
    const dots = this.steps.map((_, i) =>
      `<span class="${i === this.currentStep ? 'active' : ''}"></span>`
    ).join('');
    document.getElementById('onb-dots').innerHTML = dots;

    // Button text
    const btn = document.getElementById('onb-next');
    btn.textContent = this.currentStep === this.steps.length - 1 ? "Let's Go! 🚀" : 'Next →';

    // Highlight
    document.querySelectorAll('.onb-highlight').forEach(el => el.classList.remove('onb-highlight'));
    if (step.highlight) {
      const el = document.querySelector(step.highlight);
      if (el) el.classList.add('onb-highlight');
    }
  },

  next() {
    this.currentStep++;
    if (this.currentStep >= this.steps.length) {
      this.finish();
    } else {
      this._renderStep();
    }
  },

  finish() {
    localStorage.setItem('echoWorlds_onboarded', '1');
    document.querySelectorAll('.onb-highlight').forEach(el => el.classList.remove('onb-highlight'));
    if (this.overlay) this.overlay.remove();
    document.removeEventListener('keydown', this._keyHandler);
  },
};

// Auto-start after world loads
if (typeof window !== 'undefined') {
  window.Onboarding = Onboarding;
}
