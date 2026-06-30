/* -------------------------------------------------------------
 * BREWMIND AI - Chart.js Analytics Controller (10 Charts)
 * ------------------------------------------------------------- */

import { DRINK_MENU } from './simulation.js';

class AnalyticsController {
  constructor() {
    this.container = null;
    this.charts = {};
    this.isInitialized = false;
    
    // Rolling historical buffer of the last 20 ticks to populate line charts
    this.history = {
      labels: [],
      revenue: [],
      orders: [],
      queue: [],
      satisfaction: [],
      machine: []
    };
  }

  /**
   * Bind components on page reveal.
   * @param {HTMLElement} containerElement 
   */
  init(containerElement) {
    if (!containerElement) return;
    this.container = containerElement;
    
    if (this.isInitialized) {
      this.updateChartsData(window.BrewMind.getState());
      return;
    }
    
    this.isInitialized = true;

    this.renderLayout();
    this.bindEvents();

    console.log("Analytics Charts Workspace initialized with 10 live charts.");
  }

  /**
   * Create structure layouts.
   */
  renderLayout() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; height: 100%; overflow-y: auto; padding-right: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 class="panel-title">Operations Analytics & Live Forecasting</h3>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Live telemetry and correlation metrics across 10 distinct charts.</p>
          </div>
          <button class="btn-secondary" id="btn-export-csv">Export Reports</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
          
          <!-- 1. Revenue Timeline -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">1. Revenue Forecast ($)</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-revenue"></canvas>
            </div>
          </div>

          <!-- 2. Orders Volume -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">2. Orders volume (Completions)</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-orders"></canvas>
            </div>
          </div>

          <!-- 3. Queue Size Line -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">3. Queue Line Telemetry</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-queue"></canvas>
            </div>
          </div>

          <!-- 4. Inventory Capacities -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">4. Stock Levels (% Capacity)</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-inventory"></canvas>
            </div>
          </div>

          <!-- 5. Customer Satisfaction -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">5. Satisfaction Trends</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-satisfaction"></canvas>
            </div>
          </div>

          <!-- 6. Machine Telemetry -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">6. Boiler health & wear</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-machine"></canvas>
            </div>
          </div>

          <!-- 7. Weather Impact Correlation -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">7. Weather Impact Correlation</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-weather"></canvas>
            </div>
          </div>

          <!-- 8. Rush Hour Timeline -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">8. Peak Hour Congestion overlays</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-rush"></canvas>
            </div>
          </div>

          <!-- 9. Top Selling Products -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">9. Best Sellers Demand Trends</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-top-selling"></canvas>
            </div>
          </div>

          <!-- 10. Profit by Category -->
          <div class="panel-container" style="min-height: 250px; position: relative;">
            <h4 style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary);">10. Category Margins Profit ($)</h4>
            <div style="position: relative; width: 100%; height: 170px;">
              <canvas id="chart-profit-category"></canvas>
            </div>
          </div>

        </div>
      </div>
    `;
    
    if (window.lucide) lucide.createIcons();

    // Trigger charts rendering asynchronously
    setTimeout(() => {
      this.initCharts();
    }, 50);
  }

  /**
   * Initialize all 10 Chart.js configurations.
   */
  initCharts() {
    if (!window.Chart) {
      console.warn("Chart.js is not loaded on window.");
      return;
    }

    Chart.defaults.color = 'rgba(255, 255, 255, 0.45)';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const state = window.BrewMind.getState();

    // Helper to get contexts
    const getCtx = (id) => document.getElementById(id);

    // 1. Revenue
    this.charts.revenue = new Chart(getCtx('chart-revenue'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Sales ($)', data: [], borderColor: '#D4A373', backgroundColor: 'rgba(212, 163, 115, 0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 2. Orders
    this.charts.orders = new Chart(getCtx('chart-orders'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Orders', data: [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 3. Queue
    this.charts.queue = new Chart(getCtx('chart-queue'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Queue', data: [], borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 4. Inventory capacity bars
    this.charts.inventory = new Chart(getCtx('chart-inventory'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: '% Capacity', data: [], backgroundColor: 'rgba(212, 163, 115, 0.55)', borderColor: '#D4A373', borderWidth: 1.5, borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    // 5. Satisfaction
    this.charts.satisfaction = new Chart(getCtx('chart-satisfaction'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Satisfaction (%)', data: [], borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    // 6. Machine Health
    this.charts.machine = new Chart(getCtx('chart-machine'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Boiler health (%)', data: [], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });

    // 7. Weather correlation
    this.charts.weather = new Chart(getCtx('chart-weather'), {
      type: 'bar',
      data: { labels: ['Sunny', 'Cloudy', 'Rainy', 'Windy'], datasets: [{ label: 'Sales Factor', data: [1.2, 1.0, 0.65, 0.85], backgroundColor: 'rgba(212, 163, 115, 0.45)', borderWidth: 1.5 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 8. Rush hour timeline (congestions size vs hours)
    this.charts.rush = new Chart(getCtx('chart-rush'), {
      type: 'bar',
      data: { labels: ['07:30', '08:30', '10:30', '13:00', '15:30', '17:00', '19:00'], datasets: [{ label: 'Peak visitors', data: [28, 42, 65, 52, 33, 29, 8], backgroundColor: 'rgba(245, 158, 11, 0.55)', borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 9. Top Selling Products
    this.charts.topSelling = new Chart(getCtx('chart-top-selling'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Units Sold', data: [], backgroundColor: 'rgba(16, 185, 129, 0.55)', borderWidth: 1 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 10. Profit by Category
    this.charts.profitCategory = new Chart(getCtx('chart-profit-category'), {
      type: 'doughnut',
      data: { labels: ['Coffee', 'Tea', 'Cold Drinks', 'Food', 'Other'], datasets: [{ data: [120, 45, 60, 180, 22], backgroundColor: ['#D4A373', 'rgba(212,163,115,0.7)', '#10B981', '#3B82F6', 'rgba(255,255,255,0.1)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } } }
    });

    // Render initial statistics
    this.updateChartsData(state);
  }

  bindEvents() {
    window.addEventListener('brewmind:statechange', (e) => {
      if (!this.isInitialized) return;
      this.updateChartsData(e.detail);
    });

    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCSVReport();
      });
    }
  }

  /**
   * Refreshes chart arrays dynamically.
   */
  updateChartsData(state) {
    if (!window.Chart || Object.keys(this.charts).length === 0) return;

    // Advance clock labels
    const timeLabel = `${state.clock.hours.toString().padStart(2, '0')}:${state.clock.minutes.toString().padStart(2, '0')}`;
    
    // Add point to local line chart history arrays
    if (this.history.labels[this.history.labels.length - 1] !== timeLabel) {
      this.history.labels.push(timeLabel);
      this.history.revenue.push(state.revenue);
      this.history.orders.push(state.orders.completed);
      this.history.queue.push(state.customers.queueLength);
      this.history.satisfaction.push(state.customerSatisfaction);
      this.history.machine.push(state.machineHealth);

      // Clamped length
      if (this.history.labels.length > 20) {
        this.history.labels.shift();
        this.history.revenue.shift();
        this.history.orders.shift();
        this.history.queue.shift();
        this.history.satisfaction.shift();
        this.history.machine.shift();
      }
    }

    // 1. Update Revenue Chart
    if (this.charts.revenue) {
      this.charts.revenue.data.labels = this.history.labels;
      this.charts.revenue.data.datasets[0].data = this.history.revenue;
      this.charts.revenue.update('none');
    }

    // 2. Update Orders Chart
    if (this.charts.orders) {
      this.charts.orders.data.labels = this.history.labels;
      this.charts.orders.data.datasets[0].data = this.history.orders;
      this.charts.orders.update('none');
    }

    // 3. Update Queue Chart
    if (this.charts.queue) {
      this.charts.queue.data.labels = this.history.labels;
      this.charts.queue.data.datasets[0].data = this.history.queue;
      this.charts.queue.update('none');
    }

    // 4. Update Inventory Capacity
    if (this.charts.inventory) {
      const keys = Object.keys(state.inventory);
      this.charts.inventory.data.labels = keys.map(k => state.inventory[k].name.split(' (')[0]);
      this.charts.inventory.data.datasets[0].data = keys.map(k => Math.round((state.inventory[k].current / state.inventory[k].max) * 100));
      this.charts.inventory.update('none');
    }

    // 5. Update Satisfaction Chart
    if (this.charts.satisfaction) {
      this.charts.satisfaction.data.labels = this.history.labels;
      this.charts.satisfaction.data.datasets[0].data = this.history.satisfaction;
      this.charts.satisfaction.update('none');
    }

    // 6. Update Machine Health
    if (this.charts.machine) {
      this.charts.machine.data.labels = this.history.labels;
      this.charts.machine.data.datasets[0].data = this.history.machine;
      this.charts.machine.update('none');
    }

    // 7. Update Weather Correlation based on active conditions
    if (this.charts.weather) {
      // Varies slightly based on current temp noise
      const cond = state.weather.condition;
      const sales = state.orders.sales || {};
      let factor = 1.0;
      if (cond === 'Sunny') factor = 1.35;
      else if (cond === 'Rainy') factor = 0.58;
      else if (cond === 'Windy') factor = 0.88;
      
      const dataset = this.charts.weather.data.datasets[0].data;
      if (cond === 'Sunny') dataset[0] = factor;
      else if (cond === 'Cloudy') dataset[1] = factor;
      else if (cond === 'Rainy') dataset[2] = factor;
      else if (cond === 'Windy') dataset[3] = factor;
      this.charts.weather.update('none');
    }

    // 9. Update Top Selling Products Horizontal Bar
    if (this.charts.topSelling) {
      const sales = state.orders.sales || {};
      const sorted = Object.keys(sales).map(key => ({ key, val: sales[key] })).sort((a,b) => b.val - a.val).slice(0, 5);
      
      this.charts.topSelling.data.labels = sorted.map(s => s.key);
      this.charts.topSelling.data.datasets[0].data = sorted.map(s => s.val);
      this.charts.topSelling.update('none');
    }

    // 10. Update Category Margins
    if (this.charts.profitCategory) {
      const sales = state.orders.sales || {};
      const profits = { Coffee: 0, Tea: 0, 'Cold Drinks': 0, Food: 0, Other: 0 };
      
      Object.keys(DRINK_MENU).forEach(key => {
        const item = DRINK_MENU[key];
        const count = sales[key] || 0;
        const profit = count * item.profit;
        if (profits[item.category] !== undefined) {
          profits[item.category] = parseFloat((profits[item.category] + profit).toFixed(2));
        }
      });

      this.charts.profitCategory.data.datasets[0].data = [
        profits.Coffee, profits.Tea, profits['Cold Drinks'], profits.Food, profits.Other
      ];
      this.charts.profitCategory.update('none');
    }
  }

  exportCSVReport() {
    const state = window.BrewMind.getState();
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Revenue,$${state.revenue.toFixed(2)}\n`
      + `Orders Completed,${state.orders.completed}\n`
      + `Orders Cancelled,${state.orders.cancelled}\n`
      + `Customer Satisfaction,${state.customerSatisfaction}%\n`
      + `Cafe Reputation,${state.cafeReputation}/100\n`
      + `Machine Health,${state.machineHealth}%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `brewmind_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const analyticsController = new AnalyticsController();
