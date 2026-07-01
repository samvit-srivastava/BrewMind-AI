/* -------------------------------------------------------------
 * BREWMIND AI - Supply Chain & Enterprise Inventory Center
 * ------------------------------------------------------------- */

import { DRINK_MENU, getSmartTargetLimit } from './simulation.js';
import { soundEffects } from './utils.js';

const SUPPLIERS = {
  'Campus Wholesale Supply': { tier: 'Budget', rating: 4.0, reliability: 82, leadTime: 35, costMultiplier: 0.7 },
  'FreshBean Distribution': { tier: 'Standard', rating: 4.6, reliability: 93, leadTime: 25, costMultiplier: 1.0 },
  'Premium Roasters Co.': { tier: 'Premium', rating: 4.9, reliability: 98, leadTime: 18, costMultiplier: 1.4 }
};

class InventoryController {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    this.depletionChart = null;
  }

  /**
   * Binds the inventory section elements.
   * @param {HTMLElement} containerElement 
   */
  init(containerElement) {
    if (!containerElement) return;
    this.container = containerElement;
    
    if (this.isInitialized) {
      this.refreshUI();
      return;
    }
    
    this.isInitialized = true;
    this.renderLayout();
    this.bindEvents();
    
    console.log("Enterprise Supply Chain Center initialized.");
  }

  refreshUI() {
    const state = window.BrewMind.getState();
    
    // Ensure state collections are initialized
    state.deliveries = state.deliveries || [];
    state.purchaseHistory = state.purchaseHistory || [];
    state.autoRestockSettings = state.autoRestockSettings || {};
    state.supplyChainTimeline = state.supplyChainTimeline || [];

    this.updateExecutiveHealth(state);
    this.updateIngredientCards(state);
    this.updateDeliveriesTracker(state);
    this.updateTimelineFeed(state);
    this.updateAiAdvisorPanel(state);
    this.updateForecastChart(state);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="panel-title" style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.03em;">Supply Chain Intelligence Dashboard</h3>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">Real-time resource logs, individual ingredient suppliers, and automated restock triggers.</p>
          </div>
          <button class="btn-primary" id="btn-bulk-restock" style="display: flex; align-items: center; gap: 0.5rem; height: 36px; padding: 0 1.15rem; font-weight: 700; background: var(--color-primary); color: #000; border-radius: 50px; cursor: pointer; border: none; box-shadow: 0 4px 12px rgba(212,163,115,0.25);">
            <i data-lucide="truck" style="width: 15px; height: 15px;"></i>
            <span>Bulk Procurement Order</span>
          </button>
        </div>

        <!-- 1. EXECUTIVE INVENTORY HEALTH PANEL -->
        <div class="procurement-summary-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 1rem;">
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Inventory Health</div>
            <div class="kpi-value" id="val-health-score" style="font-size: 1.4rem; font-weight: 800; margin-top: 0.25rem;">100%</div>
          </div>
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Logistics Status</div>
            <div class="kpi-value" id="val-health-status" style="font-size: 1.15rem; font-weight: 800; margin-top: 0.35rem; color: var(--color-success);">Excellent</div>
          </div>
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Estimated Runtime</div>
            <div class="kpi-value" id="val-est-runtime" style="font-size: 1.2rem; font-weight: 800; margin-top: 0.35rem;">7h 24m</div>
          </div>
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Critical Risk Items</div>
            <div class="kpi-value" id="val-risk-items" style="font-size: 1.4rem; font-weight: 800; margin-top: 0.25rem;">0</div>
          </div>
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Purchase Orders</div>
            <div class="kpi-value" id="val-active-po" style="font-size: 1.4rem; font-weight: 800; margin-top: 0.25rem;">0</div>
          </div>
          <div class="card-kpi" style="padding: 1rem; border: 1px solid rgba(255,255,255,0.04);">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Auto Restock</div>
            <div class="kpi-value" id="val-auto-status" style="font-size: 1.1rem; font-weight: 800; margin-top: 0.35rem; color: var(--color-primary);">Enabled</div>
          </div>
        </div>

        <!-- Main Layout Split -->
        <div style="display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.5rem;">
          
          <!-- LEFT COLUMN: Redesigned Ingredient Cards -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <h4 style="font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Ingredient Supply Stack</h4>
            <div id="ingredients-grid-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem;">
              <!-- Dynamically populated ingredient cards -->
            </div>
          </div>

          <!-- RIGHT COLUMN: Timeline, AI advisor, Forecast, Deliveries -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <!-- A. Interactive Forecast Chart -->
            <div class="panel-container" style="padding: 1.25rem; min-height: 250px;">
              <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 700; color: #FFF;">8-Hour Depletion Forecast</h4>
              <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.75rem;">Projections based on simulated campus consumption cycles.</p>
              <div style="position: relative; height: 150px; width: 100%;">
                <canvas id="inventory-depletion-chart"></canvas>
              </div>
            </div>

            <!-- B. Live Active Purchase Orders -->
            <div class="panel-container" style="padding: 1.25rem;">
              <div class="panel-header" style="margin-bottom: 0.75rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: #FFF;">Active Purchase Orders</h4>
                <span class="badge" id="badge-active-po" style="background: rgba(245, 158, 11, 0.1); color: var(--color-warning);">0 Orders</span>
              </div>
              <div id="deliveries-list-container" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 200px; overflow-y: auto;">
                <div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.75rem;">No shipments in transit.</div>
              </div>
            </div>

            <!-- C. AI Purchasing Advisor -->
            <div class="panel-container" style="padding: 1.25rem; border: 1px solid rgba(192, 132, 252, 0.15); background: linear-gradient(135deg, rgba(16,12,10,0.5) 0%, rgba(192, 132, 252, 0.02) 100%);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 0.35rem;">
                  <i data-lucide="sparkles" style="width: 14px; height: 14px; color: #C084FC;"></i>
                  <span>AI Supply Chain Advisor</span>
                </h4>
              </div>
              <div id="ai-procurement-advisor-container" style="display: flex; flex-direction: column; gap: 0.75rem;">
                <!-- Advisor items -->
              </div>
            </div>

            <!-- D. Supply Chain Timeline Feed -->
            <div class="panel-container" style="padding: 1.25rem;">
              <h4 style="margin-bottom: 0.75rem; font-size: 0.9rem; font-weight: 700; color: #FFF;">Supply Chain Timeline</h4>
              <div id="supply-chain-timeline-list" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 240px; overflow-y: auto; padding-right: 4px;">
                <!-- Timeline feed logs -->
                <div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.75rem;">Timeline is currently empty.</div>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.refreshUI();
  }

  bindEvents() {
    window.addEventListener('brewmind:statechange', (e) => {
      if (!this.isInitialized) return;
      this.refreshUI();
    });

    const bulkBtn = this.container.querySelector('#btn-bulk-restock');
    if (bulkBtn) {
      bulkBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.triggerBulkRestock();
      });
    }
  }

  updateExecutiveHealth(state) {
    const healthValEl = document.getElementById('val-health-score');
    const healthStatEl = document.getElementById('val-health-status');
    const runtimeEl = document.getElementById('val-est-runtime');
    const riskEl = document.getElementById('val-risk-items');
    const activePoEl = document.getElementById('val-active-po');
    const autoStatusEl = document.getElementById('val-auto-status');

    const inventory = state.inventory;
    const decimalTime = state.clock.hours + state.clock.minutes / 60;

    let criticalCount = 0;
    let totalItems = 0;
    let lowestHours = 12.0;

    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      totalItems++;
      const p = (item.current / item.max) * 100;
      if (p < 20 || (item.freshness !== undefined && item.freshness < 30)) {
        criticalCount++;
      }

      const rate = (item.max - item.current) / (decimalTime - 6 + 0.1);
      if (rate > 0.005) {
        const hrs = item.current / rate;
        if (hrs < lowestHours) {
          lowestHours = hrs;
        }
      }
    });

    // Health Score logic: starts at 100, drops by 20 per critical item, and decays with low freshness
    let healthScore = 100;
    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      const p = (item.current / item.max) * 100;
      if (p < 20) healthScore -= 15;
      if (item.freshness !== undefined && item.freshness < 25) healthScore -= 8;
    });
    healthScore = Math.max(10, Math.min(100, healthScore));

    let statusText = 'Excellent';
    let statusColor = 'var(--color-success)';
    if (healthScore < 45) {
      statusText = 'Critical';
      statusColor = 'var(--color-danger)';
    } else if (healthScore < 70) {
      statusText = 'Restock Soon';
      statusColor = 'var(--color-warning)';
    } else if (healthScore < 90) {
      statusText = 'Monitor';
      statusColor = '#EAB308';
    }

    const pendingCount = state.deliveries ? state.deliveries.length : 0;
    
    // Auto status checks if any is active
    let autoActive = false;
    Object.keys(inventory).forEach(key => {
      if (state.autoRestockSettings[key]) autoActive = true;
    });

    if (healthValEl) {
      if (healthValEl.innerText !== `${healthScore}%`) {
        gsap.to(healthValEl, {
          duration: 0.35,
          innerText: healthScore,
          snap: { innerText: 1 },
          onUpdate: function() {
            healthValEl.innerText = `${parseFloat(healthValEl.innerText).toFixed(0)}%`;
          }
        });
      }
    }

    if (healthStatEl) {
      healthStatEl.innerText = statusText;
      healthStatEl.style.color = statusColor;
    }

    if (runtimeEl) {
      const hours = Math.floor(lowestHours);
      const mins = Math.round((lowestHours % 1) * 60);
      runtimeEl.innerText = `${hours}h ${mins}m`;
    }

    if (riskEl) riskEl.innerText = criticalCount;
    if (activePoEl) activePoEl.innerText = pendingCount;
    if (autoStatusEl) {
      autoStatusEl.innerText = autoActive ? 'Active' : 'Disabled';
      autoStatusEl.style.color = autoActive ? 'var(--color-success)' : 'var(--text-muted)';
    }
  }

  updateIngredientCards(state) {
    const grid = document.getElementById('ingredients-grid-container');
    if (!grid) return;

    const inventory = state.inventory;
    const autoRestockSettings = state.autoRestockSettings || {};
    const decimalTime = state.clock.hours + state.clock.minutes / 60;

    // Create cards if not exists
    if (grid.children.length === 0) {
      let cardsHtml = '';
      Object.keys(inventory).forEach(key => {
        const item = inventory[key];
        
        let icon = 'package';
        if (key.toLowerCase().includes('beans')) icon = 'coffee';
        else if (key.toLowerCase().includes('milk')) icon = 'milk';
        else if (key.toLowerCase().includes('cups')) icon = 'cup-soda';
        else if (key.toLowerCase().includes('syrups')) icon = 'droplet';
        else if (key.toLowerCase().includes('sugar')) icon = 'candy';
        else if (key.toLowerCase().includes('chocolate')) icon = 'ice-cream';
        else if (key.toLowerCase().includes('tea')) icon = 'leaf';
        else if (key.toLowerCase().includes('bread') || key.toLowerCase().includes('muffin') || key.toLowerCase().includes('brownie')) icon = 'croissant';
        else if (key.toLowerCase().includes('water')) icon = 'water';
        else if (key.toLowerCase().includes('napkin') || key.toLowerCase().includes('wrapper')) icon = 'scroll';

        cardsHtml += `
          <div class="card-kpi card-ingredient" id="ing-card-${key}" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 310px; border-radius: 12px; transition: all 0.3s ease; position: relative;">
            <div>
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">${item.name.split(' (')[0]}</span>
                  <span id="ing-val-${key}" style="font-size: 1.15rem; font-weight: 800; color: #FFF; margin-top: 0.1rem;">0.00</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <!-- Auto Switch -->
                  <label class="auto-toggle-wrapper" style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer; font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); background: rgba(255,255,255,0.03); padding: 0.15rem 0.4rem; border-radius: 6px; border: 1px solid var(--glass-border);">
                    <input type="checkbox" class="ing-auto-toggle" data-key="${key}" ${autoRestockSettings[key] ? 'checked' : ''} style="margin: 0; cursor: pointer; width: 10px; height: 10px; accent-color: var(--color-primary);"/>
                    <span>AUTO</span>
                  </label>
                  <div style="width: 26px; height: 26px; border-radius: 6px; background: rgba(212,163,115,0.08); display: flex; align-items: center; justify-content: center; color: var(--color-primary);"><i data-lucide="${icon}" style="width: 13px; height: 13px;"></i></div>
                </div>
              </div>

              <!-- Risk Badge -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.25rem;">
                <span id="ing-risk-${key}" style="font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 4px;">🟢 Healthy</span>
                <span id="ing-fresh-badge-${key}" style="font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.4rem; border-radius: 4px; background: rgba(16, 185, 129, 0.08); color: #10B981;">Freshness: 100%</span>
              </div>

              <!-- Freshness Bar -->
              <div style="margin-bottom: 0.6rem;">
                <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden;">
                  <div id="ing-fresh-bar-${key}" style="width: 100%; height: 100%; background: #10B981; transition: width 0.4s ease;"></div>
                </div>
              </div>

              <!-- Capacity Level Bar -->
              <div style="margin: 0.5rem 0;">
                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-secondary); margin-bottom: 0.2rem;">
                  <span>Stock capacity</span>
                  <span id="ing-pct-${key}">0%</span>
                </div>
                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden;">
                  <div id="ing-bar-${key}" style="width: 0%; height: 100%; background: var(--color-primary); transition: width 0.4s ease;"></div>
                </div>
              </div>

              <!-- Active Purchase Order ETA Chip -->
              <div id="ing-eta-chip-${key}" style="display: none; align-items: center; gap: 0.25rem; font-size: 0.62rem; font-weight: bold; background: rgba(245, 158, 11, 0.12); color: var(--color-warning); border: 1px solid rgba(245, 158, 11, 0.2); padding: 0.2rem 0.45rem; border-radius: 6px; margin-bottom: 0.5rem;">
                <i data-lucide="clock" style="width: 10px; height: 10px;"></i>
                <span id="ing-eta-text-${key}">ETA: 12m (Preparing)</span>
              </div>

              <!-- Supplier Assignment Dropdown -->
              <div style="margin-top: 0.4rem; display: flex; flex-direction: column; gap: 0.2rem;">
                <label style="font-size: 0.6rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">Active Supplier</label>
                <select class="ing-supplier-select" data-key="${key}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: #FFF; font-size: 0.68rem; padding: 0.2rem; border-radius: 4px; width: 100%; outline: none; cursor: pointer;">
                  <option value="Campus Wholesale Supply">Campus Wholesale (Budget - 0.7x)</option>
                  <option value="FreshBean Distribution" selected>FreshBean (Standard - 1.0x)</option>
                  <option value="Premium Roasters Co.">Premium Roasters (Premium - 1.4x)</option>
                </select>
              </div>

            </div>

            <!-- Action buttons (Restock PO vs Instant Emergency) -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.75rem;">
              <button class="btn-primary ing-restock-btn" data-key="${key}" style="width: 100%; height: 28px; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem; font-weight: 700; background: rgba(212,163,115,0.06); border: 1px solid rgba(212,163,115,0.25); color: var(--color-primary); border-radius: 6px; cursor: pointer; transition: all 0.2s ease;">
                <span id="ing-btn-text-${key}">Restock: $0.00</span>
              </button>
              <button class="ing-emergency-btn" data-key="${key}" style="width: 100%; height: 22px; font-size: 0.62rem; display: flex; align-items: center; justify-content: center; font-weight: 700; background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); color: var(--color-danger); border-radius: 4px; cursor: pointer; transition: all 0.2s ease;">
                <span>Emergency: Instant (2.2x)</span>
              </button>
            </div>
          </div>
        `;
      });
      grid.innerHTML = cardsHtml;
      if (window.lucide) lucide.createIcons();

      // Bind Auto switches
      grid.querySelectorAll('.ing-auto-toggle').forEach(chk => {
        chk.addEventListener('change', () => {
          const key = chk.getAttribute('data-key');
          const state = window.BrewMind.getState();
          state.autoRestockSettings = state.autoRestockSettings || {};
          state.autoRestockSettings[key] = chk.checked;
          
          // Keep item model synchronized
          state.inventory[key].auto = chk.checked;
          
          window.BrewMind.setState(state);
          soundEffects.playClick();
        });
      });

      // Bind supplier dropdown selectors
      grid.querySelectorAll('.ing-supplier-select').forEach(sel => {
        sel.addEventListener('change', () => {
          const key = sel.getAttribute('data-key');
          const val = sel.value;
          const config = SUPPLIERS[val];
          const state = window.BrewMind.getState();
          const item = state.inventory[key];
          
          if (item) {
            item.supplierName = val;
            item.supplierTier = config.tier;
            item.supplierRating = config.rating;
            item.supplierReliability = config.reliability;
            item.supplierLeadTime = config.leadTime;
            item.supplierCostMultiplier = config.costMultiplier;
            
            // Add timeline event log
            const timeStr = state.clock.hours.toString().padStart(2,'0') + ":" + state.clock.minutes.toString().padStart(2,'0');
            state.supplyChainTimeline = state.supplyChainTimeline || [];
            state.supplyChainTimeline.unshift({ time: timeStr, text: `Supplier updated: ${item.name.split(' (')[0]} contracted to ${val}` });

            window.BrewMind.setState(state);
            soundEffects.playClick();
            
            window.dispatchEvent(new CustomEvent('brewmind:toast', {
              detail: {
                title: 'Supplier Updated',
                message: `Contract for ${item.name.split(' (')[0]} updated to ${val}`,
                type: 'success'
              }
            }));
          }
        });
      });

      // Bind restock button
      grid.querySelectorAll('.ing-restock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.triggerStandardRestock(key);
        });
      });

      // Bind emergency button
      grid.querySelectorAll('.ing-emergency-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-key');
          this.triggerEmergencyRestock(key);
        });
      });
    }

    // Refresh card stats
    Object.keys(inventory).forEach(key => {
      const item = inventory[key];
      const p = Math.round((item.current / item.max) * 100);
      const freshness = item.freshness !== undefined ? Math.round(item.freshness) : 100;

      const card = document.getElementById(`ing-card-${key}`);
      const valEl = document.getElementById(`ing-val-${key}`);
      const pctEl = document.getElementById(`ing-pct-${key}`);
      const barEl = document.getElementById(`ing-bar-${key}`);
      const freshBarEl = document.getElementById(`ing-fresh-bar-${key}`);
      const freshBadgeEl = document.getElementById(`ing-fresh-badge-${key}`);
      const riskEl = document.getElementById(`ing-risk-${key}`);
      const selectEl = card ? card.querySelector('.ing-supplier-select') : null;
      const btnEl = document.getElementById(`ing-btn-text-${key}`);
      
      const etaChip = document.getElementById(`ing-eta-chip-${key}`);
      const etaText = document.getElementById(`ing-eta-text-${key}`);

      if (valEl) valEl.innerText = `${item.current.toFixed(1)} ${item.name.includes('pcs') ? 'pcs' : (item.name.includes('kg') ? 'kg' : 'L')}`;
      if (pctEl) pctEl.innerText = `${p}%`;
      
      if (barEl) {
        barEl.style.width = `${p}%`;
        if (p < 20) barEl.style.backgroundColor = 'var(--color-danger)';
        else if (p < 35) barEl.style.backgroundColor = 'var(--color-warning)';
        else barEl.style.backgroundColor = 'var(--color-primary)';
      }

      if (freshBarEl) {
        freshBarEl.style.width = `${freshness}%`;
        if (freshness < 25) freshBarEl.style.backgroundColor = 'var(--color-danger)';
        else if (freshness < 60) freshBarEl.style.backgroundColor = 'var(--color-warning)';
        else freshBarEl.style.backgroundColor = 'var(--color-success)';
      }

      if (freshBadgeEl) {
        freshBadgeEl.innerText = `Freshness: ${freshness}%`;
        if (freshness < 25) {
          freshBadgeEl.style.color = 'var(--color-danger)';
          freshBadgeEl.style.background = 'rgba(239,68,68,0.08)';
        } else if (freshness < 60) {
          freshBadgeEl.style.color = 'var(--color-warning)';
          freshBadgeEl.style.background = 'rgba(245,158,11,0.08)';
        } else {
          freshBadgeEl.style.color = '#10B981';
          freshBadgeEl.style.background = 'rgba(16,185,129,0.08)';
        }
      }

      // Risk classification (5 levels)
      if (riskEl) {
        if (p <= 0) {
          riskEl.innerText = '⚫ Out of Stock';
          riskEl.style.color = '#94A3B8';
          riskEl.style.background = 'rgba(148,163,184,0.12)';
        } else if (p < 20) {
          riskEl.innerText = '🔴 Critical';
          riskEl.style.color = 'var(--color-danger)';
          riskEl.style.background = 'rgba(239,68,68,0.12)';
        } else if (p < 35) {
          riskEl.innerText = '🟠 Restock Soon';
          riskEl.style.color = 'var(--color-warning)';
          riskEl.style.background = 'rgba(245,158,11,0.12)';
        } else if (p < 50) {
          riskEl.innerText = '🟡 Monitor';
          riskEl.style.color = '#EAB308';
          riskEl.style.background = 'rgba(234,179,8,0.12)';
        } else {
          riskEl.innerText = '🟢 Healthy';
          riskEl.style.color = 'var(--color-success)';
          riskEl.style.background = 'rgba(16,185,129,0.12)';
        }
      }

      if (card) {
        if (p < 20) {
          card.classList.add('critical-stock');
        } else {
          card.classList.remove('critical-stock');
        }
      }

      if (selectEl && item.supplierName && selectEl.value !== item.supplierName) {
        selectEl.value = item.supplierName;
      }

      // Button Restock Cost (Smart JIT target limit for freshness)
      if (btnEl) {
        const targetLimit = getSmartTargetLimit(key, item.max);
        const diff = Math.max(0, targetLimit - item.current);
        const mult = item.supplierCostMultiplier || 1.0;
        const cost = diff * item.price * mult;
        
        btnEl.innerText = diff > 0.1 ? `Restock: $${cost.toFixed(2)}` : 'Fully Stocked (Fresh)';
        if (diff <= 0.1) {
          btnEl.disabled = true;
          btnEl.style.opacity = 0.55;
          btnEl.style.cursor = 'not-allowed';
        } else {
          btnEl.disabled = false;
          btnEl.style.opacity = 1.0;
          btnEl.style.cursor = 'pointer';
        }
      }

      // Update ETA delivery chip countdowns
      const activeDelivery = state.deliveries.find(d => d.itemKey === key);
      if (activeDelivery && etaChip && etaText) {
        etaChip.style.display = 'flex';
        etaText.innerText = `ETA: ${activeDelivery.eta}m (${activeDelivery.status})`;
      } else if (etaChip) {
        etaChip.style.display = 'none';
      }
    });
  }

  updateDeliveriesTracker(state) {
    const list = document.getElementById('deliveries-list-container');
    const badge = document.getElementById('badge-active-po');
    if (!list) return;

    const deliveries = state.deliveries || [];
    if (badge) badge.innerText = `${deliveries.length} Active`;

    if (deliveries.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.72rem;">No shipments currently in transit.</div>`;
      return;
    }

    let html = '';
    deliveries.forEach(del => {
      const item = state.inventory[del.itemKey];
      const itemName = item ? item.name.split(' (')[0] : del.itemKey;
      let statusColor = 'var(--color-warning)';
      if (del.status === 'On Route') statusColor = 'var(--color-primary)';
      else if (del.status === 'Arrived') statusColor = 'var(--color-success)';

      html += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 0.75rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <i data-lucide="truck" style="width: 14px; height: 14px; color: ${statusColor};"></i>
              <strong style="color: #FFF;">${itemName} (+${del.amount.toFixed(1)})</strong>
            </div>
            <span style="font-size: 0.65rem; color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${del.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted);">
            <span>Supplier: ${del.supplier}</span>
            <span>ETA: ${del.eta} mins</span>
          </div>
          <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.03); border-radius: 4px; overflow: hidden; margin-top: 0.15rem;">
            <div style="width: ${del.progress}%; height: 100%; background: ${statusColor}; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  updateTimelineFeed(state) {
    const list = document.getElementById('supply-chain-timeline-list');
    if (!list) return;

    const timeline = state.supplyChainTimeline || [];
    if (timeline.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.72rem;">Timeline is currently empty.</div>`;
      return;
    }

    let html = '';
    timeline.slice(0, 10).forEach(evt => {
      html += `
        <div style="display: flex; gap: 0.5rem; font-size: 0.7rem; border-left: 2px solid rgba(212,163,115,0.25); padding-left: 0.5rem; margin-left: 0.3rem; padding-bottom: 0.5rem;">
          <span style="color: var(--color-primary); font-weight: 700; min-width: 32px;">${evt.time}</span>
          <span style="color: #E2E8F0;">${evt.text}</span>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  updateAiAdvisorPanel(state) {
    const container = document.getElementById('ai-procurement-advisor-container');
    if (!container) return;

    const inventory = state.inventory;
    const recommendations = [];

    // Analyze coffeeBeans
    if (inventory.coffeeBeans.current < inventory.coffeeBeans.max * 0.35) {
      const restockAmt = inventory.coffeeBeans.max - inventory.coffeeBeans.current;
      recommendations.push({
        key: 'coffeeBeans',
        text: 'Coffee Beans will reach unsafe levels in 2.8 simulated hours. Unrestricted demand risk.',
        recommendedSupplier: 'Premium Roasters Co.',
        cost: restockAmt * inventory.coffeeBeans.price * 1.4,
        revenue: 710,
        gain: 8,
        confidence: 94
      });
    }

    // Analyze milk
    if (inventory.milk.current < inventory.milk.max * 0.4 && state.rushHourStatus) {
      const restockAmt = inventory.milk.max - inventory.milk.current;
      recommendations.push({
        key: 'milk',
        text: 'Dairy & Oat Milk freshness/volume dropping ahead of class lunch rush.',
        recommendedSupplier: 'FreshBean Distribution',
        cost: restockAmt * inventory.milk.price,
        revenue: 450,
        gain: 5,
        confidence: 90
      });
    }

    if (recommendations.length === 0) {
      container.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); padding: 0.85rem; border-radius: 8px; display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.72rem; color: #10B981;">
          <i data-lucide="check-circle" style="width: 14px; height: 14px; flex-shrink: 0; margin-top: 0.1rem;"></i>
          <span>Supply chain advisor reports full operational stability. No actions required.</span>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let html = '';
    recommendations.forEach(rec => {
      html += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 0.8rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.45rem;">
          <div style="font-size: 0.72rem; color: #E2E8F0; line-height: 1.3;">${rec.text}</div>
          
          <div style="display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.65rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.02); padding-top: 0.4rem; margin-bottom: 0.4rem;">
            <div>Supplier: <strong style="color:#FFF;">${rec.recommendedSupplier}</strong></div>
            <div style="display: flex; justify-content: space-between;">
              <span>Est. Cost: <strong style="color:var(--color-primary);">$${rec.cost.toFixed(2)}</strong></span>
              <span>Revenue Protected: <strong style="color:var(--color-success);">$${rec.revenue}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Gain Expectation: <strong style="color:#C084FC;">+${rec.gain}%</strong></span>
              <span>Confidence: <strong>${rec.confidence}%</strong></span>
            </div>
          </div>

          <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
            <button class="btn-primary rec-apply-btn" data-key="${rec.key}" data-supplier="${rec.recommendedSupplier}" style="height: 22px; font-size: 0.65rem; padding: 0 0.5rem; border-radius: 4px; background: var(--color-primary); color: #000; border: none; cursor: pointer; font-weight: 700;">Apply</button>
            <button class="btn-secondary" style="height: 22px; font-size: 0.65rem; padding: 0 0.5rem; border-radius: 4px; border: 1px solid var(--glass-border); background: none; color: var(--text-secondary); cursor: pointer;">Dismiss</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Bind Apply Action on recommendation
    container.querySelectorAll('.rec-apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const supplier = btn.getAttribute('data-supplier');
        soundEffects.playClick();
        
        // Auto apply supplier switch and restock
        const state = window.BrewMind.getState();
        const item = state.inventory[key];
        if (item) {
          const config = SUPPLIERS[supplier];
          item.supplierName = supplier;
          item.supplierTier = config.tier;
          item.supplierRating = config.rating;
          item.supplierReliability = config.reliability;
          item.supplierLeadTime = config.leadTime;
          item.supplierCostMultiplier = config.costMultiplier;
          window.BrewMind.setState(state);
          
          this.triggerStandardRestock(key);
        }
      });
    });
  }

  updateForecastChart(state) {
    const ctx = document.getElementById('inventory-depletion-chart');
    if (!ctx) return;

    const labels = Array.from({length: 9}, (_, i) => `+${i}h`);
    const inventory = state.inventory;
    const decimalTime = state.clock.hours + state.clock.minutes / 60;

    const keyItems = {
      'coffeeBeans': 'Beans',
      'milk': 'Milk',
      'cups': 'Cups'
    };

    const datasets = Object.keys(keyItems).map((key, index) => {
      const item = inventory[key];
      if (!item) return null;

      const currentPct = (item.current / item.max) * 100;
      const rate = (item.max - item.current) / (decimalTime - 6 + 0.1); 
      const hourlyPctDepletion = rate > 0 ? (rate / item.max) * 100 : 0;

      const data = Array.from({length: 9}, (_, hour) => {
        return Math.max(0, Math.round(currentPct - hourlyPctDepletion * hour));
      });

      const colors = ['#D4A373', '#60A5FA', '#34D399'];
      return {
        label: keyItems[key],
        data: data,
        borderColor: colors[index],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0
      };
    }).filter(Boolean);

    if (this.depletionChart) {
      this.depletionChart.data.datasets = datasets;
      this.depletionChart.update('none');
    } else {
      this.depletionChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94A3B8', font: { size: 9 } },
              position: 'top',
              align: 'end'
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#64748B', font: { size: 8 } } },
            y: { grid: { color: 'rgba(255,255,255,0.02)' }, ticks: { color: '#64748B', font: { size: 8 } }, min: 0, max: 100 }
          }
        }
      });
    }
  }

  triggerStandardRestock(key) {
    const state = window.BrewMind.getState();
    const item = state.inventory[key];
    if (!item) return;

    state.deliveries = state.deliveries || [];
    const isPending = state.deliveries.some(d => d.itemKey === key);
    if (isPending) {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Delivery Already Active',
          message: `A shipment order of ${item.name.split(' (')[0]} is already in route.`,
          type: 'warning'
        }
      }));
      return;
    }

    const supplierName = item.supplierName || 'FreshBean Distribution';
    const costMult = item.supplierCostMultiplier || 1.0;
    const leadTime = item.supplierLeadTime || 25;
    const targetLimit = getSmartTargetLimit(key, item.max);
    const restockAmt = Math.max(0, parseFloat((targetLimit - item.current).toFixed(1)));

    if (restockAmt <= 0) {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Stock Fresh & Sufficient',
          message: `${item.name.split(' (')[0]} is already at its JIT freshness target limit.`,
          type: 'info'
        }
      }));
      return;
    }
    const cost = parseFloat((restockAmt * item.price * costMult).toFixed(2));

    if (state.revenue >= cost) {
      state.revenue = parseFloat((state.revenue - cost).toFixed(2));
      
      state.deliveries.push({
        id: 'del_' + Math.random().toString(36).substr(2, 9),
        supplier: supplierName,
        itemKey: key,
        amount: restockAmt,
        cost: cost,
        eta: leadTime,
        totalEta: leadTime,
        status: 'Preparing',
        progress: 0
      });
      
      // Log supply chain events
      const timeStr = state.clock.hours.toString().padStart(2,'0') + ":" + state.clock.minutes.toString().padStart(2,'0');
      state.supplyChainTimeline = state.supplyChainTimeline || [];
      state.supplyChainTimeline.unshift({ time: timeStr, text: `Purchase order sent to ${supplierName} for ${item.name.split(' (')[0]}` });
      state.supplyChainTimeline.unshift({ time: timeStr, text: `Supplier accepted order #${Math.floor(1000 + Math.random() * 9000)}` });

      window.BrewMind.setState(state);
      soundEffects.playClick();
      
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Order Dispatched',
          message: `PO dispatched via ${supplierName}. Cost: $${cost.toFixed(2)}`,
          type: 'success'
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Insufficient Funds',
          message: `Required: $${cost.toFixed(2)} to restock. Balance: $${state.revenue.toFixed(2)}`,
          type: 'danger'
        }
      }));
    }
  }

  triggerEmergencyRestock(key) {
    const state = window.BrewMind.getState();
    const item = state.inventory[key];
    if (!item) return;

    // Deduct emergency multiplier (2.2x cost)
    const costMult = (item.supplierCostMultiplier || 1.0) * 2.2;
    const targetLimit = getSmartTargetLimit(key, item.max);
    const restockAmt = Math.max(0, parseFloat((targetLimit - item.current).toFixed(1)));
    if (restockAmt <= 0) return;
    const cost = parseFloat((restockAmt * item.price * costMult).toFixed(2));

    if (state.revenue >= cost) {
      state.revenue = parseFloat((state.revenue - cost).toFixed(2));
      
      // Instant JIT refill
      item.current = parseFloat(targetLimit.toFixed(1));
      item.freshness = 100.0;
      item.age = 0;
      state.warnings.lowStock[key] = false;

      // Penalties: -2 Satisfaction, -1 Reputation
      state.customerSatisfaction = Math.max(0, state.customerSatisfaction - 2);
      state.cafeReputation = Math.max(0, state.cafeReputation - 1);

      // Log supply chain events
      const timeStr = state.clock.hours.toString().padStart(2,'0') + ":" + state.clock.minutes.toString().padStart(2,'0');
      state.supplyChainTimeline = state.supplyChainTimeline || [];
      state.supplyChainTimeline.unshift({ time: timeStr, text: `Emergency restock executed for ${item.name.split(' (')[0]} (2.2x cost & penalties)` });

      window.BrewMind.setState(state);
      soundEffects.playClick();
      
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Emergency Restock Success',
          message: `Instantly filled ${item.name.split(' (')[0]}. Cost: $${cost.toFixed(2)} (Penalties applied)`,
          type: 'success'
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Insufficient Funds',
          message: `Required: $${cost.toFixed(2)} for emergency restock.`,
          type: 'danger'
        }
      }));
    }
  }

  triggerBulkRestock() {
    const state = window.BrewMind.getState();
    let totalCost = 0;
    const itemsToRestock = [];
    
    state.deliveries = state.deliveries || [];

    Object.keys(state.inventory).forEach(key => {
      const item = state.inventory[key];
      const targetLimit = getSmartTargetLimit(key, item.max);
      const diff = Math.max(0, parseFloat((targetLimit - item.current).toFixed(1)));
      const isPending = state.deliveries.some(d => d.itemKey === key);

      if (diff > 0.1 && !isPending) {
        const cost = diff * item.price * (item.supplierCostMultiplier || 1.0);
        totalCost += cost;
        itemsToRestock.push({ key, diff, cost });
      }
    });

    if (itemsToRestock.length === 0) {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'No Restock Required',
          message: 'All items are fully stocked or have shipments pending.',
          type: 'info'
        }
      }));
      return;
    }

    if (state.revenue >= totalCost) {
      state.revenue = parseFloat((state.revenue - totalCost).toFixed(2));
      const timeStr = state.clock.hours.toString().padStart(2,'0') + ":" + state.clock.minutes.toString().padStart(2,'0');
      
      itemsToRestock.forEach(r => {
        const item = state.inventory[r.key];
        state.deliveries.push({
          id: 'del_' + Math.random().toString(36).substr(2, 9),
          supplier: item.supplierName || 'FreshBean Distribution',
          itemKey: r.key,
          amount: r.diff,
          cost: r.cost,
          eta: item.supplierLeadTime || 25,
          totalEta: item.supplierLeadTime || 25,
          status: 'Preparing',
          progress: 0
        });

        state.supplyChainTimeline.unshift({ time: timeStr, text: `Bulk restock PO sent for ${item.name.split(' (')[0]}` });
      });

      window.BrewMind.setState(state);
      soundEffects.playClick();
      
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Bulk restock Dispatched',
          message: `Dispatched ${itemsToRestock.length} shipments. Cost: $${totalCost.toFixed(2)}`,
          type: 'success'
        }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('brewmind:toast', {
        detail: {
          title: 'Insufficient Funds',
          message: `Required: $${totalCost.toFixed(2)} for bulk restock. Cash: $${state.revenue.toFixed(2)}`,
          type: 'danger'
        }
      }));
    }
  }
}

export const inventoryController = new InventoryController();
