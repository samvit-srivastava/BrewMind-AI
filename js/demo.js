import { soundEffects } from './utils.js';
import { simulation } from './simulation.js';

class DemoController {
  constructor() {
    this.drawer = null;
    this.cards = [];
    this.isDrawerOpen = false;
  }

  /**
   * Initialize DOM hooks.
   */
  init() {
    this.drawer = document.getElementById('demo-drawer');
    this.cards = document.querySelectorAll('.demo-card');

    if (!this.drawer) return;

    this.bindEvents();
    
    console.log("Demo Controller Panel active.");
  }

  /**
   * Binds click controls and keystrokes.
   */
  bindEvents() {
    // Floating button toggle
    const floatBtn = document.getElementById('float-demo-trigger');
    if (floatBtn) {
      floatBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.toggleDrawer();
      });
    }

    // Drawer close button click
    const closeBtn = document.getElementById('demo-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        soundEffects.playClick();
        this.closeDrawer();
      });
    }

    // Bind demo scenario card click events
    this.cards.forEach(card => {
      card.addEventListener('click', () => {
        const scenario = card.getAttribute('data-scenario');
        this.triggerScenario(scenario);
      });
    });
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
    gsap.fromTo(this.drawer.querySelectorAll('.drawer-header, #demo-drawer-close, .drawer-body p'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }
    );

    // Stagger all scenario cards
    if (this.cards && this.cards.length > 0) {
      gsap.fromTo(this.cards, 
        { opacity: 0, y: 35, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'back.out(1.4)', delay: 0.15 }
      );
    }
  }

  closeDrawer() {
    if (!this.drawer) return;
    this.isDrawerOpen = false;
    this.drawer.classList.remove('open');
  }

  /**
   * Executes preset parameters on the simulation state.
   * @param {string} scenarioId 
   */
  triggerScenario(scenarioId) {
    soundEffects.playClick();
    
    let title = '';
    let message = '';
    let type = 'info';

    switch (scenarioId) {
      case 'morning-rush':
        simulation.spawnRush();
        title = 'Morning Rush Simulation';
        message = 'Customer arrival rates spiked. Service queues compiling...';
        type = 'warning';
        soundEffects.playAlert();
        break;
      case 'machine-failure':
        simulation.triggerMachineFailure();
        title = 'Hardware Alert';
        message = 'Espresso Machine B experienced thermal failure. Output capacity down 100%.';
        type = 'danger';
        soundEffects.playAlert();
        break;
      case 'employee-late':
        window.BrewMind.updateState({ demo: { activeScenario: 'Late Employee' } });
        simulation.addAlert('Scheduling Crisis', 'Emma is late for her shift! Staff count reduced.', 'warning');
        title = 'Scheduling Issue';
        message = 'Emma is late. Average order processing latency increased.';
        type = 'warning';
        soundEffects.playAlert();
        break;
      case 'inventory-crisis':
        simulation.triggerInventoryCrisis();
        title = 'Inventory Warning';
        message = 'Critical Stock levels detected for Coffee Beans and Dairy Milk.';
        type = 'danger';
        soundEffects.playAlert();
        break;
      case 'rainy-day':
        window.BrewMind.updateState({ weather: { condition: 'Rainy', temp: 14 } });
        simulation.addAlert('Weather Alert', 'Rainy conditions active. Specialty warm drinks popularity adjusted.', 'info');
        title = 'Weather Anomaly';
        message = 'External rain conditions active. Specialty warm drinks popularity adjusted.';
        type = 'info';
        break;
      case 'reset':
        simulation.reset();
        title = 'Simulation Reset';
        message = 'Operational state restored. Queue flushed, hardware online.';
        type = 'success';
        soundEffects.playSuccess();
        break;
    }

    // Auto close drawer to let judges watch the stats update
    setTimeout(() => {
      this.closeDrawer();
    }, 400);
  }
}

export const demoController = new DemoController();
