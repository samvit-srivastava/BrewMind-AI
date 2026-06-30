/* -------------------------------------------------------------
 * BREWMIND AI - State Store & Simulation Engine
 * ------------------------------------------------------------- */

import { generateObservations } from './brain.js';

// Extended Menu System containing Coffee, Cold Drinks, Tea, Food, and Other products
export const DRINK_MENU = {
  // Coffee
  'Espresso': { category: 'Coffee', prepTime: 2, price: 3.00, cost: 0.40, profit: 2.60, popularity: 0.8, usage: { coffeeBeans: 0.018, cups: 1, water: 0.05, napkin: 1 } },
  'Americano': { category: 'Coffee', prepTime: 3, price: 3.50, cost: 0.45, profit: 3.05, popularity: 0.9, usage: { coffeeBeans: 0.018, cups: 1, water: 0.25, napkin: 1 } },
  'Latte': { category: 'Coffee', prepTime: 5, price: 4.50, cost: 1.10, profit: 3.40, popularity: 0.95, usage: { coffeeBeans: 0.018, milk: 0.22, cups: 1, sugar: 0.005, napkin: 1 } },
  'Cappuccino': { category: 'Coffee', prepTime: 5, price: 4.50, cost: 1.10, profit: 3.40, popularity: 0.9, usage: { coffeeBeans: 0.018, milk: 0.22, cups: 1, napkin: 1 } },
  'Mocha': { category: 'Coffee', prepTime: 6, price: 5.00, cost: 1.40, profit: 3.60, popularity: 0.85, usage: { coffeeBeans: 0.018, milk: 0.18, chocolate: 0.025, cups: 1, sugar: 0.005, napkin: 1 } },
  'Flat White': { category: 'Coffee', prepTime: 4, price: 4.25, cost: 1.00, profit: 3.25, popularity: 0.85, usage: { coffeeBeans: 0.018, milk: 0.15, cups: 1, napkin: 1 } },
  
  // Cold Drinks
  'Cold Coffee': { category: 'Cold Drinks', prepTime: 3, price: 4.50, cost: 1.20, profit: 3.30, popularity: 0.9, usage: { coffeeBeans: 0.018, milk: 0.20, sugar: 0.01, cups: 1, napkin: 1 } },
  'Cold Brew': { category: 'Cold Drinks', prepTime: 1, price: 4.25, cost: 0.75, profit: 3.50, popularity: 0.8, usage: { coffeeBeans: 0.022, cups: 1, water: 0.3, napkin: 1 } },
  'Frappuccino': { category: 'Cold Drinks', prepTime: 5, price: 5.25, cost: 1.60, profit: 3.65, popularity: 0.95, usage: { coffeeBeans: 0.018, milk: 0.25, syrups: 0.015, cups: 1, sugar: 0.01, napkin: 1 } },
  
  // Tea
  'Masala Tea': { category: 'Tea', prepTime: 3, price: 2.75, cost: 0.60, profit: 2.15, popularity: 0.85, usage: { teaLeaves: 0.01, milk: 0.12, cups: 1, sugar: 0.008, water: 0.12, napkin: 1 } },
  'Green Tea': { category: 'Tea', prepTime: 2, price: 2.50, cost: 0.40, profit: 2.10, popularity: 0.7, usage: { teaLeaves: 0.008, cups: 1, water: 0.25, napkin: 1 } },
  'Black Tea': { category: 'Tea', prepTime: 2, price: 2.25, cost: 0.35, profit: 1.90, popularity: 0.65, usage: { teaLeaves: 0.008, cups: 1, sugar: 0.005, water: 0.25, napkin: 1 } },
  
  // Food
  'Veg Sandwich': { category: 'Food', prepTime: 4, price: 5.50, cost: 1.80, profit: 3.70, popularity: 0.8, usage: { bread: 2, cheese: 1, wrapper: 1, napkin: 1 } },
  'Paneer Sandwich': { category: 'Food', prepTime: 5, price: 6.25, cost: 2.20, profit: 4.05, popularity: 0.85, usage: { bread: 2, cheese: 1, wrapper: 1, napkin: 1 } },
  'Brownie': { category: 'Food', prepTime: 1, price: 3.50, cost: 0.90, profit: 2.60, popularity: 0.9, usage: { brownieStock: 1, napkin: 1 } },
  'Chocolate Muffin': { category: 'Food', prepTime: 1, price: 3.25, cost: 0.80, profit: 2.45, popularity: 0.85, usage: { muffinStock: 1, napkin: 1 } },
  'Blueberry Muffin': { category: 'Food', prepTime: 1, price: 3.25, cost: 0.80, profit: 2.45, popularity: 0.8, usage: { muffinStock: 1, napkin: 1 } },
  'Croissant': { category: 'Food', prepTime: 2, price: 3.00, cost: 0.70, profit: 2.30, popularity: 0.9, usage: { bread: 1, napkin: 1 } },
  'Garlic Bread': { category: 'Food', prepTime: 3, price: 4.00, cost: 1.10, profit: 2.90, popularity: 0.75, usage: { bread: 1, cheese: 1, napkin: 1 } },
  'Cookie': { category: 'Food', prepTime: 1, price: 2.00, cost: 0.45, profit: 1.55, popularity: 0.95, usage: { muffinStock: 1, napkin: 1 } },
  
  // Other
  'Hot Chocolate': { category: 'Other', prepTime: 4, price: 3.75, cost: 1.00, profit: 2.75, popularity: 0.85, usage: { milk: 0.25, chocolate: 0.03, syrups: 0.01, cups: 1, napkin: 1 } },
  'Water': { category: 'Other', prepTime: 1, price: 1.50, cost: 0.15, profit: 1.35, popularity: 0.9, usage: { cups: 1, water: 0.5, napkin: 1 } },
  'Juice': { category: 'Other', prepTime: 1, price: 3.50, cost: 1.00, profit: 2.50, popularity: 0.75, usage: { cups: 1, syrups: 0.04, water: 0.3, napkin: 1 } }
};

// Customer Archetype configurations rebranded for university campus setup
export const CUSTOMER_ARCHETYPES = {
  'Faculty': {
    type: 'Faculty',
    preferredDrinks: ['Espresso', 'Americano', 'Latte', 'Flat White', 'Masala Tea', 'Green Tea', 'Veg Sandwich', 'Croissant'],
    patienceRange: [7, 10], 
    budgetRange: [5.00, 12.00],
    loyalty: 0.85,
    visitFrequency: 0.9,
    spawnWeight: (hour) => (hour >= 7.5 && hour <= 9.0) || (hour >= 12.5 && hour <= 14.0) ? 0.6 : 0.15
  },
  'Student': {
    type: 'Student',
    preferredDrinks: ['Cold Coffee', 'Frappuccino', 'Masala Tea', 'Cookie', 'Brownie', 'Paneer Sandwich', 'Chocolate Muffin', 'Blueberry Muffin'],
    patienceRange: [10, 15],
    budgetRange: [2.00, 7.50],
    loyalty: 0.5,
    visitFrequency: 0.7,
    spawnWeight: (hour) => (hour >= 8.5 && hour <= 11.5) || (hour >= 15.0 && hour <= 18.0) ? 0.75 : 0.25
  },
  'Visitor': {
    type: 'Visitor',
    preferredDrinks: ['Latte', 'Cappuccino', 'Flat White', 'Juice', 'Water', 'Croissant', 'Garlic Bread'],
    patienceRange: [15, 22],
    budgetRange: [4.00, 10.00],
    loyalty: 0.1,
    visitFrequency: 0.1,
    spawnWeight: (hour) => (hour >= 10.0 && hour <= 15.0) ? 0.3 : 0.05
  },
  'Campus Event Guest': {
    type: 'Campus Event Guest',
    preferredDrinks: ['Latte', 'Cold Coffee', 'Hot Chocolate', 'Veg Sandwich', 'Paneer Sandwich', 'Brownie', 'Garlic Bread'],
    patienceRange: [12, 18],
    budgetRange: [8.00, 20.00],
    loyalty: 0.3,
    visitFrequency: 0.2,
    spawnWeight: (hour) => (hour >= 11.0 && hour <= 14.0) || (hour >= 17.0 && hour <= 19.0) ? 0.35 : 0.05
  },
  'Researcher': {
    type: 'Researcher',
    preferredDrinks: ['Black Tea', 'Green Tea', 'Cold Brew', 'Americano', 'Cookie', 'Blueberry Muffin'],
    patienceRange: [15, 25],
    budgetRange: [3.50, 8.00],
    loyalty: 0.8,
    visitFrequency: 0.85,
    spawnWeight: (hour) => (hour >= 9.0 && hour <= 17.0) ? 0.45 : 0.15
  }
};

// University Campus Schedule driving peak rush hour generation
export const CAMPUS_SCHEDULE = [
  { timeStart: 7.5, timeEnd: 8.5, name: 'Faculty Coffee Rush', spawnChance: 0.75, focusCategory: 'morning' },
  { timeStart: 8.5, timeEnd: 9.5, name: 'Student Breakfast Rush', spawnChance: 0.80, focusCategory: 'breakfast' },
  { timeStart: 10.5, timeEnd: 11.5, name: 'Class Break Rush', spawnChance: 0.90, focusCategory: 'break' },
  { timeStart: 13.0, timeEnd: 14.5, name: 'Lunch Rush', spawnChance: 0.85, focusCategory: 'lunch' },
  { timeStart: 15.5, timeEnd: 16.5, name: 'Afternoon Coffee Break', spawnChance: 0.70, focusCategory: 'afternoon' },
  { timeStart: 17.0, timeEnd: 18.5, name: 'Evening Snacks Rush', spawnChance: 0.65, focusCategory: 'evening' }
];

// Expanded Default State Template
const DEFAULT_STATE = {
  manager: { name: '' },
  shop: { name: '', type: 'Standard', city: 'San Francisco', operatingHours: '06:00 AM - 08:00 PM', calendarEvent: 'Normal Week' },
  simulation: { active: false, speed: 1 },
  inventory: {
    coffeeBeans: { name: 'Espresso Roast (kg)', current: 50.0, max: 100.0, price: 18.00 },
    milk: { name: 'Dairy & Oat Milk (L)', current: 40.0, max: 80.0, price: 4.50 },
    cups: { name: 'Bio-Cups (pcs)', current: 300, max: 500, price: 0.25 },
    syrups: { name: 'Flavor Syrups (L)', current: 15.0, max: 30.0, price: 9.50 },
    sugar: { name: 'Refined Sugar (kg)', current: 10.0, max: 20.0, price: 2.00 },
    chocolate: { name: 'Cocoa Powder (kg)', current: 5.0, max: 10.0, price: 12.00 },
    teaLeaves: { name: 'Organic Tea (kg)', current: 5.0, max: 10.0, price: 15.00 },
    bread: { name: 'Sandwich Bread (pcs)', current: 100, max: 200, price: 0.40 },
    cheese: { name: 'Sliced Cheese (pcs)', current: 100, max: 200, price: 0.50 },
    muffinStock: { name: 'Baked Goods (pcs)', current: 80, max: 150, price: 0.80 },
    brownieStock: { name: 'Fudge Brownies (pcs)', current: 40, max: 100, price: 1.20 },
    water: { name: 'Filtered Water (L)', current: 200.0, max: 400.0, price: 0.05 },
    napkin: { name: 'Recycled Napkins (pcs)', current: 400, max: 800, price: 0.02 },
    wrapper: { name: 'Bio Wrappers (pcs)', current: 100, max: 200, price: 0.10 }
  },
  staff: {
    list: [
      { id: 'b1', name: 'Emma', busy: false, skill: 1.2, efficiency: 1.25, quality: 0.7, stress: 0, currentOrder: null },
      { id: 'b2', name: 'Sophia', busy: false, skill: 1.0, efficiency: 1.0, quality: 1.0, stress: 0, currentOrder: null },
      { id: 'b3', name: 'Liam', busy: false, skill: 0.8, efficiency: 0.75, quality: 1.3, stress: 0, currentOrder: null }
    ],
    count: 3,
    available: 3
  },
  warnings: {
    queueExceeded: false,
    machineHealthCritical: false,
    rushHourActive: false,
    lowStock: {
      coffeeBeans: false, milk: false, cups: false, syrups: false, sugar: false, chocolate: false,
      teaLeaves: false, bread: false, cheese: false, muffinStock: false, brownieStock: false, water: false, napkin: false, wrapper: false
    }
  },
  analytics: { snapshots: [] },
  notifications: { unreadCount: 0, items: [] },
  theme: 'dark-coffee',
  memory: { acceptedRecs: [], rejectedRecs: [], chatHistory: [] },
  copilot: { active: false, soundEnabled: true, voiceEnabled: false },
  demo: { activeScenario: null },
  navigation: { currentView: 'dashboard' },
  weather: { condition: 'Sunny', temp: 24, wind: 10, humidity: 55 },
  clock: { hours: 7, minutes: 0 },
  health: 'Nominal',
  cafeReputation: 85,
  revenue: 0.00,
  orders: { completed: 0, cancelled: 0, total: 0, activeQueueCount: 0 },
  customers: { inside: 0, waiting: 0, queueLength: 0, avgWaitTime: 0, list: [] },
  machineHealth: 100,
  customerSatisfaction: 90,
  aiConfidence: 85,
  businessStatus: 'Campus Operations',
  rushHourStatus: false,
  
  // Extended Command, Predictions, Goals, and Journals fields
  campusActivity: 'Normal',
  campusPopulation: 15000,
  predictions: {
    closingRevenue: 0.0,
    queue30Min: 0,
    inventoryHoursRemaining: 12.0,
    expectedSatisfaction: 90,
    expectedReputation: 85
  },
  activeGoal: {
    type: 'Reduce Wait Time',
    progress: 75,
    eta: '20:00',
    strategy: 'Emma to Espresso bar, Liam to Registers'
  },
  performanceScore: 88,
  journal: [],
  brainInsights: []
};

// Establish window bindings immediately
window.BrewMind = window.BrewMind || {};
window.BrewMind.state = JSON.parse(JSON.stringify(DEFAULT_STATE));

// Load persisted simulation state from localStorage if available
try {
  const savedState = localStorage.getItem('brewmind_sim_state');
  if (savedState) {
    const parsed = JSON.parse(savedState);
    if (parsed.clock) window.BrewMind.state.clock = parsed.clock;
    if (parsed.revenue !== undefined) window.BrewMind.state.revenue = parsed.revenue;
    if (parsed.orders) window.BrewMind.state.orders = parsed.orders;
    if (parsed.inventory) {
      Object.keys(parsed.inventory).forEach(key => {
        if (window.BrewMind.state.inventory[key]) {
          window.BrewMind.state.inventory[key].current = parsed.inventory[key].current;
        }
      });
    }
    if (parsed.cafeReputation !== undefined) window.BrewMind.state.cafeReputation = parsed.cafeReputation;
    if (parsed.machineHealth !== undefined) window.BrewMind.state.machineHealth = parsed.machineHealth;
    if (parsed.customerSatisfaction !== undefined) window.BrewMind.state.customerSatisfaction = parsed.customerSatisfaction;
    if (parsed.journal) window.BrewMind.state.journal = parsed.journal;
    if (parsed.activeGoal) window.BrewMind.state.activeGoal = parsed.activeGoal;
  }
} catch (e) {
  console.warn("Could not load persisted simulation state:", e);
}

window.BrewMind.getState = () => {
  return JSON.parse(JSON.stringify(window.BrewMind.state));
};

window.BrewMind.setState = (newState) => {
  window.BrewMind.state = JSON.parse(JSON.stringify(newState));
  window.BrewMind.dispatch('brewmind:statechange', window.BrewMind.state);
};

window.BrewMind.updateState = (changes) => {
  const mergeDeep = (target, source) => {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  };
  mergeDeep(window.BrewMind.state, changes);
  window.BrewMind.dispatch('brewmind:statechange', window.BrewMind.state);
};

window.BrewMind.subscribe = (event, callback) => {
  window.addEventListener(event, callback);
};

window.BrewMind.unsubscribe = (event, callback) => {
  window.removeEventListener(event, callback);
};

window.BrewMind.dispatch = (event, detail) => {
  const customEvent = new CustomEvent(event, { detail });
  window.dispatchEvent(customEvent);
};

/* --- Simulation Engine Class --- */
class SimulationEngine {
  constructor() {
    this.timer = null;
    this.tickCount = 0;
    this.lastCompletedCount = 0;
    this.lastRevenueCount = 0;
    this.hourlyGrossSales = 0;
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    
    window.BrewMind.updateState({ simulation: { active: true } });
    
    const speed = window.BrewMind.state.simulation.speed || 1;
    const interval = this.getTickInterval(speed);
    
    console.log(`Simulation Engine ONLINE. Speed: x${speed} (tick every ${interval}ms)`);
    
    this.timer = setInterval(() => {
      this.tick();
    }, interval);
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    window.BrewMind.updateState({ simulation: { active: false } });
    console.log("Simulation Engine PAUSED.");
  }

  reset() {
    this.pause();
    this.tickCount = 0;
    this.lastCompletedCount = 0;
    this.lastRevenueCount = 0;
    
    const freshState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    const cur = window.BrewMind.state;
    freshState.manager.name = cur.manager.name;
    freshState.shop = cur.shop;
    freshState.theme = cur.theme;
    
    localStorage.removeItem('brewmind_sim_state');
    window.BrewMind.setState(freshState);
    console.log("Simulation Engine RESET.");
  }

  changeSpeed(factor) {
    window.BrewMind.updateState({ simulation: { speed: factor } });
    if (window.BrewMind.state.simulation.active) {
      this.start();
    }
  }

  getTickInterval(speed) {
    // 1x = 3s per simulated minute (1 hour passes in ~3 real minutes)
    // 2x = 1.5s, 5x = 600ms, 10x = 300ms
    if (speed === 1) return 3000;
    if (speed === 2) return 1500;
    if (speed === 5) return 600;
    if (speed === 10) return 300;
    return 3000;
  }

  dispatchStateChange() {
    window.BrewMind.dispatch('brewmind:statechange', window.BrewMind.getState());
  }

  /**
   * Generates a natural operational journal log every simulated hour.
   */
  writeJournalEntry(hour, state) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    const completedThisHour = state.orders.completed - this.lastCompletedCount;
    this.lastCompletedCount = state.orders.completed;

    const hourlyRevenue = this.hourlyGrossSales || 0;
    this.hourlyGrossSales = 0;
    this.lastRevenueCount = state.revenue;

    // Get previous entry if available
    const prevEntry = state.journal && state.journal.length > 0 ? state.journal[0] : null;
    const narratives = [];

    // Chronological flow connection
    if (prevEntry) {
      if (prevEntry.summary.includes('rush') && !state.rushHourStatus) {
        narratives.push(`Following this morning's rush, student traffic transitioned back to stable baseline levels.`);
      } else if (prevEntry.summary.includes('depleted') || prevEntry.summary.includes('critical')) {
        narratives.push(`Following inventory replenishment, supply metrics successfully recovered from critical warnings.`);
      } else if (state.customerSatisfaction > (prevEntry.satisfaction || 80)) {
        narratives.push(`Customer satisfaction recovered to ${state.customerSatisfaction}%, bouncing back from previous bottlenecks.`);
      } else {
        narratives.push(`Continuing operations from the previous service window, student arrivals stabilized.`);
      }
    } else {
      narratives.push(`Initial morning window opened. Baristas clocked in for equipment calibration.`);
    }

    // Dynamic operational highlights
    if (completedThisHour > 12) {
      narratives.push(`Processed ${completedThisHour} beverage transactions, generating $${hourlyRevenue.toFixed(2)} in gross sales.`);
    } else if (completedThisHour > 0) {
      narratives.push(`Fulfillment flow serviced ${completedThisHour} orders quietly, grossing $${hourlyRevenue.toFixed(2)}.`);
    } else {
      narratives.push(`Foot traffic remained low during this hour, resulting in standard sales volumes.`);
    }

    // Staffing & Quality checks
    const activeStaff = state.staff.list.map(b => b.name).join(', ');
    const highStress = state.staff.list.some(b => b.stress > 70);
    if (highStress) {
      narratives.push(`Baristas are experiencing elevated stress profiles. Queue calibration is recommended.`);
    } else {
      narratives.push(`Active roster (${activeStaff}) maintained excellent quality indices.`);
    }

    // Equipment checks
    if (state.machineHealth < 75) {
      narratives.push(`Boiler pressure variance detected on espresso lines. Machine health stands at ${state.machineHealth}%.`);
    }

    // Dynamic Recommendation
    let recommendation;
    if (state.customers.queueLength > 5) {
      recommendation = "Hiring temporary staff support would distribute register loads.";
    } else if (state.machineHealth < 70) {
      recommendation = "Schedule machine calibration to restore pressure index.";
    } else if (hourlyRevenue > 120) {
      recommendation = "Order volumes are strong; verify bean stocks coverage.";
    } else {
      recommendation = "Maintain baseline schedule parameters.";
    }

    const entry = {
      id: 'journal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      time: timeStr,
      satisfaction: state.customerSatisfaction,
      summary: narratives.join(' '),
      recommendation
    };

    state.journal = state.journal || [];
    state.journal.unshift(entry);
    if (state.journal.length > 15) {
      state.journal.pop();
    }
  }

  /**
   * Central clock increment, customer spawner, and staff task worker tick.
   */
  tick() {
    const state = window.BrewMind.getState();
    
    // 1. Advance Clock smoothly by 1 minute
    let min = state.clock.minutes + 1;
    let hr = state.clock.hours;
    if (min >= 60) {
      min = 0;
      hr = (hr + 1) % 24;
      this.writeJournalEntry(hr, state);
    }

    // 2. Schedule-based Rush Hour check
    const decimalTime = hr + min / 60;
    const activeRush = CAMPUS_SCHEDULE.find(r => decimalTime >= r.timeStart && decimalTime < r.timeEnd) || 
                       (state.demo.activeScenario === 'Morning Rush' ? { name: 'Class Break Rush (Demo)', spawnChance: 0.90, focusCategory: 'break' } : null);

    const isRushHour = activeRush !== null;
    state.rushHourStatus = isRushHour;
    state.businessStatus = isRushHour ? 'Rushing' : (state.demo.activeScenario ? 'Crisis' : 'Campus Operations');
    state.campusActivity = isRushHour ? 'Rush Hour' : (state.demo.activeScenario ? 'Exam Week' : 'Normal');

    // Expected next rush
    const upcomingRush = CAMPUS_SCHEDULE.find(r => r.timeStart > decimalTime);
    state.expectedNextRush = upcomingRush ? `${upcomingRush.name} at ${Math.floor(upcomingRush.timeStart).toString().padStart(2, '0')}:${Math.round((upcomingRush.timeStart % 1) * 60).toString().padStart(2, '0')}` : 'Closed';

    // Rises during rushes or exam scenarios
    let estPop = 12000;
    if (isRushHour) estPop += 4500;
    if (state.demo.activeScenario) estPop += 6000;
    state.campusPopulation = Math.round(estPop + (Math.random() - 0.5) * 500);

    // Rush Hour Transitions Notification checks (Alerts trigger only once)
    if (isRushHour) {
      if (!state.warnings.rushHourActive) {
        state.warnings.rushHourActive = true;
        this.addAlert('Campus Event Alert', `${activeRush.name} has started! Demand is spiking.`, 'warning');
      }
    } else {
      if (state.warnings.rushHourActive) {
        state.warnings.rushHourActive = false;
        this.addAlert('Operations Alert', 'Peak campus rush has subsided. Operations returning to baseline.', 'success');
      }
    }

    // 3. Customer Spawn Engine
    const isClosed = decimalTime < 6.0 || decimalTime >= 20.0;
    let spawnChance = 0.12; 
    if (isRushHour && activeRush) spawnChance = activeRush.spawnChance;
    if (state.weather.condition === 'Rainy') spawnChance -= 0.15;
    spawnChance *= (state.cafeReputation / 100);

    const queueLength = state.customers.list.filter(c => c.status === 'Queue').length;
    if (queueLength > 8) spawnChance -= 0.20;

    spawnChance = Math.max(0.02, Math.min(0.95, spawnChance));
    if (isClosed) spawnChance = 0.0;

    if (Math.random() < spawnChance && state.customers.list.length < 18) {
      const spawnedCustomer = this.generateCustomer(hr, state.weather.condition);
      state.customers.list.push(spawnedCustomer);
      state.orders.total += 1;
      
      window.BrewMind.dispatch('brewmind:customer', spawnedCustomer);
      
      if (spawnedCustomer.isVIP) {
        this.addAlert('Faculty Guest Arrival', `${spawnedCustomer.name} has joined the queue.`, 'info');
      }
    }

    // Group arrivals for timeline logs to reduce spam
    this.tickCount += 1;

    // 4. Queue limit warnings
    if (queueLength > 10) {
      if (!state.warnings.queueExceeded) {
        state.warnings.queueExceeded = true;
        this.addAlert('Queue Bottleneck Warning', 'Active queue size has exceeded 10 students! Consider speeding up service.', 'warning');
      }
    } else {
      state.warnings.queueExceeded = false;
    }

    // 5. Staff Processing & Queue allocation
    const activeCustomers = state.customers.list;
    const queue = activeCustomers.filter(c => c.status === 'Queue' || c.status === 'Entering');

    queue.forEach(c => {
      if (c.status === 'Entering') {
        c.status = 'Queue';
      }
    });

    let activeBaristas = state.staff.list;
    if (state.demo.activeScenario === 'Late Employee') {
      activeBaristas = state.staff.list.filter(b => b.name !== 'Emma');
    }

    const isMachineFailed = (state.machineHealth <= 0) || (state.demo.activeScenario === 'Machine Failure');
    
    // Machine Failure Warnings
    if (isMachineFailed) {
      state.machineHealth = 0;
      state.health = 'Critical';
      if (!state.warnings.machineHealthCritical) {
        state.warnings.machineHealthCritical = true;
        this.addAlert('Hardware Outage', 'Espresso Machine B experienced thermal failure! Service capacity halved.', 'danger');
      }
    } else {
      state.health = queue.length > 5 ? 'Degraded' : 'Nominal';
      if (state.warnings.machineHealthCritical) {
        state.warnings.machineHealthCritical = false;
        this.addAlert('Hardware Recovered', 'Espresso Machine regulators repaired. System running stable.', 'success');
      }
    }

    // Assign idle staff to queue
    if (!isMachineFailed) {
      activeBaristas.forEach(barista => {
        if (!barista.busy && queue.length > 0) {
          const customer = queue.shift();
          const drink = DRINK_MENU[customer.drinkType];
          
          const hasIngredients = this.checkAndConsumeInventory(state.inventory, drink.usage, state.warnings.lowStock);
          
          if (hasIngredients) {
            barista.busy = true;
            barista.currentOrder = {
              customerId: customer.id,
              drinkType: customer.drinkType,
              prepTimeRemaining: Math.ceil(drink.prepTime / barista.efficiency),
              totalPrepTime: Math.ceil(drink.prepTime / barista.efficiency),
              value: customer.orderValue
            };
            
            customer.status = 'Preparing';
            
            window.BrewMind.dispatch('brewmind:order', {
              type: 'preparing',
              customer,
              baristaName: barista.name
            });
            window.BrewMind.dispatch('brewmind:staff', barista);
          } else {
            // Cancel order due to stockout, avoiding limbo customer nodes
            customer.status = 'Cancelled';
            state.orders.cancelled += 1;
            state.cafeReputation = Math.max(0, state.cafeReputation - 2); // Small penalty for stockout
            this.addAlert('Fulfillment Halted', `Cancelled ${customer.name}'s order due to insufficient stock of ingredients for ${customer.drinkType}.`, 'danger');
            window.BrewMind.dispatch('brewmind:order', {
              type: 'cancelled',
              customer
            });
          }
        }
      });
    }

    // Progress active orders
    activeBaristas.forEach(barista => {
      if (barista.busy && barista.currentOrder) {
        const order = barista.currentOrder;
        order.prepTimeRemaining -= 1;

        barista.stress = Math.min(100, Math.max(0, barista.stress + (queue.length > 4 ? 4 : -2)));

        if (order.prepTimeRemaining <= 0) {
          const customer = activeCustomers.find(c => c.id === order.customerId);
          if (customer) {
            customer.status = 'Completed';
            customer.diningTimeRemaining = Math.floor(Math.random() * 8) + 4;
            
            let tipValue = 0;
            if (barista.quality > 1.1) {
              tipValue = order.value * 0.15;
              customer.mood = 'Excellent';
              this.addAlert('Excellent Feedback', `Faculty Guest served premium ${order.drinkType} crafted by ${barista.name}!`, 'success');
            } else if (barista.quality < 0.8 && Math.random() < 0.25) {
              customer.mood = 'Bored';
              this.addAlert('Customer Complaint', `Student noted slight quality discrepancy on ${barista.name}'s craft.`, 'warning');
              state.cafeReputation = Math.max(0, state.cafeReputation - 2);
            }
            
            const finalCash = parseFloat((order.value + tipValue).toFixed(2));
            state.revenue = parseFloat((state.revenue + finalCash).toFixed(2));
            state.orders.completed += 1;
            this.hourlyGrossSales = (this.hourlyGrossSales || 0) + finalCash;
            
            state.orders.sales = state.orders.sales || {};
            state.orders.sales[order.drinkType] = (state.orders.sales[order.drinkType] || 0) + 1;
            
            // Recalculate average wait time in minutes
            state.orders.totalWaitTime = (state.orders.totalWaitTime || 0) + customer.waitingTime;
            state.customers.avgWaitTime = parseFloat((state.orders.totalWaitTime / state.orders.completed).toFixed(1));
            
            window.BrewMind.dispatch('brewmind:revenue', { amount: finalCash, total: state.revenue });
            window.BrewMind.dispatch('brewmind:order', {
              type: 'completed',
              customer,
              value: finalCash
            });
          }

          barista.busy = false;
          barista.currentOrder = null;
          window.BrewMind.dispatch('brewmind:staff', barista);
        }
      }
    });

    // 6. Decay Patience & Abandonment
    activeCustomers.forEach(customer => {
      if (customer.status === 'Queue' || customer.status === 'Preparing') {
        customer.patience -= 1;
        customer.waitingTime += 1;

        const ratio = customer.waitingTime / customer.waitingTolerance;
        if (ratio <= 0.35) customer.mood = 'Excellent';
        else if (ratio <= 0.65) customer.mood = 'Good';
        else if (ratio <= 0.85) customer.mood = 'Bored';
        else if (ratio <= 1.0) customer.mood = 'Impatient';
        else customer.mood = 'Angry';

        if (customer.patience <= 0 && customer.status === 'Queue') {
          customer.status = 'Cancelled';
          state.orders.cancelled += 1;
          state.cafeReputation = Math.max(0, state.cafeReputation - 4);
          
          this.addAlert('Student Left Queue', `${customer.name} left due to long waiting delay.`, 'warning');
          window.BrewMind.dispatch('brewmind:order', {
            type: 'cancelled',
            customer
          });
        }
      }
    });

    // Progress dining customers
    activeCustomers.forEach(customer => {
      if (customer.status === 'Completed') {
        customer.diningTimeRemaining = (customer.diningTimeRemaining || 5) - 1;
        if (customer.diningTimeRemaining <= 0) {
          customer.status = 'Leaving';
          console.log(`Student Departure: ${customer.name} finished their coffee and left.`);
        }
      }
    });

    // Remove leaving entities
    const remainingCustomers = activeCustomers.filter(c => {
      if (c.status === 'Cancelled') {
        c.status = 'Leaving';
        return true;
      }
      return c.status !== 'Leaving';
    });

    state.customers.list = remainingCustomers;
    state.customers.inside = remainingCustomers.length;
    state.customers.waiting = remainingCustomers.filter(c => c.status === 'Queue').length;
    state.customers.queueLength = state.customers.waiting;
    state.orders.activeQueueCount = state.customers.waiting;

    // Recalc Satisfaction
    if (remainingCustomers.length > 0) {
      let satisfactionSum = 0;
      remainingCustomers.forEach(c => {
        if (c.mood === 'Excellent') satisfactionSum += 100;
        else if (c.mood === 'Good') satisfactionSum += 80;
        else if (c.mood === 'Bored') satisfactionSum += 50;
        else if (c.mood === 'Impatient') satisfactionSum += 30;
        else satisfactionSum += 10;
      });
      state.customerSatisfaction = Math.round(satisfactionSum / remainingCustomers.length);
    } else {
      state.customerSatisfaction = 90;
    }

    // Rolling reputation math
    const queuePenalty = Math.max(0, (state.customers.queueLength - 3) * 2.5);
    const targetRep = Math.max(10, Math.min(100, state.customerSatisfaction - queuePenalty));
    state.cafeReputation = Math.round(state.cafeReputation * 0.95 + targetRep * 0.05);

    // Save state clock
    state.clock = { hours: hr, minutes: min };

    // --- Dynamic Goal, Predictions, Performance, and Observations Evaluators ---
    
    // Update active goal progress
    const goalType = state.activeGoal?.type || 'Reduce Wait Time';
    let progress = 75;
    let strategy = 'Emma to Espresso bar, Liam to Registers';
    if (goalType === 'Reduce Wait Time') {
      const wait = state.customers.avgWaitTime || 1.2;
      progress = Math.max(10, Math.min(100, Math.round(100 - wait * 18)));
      strategy = 'Emma to Espresso bar, Liam to Registers.';
    } else if (goalType === 'Maximize Revenue') {
      progress = Math.min(100, Math.round((state.revenue / 600) * 100));
      strategy = 'Offer baked goods and premium single-origin cold brews.';
    } else if (goalType === 'Minimize Waste') {
      progress = 94;
      strategy = 'Recipe portioning and strict tracking of dairy stocks.';
    } else if (goalType === 'Increase Satisfaction') {
      progress = state.customerSatisfaction;
      strategy = 'Liam to Espresso to craft premium quality drinks.';
    } else if (goalType === 'Improve Reputation') {
      progress = state.cafeReputation;
      strategy = 'Maintain minimal queue line sizes to optimize ratings.';
    }
    state.activeGoal = {
      type: goalType,
      progress,
      eta: '20:00',
      strategy
    };

    // Overall Performance Score
    const avgStress = state.staff.list.reduce((acc, curr) => acc + curr.stress, 0) / state.staff.list.length;
    const performance = Math.round(
      state.customerSatisfaction * 0.3 +
      state.cafeReputation * 0.25 +
      state.machineHealth * 0.15 +
      Math.max(0, 100 - state.customers.queueLength * 4) * 0.15 +
      (100 - avgStress) * 0.15
    );
    state.performanceScore = Math.max(10, Math.min(100, performance));

    // Predictions
    const hoursLeft = Math.max(0, 20 - decimalTime);
    const hourlyRate = decimalTime > 7 ? state.revenue / (decimalTime - 7 + 0.1) : 45.00;
    const closingRev = state.revenue + (hourlyRate * hoursLeft * (state.rushHourStatus ? 1.4 : 0.8));
    
    let lowestHours = 12.0;
    Object.keys(state.inventory).forEach(key => {
      const item = state.inventory[key];
      const depletionRate = (item.max - item.current) / (decimalTime - 6 + 0.1);
      if (depletionRate > 0.01) {
        const itemHours = item.current / depletionRate;
        if (itemHours < lowestHours) lowestHours = itemHours;
      }
    });

    state.predictions = {
      closingRevenue: parseFloat(closingRev.toFixed(2)),
      queue30Min: Math.max(0, Math.min(15, state.customers.queueLength + (state.rushHourStatus ? Math.floor(Math.random() * 4) + 1 : -Math.floor(Math.random() * 2)))),
      inventoryHoursRemaining: parseFloat(Math.max(1.5, Math.min(24.0, lowestHours)).toFixed(1)),
      expectedSatisfaction: Math.max(50, Math.min(100, Math.round(state.customerSatisfaction * 0.95 + (100 - state.customers.queueLength * 3) * 0.05))),
      expectedReputation: Math.max(50, Math.min(100, Math.round(state.cafeReputation * 0.98 + state.customerSatisfaction * 0.02)))
    };

    // Evaluate BrewMind Brain Observations
    state.brainInsights = generateObservations(state);

    window.BrewMind.setState(state);

    // Save state fields to LocalStorage
    try {
      localStorage.setItem('brewmind_sim_state', JSON.stringify({
        clock: state.clock,
        revenue: state.revenue,
        orders: state.orders,
        inventory: state.inventory,
        cafeReputation: state.cafeReputation,
        machineHealth: state.machineHealth,
        customerSatisfaction: state.customerSatisfaction,
        journal: state.journal,
        activeGoal: state.activeGoal
      }));
    } catch (e) {
      console.warn("Error saving simulation state to LocalStorage:", e);
    }
  }

  /**
   * Rebranded weighted customer archetype and drink menu selections based on campus schedule.
   */
  generateCustomer(hour, weatherCondition) {
    const archetypes = Object.values(CUSTOMER_ARCHETYPES);
    const weights = archetypes.map(arc => arc.spawnWeight(hour));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let archetype = CUSTOMER_ARCHETYPES['Student']; 
    let rand = Math.random() * totalWeight;
    let sum = 0;
    for (let i = 0; i < archetypes.length; i++) {
      sum += weights[i];
      if (rand <= sum) {
        archetype = archetypes[i];
        break;
      }
    }

    const isVIP = (archetype.type === 'Faculty' && Math.random() < 0.15) || (Math.random() < 0.05);

    let categoryFocus = 'Coffee';
    if (hour < 10.5) categoryFocus = 'morning';
    else if (hour >= 12 && hour < 14.5) categoryFocus = 'lunch';
    else if (hour >= 16.5 && hour < 20) categoryFocus = 'evening';
    else categoryFocus = 'break';

    const menuKeys = Object.keys(DRINK_MENU);
    const itemsWithWeight = menuKeys.map(key => {
      const item = DRINK_MENU[key];
      let weight = item.popularity;
      
      if (categoryFocus === 'morning') {
        if (item.category === 'Coffee' || item.category === 'Tea') weight *= 2.5;
        else if (item.category === 'Food' && (key === 'Croissant' || key === 'Chocolate Muffin')) weight *= 1.5;
        else if (item.category === 'Cold Drinks') weight *= 0.5;
      } else if (categoryFocus === 'lunch') {
        if (item.category === 'Food' && (key.includes('Sandwich') || key === 'Garlic Bread')) weight *= 3.5;
        else if (item.category === 'Other' || item.category === 'Cold Drinks') weight *= 1.8;
        else if (item.category === 'Coffee') weight *= 0.4;
      } else if (categoryFocus === 'evening') {
        if (item.category === 'Food' && (key === 'Brownie' || key === 'Cookie')) weight *= 2.5;
        if (item.category === 'Tea') weight *= 1.8;
        if (item.category === 'Coffee') weight *= 0.8;
      }

      if (weatherCondition === 'Rainy' || weatherCondition === 'Cloudy') {
        if (item.category === 'Cold Drinks') weight *= 0.3;
        else if (key === 'Hot Chocolate' || item.category === 'Tea' || item.category === 'Coffee') weight *= 1.6;
      } else if (weatherCondition === 'Sunny') {
        if (item.category === 'Cold Drinks') weight *= 1.8;
        else if (key === 'Hot Chocolate') weight *= 0.4;
      }

      return { key, weight };
    });

    const totalItemWeight = itemsWithWeight.reduce((a, b) => a + b.weight, 0);
    let itemRand = Math.random() * totalItemWeight;
    let drinkType = menuKeys[0];
    let itemSum = 0;
    for (let i = 0; i < itemsWithWeight.length; i++) {
      itemSum += itemsWithWeight[i].weight;
      if (itemRand <= itemSum) {
        drinkType = itemsWithWeight[i].key;
        break;
      }
    }

    const baseDrink = DRINK_MENU[drinkType];
    const patience = Math.floor(
      archetype.patienceRange[0] + 
      Math.random() * (archetype.patienceRange[1] - archetype.patienceRange[0])
    );
    const budget = archetype.budgetRange[0] + Math.random() * (archetype.budgetRange[1] - archetype.budgetRange[0]);
    const customerId = 'cust_' + Math.random().toString(36).substr(2, 9);
    
    return {
      id: customerId,
      name: (isVIP ? 'Faculty Guest ' : '') + archetype.type + ' #' + customerId.substr(5, 3).toUpperCase(),
      archetype: archetype.type,
      drinkType: drinkType,
      arrivalTime: `${hour.toString().padStart(2, '0')}:${Math.floor(Math.random()*60).toString().padStart(2, '0')}`,
      patience: isVIP ? patience * 2 : patience,
      waitingTolerance: isVIP ? patience * 2 : patience,
      orderValue: baseDrink.price,
      waitingTime: 0,
      mood: 'Excellent',
      status: 'Entering',
      loyalty: archetype.loyalty,
      budget: budget,
      isVIP: isVIP
    };
  }

  /**
   * Consume stock ingredients and trigger low-capacity alerts only once on transition.
   */
  checkAndConsumeInventory(inventory, usage, warningCache) {
    if (!usage) return true;
    
    for (const key in usage) {
      if (!inventory[key] || inventory[key].current < usage[key]) {
        return false;
      }
    }

    for (const key in usage) {
      inventory[key].current = parseFloat((inventory[key].current - usage[key]).toFixed(3));
      
      const pct = (inventory[key].current / inventory[key].max) * 100;
      if (pct < 15) {
        if (!warningCache[key]) {
          warningCache[key] = true;
          this.addAlert('Inventory Alert', `${inventory[key].name.split(' (')[0]} stock is critical (<15% remaining).`, 'danger');
        }
      } else {
        warningCache[key] = false;
      }
    }

    window.BrewMind.dispatch('brewmind:inventory', inventory);
    return true;
  }

  /**
   * Adds operational alert logs and dispatches system notification badges.
   */
  addAlert(title, message, type) {
    const state = window.BrewMind.getState();
    const newAlert = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title,
      message,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    state.notifications.items.unshift(newAlert);
    state.notifications.unreadCount += 1;
    window.BrewMind.setState(state);
    
    window.BrewMind.dispatch('brewmind:alert', newAlert);
    window.BrewMind.dispatch('brewmind:toast', {
      title,
      message,
      type
    });
  }

  /* --- Manual Trigger Overrides --- */
  spawnCustomer() {
    const state = window.BrewMind.getState();
    const hr = state.clock.hours;
    const customer = this.generateCustomer(hr, state.weather.condition);
    state.customers.list.push(customer);
    state.orders.total += 1;
    window.BrewMind.setState(state);
    window.BrewMind.dispatch('brewmind:customer', customer);
    this.addAlert('Manual Dispatch', `Spawned ${customer.name} manually.`, 'info');
  }

  spawnRush() {
    window.BrewMind.updateState({ demo: { activeScenario: 'Morning Rush' } });
    this.addAlert('Scenario Triggered', `Morning Rush event started. Customer rate maximized.`, 'warning');
  }

  spawnVIP() {
    const state = window.BrewMind.getState();
    const hr = state.clock.hours;
    const customer = this.generateCustomer(hr, state.weather.condition);
    customer.isVIP = true;
    customer.name = 'Faculty Guest ' + customer.name;
    state.customers.list.push(customer);
    state.orders.total += 1;
    window.BrewMind.setState(state);
    window.BrewMind.dispatch('brewmind:customer', customer);
    this.addAlert('Faculty Guest Dispatch', `Faculty Guest ${customer.name} has arrived at the café!`, 'success');
  }

  triggerMachineFailure() {
    window.BrewMind.updateState({ machineHealth: 0, demo: { activeScenario: 'Machine Failure' } });
  }

  triggerInventoryCrisis() {
    const state = window.BrewMind.getState();
    state.inventory.coffeeBeans.current = 1.2;
    state.inventory.milk.current = 0.8;
    state.demo.activeScenario = 'Inventory Crisis';
    window.BrewMind.setState(state);
    this.addAlert('Inventory Crisis', `Espresso beans and milk stocks depleted!`, 'danger');
  }

  /**
   * Sandbox simulation sandbox runner (clones current state and ticks it forward).
   */
  runWhatIfSimulation(duration = 240, modifications = {}) {
    const liveState = window.BrewMind.getState();
    const clone = JSON.parse(JSON.stringify(liveState));
    
    // Apply initial sandbox modifiers
    if (modifications.weather) {
      clone.weather.condition = modifications.weather;
      if (modifications.weather === 'Rainy') {
        clone.weather.temp = 12;
      }
    }
    if (modifications.forceMachineFailure) {
      clone.machineHealth = 0;
      clone.demo.activeScenario = 'Machine Failure';
    }
    if (modifications.addTempBarista) {
      const names = ['Jordan', 'Taylor', 'Sam', 'Casey', 'Robin'];
      const skills = ['Junior', 'Intermediate', 'Senior'];
      const name = names[Math.floor(Math.random() * names.length)];
      const skill = skills[Math.floor(Math.random() * skills.length)];
      let efficiency = 1.05;
      if (skill === 'Junior') efficiency = 0.85;
      else if (skill === 'Senior') efficiency = 1.35;

      clone.staff.list.push({
        name: `${name} (${skill} Helper)`,
        busy: false,
        efficiency: efficiency,
        skill: skill,
        ordersServed: 0,
        currentOrder: null
      });
    }

    // Run ticks quietly in memory
    for (let tick = 0; tick < duration; tick++) {
      this.sandboxTick(clone, modifications);
    }
    
    return clone;
  }

  sandboxTick(state, mods) {
    state.clock.minutes += 1;
    if (state.clock.minutes >= 60) {
      state.clock.minutes = 0;
      state.clock.hours = (state.clock.hours + 1) % 24;
    }
    const hour = state.clock.hours;

    const arrivalMult = mods.arrivalMultiplier || 1.0;
    let spawnChance = 0.12 * arrivalMult;
    if (state.weather.condition === 'Rainy') spawnChance -= 0.08;
    
    spawnChance = Math.max(0.02, Math.min(0.95, spawnChance));
    
    if (Math.random() < spawnChance && state.customers.list.length < 18) {
      const budget = 5 + Math.round(Math.random() * 15);
      const categories = ['Espresso', 'Latte', 'Capuccino', 'Matcha', 'Croissant', 'Muffin'];
      const drinkType = categories[Math.floor(Math.random() * categories.length)];

      state.customers.list.push({
        id: 'sb_cust_' + Math.random(),
        name: 'Student',
        archetype: 'Student',
        drinkType,
        patience: 12 + Math.floor(Math.random() * 8),
        orderValue: 4.5 + (mods.lattePriceOffset || 0),
        status: 'Queue',
        isVIP: Math.random() < 0.05
      });
      state.orders.total += 1;
    }

    const isMachineFailed = state.machineHealth <= 0 || mods.forceMachineFailure;
    const activeBaristas = state.staff.list;
    const queue = state.customers.list.filter(c => c.status === 'Queue');

    if (!isMachineFailed) {
      activeBaristas.forEach(barista => {
        if (!barista.busy && queue.length > 0) {
          const customer = queue.shift();
          customer.status = 'Preparing';
          barista.busy = true;
          barista.currentOrder = {
            customerId: customer.id,
            prepTimeRemaining: 2,
            value: customer.orderValue
          };
        }
      });
    }

    activeBaristas.forEach(barista => {
      if (barista.busy && barista.currentOrder) {
        barista.currentOrder.prepTimeRemaining -= 1;
        if (barista.currentOrder.prepTimeRemaining <= 0) {
          state.orders.completed += 1;
          state.revenue = parseFloat((state.revenue + barista.currentOrder.value).toFixed(2));
          state.customers.list = state.customers.list.filter(c => c.id !== barista.currentOrder.customerId);
          barista.busy = false;
          barista.currentOrder = null;
        }
      }
    });

    state.customers.list.forEach(customer => {
      if (customer.status === 'Queue') {
        customer.patience -= 1;
        if (customer.patience <= 0) {
          customer.status = 'Cancelled';
          state.orders.cancelled += 1;
          state.cafeReputation = Math.max(0, state.cafeReputation - 2);
        }
      }
    });

    state.customers.list = state.customers.list.filter(c => c.status !== 'Cancelled');
    
    const totalOrders = state.orders.completed + state.orders.cancelled || 1;
    state.customerSatisfaction = Math.round((state.orders.completed / totalOrders) * 100);
  }
}

export const simulation = new SimulationEngine();
window.BrewMind.simulation = simulation;
