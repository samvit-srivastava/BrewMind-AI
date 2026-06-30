/* -------------------------------------------------------------
 * BREWMIND AI - Digital Twin View Controller
 * ------------------------------------------------------------- */

import { DRINK_MENU } from './simulation.js';

class DigitalTwin {
  constructor() {
    this.container = null;
    this.svg = null;
    this.isInitialized = false;
    this.customerNodes = {}; // Tracks active student SVG groups by customerId
    this.seatOccupants = {}; // Tracks occupied chair coordinates
  }

  /**
   * Initializes the Digital Twin view canvas hooks.
   * @param {HTMLElement} containerElement 
   */
  init(containerElement) {
    if (!containerElement) return;
    this.container = containerElement;
    
    if (this.isInitialized) {
      this.handleStateUpdate(window.BrewMind.getState());
      return;
    }
    
    this.isInitialized = true;
    this.customerNodes = {};
    this.seatOccupants = {};
    
    this.setupViewport();
    this.bindEvents();
    this.initAnimations();
    
    console.log("Digital Twin Workspace initialized with animated pathfinding.");
  }

  /**
   * Setup vectors, scales and background maps.
   */
  setupViewport() {
    this.container.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; position: relative; overflow: hidden; padding: 1rem; gap: 1rem;">
        
        <!-- Absolute Tooltip Overlay -->
        <div id="twin-tooltip" style="position: absolute; display: none; background: rgba(16, 12, 10, 0.95); border: 1px solid var(--glass-border); padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.72rem; color: #FFF; pointer-events: none; z-index: 200; box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-family: var(--font-sans); line-height: 1.35;"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; z-index: 5;">
          <div>
            <h3 class="panel-title">Operations Twin Map</h3>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">Interactive Digital Twin mapping live barista movements, path transitions, and steam telemetry.</p>
          </div>
          <div style="display: flex; gap: 1rem; font-size: 0.72rem; color: var(--text-secondary); background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 0.4rem 0.8rem; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 0.3rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--color-success);"></span> Excel/Good</div>
            <div style="display: flex; align-items: center; gap: 0.3rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--color-warning);"></span> Bored</div>
            <div style="display: flex; align-items: center; gap: 0.3rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--color-danger);"></span> Impatient</div>
          </div>
        </div>

        <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; position: relative;">
          <svg id="twin-svg" viewBox="0 0 600 400" style="width:100%; height:100%; max-height: 480px; background:#070504; border: 1px solid var(--glass-border); border-radius:16px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
            <defs>
              <pattern id="twin-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(212, 163, 115, 0.02)" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="600" height="400" fill="url(#twin-grid)" />

            <!-- Shop floor outline elements -->
            <!-- Counter block -->
            <rect x="50" y="145" width="500" height="40" rx="8" fill="#18110E" stroke="rgba(212, 163, 115, 0.15)" stroke-width="1.5" />
            <text x="300" y="170" fill="rgba(255,255,255,0.15)" font-size="10" font-weight="600" text-anchor="middle" letter-spacing="1.5">SERVICE & PICKUP COUNTER</text>

            <!-- Espresso Machine A -->
            <g id="espresso-machine-1" transform="translate(160, 100)">
              <rect width="45" height="32" rx="4" fill="#241B17" stroke="#D4A373" stroke-width="1.5" />
              <circle id="machine-light-1" cx="8" cy="8" r="3" fill="#10B981" />
              <path d="M 15 30 L 15 38 M 30 30 L 30 38" stroke="#D4A373" stroke-width="1.8"/>
              <text x="22.5" y="21" fill="#FFF" font-size="7" text-anchor="middle" font-weight="700">ESPR-A</text>
              
              <!-- Steam Paths -->
              <path class="twin-steam-line" d="M 15 -2 Q 13 -8 15 -14 T 15 -20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round" />
              <path class="twin-steam-line" d="M 30 -2 Q 28 -8 30 -14 T 30 -20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round" />
            </g>
            
            <!-- Espresso Machine B -->
            <g id="espresso-machine-2" transform="translate(240, 100)">
              <rect width="45" height="32" rx="4" fill="#241B17" stroke="#D4A373" stroke-width="1.5" />
              <circle id="machine-light-2" cx="8" cy="8" r="3" fill="#10B981" />
              <path d="M 15 30 L 15 38 M 30 30 L 30 38" stroke="#D4A373" stroke-width="1.8"/>
              <text x="22.5" y="21" fill="#FFF" font-size="7" text-anchor="middle" font-weight="700">ESPR-B</text>
              
              <!-- Steam Paths -->
              <path class="twin-steam-line" d="M 15 -2 Q 13 -8 15 -14 T 15 -20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round" />
              <path class="twin-steam-line" d="M 30 -2 Q 28 -8 30 -14 T 30 -20" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round" />
            </g>

            <!-- POS Counter -->
            <g id="register-desk" transform="translate(435, 110)">
              <rect width="40" height="24" rx="3" fill="#2D221D" stroke="#D4A373" stroke-width="1.2" />
              <text x="20" y="15" fill="#FFF" font-size="8" text-anchor="middle">POS-01</text>
            </g>

            <!-- Baristas -->
            <g id="barista-emma" transform="translate(130, 115)">
              <circle r="15" fill="rgba(16, 185, 129, 0.1)" stroke="var(--color-success)" stroke-width="2" id="barista-emma-ring" style="transition: stroke 0.4s ease;" />
              <text y="3" fill="#D4A373" font-size="9" font-weight="bold" text-anchor="middle">EM</text>
              <text y="-18" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Emma</text>
            </g>
            <g id="barista-sophia" transform="translate(210, 115)">
              <circle r="15" fill="rgba(16, 185, 129, 0.1)" stroke="var(--color-success)" stroke-width="2" id="barista-sophia-ring" style="transition: stroke 0.4s ease;" />
              <text y="3" fill="#D4A373" font-size="9" font-weight="bold" text-anchor="middle">SO</text>
              <text y="-18" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Sophia</text>
            </g>
            <g id="barista-liam" transform="translate(290, 115)">
              <circle r="15" fill="rgba(16, 185, 129, 0.1)" stroke="var(--color-success)" stroke-width="2" id="barista-liam-ring" style="transition: stroke 0.4s ease;" />
              <text y="3" fill="#D4A373" font-size="9" font-weight="bold" text-anchor="middle">LI</text>
              <text y="-18" fill="var(--text-secondary)" font-size="8" text-anchor="middle">Liam</text>
            </g>

            <!-- Dining Tables with seat outline anchors -->
            <g id="table-1" transform="translate(110, 270)">
              <circle r="22" fill="#1C1410" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
              <circle cx="-25" cy="0" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-1-left" />
              <circle cx="25" cy="0" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-1-right" />
              <text y="3" fill="rgba(255,255,255,0.2)" font-size="8" text-anchor="middle">TABLE-1</text>
            </g>
            
            <g id="table-2" transform="translate(250, 270)">
              <circle r="22" fill="#1C1410" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
              <circle cx="-25" cy="0" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-2-left" />
              <circle cx="25" cy="0" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-2-right" />
              <text y="3" fill="rgba(255,255,255,0.2)" font-size="8" text-anchor="middle">TABLE-2</text>
            </g>

            <g id="table-3" transform="translate(390, 270)">
              <circle r="22" fill="#1C1410" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
              <circle cx="0" cy="-25" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-3-top" />
              <circle cx="0" cy="25" r="6" fill="#120D0B" stroke="var(--color-success)" stroke-width="1" id="seat-3-bottom" />
              <text y="3" fill="rgba(255,255,255,0.2)" font-size="8" text-anchor="middle">TABLE-3</text>
            </g>

            <!-- Door outline doors -->
            <path d="M 520 310 L 520 370" stroke="rgba(255,255,255,0.12)" stroke-width="2" stroke-dasharray="3 3" />
            <rect x="515" y="325" width="20" height="4" fill="var(--color-primary)" transform="rotate(-40, 515, 325)" />
            <text x="475" y="365" fill="rgba(255,255,255,0.2)" font-size="8" font-weight="bold">ENTRY</text>

            <!-- Live Customer Dots Container -->
            <g id="twin-customers-container"></g>
          </svg>
        </div>
      </div>
    `;
  }

  bindEvents() {
    window.addEventListener('brewmind:statechange', (e) => {
      if (!this.isInitialized) return;
      this.handleStateUpdate(e.detail);
    });
  }

  initAnimations() {
    // Premium animated rising steam paths
    gsap.fromTo('.twin-steam-line',
      { y: 4, opacity: 0 },
      { y: -12, opacity: 0.65, duration: 1.5, repeat: -1, stagger: 0.3, ease: 'sine.inOut' }
    );
  }

  /**
   * Translates simulation states to coordinate movements on the SVG floorplan using GSAP.
   * @param {Object} state 
   */
  handleStateUpdate(state) {
    const container = document.getElementById('twin-customers-container');
    const tooltip = document.getElementById('twin-tooltip');
    if (!container) return;

    // Queue line coordinate slots
    const queueCoords = [
      { x: 455, y: 190 },
      { x: 455, y: 220 },
      { x: 455, y: 250 },
      { x: 415, y: 250 },
      { x: 375, y: 250 },
      { x: 335, y: 250 },
      { x: 295, y: 250 }
    ];

    // Barista rings status + small walking shifts when preparing
    state.staff.list.forEach(b => {
      const ring = document.getElementById(`barista-${b.name.toLowerCase()}-ring`);
      const group = document.getElementById(`barista-${b.name.toLowerCase()}`);
      if (ring && group) {
        if (b.busy) {
          ring.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
          ring.setAttribute('stroke', 'var(--color-warning)');
          
          // Animate shift closer to espresso machine
          gsap.to(group, { attr: { transform: `translate(${b.name === 'Emma' ? 145 : (b.name === 'Sophia' ? 220 : 275)}, 105)` }, duration: 0.6 });
        } else {
          ring.setAttribute('fill', 'rgba(16, 185, 129, 0.1)');
          ring.setAttribute('stroke', 'var(--color-success)');
          
          // Return to baseline
          gsap.to(group, { attr: { transform: `translate(${b.name === 'Emma' ? 130 : (b.name === 'Sophia' ? 210 : 290)}, 115)` }, duration: 0.6 });
        }
      }
    });

    // Machines glows
    const mLight1 = document.getElementById('machine-light-1');
    const mLight2 = document.getElementById('machine-light-2');
    if (mLight1 && mLight2) {
      if (state.machineHealth <= 0 || state.demo.activeScenario === 'Machine Failure') {
        mLight1.setAttribute('fill', 'var(--color-danger)');
        mLight2.setAttribute('fill', 'var(--color-danger)');
      } else {
        // Blink light green if busy
        const emmaBusy = state.staff.list.find(b => b.name === 'Emma')?.busy;
        const sophiaBusy = state.staff.list.find(b => b.name === 'Sophia')?.busy;
        mLight1.setAttribute('fill', emmaBusy ? 'var(--color-primary)' : 'var(--color-success)');
        mLight2.setAttribute('fill', sophiaBusy ? 'var(--color-primary)' : 'var(--color-success)');
      }
    }

    // Chair seats highlights
    const seats = {
      'seat-1-left': false, 'seat-1-right': false,
      'seat-2-left': false, 'seat-2-right': false,
      'seat-3-top': false, 'seat-3-bottom': false
    };

    // Keep track of which customer is in the rendering cycle
    const currentCustomersMap = {};

    let queueIdx = 0;
    state.customers.list.forEach(c => {
      currentCustomersMap[c.id] = true;

      // Determine coordinates target
      let targetX = 520;
      let targetY = 345;
      let isQueued = false;
      let queueBadgeNum = 0;

      if (c.status === 'Queue') {
        const slot = queueCoords[Math.min(queueIdx, queueCoords.length - 1)];
        targetX = slot.x;
        targetY = slot.y;
        queueBadgeNum = queueIdx + 1;
        queueIdx++;
        isQueued = true;
      } else if (c.status === 'Preparing') {
        // Standing at pickup bar
        targetX = 180 + (c.id.charCodeAt(5) % 3) * 35;
        targetY = 185;
      } else if (c.status === 'Completed' || c.status === 'Leaving') {
        // Sit at table chairs
        const val = c.id.charCodeAt(5) % 3;
        if (val === 0) {
          if (!seats['seat-1-left']) { targetX = 85; targetY = 270; seats['seat-1-left'] = true; }
          else { targetX = 135; targetY = 270; seats['seat-1-right'] = true; }
        } else if (val === 1) {
          if (!seats['seat-2-left']) { targetX = 225; targetY = 270; seats['seat-2-left'] = true; }
          else { targetX = 275; targetY = 270; seats['seat-2-right'] = true; }
        } else {
          if (!seats['seat-3-top']) { targetX = 390; targetY = 245; seats['seat-3-top'] = true; }
          else { targetX = 390; targetY = 295; seats['seat-3-bottom'] = true; }
        }
      }

      // Check if node exists, if not create one at doorway
      let group = this.customerNodes[c.id];
      if (!group) {
        group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', `twin-node-${c.id}`);
        group.setAttribute('transform', `translate(520, 345)`);
        group.style.cursor = 'pointer';

        // Base circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '8');
        circle.setAttribute('stroke', '#FFF');
        circle.setAttribute('stroke-width', '1.2');
        circle.setAttribute('class', 'node-circle');
        group.appendChild(circle);

        // Letter
        const letter = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        letter.setAttribute('y', '3');
        letter.setAttribute('fill', '#000');
        letter.setAttribute('font-size', '8');
        letter.setAttribute('font-weight', 'bold');
        letter.setAttribute('text-anchor', 'middle');
        letter.setAttribute('class', 'node-letter');
        letter.textContent = c.isVIP ? 'F' : c.archetype.substring(0, 1);
        group.appendChild(letter);

        // Group index badge
        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        badgeG.setAttribute('class', 'node-badge');
        badgeG.setAttribute('transform', 'translate(8, -8)');
        badgeG.style.display = 'none';

        const badgeC = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        badgeC.setAttribute('r', '5.5');
        badgeC.setAttribute('fill', 'var(--color-primary)');
        badgeG.appendChild(badgeC);

        const badgeT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badgeT.setAttribute('y', '2');
        badgeT.setAttribute('fill', '#000');
        badgeT.setAttribute('font-size', '6');
        badgeT.setAttribute('font-weight', 'bold');
        badgeT.setAttribute('text-anchor', 'middle');
        badgeG.appendChild(badgeT);

        group.appendChild(badgeG);

        // Drink Floating Icon
        const drinkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        drinkIcon.setAttribute('class', 'node-drink-icon');
        drinkIcon.setAttribute('transform', 'translate(0, -18)');
        
        const drinkCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        drinkCircle.setAttribute('r', '5');
        drinkCircle.setAttribute('fill', 'rgba(0,0,0,0.7)');
        drinkCircle.setAttribute('stroke', 'var(--color-primary)');
        drinkCircle.setAttribute('stroke-width', '0.6');
        drinkIcon.appendChild(drinkCircle);

        const drinkText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        drinkText.setAttribute('y', '2');
        drinkText.setAttribute('fill', 'var(--color-primary)');
        drinkText.setAttribute('font-size', '6');
        drinkText.setAttribute('text-anchor', 'middle');
        
        const item = DRINK_MENU[c.drinkType];
        drinkText.textContent = item && item.category === 'Food' ? '🍞' : '☕';
        drinkIcon.appendChild(drinkText);
        group.appendChild(drinkIcon);

        container.appendChild(group);
        this.customerNodes[c.id] = group;

        // Hover events for absolute Tooltip
        group.addEventListener('mouseenter', (evt) => {
          tooltip.style.display = 'block';
          
          let moodColor = 'var(--color-success)';
          if (c.mood === 'Bored') moodColor = 'var(--color-warning)';
          else if (c.mood === 'Impatient' || c.mood === 'Angry') moodColor = 'var(--color-danger)';

          tooltip.innerHTML = `
            <strong>${c.name}</strong><br/>
            <span style="color:var(--color-primary);">${c.archetype} &bull; Ordered ${c.drinkType}</span><br/>
            Patience: ${c.patience} mins remaining<br/>
            Mood: <span style="font-weight:700; color:${moodColor};">${c.mood}</span>
          `;
        });
        group.addEventListener('mousemove', (evt) => {
          const rect = this.container.getBoundingClientRect();
          tooltip.style.left = `${evt.clientX - rect.left + 15}px`;
          tooltip.style.top = `${evt.clientY - rect.top + 15}px`;
        });
        group.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      }

      // Update Node Color based on satisfaction mood
      let moodColor = 'var(--color-success)';
      if (c.mood === 'Bored') moodColor = 'var(--color-warning)';
      else if (c.mood === 'Impatient' || c.mood === 'Angry') moodColor = 'var(--color-danger)';
      group.querySelector('.node-circle').setAttribute('fill', moodColor);

      // Render queue index badge
      const badge = group.querySelector('.node-badge');
      if (badge) {
        if (isQueued) {
          badge.style.display = 'block';
          badge.querySelector('text').textContent = queueBadgeNum;
        } else {
          badge.style.display = 'none';
        }
      }

      // Animate translation smoothly using GSAP with realistic walking bobbing/wiggle
      const prevX = parseFloat(group.dataset.prevX || 520);
      const prevY = parseFloat(group.dataset.prevY || 345);
      const hasMoved = Math.abs(prevX - targetX) > 2 || Math.abs(prevY - targetY) > 2;

      if (hasMoved) {
        group.dataset.prevX = targetX;
        group.dataset.prevY = targetY;

        const circle = group.querySelector('.node-circle');
        const letter = group.querySelector('.node-letter');
        const drink = group.querySelector('.node-drink-icon');

        // Step-bobbing walking animation
        gsap.timeline()
          .fromTo([circle, letter, drink],
            { y: 0 },
            { y: -6, duration: 0.16, yoyo: true, repeat: 3, ease: 'sine.inOut' }
          )
          .to([circle, letter, drink], { y: 0, duration: 0.1 });

        // Translate the whole node group
        gsap.to(group, {
          attr: { transform: `translate(${targetX}, ${targetY})` },
          duration: 0.85,
          ease: 'power2.out',
          onComplete: () => {
            // Settle squash & stretch
            gsap.timeline()
              .to(group, { scaleX: 1.3, scaleY: 0.7, duration: 0.12, ease: 'power1.in' })
              .to(group, { scaleX: 0.85, scaleY: 1.25, duration: 0.12, ease: 'power1.out' })
              .to(group, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'back.out(2)' });
          }
        });
      } else {
        // Instant micro-adjust or keep baseline
        gsap.to(group, {
          attr: { transform: `translate(${targetX}, ${targetY})` },
          duration: 0.3,
          ease: 'power1.out'
        });
      }
    });

    // Update Chair occupancy colors (green = empty, amber = occupied)
    Object.keys(seats).forEach(id => {
      const chair = document.getElementById(id);
      if (chair) {
        if (seats[id]) {
          chair.setAttribute('stroke', 'var(--color-warning)');
          chair.setAttribute('fill', 'rgba(245, 158, 11, 0.25)');
        } else {
          chair.setAttribute('stroke', 'var(--color-success)');
          chair.setAttribute('fill', '#120D0B');
        }
      }
    });

    // Find and remove elements that left or cancelled
    Object.keys(this.customerNodes).forEach(id => {
      if (!currentCustomersMap[id]) {
        const node = this.customerNodes[id];
        // Animate door exit before cleanup
        gsap.to(node, {
          attr: { transform: 'translate(520, 345)' },
          opacity: 0,
          duration: 0.6,
          onComplete: () => {
            if (node.parentNode) node.remove();
          }
        });
        delete this.customerNodes[id];
      }
    });
  }
}

export const twin = new DigitalTwin();
