/* -------------------------------------------------------------
 * BREWMIND AI - Scenario Sandbox Controller
 * ------------------------------------------------------------- */

import { simulation } from './simulation.js';
import { soundEffects } from './utils.js';

class ScenarioController {
  constructor() {
    this.container = null;
    this.chart = null;
    this.activeScenario = null;
    this.sandboxResultState = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Sandbox bindings on tab reveal.
   */
  init(containerElement) {
    if (!containerElement) return;
    this.container = containerElement;

    if (this.isInitialized) {
      this.syncCurrentMetrics();
      return;
    }

    this.isInitialized = true;
    this.bindEvents();
    this.syncCurrentMetrics();

    console.log("Scenario Sandbox active. Sandbox simulation pipeline active.");
  }

  syncCurrentMetrics() {
    const state = window.BrewMind.getState();
    const revEl = document.getElementById('sb-rev-curr');
    const qEl = document.getElementById('sb-q-curr');
    const satEl = document.getElementById('sb-sat-curr');

    if (revEl) revEl.innerText = `$${state.revenue.toFixed(2)}`;
    if (qEl) qEl.innerText = state.customers.queueLength;
    if (satEl) satEl.innerText = `${state.customerSatisfaction}%`;
  }

  bindEvents() {
    // Packaged cards selection
    const cards = this.container.querySelectorAll('.scenario-select-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const scenario = card.getAttribute('data-scenario');
        cards.forEach(c => c.style.borderColor = 'var(--glass-border)');
        card.style.borderColor = 'var(--color-primary)';
        
        soundEffects.playClick();
        this.runSandboxScenario(scenario);
      });
    });

    // Custom Builder form submit
    const customForm = document.getElementById('custom-scenario-form');
    if (customForm) {
      customForm.addEventListener('submit', (e) => {
        e.preventDefault();
        soundEffects.playClick();
        this.runCustomSandbox();
      });
    }

    // Deploy to Live Twin
    const deployBtn = document.getElementById('btn-deploy-sandbox');
    if (deployBtn) {
      deployBtn.addEventListener('click', () => {
        this.deploySandboxToLive();
      });
    }
  }

  /**
   * Run a sandboxed What-If simulation without impacting live operations.
   */
  runSandboxScenario(scenarioId) {
    this.activeScenario = scenarioId;
    let mods = {};
    let title = '';
    let assumptions = [];

    switch (scenarioId) {
      case 'rain':
        mods = { weather: 'Rainy', tempOffset: -6 };
        title = 'Rainy Day Simulation';
        assumptions = [
          'Weather transitions immediately to Rainy (-6°C offset)',
          'Hot beverages (Espresso, Tea) demand increases 40%',
          'Cold drinks demand declines by 30%',
          'Baristas operate at normal shift speeds'
        ];
        break;
      case 'exams':
        mods = { arrivalMultiplier: 1.5, staffFatigueMultiplier: 1.2 };
        title = 'Exam Week Rush Sandbox';
        assumptions = [
          'Arrival rates multiply by x1.5 (heavy library foot traffic)',
          'Baristas experience 20% higher stress scaling coefficients',
          'Inventory usage scales proportionally with orders volume'
        ];
        break;
      case 'festival':
        mods = { arrivalMultiplier: 2.0, orderBudgetMultiplier: 1.3 };
        title = 'Campus Festival Overload';
        assumptions = [
          'Double baseline student arrival rates (x2.0 factor)',
          'Student order budgets increase by 30% (parents visiting)',
          'Equipment maintenance warnings disabled during festival'
        ];
        break;
      case 'outage':
        mods = { forceMachineFailure: true };
        title = 'Outage Sandbox';
        assumptions = [
          'Espresso Machine A and B offline immediately',
          'Preparing orders halt. Students wait in line until cancel limit',
          'Cafe reputation declines due to long outages'
        ];
        break;
      case 'barista':
        mods = { addTempBarista: true };
        title = 'Temporary Staff Expansion';
        assumptions = [
          'Spawns a dynamically named Senior Barista helper',
          'Hiring cost deduction applied on sandbox balance sheet',
          'Total prep time declines due to parallel baristas lines'
        ];
        break;
    }

    this.executeSandboxRun(title, mods, assumptions);
  }

  runCustomSandbox() {
    this.activeScenario = 'custom';
    const arrival = parseFloat(document.getElementById('custom-arrival-factor').value) || 1.0;
    const price = parseFloat(document.getElementById('custom-price-adj').value) || 0.0;
    const delay = parseInt(document.getElementById('custom-supply-delay').value, 10) || 0;

    const mods = {
      arrivalMultiplier: arrival,
      lattePriceOffset: price,
      supplyDelay: delay
    };

    const assumptions = [
      `Arrival rates factor set to x${arrival}`,
      `Beverage items average pricing offset: $${price.toFixed(2)}`,
      `Inventory supply delivery delay: ${delay} simulated minutes`
    ];

    this.executeSandboxRun('Custom Modifier Model', mods, assumptions);
  }

  /**
   * Ticks a cloned copy of the state forward to predict outcomes.
   */
  executeSandboxRun(title, modifications, assumptions) {
    // Show loading pipeline states
    document.getElementById('sandbox-prompt-box').style.display = 'none';
    const compGrid = document.getElementById('sandbox-comparison-grid');
    const chartCont = document.getElementById('sandbox-charts-container');
    const footerCont = document.getElementById('sandbox-footer-controls');
    const assumCont = document.getElementById('sandbox-assumptions-container');

    compGrid.style.display = 'none';
    chartCont.style.display = 'none';
    footerCont.style.display = 'none';
    assumCont.style.display = 'none';

    // Spawn a temporary thinking banner inside prompt box
    const loadingBanner = document.createElement('div');
    loadingBanner.id = 'sandbox-loading';
    loadingBanner.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:0.5rem;">
        <div style="width:24px; height:24px; border:2px solid var(--color-primary); border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
        <div style="font-size:0.75rem; color:var(--text-secondary);" id="sandbox-loading-status">Cloning Twin State...</div>
      </div>
    `;
    document.getElementById('sandbox-prompt-box').parentNode.appendChild(loadingBanner);

    const stages = [
      { text: 'Cloning Live Twin State...', delay: 150 },
      { text: 'Injecting Modifier Matrices...', delay: 350 },
      { text: 'Running 240 Sandbox Ticks (4 hours)...', delay: 600 },
      { text: 'Comparing Business Metrics...', delay: 900 }
    ];

    stages.forEach(st => {
      setTimeout(() => {
        const el = document.getElementById('sandbox-loading-status');
        if (el) el.innerText = st.text;
      }, st.delay);
    });

    setTimeout(() => {
      // Clean loader
      if (loadingBanner) loadingBanner.remove();

      // Execute cloned run
      this.sandboxResultState = simulation.runWhatIfSimulation(240, modifications);

      // Display results
      document.getElementById('sandbox-title-display').innerText = title;
      
      // Update assumptions
      const assumList = document.getElementById('sandbox-assumptions-list');
      assumList.innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
      assumCont.style.display = 'block';

      // Compare metrics
      const current = window.BrewMind.getState();
      const pred = this.sandboxResultState;

      const revCurr = current.revenue;
      const revPred = pred.revenue;
      const revPct = revCurr > 0 ? ((revPred - revCurr) / revCurr) * 100 : 0;

      const qCurr = current.customers.queueLength;
      const qPred = pred.customers.queueLength;

      const satCurr = current.customerSatisfaction;
      const satPred = pred.customerSatisfaction;

      // Fill HTML values
      document.getElementById('sb-rev-curr').innerText = `$${revCurr.toFixed(2)}`;
      document.getElementById('sb-rev-pred').innerText = `$${revPred.toFixed(2)}`;
      
      const revDiffEl = document.getElementById('sb-rev-diff');
      revDiffEl.innerText = `${revPct >= 0 ? '+' : ''}${revPct.toFixed(1)}%`;
      revDiffEl.style.color = revPct >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

      document.getElementById('sb-q-curr').innerText = qCurr;
      document.getElementById('sb-q-pred').innerText = qPred;
      
      const qDiffEl = document.getElementById('sb-q-diff');
      const qDiffVal = qPred - qCurr;
      qDiffEl.innerText = `${qDiffVal >= 0 ? '+' : ''}${qDiffVal}`;
      qDiffEl.style.color = qDiffVal <= 0 ? 'var(--color-success)' : 'var(--color-danger)';

      document.getElementById('sb-sat-curr').innerText = `${satCurr}%`;
      document.getElementById('sb-sat-pred').innerText = `${satPred}%`;
      
      const satDiffEl = document.getElementById('sb-sat-diff');
      const satDiffVal = satPred - satCurr;
      satDiffEl.innerText = `${satDiffVal >= 0 ? '+' : ''}${satDiffVal}%`;
      satDiffEl.style.color = satDiffVal >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

      // Calculate confidence and ROI
      const confEngine = this.calculateConfidence(current, modifications);
      const confEl = document.getElementById('sb-confidence-val');
      confEl.innerText = `${confEngine.level} (${confEngine.pct}%)`;
      confEl.style.color = confEngine.level === 'HIGH' ? 'var(--color-success)' : (confEngine.level === 'MEDIUM' ? 'var(--color-warning)' : 'var(--color-danger)');

      const roiValEl = document.getElementById('sb-roi-val');
      if (modifications.addTempBarista) {
        roiValEl.innerText = '147%';
      } else if (modifications.arrivalMultiplier && modifications.arrivalMultiplier > 1.2) {
        roiValEl.innerText = '188%';
      } else if (modifications.lattePriceOffset && modifications.lattePriceOffset > 0) {
        roiValEl.innerText = '120%';
      } else {
        roiValEl.innerText = 'N/A';
      }

      // Display charts comparison
      compGrid.style.display = 'grid';
      chartCont.style.display = 'block';
      footerCont.style.display = 'flex';

      this.renderComparisonChart(current, pred);
    }, 1100);
  }

  calculateConfidence(state, mods) {
    let pct = 95;
    // Lower confidence if no historical data or high complexity modifiers
    if (mods.forceMachineFailure) pct -= 35; // Chaotic scenario
    if (mods.supplyDelay && mods.supplyDelay > 30) pct -= 15;
    if (state.clock.hours < 9) pct -= 8; // Early morning has less historical metrics
    
    let level = 'HIGH';
    if (pct < 65) level = 'LOW';
    else if (pct < 85) level = 'MEDIUM';

    return { level, pct };
  }

  renderComparisonChart(current, predicted) {
    const ctx = document.getElementById('chart-sandbox-comparison');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    // Build timeline indicators
    const currentHour = current.clock.hours;
    const labels = [];
    const baselineData = [];
    const predData = [];

    let tempRevBaseline = current.revenue;
    let tempRevPred = current.revenue;

    const hourlyRateCurr = current.revenue / (currentHour - 7 + 0.1);
    const hourlyRatePred = hourlyRateCurr * (modsArrivalFactor(this.activeScenario));

    for (let i = 0; i <= 4; i++) {
      const hr = (currentHour + i) % 24;
      labels.push(`${hr.toString().padStart(2, '0')}:00`);
      
      baselineData.push(parseFloat(tempRevBaseline.toFixed(2)));
      predData.push(parseFloat(tempRevPred.toFixed(2)));

      tempRevBaseline += Math.max(15, hourlyRateCurr * 0.8);
      tempRevPred += Math.max(15, hourlyRatePred * (this.activeScenario === 'outage' ? 0.05 : 1.15));
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Live Baseline ($)',
            data: baselineData,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderDash: [5, 5],
            fill: false,
            tension: 0.2
          },
          {
            label: 'Projected Sandbox Path ($)',
            data: predData,
            borderColor: 'var(--color-primary)',
            backgroundColor: 'rgba(212, 163, 115, 0.08)',
            fill: true,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { size: 9 } }
          }
        }
      }
    });
  }

  deploySandboxToLive() {
    if (!this.sandboxResultState) return;

    soundEffects.playAlert();
    
    // Safety check Warning modal before deployment
    const confirmation = confirm("⚠️ DEMO MODE SAFETY WARNING:\n\nDeploying this Sandbox will permanently inject these scenario parameters (pricing changes, barista shifts, outages) into the Live Cafe twin. This will modify active operations.\n\nAre you sure you want to deploy to the Live Twin?");
    
    if (confirmation) {
      const state = window.BrewMind.getState();
      
      // Apply sandbox parameters (weather, baristas, machine health)
      state.revenue = this.sandboxResultState.revenue;
      state.orders = this.sandboxResultState.orders;
      state.inventory = this.sandboxResultState.inventory;
      state.customerSatisfaction = this.sandboxResultState.customerSatisfaction;
      state.cafeReputation = this.sandboxResultState.cafeReputation;
      state.machineHealth = this.sandboxResultState.machineHealth;

      // Copy weather if rain scenario
      if (this.activeScenario === 'rain') {
        state.weather.condition = 'Rainy';
        state.weather.temp = 12;
      }
      
      // Copy activeScenario trigger
      if (this.activeScenario === 'exams') {
        state.demo.activeScenario = 'Exam Week';
        state.campusActivity = 'Exam Week';
      } else if (this.activeScenario === 'festival') {
        state.demo.activeScenario = 'Festival';
        state.campusActivity = 'Festival';
      } else if (this.activeScenario === 'outage') {
        state.demo.activeScenario = 'Power Outage';
      }

      // Copy dynamic temporary baristas if hired
      if (this.activeScenario === 'barista') {
        // Spawn temporary barista dynamic details
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
            title: 'Temporary Staff Hired',
            message: `Spawned temporary barista ${tempName} (${tempSkill} skill) to live service line.`,
            type: 'success'
          }
        }));
      }

      window.BrewMind.setState(state);
      soundEffects.playSuccess();

      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Sandbox Sandbox Deployed',
          message: 'All sandbox predicted parameters have been written to live twin state.',
          type: 'success'
        }
      }));
    }
  }
}

function modsArrivalFactor(scenario) {
  if (scenario === 'exams') return 1.4;
  if (scenario === 'festival') return 1.95;
  if (scenario === 'rain') return 0.85;
  if (scenario === 'outage') return 0.2;
  return 1.0;
}

export const sandboxController = new ScenarioController();
