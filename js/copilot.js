/* -------------------------------------------------------------
 * BREWMIND AI - AI Operations Copilot Drawer
 * ------------------------------------------------------------- */

import { memory } from './memory.js';
import { soundEffects } from './utils.js';
import { simulation } from './simulation.js';

class AICopilot {
  constructor() {
    this.drawer = null;
    this.chatHistoryContainer = null;
    this.userInputField = null;
    this.voiceBtn = null;
    this.sendBtn = null;
    this.isDrawerOpen = false;
    this.isListening = false;
    this.recognition = null;
    this.detectedLocalModel = null;
  }

  /**
   * Initializes drawer elements and listeners.
   */
  init() {
    this.drawer = document.getElementById('copilot-drawer');
    this.chatHistoryContainer = document.getElementById('copilot-chat-history');
    this.userInputField = document.getElementById('copilot-user-input');
    this.voiceBtn = document.getElementById('btn-copilot-voice');
    this.sendBtn = document.getElementById('btn-copilot-send');

    if (!this.drawer) return;

    this.bindEvents();
    this.setupSpeechRecognition();
    this.setupCardDelegation();
    this.checkLocalAIStatus();
    
    // Check local AI status periodically
    setInterval(() => this.checkLocalAIStatus(), 10000);

    // Global Cmd+K / Ctrl+K listener to toggle command center drawer
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        soundEffects.playClick();
        this.toggleDrawer();
        if (this.isDrawerOpen && this.userInputField) {
          setTimeout(() => this.userInputField.focus(), 300);
        }
      }
    });
    
    console.log("AI Operations Copilot Drawer active. Command Center keyboard shortcut listener registered.");
  }

  /**
   * Setup UI click hooks and keystroke handlers.
   */
  bindEvents() {
    // Floating button toggle
    const floatBtn = document.getElementById('float-copilot-trigger');
    if (floatBtn) {
      floatBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.toggleDrawer();
      });
    }

    // Close button click
    const closeBtn = document.getElementById('copilot-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.closeDrawer();
      });
    }

    // Send button click
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => {
        this.handleUserSend();
      });
    }

    // Input Enter key click
    if (this.userInputField) {
      this.userInputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleUserSend();
        }
      });
    }

    // Mic click
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => {
        this.toggleVoiceRecording();
      });
    }
  }

  /**
   * Slides the drawer in or out.
   */
  toggleDrawer() {
    this.isDrawerOpen ? this.closeDrawer() : this.openDrawer();
  }

  openDrawer() {
    if (!this.drawer) return;
    this.isDrawerOpen = true;
    this.drawer.classList.add('open');
    
    // Spring pop-in staggered animations for drawer controls
    gsap.fromTo(this.drawer.querySelectorAll('.drawer-header, .drawer-footer, #copilot-chat-history'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }
    );

    // Stagger all previous chat bubbles in history container
    const bubbles = this.chatHistoryContainer?.querySelectorAll('.chat-bubble');
    if (bubbles && bubbles.length > 0) {
      gsap.fromTo(bubbles,
        { opacity: 0, x: 30, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, stagger: 0.05, ease: 'back.out(1.4)', delay: 0.15 }
      );
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.isDrawerOpen = false;
    this.drawer.classList.remove('open');
  }

  /**
   * Process user input string and display bubble.
   */
  handleUserSend() {
    if (!this.userInputField) return;
    const text = this.userInputField.value.trim();
    if (!text) return;

    soundEffects.playClick();
    this.addChatBubble('user', text);
    this.userInputField.value = '';

    // Cache message in memory module
    memory.saveChatMessage('user', text);

    // AI streaming text animation simulation for M1
    this.simulateAssistantResponse(text);
  }

  /**
   * Append a chat bubble elements inside scroll container.
   * @param {string} sender 'user' | 'assistant'
   * @param {string} text 
   */
  addChatBubble(sender, text) {
    if (!this.chatHistoryContainer) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    
    if (sender === 'assistant') {
      bubble.innerHTML = this.renderMarkdown(text);
      
      // Inject interactive recommendation card if keywords match
      const lower = text.toLowerCase();
      if (lower.includes('barista') || lower.includes('staff') || lower.includes('hire')) {
        bubble.appendChild(this.createRecommendationDOM({
          action: 'hire_barista',
          title: 'Hired Temporary Barista Support',
          observation: 'Queue length exceeded critical thresholds during class break periods.',
          reasoning: 'Spawning intermediate staff helper partitions the register queuing load and speeds up drink preparation lines.',
          assumptions: 'Arrival rates remain stable; Equipment operations are uninterrupted; Inventory capacity is sufficient.',
          confidencePct: 94,
          cost: '₹850',
          benefit: 'Average queue wait time decreases by 31%',
          roi: '147%',
          timeToImpact: 'Immediate'
        }));
      } else if (lower.includes('calibrate') || lower.includes('machine') || lower.includes('maintenance')) {
        bubble.appendChild(this.createRecommendationDOM({
          action: 'calibrate_machines',
          title: 'Calibrate Espresso Systems',
          observation: 'Espresso boiler heat pressure variance exceeds 15% tolerance limits.',
          reasoning: 'Calibrating thermal regulators calibrates extraction pressures, completely preventing thermal outages.',
          assumptions: 'No electrical grid outages occur; calibration spare parts are available.',
          confidencePct: 88,
          cost: '₹350',
          benefit: 'Espresso machine health restored to 100%',
          roi: '210%',
          timeToImpact: '15 simulated minutes'
        }));
      } else if (lower.includes('restock') || lower.includes('beans') || lower.includes('milk')) {
        bubble.appendChild(this.createRecommendationDOM({
          action: 'restock_inventory',
          title: 'Emergency Ingredients Replenishment',
          observation: 'Active inventory stocks for dairy or espresso beans dropped below 30%.',
          reasoning: 'Replenishing beans and milk reserves immediately prevents stockout cancels during campus hours.',
          assumptions: 'Local campus supply courier schedules remain normal.',
          confidencePct: 96,
          cost: '₹500',
          benefit: 'Ingredients stock levels restored to 100% capacity',
          roi: '320%',
          timeToImpact: 'Immediate'
        }));
      }

      // Voice synthesises
      if (memory.preferences.voiceEnabled) {
        this.speakResponse(text);
      }
    } else {
      bubble.innerText = text;
    }
    
    this.chatHistoryContainer.appendChild(bubble);
    this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;

    // Apply quick GSAP bubble pop-in
    gsap.from(bubble, {
      opacity: 0,
      scale: 0.95,
      y: 10,
      duration: 0.3,
      ease: 'back.out(1.7)'
    });
  }

  /**
   * Helper: Generate a structured recommendation DOM card.
   */
  createRecommendationDOM(data) {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.setAttribute('data-action', data.action);
    card.style.cssText = 'background: rgba(212,163,115,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;';
    
    let confLvl = 'HIGH';
    if (data.confidencePct < 75) confLvl = 'LOW';
    else if (data.confidencePct < 90) confLvl = 'MEDIUM';
    
    let confColor = confLvl === 'HIGH' ? 'var(--color-success)' : (confLvl === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-danger)');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom:1px solid rgba(255,255,255,0.03); padding-bottom:0.4rem;">
        <span class="btn-badge" style="background: var(--color-primary); color: #000; font-size: 0.62rem; font-weight: 700; border-radius: 4px; padding: 0.1rem 0.35rem; transform: none; position: static;">RECOMMENDATION</span>
        <span style="font-size: 0.68rem; color: var(--text-secondary);">Confidence: <strong style="color: ${confColor};">${confLvl} (${data.confidencePct}%)</strong></span>
      </div>
      
      <h4 style="font-size: 0.8rem; font-weight: 700; color: #FFF; margin: 0;">${data.title}</h4>
      
      <div style="font-size: 0.72rem; color: var(--text-secondary); line-height:1.35;">
        <strong>Observation:</strong> ${data.observation}
      </div>

      <!-- Expandable Reasoning -->
      <div class="why-expand-container" style="display: none; font-size: 0.7rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 0.5rem; margin-top: 0.25rem; line-height: 1.4;">
        <div style="margin-bottom: 0.25rem;"><strong>Reasoning:</strong> ${data.reasoning}</div>
        <div style="margin-bottom: 0.25rem;"><strong>Assumptions:</strong> ${data.assumptions}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; background:rgba(0,0,0,0.1); padding:0.4rem; border-radius:6px; margin-top:0.3rem;">
          <div>Cost: <strong style="color:#FFF;">${data.cost}</strong></div>
          <div>Expected ROI: <strong style="color:var(--color-primary);">${data.roi}</strong></div>
          <div>Benefit: <strong style="color:#FFF;">${data.benefit}</strong></div>
          <div>Time to Impact: <strong style="color:#FFF;">${data.timeToImpact}</strong></div>
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.6rem; margin-top: 0.25rem; flex-wrap: wrap;">
        <button class="btn-secondary btn-why" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Why?</button>
        <div style="display: flex; gap: 0.3rem;">
          <button class="btn-secondary btn-save" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Save</button>
          <button class="btn-secondary btn-reject" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem; background: rgba(239, 68, 68, 0.03); border-color: rgba(239, 68, 68, 0.1); color: var(--color-danger);">Reject</button>
          <button class="btn-primary btn-apply" type="button" style="height: 24px; padding: 0 0.5rem; font-size: 0.65rem;">Apply</button>
        </div>
      </div>
    `;

    return card;
  }

  /**
   * Setup card action button listeners.
   */
  setupCardDelegation() {
    if (!this.chatHistoryContainer) return;
    
    this.chatHistoryContainer.addEventListener('click', (e) => {
      const target = e.target;
      
      // Why? toggle
      if (target.classList.contains('btn-why')) {
        soundEffects.playClick();
        const card = target.closest('.recommendation-card');
        const expander = card.querySelector('.why-expand-container');
        if (expander) {
          expander.style.display = expander.style.display === 'none' ? 'block' : 'none';
        }
      }
      
      // Save
      if (target.classList.contains('btn-save')) {
        soundEffects.playSuccess();
        const card = target.closest('.recommendation-card');
        const title = card.querySelector('h4').innerText;
        
        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'saved');
        
        window.dispatchEvent(new CustomEvent('brewmind:toast', {
          detail: {
            title: 'Recommendation Saved',
            message: 'Bookmarked for operational audits.',
            type: 'info'
          }
        }));
      }

      // Reject
      if (target.classList.contains('btn-reject')) {
        soundEffects.playClick();
        const card = target.closest('.recommendation-card');
        const title = card.querySelector('h4').innerText;
        
        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'rejected');
        card.style.opacity = 0.5;
        target.disabled = true;
      }

      // Apply
      if (target.classList.contains('btn-apply')) {
        soundEffects.playSuccess();
        const card = target.closest('.recommendation-card');
        const action = card.getAttribute('data-action');
        const title = card.querySelector('h4').innerText;

        memory.logRecommendation('rec_' + Date.now(), { title, recommendation: title }, 'accepted');
        
        // Execute state changes
        const state = window.BrewMind.getState();
        if (action === 'hire_barista') {
          // Spawn temp barista details
          const tempName = ['Jordan', 'Taylor', 'Sam', 'Casey'][Math.floor(Math.random() * 4)];
          const skills = ['Junior', 'Intermediate', 'Senior'];
          const tempSkill = skills[Math.floor(Math.random() * skills.length)];
          let efficiency = 1.0;
          if (tempSkill === 'Junior') efficiency = 0.8;
          if (tempSkill === 'Senior') efficiency = 1.35;

          state.staff.list.push({
            name: tempName,
            busy: false,
            efficiency: efficiency,
            skill: tempSkill,
            ordersServed: 0,
            currentOrder: null
          });
          
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Staff Hired',
              message: `Spawned temporary barista ${tempName} (${tempSkill} skill) to live service line.`,
              type: 'success'
            }
          }));
        } else if (action === 'calibrate_machines') {
          state.machineHealth = 100;
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Calibration Succeeded',
              message: 'Espresso pressure and boiler temperature restored to 100%.',
              type: 'success'
            }
          }));
        } else if (action === 'restock_inventory') {
          state.inventory.coffeeBeans.current = state.inventory.coffeeBeans.max;
          state.inventory.milk.current = state.inventory.milk.max;
          state.inventory.cups.current = state.inventory.cups.max;
          window.dispatchEvent(new CustomEvent('brewmind:toast', {
            detail: {
              title: 'Stock Replenished',
              message: 'Depleted storage containers refilled to maximum capacity.',
              type: 'success'
            }
          }));
        }

        window.BrewMind.setState(state);
        card.style.borderColor = 'var(--color-success)';
        target.disabled = true;
      }
    });
  }

  /**
   * Speak response aloud if voice feedback is enabled.
   */
  speakResponse(text) {
    if (!window.speechSynthesis || !memory.preferences.soundEnabled) return;
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[\*#_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Test local AI connection and update badge console telemetry.
   */
  async checkLocalAIStatus() {
    const { aiProvider, aiEndpoint } = memory.profile;
    const badgeEl = document.getElementById('local-ai-connection-status');
    if (!badgeEl) return;

    if (aiProvider !== 'lm-studio' && aiProvider !== 'ollama') {
      badgeEl.innerHTML = `🟢 Provider Connected<br/>Endpoint: Cloud API`;
      return;
    }

    let testUrl = aiProvider === 'lm-studio' 
      ? `${aiEndpoint || 'http://127.0.0.1:1234'}/v1/models`
      : `${aiEndpoint || 'http://127.0.0.1:11434'}/api/tags`;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - start);
      if (response.ok) {
        const data = await response.json();
        let model = 'Unknown';
        if (aiProvider === 'lm-studio') {
          model = data.data?.[0]?.id || 'LM Studio Loaded Model';
        } else {
          model = data.models?.[0]?.name || 'Ollama Default';
        }
        
        badgeEl.innerHTML = `
          <strong style="color:var(--color-success);">🟢 Local AI Connected</strong><br/>
          Provider: ${aiProvider === 'lm-studio' ? 'LM Studio' : 'Ollama'}<br/>
          Model: ${model}<br/>
          Latency: ${latency}ms<br/>
          Status: Ready for Demo
        `;
      } else {
        badgeEl.innerText = `🔴 Local AI Offline (Local reasoning fallback active)`;
      }
    } catch(err) {
      badgeEl.innerText = `🔴 Local AI Offline (Local reasoning fallback active)`;
    }
  }

  /**
   * Simple markdown to HTML converter for chat bubbles.
   */
  renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<span style="display: block; padding-left: 0.8rem;">• $1</span>')
      .replace(/^\d+\. (.+)$/gm, '<span style="display: block; padding-left: 0.8rem;">$&</span>')
      .replace(/\n/g, '<br>');
  }

  /**
   * AI response handler with progressive reasoning stages.
   */
  async simulateAssistantResponse(userPrompt) {
    // Intercept direct geonav / action voice commands
    if (this.checkVoiceAndDirectCommands(userPrompt)) {
      return;
    }

    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble assistant typing-dots';
    typingBubble.innerHTML = `<span style="opacity: 0.6;" id="thinking-stage-display">Observing Current Operations...</span>`;
    this.chatHistoryContainer.appendChild(typingBubble);
    this.chatHistoryContainer.scrollTop = this.chatHistoryContainer.scrollHeight;

    const stages = [
      { text: 'Reviewing Historical Trends...', delay: 350 },
      { text: 'Running Predictive Simulation...', delay: 700 },
      { text: 'Comparing Business Outcomes...', delay: 1050 },
      { text: 'Preparing Recommendation...', delay: 1400 }
    ];

    stages.forEach(st => {
      setTimeout(() => {
        const el = document.getElementById('thinking-stage-display');
        if (el) el.innerText = st.text;
      }, st.delay);
    });

    setTimeout(async () => {
      try {
        const reply = await this.fetchAIResponse(userPrompt);
        typingBubble.remove();
        this.addChatBubble('assistant', reply);
        memory.saveChatMessage('assistant', reply);
      } catch (e) {
        console.warn("AI fetch failed, falling back to local reasoning engine:", e);
        typingBubble.remove();

        const errMsg = e.message || 'Connection failed';
        const errorNote = document.createElement('div');
        errorNote.style.cssText = 'font-size: 0.65rem; color: var(--text-muted); text-align: center; padding: 0.25rem; opacity: 0.7;';
        errorNote.textContent = `⚠ ${errMsg} — Local analysis fallback`;
        this.chatHistoryContainer.appendChild(errorNote);

        await new Promise(r => setTimeout(r, 300));

        const reply = this.generateLocalRuleResponse(userPrompt);
        this.addChatBubble('assistant', reply);
        memory.saveChatMessage('assistant', reply);
      }
    }, 1650);
  }

  /**
   * Intercept special speech / typed shortcuts to trigger view redirections or simulator dispatches.
   */
  checkVoiceAndDirectCommands(text) {
    const p = text.toLowerCase().trim();
    if (p.includes('run rain simulation') || p.includes('rain scenario') || p.includes('simulate rain')) {
      this.closeDrawer();
      const navScenarios = document.getElementById('nav-scenarios');
      if (navScenarios) {
        navScenarios.click();
        setTimeout(() => {
          const rainCard = document.querySelector('.scenario-select-card[data-scenario="rain"]');
          if (rainCard) rainCard.click();
        }, 500);
      }
      return true;
    }
    
    if (p.includes('prepare for lunch rush') || p.includes('spawn rush')) {
      simulation.spawnRush();
      this.closeDrawer();
      return true;
    }
    
    if (p.includes('generate today\'s report') || p.includes('generate report')) {
      const expBtn = document.getElementById('btn-analytics-export');
      if (expBtn) expBtn.click();
      this.closeDrawer();
      return true;
    }
    
    return false;
  }

  /**
   * Unified AI Provider Abstraction Client Wrapper.
   * Supports: Gemini API, LM Studio, Ollama, OpenAI-compatible
   */
  async fetchAIResponse(userPrompt) {
    const { aiProvider, aiEndpoint, geminiKey } = memory.profile;
    const provider = aiProvider || 'gemini';
    
    // Build a live state snapshot so the AI has context
    const state = window.BrewMind.getState();
    const stateContext = `
Current Café State:
- Time: ${state.clock.hours.toString().padStart(2,'0')}:${state.clock.minutes.toString().padStart(2,'0')}
- Revenue Today: $${state.revenue.toFixed(2)}
- Orders Completed: ${state.orders.completed}
- Queue Length: ${state.customers.queueLength} students
- Average Wait Time: ${state.customers.avgWaitTime.toFixed(1)} minutes
- Customer Satisfaction: ${state.customerSatisfaction}%
- Café Reputation: ${state.cafeReputation}/100
- Machine Health: ${state.machineHealth}%
- Campus Activity: ${state.campusActivity}
- Weather: ${state.weather.condition}, ${state.weather.temp}°C
- Staff: ${state.staff.list.map(b => `${b.name} (stress: ${b.stress}%, busy: ${b.busy})`).join(', ')}
- Inventory: Coffee Beans ${state.inventory.coffeeBeans.current.toFixed(1)}kg/${state.inventory.coffeeBeans.max}kg, Milk ${state.inventory.milk.current.toFixed(1)}L/${state.inventory.milk.max}L, Cups ${state.inventory.cups.current}/${state.inventory.cups.max}
`;
    
    const systemPrompt = `You are BrewMind AI, the intelligent Campus Café Operations Copilot. You assist the café manager by analyzing the live café state below and recommending adjustments. Keep responses concise (2-4 sentences), action-oriented, and friendly. Reference staff by name: Emma (fast, lower quality), Sophia (balanced), Liam (slow, excellent quality). Use campus terminology: Class Break Rush, Faculty Guest, Students.\n\n${stateContext}`;

    if (provider === 'gemini') {
      const key = geminiKey || '';
      if (!key) {
        throw new Error("Missing Gemini API Key. Please configure it in Settings.");
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\nManager Request: ${userPrompt}\n\nProvide a short, direct response.`
            }]
          }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error(data.error?.message || "Invalid response from Gemini API.");
    } else {
      // OpenAI Compatible (LM Studio, Ollama, OpenAI)
      let baseUrl = (aiEndpoint || 'http://127.0.0.1:1234').replace(/\/+$/, '');
      
      // Normalize: strip trailing /v1, /chat/completions, etc. to get the raw base
      baseUrl = baseUrl.replace(/\/v1\/chat\/completions\/?$/, '')
                       .replace(/\/chat\/completions\/?$/, '')
                       .replace(/\/v1\/?$/, '');
      
      // Reconstruct the correct Chat Completions endpoint
      const url = `${baseUrl}/v1/chat/completions`;

      // Ollama uses port 11434 by default
      const finalUrl = (provider === 'ollama' && !baseUrl.includes('11434')) 
        ? 'http://127.0.0.1:11434/v1/chat/completions' 
        : url;

      const headers = { 'Content-Type': 'application/json' };
      if (geminiKey && provider === 'openai') {
        headers['Authorization'] = `Bearer ${geminiKey}`;
      }

      // Determine model name: check if we previously detected a local model id on startup
      let modelName = 'gpt-3.5-turbo';
      if (provider === 'lm-studio') {
        modelName = this.detectedLocalModel || 'meta-llama-3-8b-instruct';
      } else if (provider === 'ollama') {
        modelName = this.detectedLocalModel || 'llama3';
      }

      const payload = {
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
        stream: false
      };

      console.log(`[BrewMind AI Outgoing Payload - ${provider.toUpperCase()}]:`, JSON.stringify(payload, null, 2));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetch(finalUrl, {
          method: 'POST',
          headers: headers,
          signal: controller.signal,
          body: JSON.stringify(payload)
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // Distinguish connection / CORS / Timeout errors
        if (fetchErr.name === 'AbortError') {
          throw new Error(`AI request timed out after 15 seconds. Verify your ${provider === 'lm-studio' ? 'LM Studio' : 'Ollama'} server is running.`);
        }
        if (fetchErr.message && fetchErr.message.includes('Failed to fetch')) {
          throw new Error(`Connection failed. This could be a CORS issue or your local AI server at ${finalUrl} is offline.`);
        }
        throw new Error(`Connection failed: ${fetchErr.message}`);
      }

      clearTimeout(timeoutId);
      console.log(`[BrewMind AI Response Status]: ${response.status} ${response.statusText}`);

      let responseText = '';
      try {
        responseText = await response.text();
      } catch (readErr) {
        throw new Error("Unable to read response payload from server.");
      }

      console.log(`[BrewMind AI Incoming Response - ${provider.toUpperCase()}]:`, responseText);

      if (!response.ok) {
        // Detailed error reporting based on HTTP status codes
        if (response.status === 400) {
          throw new Error("Invalid request payload (400 Bad Request): Verify request parameters.");
        }
        if (response.status === 404) {
          throw new Error("Model endpoint not found (404): Verify LM Studio is hosting the API.");
        }
        if (response.status === 500) {
          throw new Error("Local AI server error (500): The server encountered an internal error.");
        }
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}. Response: ${responseText.substring(0, 100)}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error("Invalid JSON returned from local AI provider.");
      }

      if (data.choices && data.choices[0].message?.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error("Invalid OpenAI response format (missing choices content).");
    }
  }

  /**
   * Generates a state-aware response using local heuristic rules if offline.
   */
  generateLocalRuleResponse(prompt) {
    const state = window.BrewMind.getState();
    const p = prompt.toLowerCase().trim();

    // 1. Basic greetings
    if (p === 'hi' || p === 'hello' || p === 'hey' || p === 'yo' || p === 'hello copilot') {
      return `Hello! I am BrewMind, your Campus Café Operations Copilot. 

I'm currently running in **Local Heuristic Mode** (no API Key configured in Settings). 

How can I help optimize your shop today? You can ask me about:
- **Baristas & staff performance** (Emma, Liam, Sophia)
- **Inventory & stock levels**
- **Café reputation and wait times**`;
    }

    // 2. Staff performance queries
    if (p.includes('staff') || p.includes('emma') || p.includes('liam') || p.includes('sophia') || p.includes('barista')) {
      const emma = state.staff.list.find(b => b.name === 'Emma');
      const sophia = state.staff.list.find(b => b.name === 'Sophia');
      const liam = state.staff.list.find(b => b.name === 'Liam');
      return `**Barista Performance Analysis (Local Mode):**
- **Emma**: Processing speed is at 1.25x. Stress is currently **${emma ? emma.stress : 0}%**. (Emma is fast but high stress degrades quality).
- **Sophia**: Balanced speed (1.0x) and quality (1.0x). Currently stable.
- **Liam**: Excellent quality (1.3x) but slow speed (0.75x). Stress is **${liam ? liam.stress : 0}%**.

*Operational recommendation:* Keep Emma active on registers during rush breaks, but assign Liam to the Espresso bars for high-value orders and Faculty Guests.`;
    }

    // 3. Inventory queries
    if (p.includes('inventory') || p.includes('beans') || p.includes('milk') || p.includes('stock') || p.includes('exhaust') || p.includes('replenish')) {
      const beans = state.inventory.coffeeBeans.current;
      const milk = state.inventory.milk.current;
      const cups = state.inventory.cups.current;
      return `**Inventory Stock Status (Local Mode):**
- Espresso Beans: **${beans.toFixed(1)} kg** remaining.
- Dairy & Oat Milk: **${milk.toFixed(1)} L** remaining.
- Paper Cups: **${cups} pcs** remaining.

*Operational recommendation:* Replenish milk and coffee bean reserves via the **Inventory** panel before levels fall below 35% to avoid order fulfillment bottlenecks.`;
    }

    // 4. Reputation / Wait time / Queue queries
    if (p.includes('reputation') || p.includes('satisfaction') || p.includes('wait') || p.includes('queue') || p.includes('status')) {
      return `**Café Operations Audit (Local Mode):**
- Café Reputation: **${state.cafeReputation}/100** (Rolling target).
- Customer Satisfaction: **${state.customerSatisfaction}%**.
- Current Queue: **${state.customers.queueLength} students** waiting.
- Average Wait Time: **${state.customers.avgWaitTime.toFixed(1)} minutes**.

*Operational recommendation:* Monitor queue length carefully. A queue exceeding 8 students will trigger active satisfaction penalties.`;
    }

    // 5. Help / instructions queries
    if (p.includes('help') || p.includes('how') || p.includes('what') || p.includes('do')) {
      return `I am here to guide you in managing the Smart Campus Café! You can ask me to:
1. **Analyze barista performance** to rotate Emma, Sophia, and Liam.
2. **Perform an inventory check** to look up dairy and bean levels.
3. **Audit café status** to check wait times and queue lengths.

*Tip:* To enable live LLM reasoning, go to **Settings** and input your **Gemini API Key**!`;
    }

    // 6. Revenue / sales queries
    if (p.includes('revenue') || p.includes('sales') || p.includes('money') || p.includes('profit') || p.includes('earnings')) {
      const hourlyRate = state.revenue > 0 ? (state.revenue / Math.max(0.1, (state.clock.hours + state.clock.minutes / 60) - 6)).toFixed(2) : '0.00';
      return `**Revenue Report (Local Mode):**
- Total Revenue Today: **$${state.revenue.toFixed(2)}**
- Orders Completed: **${state.orders.completed}**
- Hourly Run Rate: **$${hourlyRate}/hour**
- Projected Closing: **$${(parseFloat(hourlyRate) * 12).toFixed(2)}** (based on current pace)

*Tip:* Promote premium specialty drinks and baked goods combos to boost average order value.`;
    }

    // 7. Machine / equipment queries
    if (p.includes('machine') || p.includes('espresso') || p.includes('equipment') || p.includes('maintenance')) {
      return `**Equipment Status (Local Mode):**
- Espresso Machine Health: **${state.machineHealth}%**
- ${state.machineHealth > 80 ? '✅ Machine is operating normally.' : state.machineHealth > 50 ? '⚠ Machine needs attention soon — schedule calibration.' : '🔴 Critical — machine failure risk is high. Run maintenance immediately.'}

*Recommendation:* ${state.machineHealth < 75 ? 'Run preventive calibration now to avoid thermal failure during peak hours.' : 'No immediate action needed. Monitor during rush periods.'}`;
    }

    // 8. Weather queries
    if (p.includes('weather') || p.includes('rain') || p.includes('sunny') || p.includes('temperature')) {
      return `**Weather Impact Analysis (Local Mode):**
- Current Conditions: **${state.weather.condition}, ${state.weather.temp}°C**
- ${state.weather.condition === 'Rainy' ? '☔ Rain increases hot drink demand by ~25%. Consider promoting Hot Chocolate and Chai specials.' : state.weather.condition === 'Sunny' ? '☀ Sunny weather boosts iced and cold brew orders. Feature Cold Brew and Iced Latte.' : '🌤 Moderate conditions. Standard menu mix expected.'}`;
    }

    // Generic contextual fallback
    const qLen = state.customers.queueLength;
    const sat = state.customerSatisfaction;
    return `**Quick Café Snapshot:**
- Queue: **${qLen} students** ${qLen > 5 ? '(congested ⚠)' : '(manageable ✅)'}
- Satisfaction: **${sat}%** ${sat > 80 ? '(excellent)' : sat > 60 ? '(good)' : '(needs attention)'}
- Revenue: **$${state.revenue.toFixed(2)}** across ${state.orders.completed} orders
- Machine Health: **${state.machineHealth}%**

Ask me about *staff*, *inventory*, *revenue*, *machine health*, or *weather impact* for detailed analysis!`;
  }

  /**
   * Connect browser speech API hooks.
   */
  setupSpeechRecognition() {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    this.recognition = new SpeechClass();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.voiceBtn.style.color = 'var(--color-danger)';
      this.voiceBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      if (this.userInputField) {
        this.userInputField.placeholder = "Listening to speech...";
      }
    };

    this.recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      if (this.userInputField) {
        this.userInputField.value = resultText;
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.voiceBtn.style.color = 'var(--text-secondary)';
      this.voiceBtn.style.background = 'transparent';
      if (this.userInputField) {
        this.userInputField.placeholder = "Type a message or click mic...";
      }
    };
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Speech Error',
          message: 'Voice recognition is not supported by your browser.',
          type: 'danger'
        }
      }));
      return;
    }

    soundEffects.playClick();
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
}

export const copilot = new AICopilot();
