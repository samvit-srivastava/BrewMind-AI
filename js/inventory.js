/* -------------------------------------------------------------
 * BREWMIND AI - Inventory view Controller
 * ------------------------------------------------------------- */

import { DRINK_MENU } from './simulation.js';
import { soundEffects } from './utils.js';
import { memory } from './memory.js';

class InventoryController {
  constructor() {
    this.container = null;
    this.isInitialized = false;
  }

  /**
   * Binds the inventory section elements.
   * @param {HTMLElement} containerElement 
   */
  init(containerElement) {
    if (!containerElement) return;
    this.container = containerElement;
    
    if (this.isInitialized) {
      const state = window.BrewMind.getState();
      this.updateInventoryCards(state.inventory);
      this.updatePredictiveDepletion(state);
      return;
    }
    
    this.isInitialized = true;

    this.renderLayout();
    this.bindEvents();
    
    console.log("Inventory controller active.");
  }

  /**
   * Build initial grid layout for cards dynamically mapping all 14 ingredients.
   */
  renderLayout() {
    const state = window.BrewMind.getState();
    const inventory = state.inventory;

    let cardsHtml = '';
    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      const percent = Math.round((item.current / item.max) * 100);
      const restockAmt = item.max - item.current;
      const cost = restockAmt * item.price;
      
      let icon = 'package';
      if (key.includes('Beans')) icon = 'coffee';
      else if (key.includes('milk')) icon = 'milk';
      else if (key.includes('cups')) icon = 'cup-soda';
      else if (key.includes('syrups')) icon = 'droplet';
      else if (key.includes('sugar')) icon = 'candy';
      else if (key.includes('chocolate')) icon = 'ice-cream';
      else if (key.includes('tea')) icon = 'leaf';
      else if (key.includes('bread') || key.includes('muffin') || key.includes('brownie')) icon = 'croissant';
      else if (key.includes('water')) icon = 'water';
      else if (key.includes('napkin') || key.includes('wrapper')) icon = 'scroll';

      cardsHtml += `
        <div class="card-kpi" id="inv-card-${key}" style="padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="kpi-header" style="margin-bottom: 0.4rem;">
              <span class="kpi-title" style="font-size: 0.72rem; letter-spacing: 0.02em;">${item.name.split(' (')[0]}</span>
              <div class="kpi-icon-wrapper" style="width: 28px; height: 28px; border-radius: 6px; background: rgba(212,163,115,0.08);"><i data-lucide="${icon}" style="width: 13px; height: 13px;"></i></div>
            </div>
            <div class="kpi-value" id="inv-val-${key}" style="font-size: 1.3rem; margin-bottom: 0.2rem;">${item.current.toFixed(1)} ${item.name.includes('pcs') ? 'pcs' : (item.name.includes('kg') ? 'kg' : 'L')}</div>
            
            <div style="margin-top: 0.4rem; margin-bottom: 0.6rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 0.2rem;">
                <span>Stock level</span>
                <span id="inv-percent-${key}">${percent}%</span>
              </div>
              <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden;">
                <div id="inv-bar-${key}" style="width: ${percent}%; height: 100%; background: var(--color-primary); transition: width 0.3s ease;"></div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.65rem; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.02); padding-top: 0.4rem; margin-bottom: 0.6rem;">
              <div style="display: flex; justify-content: space-between;">
                <span>Rate:</span>
                <span id="inv-rate-${key}" style="font-weight:600; color:#FFF;">0.00 units/min</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Exhaustion:</span>
                <span id="inv-time-${key}" style="font-weight:600; color:#FFF;">12.0h</span>
              </div>
            </div>
          </div>

          <button class="btn-primary restock-single-btn" data-key="${key}" style="width: 100%; height: 26px; font-size: 0.68rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem; background: rgba(212,163,115,0.08); border: 1px solid var(--color-primary-glow); color: var(--color-primary); cursor: pointer;">
            <span>Restock: $${cost.toFixed(2)}</span>
            <i data-lucide="package-plus" style="width: 11px; height: 11px;"></i>
          </button>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="panel-title">Operations Inventory Stock</h3>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Live depletion predictions and dynamic cost calculations.</p>
          </div>
          <button class="btn-primary" id="btn-restock-action" style="display: flex; align-items: center; gap: 0.4rem; height: 36px;">
            <i data-lucide="package-plus" style="width: 16px; height: 16px;"></i>
            <span>Emergency Restock All</span>
          </button>
        </div>
        
        <div class="inventory-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
          ${cardsHtml}
        </div>
        
        <!-- Predictive Warnings Panel -->
        <div class="panel-container" style="flex-grow: 1; min-height: 250px;">
          <h4 style="margin-bottom: 1rem;">Predictive Inventory Depletion Analysis</h4>
          <div style="padding: 1rem; text-align: center; color: var(--text-muted);">
            Initializing depletion algorithms...
          </div>
        </div>
      </div>
    `;
    
    if (window.lucide) lucide.createIcons();
    this.updateInventoryCards(state.inventory);
    this.updatePredictiveDepletion(state);
    this.bindSingleRestockEvents();
  }

  /**
   * Bind event listeners for actions and simulation changes.
   */
  bindEvents() {
    window.addEventListener('brewmind:statechange', (e) => {
      if (!this.isInitialized) return;
      this.updateInventoryCards(e.detail.inventory);
      this.updatePredictiveDepletion(e.detail);
    });

    const restockBtn = this.container.querySelector('#btn-restock-action');
    if (restockBtn) {
      restockBtn.addEventListener('click', () => {
        this.triggerRestockAll();
      });
    }
  }

  bindSingleRestockEvents() {
    this.container.querySelectorAll('.restock-single-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.triggerRestockSingle(key);
      });
    });
  }

  triggerRestockSingle(key) {
    const state = window.BrewMind.getState();
    const item = state.inventory[key];
    if (!item) return;

    const diff = item.max - item.current;
    const cost = diff * item.price;

    if (state.revenue >= cost) {
      state.revenue = parseFloat((state.revenue - cost).toFixed(2));
      item.current = item.max;
      state.warnings.lowStock[key] = false;
      
      window.BrewMind.setState(state);

      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Inventory Restocked',
          message: `Restocked ${item.name.split(' (')[0]} to capacity. Cost: $${cost.toFixed(2)}`,
          type: 'success'
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Insufficient Funds',
          message: `Cannot restock ${item.name.split(' (')[0]}. Required: $${cost.toFixed(2)}, Cash: $${state.revenue.toFixed(2)}`,
          type: 'danger'
        }
      }));
    }
  }

  triggerRestockAll() {
    const state = window.BrewMind.getState();
    let totalCost = 0;
    
    Object.keys(state.inventory).forEach(key => {
      const item = state.inventory[key];
      const diff = item.max - item.current;
      totalCost += diff * item.price;
    });

    if (state.revenue >= totalCost) {
      state.revenue = parseFloat((state.revenue - totalCost).toFixed(2));
      Object.keys(state.inventory).forEach(key => {
        state.inventory[key].current = state.inventory[key].max;
        state.warnings.lowStock[key] = false;
      });
      window.BrewMind.setState(state);
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Emergency Restock Complete',
          message: `Refilled all 14 ingredients. Cost: $${totalCost.toFixed(2)}`,
          type: 'success'
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Insufficient Funds',
          message: `Required: $${totalCost.toFixed(2)} for Emergency Restock. Cash: $${state.revenue.toFixed(2)}`,
          type: 'danger'
        }
      }));
    }
  }

  /**
   * Updates progress bars and stock labels.
   * @param {Object} inventory 
   */
  updateInventoryCards(inventory) {
    if (!inventory) return;
    
    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      const p = Math.round((item.current / item.max) * 100);
      
      const valEl = this.container.querySelector(`#inv-val-${key}`);
      const pctEl = this.container.querySelector(`#inv-percent-${key}`);
      const barEl = this.container.querySelector(`#inv-bar-${key}`);
      const btnEl = this.container.querySelector(`.restock-single-btn[data-key="${key}"]`);

      if (valEl) valEl.innerText = `${item.current.toFixed(1)} ${item.name.includes('pcs') ? 'pcs' : (item.name.includes('kg') ? 'kg' : 'L')}`;
      if (pctEl) pctEl.innerText = `${p}%`;
      if (barEl) {
        barEl.style.width = `${p}%`;
        if (p < 15) barEl.style.backgroundColor = 'var(--color-danger)';
        else if (p < 35) barEl.style.backgroundColor = 'var(--color-warning)';
        else barEl.style.backgroundColor = 'var(--color-primary)';
      }
      
      if (btnEl) {
        const cost = (item.max - item.current) * item.price;
        btnEl.querySelector('span').innerText = `Restock: $${cost.toFixed(2)}`;
      }
    });
  }

  /**
   * Calculate live stock exhaustion curves.
   */
  updatePredictiveDepletion(state) {
    const predictivePanel = this.container.querySelector('.panel-container:last-child');
    if (!predictivePanel) return;

    const inventory = state.inventory;
    const decimalTime = state.clock.hours + state.clock.minutes / 60;
    
    let html = `
      <h4 style="margin-bottom: 1rem; font-size: 0.95rem; color: var(--text-secondary);">Predictive Inventory Depletion Analysis</h4>
      <div style="overflow-x: auto; width: 100%;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--glass-border); color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">
              <th style="padding: 0.4rem 0.5rem;">Resource</th>
              <th style="padding: 0.4rem 0.5rem;">Current Stock</th>
              <th style="padding: 0.4rem 0.5rem;">Max Capacity</th>
              <th style="padding: 0.4rem 0.5rem; text-align: right;">Exhaustion ETA</th>
              <th style="padding: 0.4rem 0.5rem; text-align: right;">Risk Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      const p = Math.round((item.current / item.max) * 100);
      
      const rate = (item.max - item.current) / (decimalTime - 6 + 0.1); 
      let hoursRemaining = 12.0;
      if (rate > 0.005) {
        hoursRemaining = parseFloat((item.current / rate).toFixed(1));
      }
      
      let status = 'STABLE';
      let color = 'var(--color-success)';
      if (p < 15) { status = 'CRITICAL'; color = 'var(--color-danger)'; }
      else if (p < 35) { status = 'WARNING'; color = 'var(--color-warning)'; }

      const rateEl = this.container.querySelector(`#inv-rate-${key}`);
      const timeEl = this.container.querySelector(`#inv-time-${key}`);
      if (rateEl) rateEl.innerText = `${Math.max(0.001, rate / 60).toFixed(3)} units/min`;
      if (timeEl) timeEl.innerText = `${hoursRemaining} hours`;

      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
          <td style="padding: 0.5rem; font-weight: 600; color: #FFF;">${item.name.split(' (')[0]}</td>
          <td style="padding: 0.5rem;">${item.current.toFixed(1)}</td>
          <td style="padding: 0.5rem;">${item.max}</td>
          <td style="padding: 0.5rem; text-align: right; color: var(--text-secondary);">~${hoursRemaining} hours</td>
          <td style="padding: 0.5rem; text-align: right; color: ${color}; font-weight: 600; font-size: 0.7rem;">${status}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    predictivePanel.innerHTML = html;
  }
}

export const inventoryController = new InventoryController();
