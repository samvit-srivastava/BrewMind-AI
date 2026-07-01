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
   * Transforms 2D layout coordinates to 3D isometric space coordinates.
   */
  toIso(x, y) {
    // Entrance / Doorway
    if (x === 520 && y === 345) return { x: 500, y: 350 };
    
    // Barista Emma busy/idle (Espresso machine A)
    if (x === 145 && y === 105) return { x: 145, y: 245 };
    if (x === 130 && y === 115) return { x: 125, y: 255 };
    
    // Barista Sophia busy/idle (Espresso machine B)
    if (x === 220 && y === 105) return { x: 210, y: 215 };
    if (x === 210 && y === 115) return { x: 190, y: 225 };
    
    // Barista Liam busy/idle (POS Register)
    if (x === 275 && y === 105) return { x: 275, y: 185 };
    if (x === 290 && y === 115) return { x: 255, y: 195 };
    
    // Queue Slots (x: 455 to 295, y: 190 to 250)
    if (y === 190) return { x: 310, y: 250 }; // Ordering (Register Slot 1)
    if (y === 220) return { x: 340, y: 270 }; // Slot 2
    if (y === 250) {
      if (x === 455) return { x: 370, y: 290 }; // Slot 3
      if (x === 415) return { x: 400, y: 310 }; // Slot 4
      if (x === 375) return { x: 430, y: 330 }; // Slot 5
      if (x === 335) return { x: 460, y: 350 }; // Slot 6
      if (x === 295) return { x: 490, y: 370 }; // Slot 7
    }
    
    // Preparing (x: 180 to 250, y: 185)
    if (y === 185) {
      const idx = Math.round((x - 180) / 35);
      return { x: 195 + idx * 28, y: 285 - idx * 14 };
    }
    
    // Dining Seats matching the visual background tables
    if (y === 270) {
      if (x === 85) return { x: 330, y: 360 };  // Table 1 Left
      if (x === 135) return { x: 380, y: 340 }; // Table 1 Right
      if (x === 225) return { x: 440, y: 300 }; // Table 2 Left
      if (x === 275) return { x: 490, y: 280 }; // Table 2 Right
    }
    if (x === 390) {
      if (y === 245) return { x: 360, y: 220 }; // Table 3 Top
      if (y === 295) return { x: 410, y: 200 }; // Table 3 Bottom
    }
    
    // Fallback: simple centered isometric transform
    const cx = 300;
    const cy = 200;
    const dx = (x - cx) * 0.85;
    const dy = (y - cy) * 0.85;
    return {
      x: cx + (dx - dy) * 0.866,
      y: cy - 20 + (dx + dy) * 0.5
    };
  }

  /**
   * Returns a neon status color corresponding to the customer status.
   */
  getStatusColor(status) {
    if (status === 'Queue') return '#F59E0B'; // Amber / Waiting
    if (status === 'Preparing') return '#A855F7'; // Purple / Preparing
    if (status === 'Completed') return '#10B981'; // Green / Dining
    if (status === 'Leaving') return '#6B7280'; // Grey / Leaving
    return '#3B82F6'; // Blue / Ordering (default)
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
    
    this.handleStateUpdate(window.BrewMind.getState());
    
    console.log("Digital Twin Workspace initialized with animated pathfinding.");
  }

  setupViewport() {
    this.container.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column; position: relative; padding: 1.25rem; gap: 1.25rem;">
        
        <!-- CSS styles for premium visuals -->
        <style>
          @keyframes move-dots {
            to { stroke-dashoffset: -20; }
          }
          .animated-guide-line {
            animation: move-dots 1s linear infinite;
            filter: drop-shadow(0 0 3px rgba(212, 163, 115, 0.8));
          }
          @keyframes pulse-bloom {
            0%, 100% { opacity: 0.15; transform: scale(0.95); }
            50% { opacity: 0.55; transform: scale(1.15); }
          }
          .bloom-pulsing {
            animation: pulse-bloom 2s ease-in-out infinite;
          }
          .live-dot-pulse {
            animation: live-blink 1.5s infinite;
          }
          @keyframes live-blink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes pad-pulse {
            0%, 100% { stroke-opacity: 0.25; stroke-width: 1.2; }
            50% { stroke-opacity: 0.85; stroke-width: 2.2; }
          }
          .twin-chair-ring {
            animation: pad-pulse 2s infinite ease-in-out;
            transition: stroke 0.3s ease, fill 0.3s ease;
          }
          .spotlight-cone {
            transition: opacity 0.5s ease;
            mix-blend-mode: screen;
          }
          @keyframes heat-pulse {
            0%, 100% { transform: scale(1); opacity: 0.55; }
            50% { transform: scale(1.1); opacity: 0.78; }
          }
          .heat-pulsing {
            animation: heat-pulse 2.2s infinite ease-in-out;
            transform-origin: center;
          }
        </style>

        <!-- Absolute Tooltip Overlay -->
        <div id="twin-tooltip" style="position: absolute; display: none; background: rgba(16, 12, 10, 0.95); border: 1px solid var(--glass-border); padding: 0.65rem 0.9rem; border-radius: 12px; font-size: 0.72rem; color: #FFF; pointer-events: none; z-index: 200; box-shadow: 0 10px 25px rgba(0,0,0,0.6); font-family: var(--font-sans); line-height: 1.4; border-color: rgba(212,163,115,0.35);"></div>

        <!-- Sleek Operations Header Capsule matching the user request screenshot -->
        <div style="display: flex; justify-content: space-between; align-items: center; z-index: 5;">
          <div>
            <h3 class="panel-title" style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; color: #FFF; margin: 0;">Digital Twin</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.15rem 0 0 0;">Live floor view</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button class="btn-secondary" id="btn-twin-heatmap" style="padding: 0.35rem 0.75rem; font-size: 0.72rem; display: flex; align-items: center; gap: 0.25rem; height: 32px; border-radius: 8px;">
              <span>🔥</span>
              <span>Toggle Heatmap</span>
            </button>
            <span class="live-pulse-badge" style="display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 50px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); color: #10B981; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; height: 32px;">
              <span class="live-dot-pulse" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10B981; box-shadow: 0 0 8px #10B981;"></span>
              Live
            </span>
          </div>
        </div>

        <!-- Live Telemetry Status pill bar -->
        <div id="twin-telemetry-bar" style="display: flex; flex-wrap: wrap; gap: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 0.5rem 1.25rem; border-radius: 12px; font-size: 0.7rem; color: var(--text-secondary); align-items: center; z-index: 5; margin-top: -0.5rem; backdrop-filter: blur(10px);">
          <div>👥 Active Customers: <span id="twin-telemetry-active" style="color: #FFF; font-weight: 700;">0</span></div>
          <div style="width: 1px; height: 12px; background: var(--glass-border);"></div>
          <div>⏳ Queue Length: <span id="twin-telemetry-queue" style="color: #FFF; font-weight: 700;">0</span></div>
          <div style="width: 1px; height: 12px; background: var(--glass-border);"></div>
          <div>☕ ESPR-A: <span id="twin-telemetry-machine1" style="color: var(--color-success); font-weight: 700;">100%</span></div>
          <div style="width: 1px; height: 12px; background: var(--glass-border);"></div>
          <div>☕ ESPR-B: <span id="twin-telemetry-machine2" style="color: var(--color-success); font-weight: 700;">100%</span></div>
          <div style="width: 1px; height: 12px; background: var(--glass-border);"></div>
          <div>📊 Operations Load: <span id="twin-telemetry-load" style="color: var(--color-success); font-weight: 700;">Stable</span></div>
        </div>

        <!-- Layout: Responsive wrapper to allow vertical scaling and fit meet aspect ratio -->
        <div style="width: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
          <!-- SVG viewport (Zoomed-out Cafe Layout) -->
          <svg id="twin-svg" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto; max-height: 500px; background: radial-gradient(circle, #1F1511 0%, #0F0907 100%); border: 1px solid var(--glass-border); border-radius:24px; box-shadow: 0 15px 45px rgba(0,0,0,0.6);">
            <defs>
              <pattern id="twin-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(212, 163, 115, 0.08)" stroke-width="1.2"/>
              </pattern>
              
              <!-- Heatmap Gradients -->
              <radialGradient id="heat-red" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#EF4444" stop-opacity="1"/>
                <stop offset="50%" stop-color="#F59E0B" stop-opacity="0.5"/>
                <stop offset="100%" stop-color="#EF4444" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="heat-orange" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#F59E0B" stop-opacity="1"/>
                <stop offset="60%" stop-color="#EAB308" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="heat-yellow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#EAB308" stop-opacity="0.8"/>
                <stop offset="100%" stop-color="#EAB308" stop-opacity="0"/>
              </radialGradient>

              <!-- Reflection Blur Filter -->
              <filter id="reflection-blur">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>

              <!-- Warm Spotlight Gradients -->
              <radialGradient id="warm-spotlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#D4A373" stop-opacity="0.32"/>
                <stop offset="50%" stop-color="#8C5A3C" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#000" stop-opacity="0"/>
              </radialGradient>

              <!-- Espresso Machine Bronze Bloom -->
              <radialGradient id="bronze-bloom" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#D4A373" stop-opacity="0.6"/>
                <stop offset="60%" stop-color="#8C5A3C" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="#000" stop-opacity="0"/>
              </radialGradient>

              <!-- Warm Spotlight Cones Gradient -->
              <linearGradient id="spotlight-cone-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FCD34D" stop-opacity="0.22"/>
                <stop offset="100%" stop-color="#FCD34D" stop-opacity="0"/>
              </linearGradient>

              <!-- Luxury Wood Floor Gradient -->
              <linearGradient id="floor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1F1511"/>
                <stop offset="50%" stop-color="#150E0C"/>
                <stop offset="100%" stop-color="#0F0907"/>
              </linearGradient>

              <!-- Vignette Overlay Gradient -->
              <radialGradient id="vignette-grad" cx="50%" cy="50%" r="70%">
                <stop offset="55%" stop-color="rgba(15, 9, 7, 0)" />
                <stop offset="100%" stop-color="rgba(15, 9, 7, 0.95)" />
              </radialGradient>

              <!-- Sweeping Glass Reflection Gradient -->
              </linearGradient>

              <!-- Barista Circular Clip Paths -->
              <clipPath id="clip-barista-emma"><circle cx="0" cy="0" r="11" /></clipPath>
              <clipPath id="clip-barista-sophia"><circle cx="0" cy="0" r="11" /></clipPath>
              <clipPath id="clip-barista-liam"><circle cx="0" cy="0" r="11" /></clipPath>
            </defs>

            <!-- Blurred scene continuation behind the main content (removes black bars) -->
            <image href="isometric_cafe_bg.png" xlink:href="isometric_cafe_bg.png" x="-150" y="-100" width="900" height="600" style="filter: blur(20px); opacity: 0.15;" preserveAspectRatio="none" />
            <rect width="100%" height="100%" fill="url(#floor-grad)" opacity="0.45" />

            <!-- PHOTOREALISTIC 3D ISOMETRIC BACKGROUND IMAGE -->
            <image href="isometric_cafe_bg.png" xlink:href="isometric_cafe_bg.png" x="0" y="0" width="600" height="400" />

            <!-- Dynamic Window glass overlay -->
            <rect id="window-glass" x="500" y="40" width="100" height="240" fill="#FDE047" opacity="0.15" style="pointer-events: none; mix-blend-mode: overlay; filter: blur(5px);" />

            <!-- Rain Drops Overlay for Window (Feature 15) -->
            <g id="rain-drops" style="pointer-events: none; opacity: 0; transition: opacity 0.5s ease;">
              <line x1="510" y1="40" x2="505" y2="60" stroke="#94A3B8" stroke-dasharray="2 4" stroke-width="0.8" />
              <line x1="530" y1="50" x2="525" y2="70" stroke="#94A3B8" stroke-dasharray="2 4" stroke-width="0.8" />
              <line x1="550" y1="45" x2="545" y2="65" stroke="#94A3B8" stroke-dasharray="2 4" stroke-width="0.8" />
              <line x1="570" y1="60" x2="565" y2="80" stroke="#94A3B8" stroke-dasharray="2 4" stroke-width="0.8" />
              <line x1="590" y1="55" x2="585" y2="75" stroke="#94A3B8" stroke-dasharray="2 4" stroke-width="0.8" />
            </g>

            <!-- Active Spotlight Cones (dynamic opacity) -->
            <g id="spotlights-group" style="pointer-events: none;">
              <!-- Emma spotlight (Espresso A) -->
              <polygon id="spotlight-emma" class="spotlight-cone" points="145,150 115,260 175,260" fill="url(#spotlight-cone-grad)" opacity="0" />
              <!-- Sophia spotlight (Espresso B) -->
              <polygon id="spotlight-sophia" class="spotlight-cone" points="210,120 180,230 240,230" fill="url(#spotlight-cone-grad)" opacity="0" />
              <!-- Liam spotlight (Register) -->
              <polygon id="spotlight-liam" class="spotlight-cone" points="270,100 240,200 300,200" fill="url(#spotlight-cone-grad)" opacity="0" />
            </g>

            <!-- Ambient Warm Lighting Spotlights -->
            <g id="ambient-spotlights" style="pointer-events: none;">
              <ellipse cx="200" cy="270" rx="140" ry="40" fill="url(#warm-spotlight)" opacity="0.6" />
              <ellipse cx="400" cy="310" rx="120" ry="35" fill="url(#warm-spotlight)" opacity="0.6" />
              <ellipse cx="460" cy="260" rx="90" ry="30" fill="url(#warm-spotlight)" opacity="0.5" />
            </g>

            <!-- Dynamic Lighting Overlay (Multiply overlay to change tint by hour / weather) -->
            <rect id="lighting-overlay" width="600" height="400" fill="transparent" opacity="0" style="mix-blend-mode: multiply; pointer-events: none; transition: fill 1.5s ease, opacity 1.5s ease;" />

            <!-- Sweeping Glass Reflection Overlay -->
            <rect id="glass-reflection" x="-600" width="600" height="400" fill="url(#glass-reflection-grad)" style="pointer-events: none;" />

            <!-- Premium Vignette Overlay (fades sides) -->
            <rect width="600" height="400" fill="url(#vignette-grad)" style="pointer-events: none;" />

            <!-- Heatmap overlay layer -->
            <g id="heatmap-overlay" style="opacity: 0; pointer-events: none; transition: opacity 0.5s ease;">
              <circle class="heat-pulsing" cx="290" cy="240" r="55" fill="url(#heat-red)" opacity="0.6"/>
              <circle class="heat-pulsing" cx="350" cy="280" r="60" fill="url(#heat-orange)" opacity="0.65"/>
              <circle class="heat-pulsing" cx="150" cy="300" r="45" fill="url(#heat-orange)" opacity="0.5"/>
              <circle class="heat-pulsing" cx="220" cy="260" r="45" fill="url(#heat-orange)" opacity="0.5"/>
              <circle class="heat-pulsing" cx="350" cy="370" r="40" fill="url(#heat-yellow)" opacity="0.45"/>
              <circle class="heat-pulsing" cx="460" cy="300" r="40" fill="url(#heat-yellow)" opacity="0.45"/>
            </g>

            <!-- Live Guide Queue Lines -->
            <path id="queue-guide-path" class="animated-guide-line" d="M 500 350 L 320 260" fill="none" stroke="rgba(212, 163, 115, 0.5)" stroke-width="3" stroke-dasharray="5 7" style="pointer-events: none;" />

            <!-- Translucent Guides and Equipment Hover Anchors -->
            <!-- Espresso Machine A -->
            <g id="espresso-machine-1" transform="translate(130, 265)" style="cursor: pointer;">
              <rect width="50" height="36" rx="4" fill="transparent" stroke="rgba(212, 163, 115, 0.25)" stroke-width="1.2" />
              <circle id="machine-light-1" cx="8" cy="8" r="3.5" fill="#10B981" />
              <text id="repair-progress-1" x="25" y="-12" fill="var(--color-primary)" font-size="8" font-weight="bold" text-anchor="middle" style="display: none;"></text>
              <circle class="machine-bloom-glow" cx="25" cy="18" r="40" fill="url(#bronze-bloom)" opacity="0" style="transition: opacity 0.5s ease; pointer-events: none;" />
              <text id="op-label-espr-a" x="25" y="47" fill="#FCD34D" font-size="5.5" font-weight="800" text-anchor="middle" opacity="0.85">ESPR-A: IDLE</text>
            </g>
            
            <!-- Espresso Machine B -->
            <g id="espresso-machine-2" transform="translate(195, 230)" style="cursor: pointer;">
              <rect width="50" height="36" rx="4" fill="transparent" stroke="rgba(212, 163, 115, 0.25)" stroke-width="1.2" />
              <circle id="machine-light-2" cx="8" cy="8" r="3.5" fill="#10B981" />
              <text id="repair-progress-2" x="25" y="-12" fill="var(--color-primary)" font-size="8" font-weight="bold" text-anchor="middle" style="display: none;"></text>
              <circle class="machine-bloom-glow" cx="25" cy="18" r="40" fill="url(#bronze-bloom)" opacity="0" style="transition: opacity 0.5s ease; pointer-events: none;" />
              <text id="op-label-espr-b" x="25" y="47" fill="#FCD34D" font-size="5.5" font-weight="800" text-anchor="middle" opacity="0.85">ESPR-B: IDLE</text>
            </g>

            <!-- Order Cup Stacks containers -->
            <g id="cup-stack-machine-1" transform="translate(145, 260)"></g>
            <g id="cup-stack-machine-2" transform="translate(210, 225)"></g>

            <!-- POS Counter -->
            <g id="register-desk" transform="translate(260, 205)" style="opacity: 0.85;">
              <rect width="40" height="24" rx="3" fill="#3D2920" stroke="#D4A373" stroke-width="1.5" />
              <text x="20" y="14" fill="#FFF" font-size="7" font-weight="bold" text-anchor="middle">POS-01</text>
              <text id="op-label-pos" x="20" y="34" fill="#FCD34D" font-size="5.5" font-weight="800" text-anchor="middle" opacity="0.85">POS-01: IDLE</text>
            </g>

            <!-- Barista reflections -->
            <g id="barista-emma-reflection" transform="translate(0, 0)" opacity="0.12" filter="url(#reflection-blur)" style="pointer-events: none;">
              <circle r="13" fill="none" stroke="var(--color-success)" stroke-width="2.5" />
              <g transform="scale(1)">
                <circle r="9" fill="#FDBA74" stroke="#1E1410" stroke-width="1.2" />
                <circle cx="-2.5" cy="-1" r="1" fill="#1F2937" />
                <circle cx="2.5" cy="-1" r="1" fill="#1F2937" />
                <path d="M -2.5 3 Q 0 5 2.5 3" fill="none" stroke="#1F2937" stroke-width="0.8" stroke-linecap="round" />
                <path d="M -9 -2 Q -6 -9 0 -7 Q 6 -9 9 -2 Q 9 -8 -9 -8 Z" fill="#FDE047" />
              </g>
            </g>
            <g id="barista-sophia-reflection" transform="translate(0, 0)" opacity="0.12" filter="url(#reflection-blur)" style="pointer-events: none;">
              <circle r="13" fill="none" stroke="var(--color-success)" stroke-width="2.5" />
              <g transform="scale(1)">
                <circle r="9" fill="#EDC9AF" stroke="#1E1410" stroke-width="1.2" />
                <circle cx="-2.5" cy="-1" r="1" fill="#1F2937" />
                <circle cx="2.5" cy="-1" r="1" fill="#1F2937" />
                <path d="M -2.5 3 Q 0 5 2.5 3" fill="none" stroke="#1F2937" stroke-width="0.8" stroke-linecap="round" />
                <circle cx="0" cy="-9" r="3.5" fill="#1F2937" />
                <path d="M -9 -2 Q -6 -7 0 -6 Q 6 -7 9 -2 Q 9 -8 -9 -8 Z" fill="#1F2937" />
              </g>
            </g>
            <g id="barista-liam-reflection" transform="translate(0, 0)" opacity="0.12" filter="url(#reflection-blur)" style="pointer-events: none;">
              <circle r="13" fill="none" stroke="var(--color-success)" stroke-width="2.5" />
              <g transform="scale(1)">
                <circle r="9" fill="#FCD34D" stroke="#1E1410" stroke-width="1.2" />
                <circle cx="-2.5" cy="-1" r="1" fill="#1F2937" />
                <circle cx="2.5" cy="-1" r="1" fill="#1F2937" />
                <path d="M -2.5 3 Q 0 5 2.5 3" fill="none" stroke="#1F2937" stroke-width="0.8" stroke-linecap="round" />
                <path d="M -9 -3 A 9 9 0 0 1 9 -3 L 9 -5 L -9 -5 Z" fill="#78350F" />
              </g>
            </g>

            <!-- Baristas -->
            <g id="barista-emma" transform="translate(0, 0)">
              <circle r="12" fill="none" stroke="var(--color-success)" stroke-width="2" id="barista-emma-ring" style="transition: stroke 0.4s ease; filter: drop-shadow(0 0 3px var(--color-success));" />
              <image href="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80" x="-11" y="-11" width="22" height="22" clip-path="url(#clip-barista-emma)" />
              <text y="-16" fill="#FFFFFF" font-size="8.5" font-weight="800" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.85);">Emma</text>
            </g>
            <g id="barista-sophia" transform="translate(0, 0)">
              <circle r="12" fill="none" stroke="var(--color-success)" stroke-width="2" id="barista-sophia-ring" style="transition: stroke 0.4s ease; filter: drop-shadow(0 0 3px var(--color-success));" />
              <image href="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&auto=format&fit=crop&q=80" x="-11" y="-11" width="22" height="22" clip-path="url(#clip-barista-sophia)" />
              <text y="-16" fill="#FFFFFF" font-size="8.5" font-weight="800" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.85);">Sophia</text>
            </g>
            <g id="barista-liam" transform="translate(0, 0)">
              <circle r="12" fill="none" stroke="var(--color-success)" stroke-width="2" id="barista-liam-ring" style="transition: stroke 0.4s ease; filter: drop-shadow(0 0 3px var(--color-success));" />
              <image href="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80" x="-11" y="-11" width="22" height="22" clip-path="url(#clip-barista-liam)" />
              <text y="-16" fill="#FFFFFF" font-size="8.5" font-weight="800" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.85);">Liam</text>
            </g>

            <!-- Seat Guides (translucent) -->
            <circle cx="330" cy="360" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-1-left" class="twin-chair-ring" />
            <circle cx="380" cy="340" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-1-right" class="twin-chair-ring" />
            <circle cx="440" cy="300" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-2-left" class="twin-chair-ring" />
            <circle cx="490" cy="280" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-2-right" class="twin-chair-ring" />
            <circle cx="360" cy="220" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-3-top" class="twin-chair-ring" />
            <circle cx="410" cy="200" r="12" fill="transparent" stroke="rgba(212, 163, 115, 0.2)" stroke-width="1.2" id="seat-3-bottom" class="twin-chair-ring" />

            <!-- Live Customer Dots Container -->
            <g id="twin-customers-container"></g>
          </svg>

          <!-- Spatial Audio Floating Toggle Button -->
          <button id="btn-twin-audio-toggle" style="position: absolute; bottom: 1rem; right: 1rem; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10; border: 1px solid var(--glass-border); background: rgba(16, 12, 10, 0.85); color: #FFF; font-size: 0.9rem; cursor: pointer; backdrop-filter: blur(5px); box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: background 0.2s ease, transform 0.1s ease;" title="Toggle Spatial Audio">
            🔊
          </button>
        </div>

        <!-- Dynamic Seek Timeline + Colors Legend Capsule -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 0.75rem 1.25rem; border-radius: 16px; font-size: 0.72rem; gap: 2rem; z-index: 10; backdrop-filter: blur(10px);">
          <!-- Legend Deck -->
          <div style="display: flex; gap: 0.85rem; align-items: center; font-size: 0.7rem; color: var(--text-secondary);">
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#F59E0B; box-shadow: 0 0 6px #F59E0B;"></span> Waiting</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3B82F6; box-shadow: 0 0 6px #3B82F6;"></span> Ordering</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#A855F7; box-shadow: 0 0 6px #A855F7;"></span> Preparing</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10B981; box-shadow: 0 0 6px #10B981;"></span> Dining</div>
            <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#6B7280; box-shadow: 0 0 6px #6B7280;"></span> Leaving</div>
          </div>
          
          <!-- Seek scrubbing controls -->
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-grow: 1;">
            <button class="btn-primary" id="btn-twin-play" style="padding: 0.25rem 0.65rem; font-size: 0.65rem; height: 26px; min-width: 80px; border-radius: 6px;">⏸ Pause</button>
            <span id="twin-mode-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.6rem; white-space: nowrap;">LIVE FEED</span>
            <input type="range" id="twin-history-range" min="0" max="0" value="0" style="flex-grow: 1; cursor: pointer; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; accent-color: var(--color-primary);" disabled/>
            <span id="twin-history-time" style="color: var(--text-secondary); min-width: 50px; text-anchor: right;">--:--</span>
          </div>

          <!-- Reset Scene CTA with unique ID (avoiding selector clashing) -->
          <button class="btn-secondary" id="btn-twin-sync-workspace" style="display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.75rem; font-size: 0.68rem; height: 26px; border-radius: 6px; font-weight: 700; color: var(--color-primary); border-color: rgba(212,163,115,0.25);">
            <span>Sync Workspace</span>
            <span>»</span>
          </button>
        </div>
      </div>

      </div>

      </div>
    `;
  }

  bindEvents() {
    // 1. Heatmap Toggle Listener (Feature 3)
    const btnHeatmap = document.getElementById('btn-twin-heatmap');
    if (btnHeatmap) {
      btnHeatmap.addEventListener('click', () => {
        const overlay = document.getElementById('heatmap-overlay');
        if (overlay) {
          const isHidden = overlay.style.opacity === '0' || !overlay.style.opacity;
          overlay.style.opacity = isHidden ? '0.75' : '0';
          btnHeatmap.classList.toggle('active', isHidden);
          this.playSpatialSound('register', 0);
        }
      });
    }

    // 2. Machine Repair Click Bindings (Feature 7)
    const machineA = document.getElementById('espresso-machine-1');
    const machineB = document.getElementById('espresso-machine-2');
    if (machineA) {
      machineA.addEventListener('click', () => {
        const state = window.BrewMind.getState();
        if (state.machineHealth <= 0 || state.demo.activeScenario === 'Machine Failure') {
          this.repairMachine(1);
        }
      });
      // Spatial Audio Hover (Feature 5)
      machineA.addEventListener('mouseenter', () => this.playSpatialSound('steam', -0.46));
    }
    if (machineB) {
      machineB.addEventListener('click', () => {
        const state = window.BrewMind.getState();
        if (state.machineHealth <= 0 || state.demo.activeScenario === 'Machine Failure') {
          this.repairMachine(2);
        }
      });
      // Spatial Audio Hover (Feature 5)
      machineB.addEventListener('mouseenter', () => this.playSpatialSound('steam', -0.2));
    }

    // 3. Register Desk Spatial Audio Hover (Feature 5)
    const register = document.getElementById('register-desk');
    if (register) {
      register.addEventListener('mouseenter', () => this.playSpatialSound('register', 0.45));
    }

    // 4. Tables Spatial Audio Hover (Feature 5)
    ['table-1', 'table-2', 'table-3'].forEach((id, idx) => {
      const el = document.getElementById(id);
      if (el) {
        const pans = [-0.63, -0.16, 0.3];
        el.addEventListener('mouseenter', () => this.playSpatialSound('chatter', pans[idx]));
      }
    });

    // 5. Playback Timeline Scrubbing listeners (Feature 10)
    const btnPlay = document.getElementById('btn-twin-play');
    const slider = document.getElementById('twin-history-range');
    
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        btnPlay.innerText = this.isPaused ? '▶ Resume' : '⏸ Pause';
        const badge = document.getElementById('twin-mode-badge');
        if (badge) {
          badge.innerText = this.isPaused ? 'HISTORICAL REPLAY' : 'LIVE FEED';
          badge.style.background = this.isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
          badge.style.color = this.isPaused ? 'var(--color-warning)' : 'var(--color-success)';
          badge.style.borderColor = this.isPaused ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
        }
        if (!this.isPaused) {
          // Jump to latest live frame
          const state = window.BrewMind.getState();
          this.handleStateUpdate(state);
          if (slider) {
            slider.value = this.history.length - 1;
            slider.disabled = true;
          }
        } else {
          if (slider) slider.disabled = false;
        }
      });
    }

    if (slider) {
      slider.addEventListener('input', () => {
        if (this.isPaused && this.history[slider.value]) {
          const snapshot = this.history[slider.value];
          this.renderSnapshot(snapshot);
        }
      });
    }

    // 6. Reset Scene Click Binding (handle both header reset and workspace sync buttons)
    const resetWorkspaceScene = () => {
      // Clear all active customer SVG nodes from parent container
      Object.keys(this.customerNodes).forEach(id => {
        const group = this.customerNodes[id];
        if (group && group.parentNode) {
          group.parentNode.removeChild(group);
        }
      });
      this.customerNodes = {};
      this.seatOccupants = {};
      
      // Restart/re-render using latest state
      const state = window.BrewMind.getState();
      this.handleStateUpdate(state);
      
      // Play spatial reset click sound
      this.playSpatialSound('register', 0);
      console.log("Digital Twin scene successfully reset and synchronized.");
    };

    const btnReset = document.getElementById('btn-twin-reset');
    if (btnReset) {
      btnReset.addEventListener('click', resetWorkspaceScene);
    }
    const btnSync = document.getElementById('btn-twin-sync-workspace');
    if (btnSync) {
      btnSync.addEventListener('click', resetWorkspaceScene);
    }

    // 7. Audio Toggle Click Binding
    const btnAudio = document.getElementById('btn-twin-audio-toggle');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        // Toggle global sound setting or local sound toggle
        if (window.BrewMind && window.BrewMind.state) {
          const enabled = !window.BrewMind.state.soundEnabled;
          window.BrewMind.updateState({ soundEnabled: enabled });
          // Fallback settings check
          if (window.memory && window.memory.preferences) {
            window.memory.preferences.soundEnabled = enabled;
          }
          btnAudio.textContent = enabled ? '🔊' : '🔇';
          btnAudio.title = enabled ? 'Mute Spatial Audio' : 'Unmute Spatial Audio';
          if (enabled) {
            this.playSpatialSound('click', 0);
          }
        }
      });
    }

    // Global state change listener
    window.addEventListener('brewmind:statechange', (e) => {
      if (!this.isInitialized) return;
      
      const state = e.detail;
      if (!this.isPaused) {
        // Record snapshot for playback (Feature 10)
        this.history = this.history || [];
        this.history.push(JSON.parse(JSON.stringify(state)));
        if (this.history.length > 50) this.history.shift();

        const sliderEl = document.getElementById('twin-history-range');
        const timeEl = document.getElementById('twin-history-time');
        
        if (sliderEl) {
          sliderEl.max = this.history.length - 1;
          sliderEl.value = this.history.length - 1;
        }
        if (timeEl) {
          const hours = state.clock.hours % 12 === 0 ? 12 : state.clock.hours % 12;
          const minutes = state.clock.minutes.toString().padStart(2, '0');
          const ampm = state.clock.hours >= 12 ? 'PM' : 'AM';
          timeEl.innerText = `${hours}:${minutes} ${ampm}`;
        }

        this.handleStateUpdate(state);
      }
    });
  }

  initAnimations() {
    // 1. Steam animation
    gsap.fromTo('.twin-steam-line',
      { y: 4, opacity: 0 },
      { y: -12, opacity: 0.65, duration: 1.5, repeat: -1, stagger: 0.3, ease: 'sine.inOut' }
    );

    // 2. Sweeping Glass Reflection (Feature 10)
    setInterval(() => {
      const reflection = document.getElementById('glass-reflection');
      if (reflection) {
        gsap.fromTo(reflection, 
          { x: -600 }, 
          { x: 600, duration: 2.2, ease: 'power2.inOut' }
        );
      }
    }, 15000);

    // 3. Ambient Dust & Bulbs Flicker (Feature 2)
    this.initAmbientEffects();

    // 4. Barista Breathing Idle Animations (Feature 17)
    ['emma', 'sophia', 'liam'].forEach(name => {
      const g = document.querySelector(`#barista-${name} g`);
      if (g) {
        gsap.to(g, {
          scaleY: 1.04,
          y: -0.25,
          duration: 1.5 + Math.random() * 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    });
  }

  initAmbientEffects() {
    // 1. Warm Bulbs Flicker (Feature 2, 17)
    const spotlights = document.getElementById('ambient-spotlights');
    if (spotlights) {
      gsap.to(spotlights.children, {
        opacity: '+=0.06',
        duration: 'random(1.2, 2.8)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.15
      });
    }

    // 2. Floating Dust Particles (Feature 2)
    const svg = document.getElementById('twin-svg');
    if (svg) {
      const dustG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      dustG.setAttribute('id', 'ambient-dust');
      dustG.style.pointerEvents = 'none';
      svg.appendChild(dustG);

      for (let i = 0; i < 15; i++) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        p.setAttribute('cx', Math.random() * 600);
        p.setAttribute('cy', Math.random() * 400);
        p.setAttribute('r', 0.4 + Math.random() * 0.6);
        p.setAttribute('fill', '#FCD34D');
        p.setAttribute('opacity', 0.05 + Math.random() * 0.12);
        dustG.appendChild(p);

        // Drift animation
        gsap.to(p, {
          x: 'random(-30, 30)',
          y: 'random(-30, 30)',
          opacity: 'random(0.02, 0.18)',
          duration: 'random(8, 16)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    }
  }

  /**
   * Play dynamic pan-based spatial sound effects (Feature 5)
   */
  playSpatialSound(type, panValue = 0) {
    try {
      const state = window.BrewMind.getState();
      const soundEnabled = state.copilot?.soundEnabled !== false;
      if (!soundEnabled) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      let panner = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(panValue, ctx.currentTime);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(ctx.destination);
      }

      if (type === 'steam') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'register') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'chatter') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.12); // E4
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Web Audio spatial playback blocked:", e);
    }
  }

  /**
   * Emit steam particle puffs from machines (Feature 4)
   */
  triggerSteamPuff(machineId, panValue) {
    const parent = document.getElementById(machineId);
    if (!parent) return;

    // A. Emit Volumetric Steam Clouds
    for (let i = 0; i < 3; i++) {
      const steam = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      steam.setAttribute('cx', 12 + Math.random() * 26);
      steam.setAttribute('cy', -2);
      steam.setAttribute('r', 2.5 + Math.random() * 3.5);
      steam.setAttribute('fill', 'rgba(245, 235, 225, 0.25)');
      steam.setAttribute('filter', 'url(#reflection-blur)');
      parent.appendChild(steam);

      gsap.fromTo(steam,
        { y: 0, opacity: 0.85, scale: 0.8 },
        { 
          y: -38 - Math.random() * 12, 
          opacity: 0, 
          scale: 2.6, 
          duration: 1.3 + Math.random() * 0.5, 
          ease: 'power1.out', 
          onComplete: () => steam.remove() 
        }
      );
    }

    // B. Emit Glowing Heat Sparks
    for (let j = 0; j < 3; j++) {
      const spark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      spark.setAttribute('cx', 12 + Math.random() * 26);
      spark.setAttribute('cy', -2);
      spark.setAttribute('r', 0.7 + Math.random() * 0.8);
      spark.setAttribute('fill', '#FBBF24');
      spark.style.filter = 'drop-shadow(0 0 2px #F59E0B)';
      parent.appendChild(spark);

      gsap.to(spark, {
        y: -24 - Math.random() * 14,
        x: `+=${(Math.random() - 0.5) * 16}`,
        opacity: 0,
        duration: 0.8 + Math.random() * 0.4,
        ease: 'sine.out',
        onComplete: () => spark.remove()
      });
    }

    this.playSpatialSound('steam', panValue);
  }

  /**
   * Interactive repairing countdown progress loader (Feature 7)
   */
  repairMachine(machineNum) {
    const repairLabel = document.getElementById(`repair-progress-${machineNum}`);
    if (!repairLabel) return;

    repairLabel.style.display = 'block';
    let progress = 0;
    
    // Play active repair chime
    this.playSpatialSound('register', machineNum === 1 ? -0.46 : -0.2);

    const interval = setInterval(() => {
      progress += 10;
      repairLabel.textContent = `FIXING: ${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
        repairLabel.style.display = 'none';
        
        // Restore machine state
        const state = window.BrewMind.getState();
        state.machineHealth = 100;
        if (state.demo.activeScenario === 'Machine Failure') {
          state.demo.activeScenario = null;
        }
        window.BrewMind.setState(state);
        
        this.playSpatialSound('register', machineNum === 1 ? -0.46 : -0.2);
        
        window.BrewMind.dispatch('brewmind:toast', {
          title: 'Equipment Calibrated',
          message: `Espresso Machine ${machineNum === 1 ? 'A' : 'B'} is back online!`,
          type: 'success'
        });
      }
    }, 150);
  }

  /**
   * Generates student dialogue bubble text options (Feature 9)
   */
  getBubbleText(c) {
    if (c.mood === 'Impatient' || c.mood === 'Angry') {
      const angryText = ["Late for class!", "Why is it so slow?", "Hurry up...", "I'm going to be late!", "Need caffeine!"];
      return angryText[c.id.charCodeAt(5) % angryText.length];
    } else if (c.mood === 'Bored') {
      return "Sigh...";
    } else if (c.status === 'Queue') {
      const queueText = ["Waiting in line...", "Study prep...", "Coffee time!"];
      return queueText[c.id.charCodeAt(5) % queueText.length];
    }
    return "Yum! ☕";
  }

  /**
   * Draw dynamic mini SVG props on occupied dining tables (Feature 5)
   */
  updateTableProps(tableId, isOccupied) {
    const tableGroup = document.getElementById(tableId);
    if (!tableGroup) return;

    let propsGroup = tableGroup.querySelector('.table-props');
    
    if (isOccupied) {
      if (!propsGroup) {
        propsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        propsGroup.setAttribute('class', 'table-props');
        propsGroup.setAttribute('transform', 'scale(0)');
        tableGroup.appendChild(propsGroup);

        const sets = [
          // Set 1: Laptop + Coffee Cup
          `
            <path d="M -8 1 L -6 -4 L 6 -4 L 8 1 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="0.8"/>
            <line x1="-9" y1="1" x2="9" y2="1" stroke="#94A3B8" stroke-width="1.2"/>
            <circle cx="5" cy="-8" r="2.8" fill="none" stroke="#FFF" stroke-width="0.5"/>
            <circle class="table-coffee-fill" cx="5" cy="-8" r="2.2" fill="#5C3D2E"/>
            <path d="M 7.5 -9 Q 9.5 -9 9.5 -8 T 7.5 -7" fill="none" stroke="#FFF" stroke-width="0.5"/>
          `,
          // Set 2: Books + Pastry (empty/eaten slowly too)
          `
            <rect x="-8" y="-6" width="8" height="11" rx="1" fill="#EF4444" transform="rotate(-15)"/>
            <rect x="-4" y="-3" width="7" height="10" rx="1" fill="#FBBF24" transform="rotate(10)"/>
            <path class="table-coffee-fill" d="M 5 4 Q 8 2 11 5 Q 9 7 7 6 T 5 4" fill="#F59E0B"/>
          `,
          // Set 3: Coffee Cup + Notebook + Glasses
          `
            <rect x="-8" y="-5" width="10" height="10" rx="1" fill="#3B82F6"/>
            <circle cx="5" cy="5" r="3" fill="none" stroke="#FFF" stroke-width="0.5"/>
            <circle class="table-coffee-fill" cx="5" cy="5" r="2.4" fill="#5C3D2E"/>
            <path d="M 8 4 Q 10 4 10 5 T 8 6" fill="none" stroke="#FFF" stroke-width="0.5"/>
            <path d="M -3 -8 H -1 M 1 -8 H 3 M -3 -8 A 1.5 1.5 0 0 0 -1 -8 M 1 -8 A 1.5 1.5 0 0 0 3 -8" stroke="#FFF" stroke-width="0.8" fill="none"/>
          `
        ];
        
        const randomSet = sets[Math.floor(Math.random() * sets.length)];
        propsGroup.innerHTML = randomSet;
        
        gsap.to(propsGroup, { transform: 'scale(1)', duration: 0.5, ease: 'back.out(1.6)' });

        // Slowly empty the cup / pastry over 18 seconds (Feature 8)
        const coffeeFill = propsGroup.querySelector('.table-coffee-fill');
        if (coffeeFill) {
          gsap.to(coffeeFill, {
            scale: 0.1,
            opacity: 0.2,
            transformOrigin: 'center',
            duration: 18.0,
            ease: 'power1.inOut'
          });
        }
      }
    } else {
      if (propsGroup) {
        gsap.to(propsGroup, {
          transform: 'scale(0)',
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => propsGroup.remove()
        });
      }
    }
  }

  /**
   * Create custom styled avatars & reflections based on student archetypes
   */
  createAvatarSVG(c, group) {
    // Clear old elements
    group.innerHTML = '';

    // A. Curated lightweight portraits mapping to archetypes
    const students = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&auto=format&fit=crop&q=80'
    ];
    const faculty = [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&auto=format&fit=crop&q=80'
    ];
    const researchers = [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&auto=format&fit=crop&q=80'
    ];

    const val = c.id.charCodeAt(c.id.length - 1) || 0;
    let avatarUrl = students[val % students.length];
    if (c.archetype === 'Faculty') {
      avatarUrl = faculty[val % faculty.length];
    } else if (c.archetype === 'Researcher') {
      avatarUrl = researchers[val % researchers.length];
    }

    // Determine status color for borders
    let statusColor = '#3B82F6'; // Default Ordering (Blue)
    if (c.status === 'Waiting') statusColor = '#F59E0B'; // Amber
    else if (c.status === 'Preparing') statusColor = '#8B5CF6'; // Purple
    else if (c.status === 'Dining' || c.status === 'Leaving') statusColor = '#10B981'; // Green

    // B. Create ClipPath inside the local group
    const clipPathId = `clip-${c.id}`;
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipPathId);
    
    const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clipCircle.setAttribute('cx', '0');
    clipCircle.setAttribute('cy', '0');
    clipCircle.setAttribute('r', '11.5');
    clipPath.appendChild(clipCircle);
    group.appendChild(clipPath);

    // C. Main Group
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.setAttribute('class', 'avatar-main');

    // D. Base shadow circle
    const shadowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadowCircle.setAttribute('cx', '0');
    shadowCircle.setAttribute('cy', '0');
    shadowCircle.setAttribute('r', '11.5');
    shadowCircle.setAttribute('fill', '#000');
    shadowCircle.setAttribute('opacity', '0.45');
    mainGroup.appendChild(shadowCircle);

    // E. Portrait Image
    const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttribute('href', avatarUrl);
    img.setAttribute('x', '-12');
    img.setAttribute('y', '-12');
    img.setAttribute('width', '24');
    img.setAttribute('height', '24');
    img.setAttribute('clip-path', `url(#${clipPathId})`);
    mainGroup.appendChild(img);

    // F. Glowing Status Outline Ring
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    border.setAttribute('r', '12.5');
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', statusColor);
    border.setAttribute('stroke-width', '2');
    border.style.filter = `drop-shadow(0 0 3px ${statusColor})`;
    mainGroup.appendChild(border);

    // G. VIP Overlay Badge
    if (c.isVIP) {
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      star.setAttribute('points', '0,-4 1.2,-1.2 4,-1.2 1.8,0.4 2.6,3.2 0,1.5 -2.6,3.2 -1.8,0.4 -4,-1.2 -1.2,-1.2');
      star.setAttribute('fill', '#F59E0B');
      star.setAttribute('stroke', '#FFF');
      star.setAttribute('stroke-width', '0.5');
      star.setAttribute('transform', 'translate(8, 8) scale(0.65)');
      mainGroup.appendChild(star);
    }

    // H. Floor Reflection
    const refGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    refGroup.setAttribute('class', 'node-reflection');
    refGroup.setAttribute('transform', 'translate(0, 20) scale(1, -0.7)');
    refGroup.setAttribute('opacity', '0.08');
    refGroup.setAttribute('filter', 'url(#reflection-blur)');
    refGroup.style.pointerEvents = 'none';

    const refImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    refImg.setAttribute('href', avatarUrl);
    refImg.setAttribute('x', '-12');
    refImg.setAttribute('y', '-12');
    refImg.setAttribute('width', '24');
    refImg.setAttribute('height', '24');
    refImg.setAttribute('clip-path', `url(#${clipPathId})`);
    refGroup.appendChild(refImg);

    // Append to group
    group.appendChild(refGroup);
    group.appendChild(mainGroup);
  }

  updateDynamicLighting(state) {
    const overlay = document.getElementById('lighting-overlay');
    if (!overlay) return;

    const hour = state.clock.hours;
    const isRainy = state.weather && state.weather.condition === 'Rainy';

    let color = 'transparent';
    let opacity = 0;

    if (isRainy) {
      color = '#273549'; // Slate blue multiply tint
      opacity = 0.28;
    } else if (hour >= 6 && hour < 12) {
      color = '#FBBF24'; // Warm gold sunrise
      opacity = 0.14;
    } else if (hour >= 12 && hour < 16) {
      color = 'transparent'; // Bright neutral light
      opacity = 0;
    } else if (hour >= 16 && hour < 20) {
      color = '#EA580C'; // Sunset amber orange
      opacity = 0.22;
    } else {
      color = '#0F0907'; // Dim warm night
      opacity = 0.58;
    }

    if (color === 'transparent') {
      overlay.setAttribute('fill', 'transparent');
      overlay.setAttribute('opacity', '0');
    } else {
      overlay.setAttribute('fill', color);
      overlay.setAttribute('opacity', opacity.toString());
    }

    // Window Glass glow brightness (Feature 3)
    const windowGlass = document.getElementById('window-glass');
    if (windowGlass) {
      if (hour >= 20 || hour < 6) {
        windowGlass.setAttribute('opacity', '0.12'); // Dark outside
        windowGlass.setAttribute('fill', '#38BDF8'); // Sky blue/moonlight
      } else if (hour >= 16 && hour < 20) {
        windowGlass.setAttribute('opacity', '0.45'); // Sunset glow
        windowGlass.setAttribute('fill', '#EA580C');
      } else if (isRainy) {
        windowGlass.setAttribute('opacity', '0.22'); // Rainy slate
        windowGlass.setAttribute('fill', '#64748B');
      } else {
        windowGlass.setAttribute('opacity', '0.65'); // Sunny bright
        windowGlass.setAttribute('fill', '#FDE047');
      }
    }

    // Rain drops animation overlay (Feature 15)
    const rain = document.getElementById('rain-drops');
    if (rain) {
      if (isRainy) {
        rain.style.opacity = '0.68';
        if (!this.rainTween) {
          this.rainTween = gsap.to(rain.children, {
            y: '+=160',
            duration: 0.6,
            repeat: -1,
            ease: 'none',
            stagger: 0.08
          });
        } else {
          this.rainTween.play();
        }
      } else {
        rain.style.opacity = '0';
        if (this.rainTween) this.rainTween.pause();
      }
    }
  }

  updateCameraFocus(state) {
    const svg = document.getElementById('twin-svg');
    if (!svg) return;

    const hour = state.clock.hours;
    const isFailure = state.demo && state.demo.activeScenario === 'Machine Failure';
    const isLowStock = state.warnings && Object.values(state.warnings.lowStock).some(Boolean);

    let targetViewBox = '0 0 600 400';

    if (isFailure) {
      // Zoom on espresso machines (coordinates around 130-220, 230-265)
      targetViewBox = '80 160 320 213';
    } else if (hour >= 8 && hour < 11) {
      // Zoom on queue lines (coordinates around 300-500, 250-350)
      targetViewBox = '240 160 360 240';
    } else if (isLowStock) {
      // Zoom on counters and inventory area
      targetViewBox = '110 140 380 253';
    }

    const currentVB = svg.getAttribute('viewBox');
    if (currentVB !== targetViewBox) {
      const parts = targetViewBox.split(' ').map(Number);
      gsap.to(svg, {
        attr: { viewBox: `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}` },
        duration: 1.6,
        ease: 'power2.inOut'
      });
    }
  }

  /**
   * Helper method to render snapshots directly during seek scrubs
   */
  renderSnapshot(state) {
    this.handleStateUpdate(state);
  }

  /**
   * Translates simulation states to coordinate movements on the SVG floorplan using GSAP.
   */
  handleStateUpdate(state) {
    const container = document.getElementById('twin-customers-container');
    const tooltip = document.getElementById('twin-tooltip');
    if (!container) return;

    // Apply JIT lighting & camera focus (Feature 3, 11)
    this.updateDynamicLighting(state);
    this.updateCameraFocus(state);

    // Update live telemetry status pill bar
    const telActive = document.getElementById('twin-telemetry-active');
    const telQueue = document.getElementById('twin-telemetry-queue');
    const telMachine1 = document.getElementById('twin-telemetry-machine1');
    const telMachine2 = document.getElementById('twin-telemetry-machine2');
    const telLoad = document.getElementById('twin-telemetry-load');

    const hasCust = state && state.customers;
    const customerList = (hasCust && state.customers.list) ? state.customers.list : [];
    const queueLength = (hasCust && state.customers.queueLength !== undefined) ? state.customers.queueLength : 0;

    if (telActive) telActive.textContent = customerList.length;
    if (telQueue) telQueue.textContent = queueLength;
    
    if (telMachine1) {
      const h1 = state && state.machineHealth !== undefined ? state.machineHealth : 100;
      telMachine1.textContent = `${h1}%`;
      telMachine1.style.color = h1 < 30 ? 'var(--color-danger)' : (h1 < 70 ? 'var(--color-warning)' : 'var(--color-success)');
    }
    if (telMachine2) {
      const isFailure = state && state.demo && state.demo.activeScenario === 'Machine Failure';
      const h2 = state && state.machineHealth !== undefined ? Math.max(0, state.machineHealth - (isFailure ? 100 : 0)) : 100;
      telMachine2.textContent = `${h2}%`;
      telMachine2.style.color = h2 < 30 ? 'var(--color-danger)' : (h2 < 70 ? 'var(--color-warning)' : 'var(--color-success)');
    }

    if (telLoad) {
      if (queueLength > 5) {
        telLoad.textContent = 'Critical Congestion';
        telLoad.style.color = 'var(--color-danger)';
      } else if (queueLength > 2) {
        telLoad.textContent = 'High Demand';
        telLoad.style.color = 'var(--color-warning)';
      } else {
        telLoad.textContent = 'Stable';
        telLoad.style.color = 'var(--color-success)';
      }
    }

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

    // 1. Baristas state & reflection synchronization (Feature 1)
    const staffList = (state && state.staff && state.staff.list) ? state.staff.list : [];
    staffList.forEach(b => {
      const ring = document.getElementById(`barista-${b.name.toLowerCase()}-ring`);
      const group = document.getElementById(`barista-${b.name.toLowerCase()}`);
      const refGroup = document.getElementById(`barista-${b.name.toLowerCase()}-reflection`);

      if (ring && group) {
        if (b.busy) {
          ring.setAttribute('fill', 'rgba(245, 158, 11, 0.15)');
          ring.setAttribute('stroke', 'var(--color-warning)');
          
          // Animate shift closer to espresso machine
          const dest = this.toIso(b.name === 'Emma' ? 145 : (b.name === 'Sophia' ? 220 : 275), 105);
          gsap.to(group, { attr: { transform: `translate(${dest.x}, ${dest.y})` }, duration: 0.6 });
          if (refGroup) gsap.to(refGroup, { attr: { transform: `translate(${dest.x}, ${dest.y + 12}) scale(1, -0.6)` }, duration: 0.6 });
        } else {
          ring.setAttribute('fill', 'rgba(16, 185, 129, 0.1)');
          ring.setAttribute('stroke', 'var(--color-success)');
          
          // Return to baseline
          const dest = this.toIso(b.name === 'Emma' ? 130 : (b.name === 'Sophia' ? 210 : 290), 115);
          gsap.to(group, { attr: { transform: `translate(${dest.x}, ${dest.y})` }, duration: 0.6 });
          if (refGroup) gsap.to(refGroup, { attr: { transform: `translate(${dest.x}, ${dest.y + 12}) scale(1, -0.6)` }, duration: 0.6 });
        }
      }
    });

    // 2. Machines state, glows, steam particles, repairs & soft bronze bloom (Features 3, 4, 7)
    const mLight1 = document.getElementById('machine-light-1');
    const mLight2 = document.getElementById('machine-light-2');
    const isBroken = state && ((state.machineHealth <= 0) || (state.demo && state.demo.activeScenario === 'Machine Failure'));

    const bloomA = document.querySelector('#espresso-machine-1 .machine-bloom-glow');
    const bloomB = document.querySelector('#espresso-machine-2 .machine-bloom-glow');

    const spotEmma = document.getElementById('spotlight-emma');
    const spotSophia = document.getElementById('spotlight-sophia');
    const spotLiam = document.getElementById('spotlight-liam');

    if (mLight1 && mLight2) {
      if (isBroken) {
        mLight1.setAttribute('fill', 'var(--color-danger)');
        mLight2.setAttribute('fill', 'var(--color-danger)');
        if (bloomA) bloomA.style.opacity = '0';
        if (bloomB) bloomB.style.opacity = '0';
        if (spotEmma) spotEmma.setAttribute('opacity', '0');
        if (spotSophia) spotSophia.setAttribute('opacity', '0');
        if (spotLiam) spotLiam.setAttribute('opacity', '0');
        
        // Blink red warning indicator
        if (Math.random() < 0.3) {
          mLight1.setAttribute('fill', '#000');
          mLight2.setAttribute('fill', '#000');
        }
      } else {
        const emma = staffList.find(b => b.name === 'Emma');
        const sophia = staffList.find(b => b.name === 'Sophia');
        const liam = staffList.find(b => b.name === 'Liam');

        const emmaBusy = emma?.busy;
        const sophiaBusy = sophia?.busy;
        const liamBusy = liam?.busy;
        
        mLight1.setAttribute('fill', emmaBusy ? 'var(--color-primary)' : 'var(--color-success)');
        mLight2.setAttribute('fill', sophiaBusy ? 'var(--color-primary)' : 'var(--color-success)');

        // Update Operational Labels (Feature 14: Floating labels)
        const labelEsprA = document.getElementById('op-label-espr-a');
        const labelEsprB = document.getElementById('op-label-espr-b');
        const labelPOS = document.getElementById('op-label-pos');

        if (labelEsprA) {
          labelEsprA.textContent = emmaBusy ? 'ESPR-A: BREWING' : 'ESPR-A: IDLE';
          labelEsprA.setAttribute('fill', emmaBusy ? 'var(--color-primary)' : '#10B981');
        }
        if (labelEsprB) {
          labelEsprB.textContent = sophiaBusy ? 'ESPR-B: BREWING' : 'ESPR-B: IDLE';
          labelEsprB.setAttribute('fill', sophiaBusy ? 'var(--color-primary)' : '#10B981');
        }
        if (labelPOS) {
          labelPOS.textContent = liamBusy ? 'POS-01: BUSY' : 'POS-01: IDLE';
          labelPOS.setAttribute('fill', liamBusy ? 'var(--color-primary)' : '#10B981');
        }

        // Toggle Dynamic Spotlights
        if (spotEmma) spotEmma.setAttribute('opacity', emmaBusy ? '0.85' : '0');
        if (spotSophia) spotSophia.setAttribute('opacity', sophiaBusy ? '0.85' : '0');
        if (spotLiam) spotLiam.setAttribute('opacity', liamBusy ? '0.85' : '0');

        // Toggle Soft Bronze Bloom pulses (Feature 3)
        if (bloomA) {
          bloomA.style.opacity = emmaBusy ? '0.65' : '0';
          if (emmaBusy) bloomA.classList.add('bloom-pulsing');
          else bloomA.classList.remove('bloom-pulsing');
        }
        if (bloomB) {
          bloomB.style.opacity = sophiaBusy ? '0.65' : '0';
          if (sophiaBusy) bloomB.classList.add('bloom-pulsing');
          else bloomB.classList.remove('bloom-pulsing');
        }
        
        // Trigger puffing steam animations randomly when busy (Feature 4)
        if (emmaBusy && Math.random() < 0.15) {
          this.triggerSteamPuff('espresso-machine-1', -0.46);
        }
        if (sophiaBusy && Math.random() < 0.15) {
          this.triggerSteamPuff('espresso-machine-2', -0.2);
        }
      }
    }

    // 3. Visual cup order stacks (Feature 6)
    const renderCupStacks = (baristaName, containerId) => {
      const cupContainer = document.getElementById(containerId);
      if (!cupContainer) return;
      cupContainer.innerHTML = '';

      const barista = staffList.find(b => b.name === baristaName);
      if (barista && barista.busy) {
        const numCups = barista.currentOrder ? 1 : 0;
        for (let i = 0; i < numCups; i++) {
          const cup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          cup.setAttribute('transform', `translate(0, ${-i * 8})`);
          
          const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          body.setAttribute('d', 'M -4 -6 L 4 -6 L 3 2 L -3 2 Z');
          body.setAttribute('fill', '#D4A373');
          cup.appendChild(body);

          const handle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          handle.setAttribute('d', 'M 4 -4 Q 7 -4 7 -2 T 4 0');
          handle.setAttribute('fill', 'none');
          handle.setAttribute('stroke', '#D4A373');
          handle.setAttribute('stroke-width', '1');
          cup.appendChild(handle);

          cupContainer.appendChild(cup);
          gsap.from(cup, { scale: 0.5, opacity: 0, duration: 0.3 });
        }
      }
    };
    renderCupStacks('Emma', 'cup-stack-machine-1');
    renderCupStacks('Sophia', 'cup-stack-machine-2');

    // 4. Chair seats highlights
    const seats = {
      'seat-1-left': false, 'seat-1-right': false,
      'seat-2-left': false, 'seat-2-right': false,
      'seat-3-top': false, 'seat-3-bottom': false
    };

    const currentCustomersMap = {};
    let queueIdx = 0;

    customerList.forEach(c => {
      currentCustomersMap[c.id] = true;

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
        targetX = 180 + (c.id.charCodeAt(5) % 3) * 35;
        targetY = 185;
      } else if (c.status === 'Completed' || c.status === 'Leaving') {
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
        const startIso = this.toIso(520, 345);
        group.setAttribute('transform', `translate(${startIso.x}, ${startIso.y})`);
        group.style.cursor = 'pointer';

        // Render customer visual avatars & reflections (Feature 1, 5)
        this.createAvatarSVG(c, group);

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

        // Speech bubble dialog container
        const bubbleG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        bubbleG.setAttribute('class', 'node-bubble');
        bubbleG.setAttribute('transform', 'translate(10, -28)');
        bubbleG.style.opacity = '0';
        bubbleG.style.pointerEvents = 'none';

        const bubbleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bubbleRect.setAttribute('x', '-5');
        bubbleRect.setAttribute('y', '-12');
        bubbleRect.setAttribute('width', '60');
        bubbleRect.setAttribute('height', '15');
        bubbleRect.setAttribute('rx', '4');
        bubbleRect.setAttribute('fill', 'rgba(16, 12, 10, 0.95)');
        bubbleRect.setAttribute('stroke', 'var(--color-primary)');
        bubbleRect.setAttribute('stroke-width', '0.8');
        bubbleG.appendChild(bubbleRect);

        const bubbleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bubbleText.setAttribute('x', '25');
        bubbleText.setAttribute('y', '-2');
        bubbleText.setAttribute('fill', '#FFF');
        bubbleText.setAttribute('font-size', '6.2');
        bubbleText.setAttribute('font-weight', '500');
        bubbleText.setAttribute('text-anchor', 'middle');
        bubbleG.appendChild(bubbleText);

        group.appendChild(bubbleG);

        container.appendChild(group);
        this.customerNodes[c.id] = group;

        // Hover events for absolute Tooltip (Feature 5: Rich Character Cards)
        group.addEventListener('mouseenter', (evt) => {
          tooltip.style.display = 'block';
          
          let moodColor = 'var(--color-success)';
          if (c.mood === 'Bored') moodColor = 'var(--color-warning)';
          else if (c.mood === 'Impatient' || c.mood === 'Angry') moodColor = 'var(--color-danger)';

          tooltip.innerHTML = `
            <div style="min-width: 145px; font-family: var(--font-sans);">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-bottom:5px;">
                <span style="font-weight:800; color:#FFF; font-size:0.75rem;">${c.name}</span>
                <span style="background:${this.getStatusColor(c.status)}; color:#000; padding:1px 5px; border-radius:4px; font-weight:800; font-size:0.55rem; text-transform:uppercase; letter-spacing:0.2px;">${c.status}</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:3px;">
                👤 Archetype: <span style="color:#FFF; font-weight:500;">${c.archetype}</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:3px;">
                ☕ Order: <span style="color:var(--color-primary); font-weight:700;">${c.drinkType}</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:3px;">
                ⏳ Patience: <span style="color:#FFF;">${c.patience} mins remaining</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:3px;">
                😊 Mood: <span style="color:${moodColor}; font-weight:700;">${c.mood}</span>
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted);">
                📊 Position: <span style="color:#FFF;">#${queueBadgeNum || 1} in queue</span>
              </div>
            </div>
          `;
          
          this.playSpatialSound('chatter', (targetX - 300) / 300);

          const avatar = group.querySelector('.avatar-main');
          if (avatar) gsap.to(avatar, { scale: 1.28, duration: 0.22, ease: 'power1.out' });
        });
        group.addEventListener('mousemove', (evt) => {
          const rect = this.container.getBoundingClientRect();
          tooltip.style.left = `${evt.clientX - rect.left + 15}px`;
          tooltip.style.top = `${evt.clientY - rect.top + 15}px`;
        });
        group.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';

          const avatar = group.querySelector('.avatar-main');
          if (avatar) gsap.to(avatar, { scale: 1, duration: 0.22, ease: 'power1.out' });
        });
      }

      // Update Animated Status Rings (Feature 6: Animated Status Rings)
      const startPat = c.archetype.includes('Faculty') ? 15 : 10;
      const progress = Math.max(0, Math.min(1.0, c.patience / startPat));
      const ringOffset = 81.68 * (1 - progress);

      const statusColor = this.getStatusColor(c.status);
      const glowRings = group.querySelectorAll('.node-glow-ring');
      glowRings.forEach(ring => {
        ring.setAttribute('stroke', statusColor);
        ring.setAttribute('stroke-dasharray', '81.68');
        ring.setAttribute('stroke-dashoffset', ringOffset.toFixed(2));
        ring.setAttribute('stroke-width', '2.2');
        ring.style.filter = `drop-shadow(0 0 5px ${statusColor})`;
      });

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

      // Dialog Speech Bubbles toggle
      const speechBubble = group.querySelector('.node-bubble');
      if (speechBubble) {
        const wantsDialog = (c.mood === 'Impatient' || c.mood === 'Angry' || Math.random() < 0.08);
        if (wantsDialog && speechBubble.style.opacity === '0') {
          speechBubble.querySelector('text').textContent = this.getBubbleText(c);
          gsap.to(speechBubble, { opacity: 0.95, y: -32, duration: 0.4, yoyo: true, hold: 2.0 });
          setTimeout(() => {
            gsap.to(speechBubble, { opacity: 0, y: -28, duration: 0.3 });
          }, 2500);
        }
      }

      // Animate translation smoothly using GSAP with realistic walking bobbing/wiggle
      const prevX = parseFloat(group.dataset.prevX || 520);
      const prevY = parseFloat(group.dataset.prevY || 345);
      const hasMoved = Math.abs(prevX - targetX) > 2 || Math.abs(prevY - targetY) > 2;

      if (hasMoved) {
        group.dataset.prevX = targetX;
        group.dataset.prevY = targetY;

        const mainAvatar = group.querySelector('.avatar-main');
        const dest = this.toIso(targetX, targetY);
        const prevDest = this.toIso(prevX, prevY);
        const dx = dest.x - prevDest.x;
        const dy = dest.y - prevDest.y;
        
        // Slight body rotation toward travel direction (Feature 4: Rotation)
        const angle = Math.max(-12, Math.min(12, Math.atan2(dy, dx) * 180 / Math.PI * 0.15));

        // Step-bobbing walking animation
        gsap.timeline()
          .fromTo(mainAvatar,
            { y: 0, rotation: 0 },
            { y: -5, rotation: angle, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' }
          )
          .to(mainAvatar, { y: 0, rotation: 0, duration: 0.1 });

        // Live Path Visualization (Feature 16:Glowing trails)
        const pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        pathLine.setAttribute('x1', prevDest.x);
        pathLine.setAttribute('y1', prevDest.y);
        pathLine.setAttribute('x2', dest.x);
        pathLine.setAttribute('y2', dest.y);
        pathLine.setAttribute('stroke', statusColor);
        pathLine.setAttribute('stroke-width', '1.2');
        pathLine.setAttribute('stroke-dasharray', '3 3');
        pathLine.setAttribute('opacity', '0.65');
        pathLine.style.filter = `drop-shadow(0 0 2px ${statusColor})`;
        
        const parentSvg = document.getElementById('twin-svg');
        if (parentSvg) {
          parentSvg.insertBefore(pathLine, document.getElementById('twin-customers-container'));
          gsap.to(pathLine, {
            opacity: 0,
            duration: 1.4,
            ease: 'power1.in',
            onComplete: () => pathLine.remove()
          });
        }

        // Turn towards barista while ordering (Feature 4)
        if (c.status === 'Ordering') {
          gsap.to(mainAvatar, { scaleX: -1, duration: 0.2 });
        } else {
          gsap.to(mainAvatar, { scaleX: 1, duration: 0.2 });
        }

        // Translate the whole node group using toIso coordinates (Feature 4: Ease In Out)
        gsap.to(group, {
          attr: { transform: `translate(${dest.x}, ${dest.y})` },
          duration: 1.1,
          ease: 'power2.inOut',
          onComplete: () => {
            // Settle squash & stretch
            gsap.timeline()
              .to(group, { scaleX: 1.25, scaleY: 0.75, duration: 0.1, ease: 'power1.in' })
              .to(group, { scaleX: 0.9, scaleY: 1.2, duration: 0.1, ease: 'power1.out' })
              .to(group, { scaleX: 1, scaleY: 1, duration: 0.18, ease: 'back.out(2)' });
          }
        });
      } else {
        const dest = this.toIso(targetX, targetY);
        gsap.to(group, {
          attr: { transform: `translate(${dest.x}, ${dest.y})` },
          duration: 0.3,
          ease: 'power1.out'
        });
      }
    });

    // Update Chair occupancy colors & Table Props animations (Feature 5)
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

    // Update Occupied table props (Feature 5)
    this.updateTableProps('table-1', seats['seat-1-left'] || seats['seat-1-right']);
    this.updateTableProps('table-2', seats['seat-2-left'] || seats['seat-2-right']);
    this.updateTableProps('table-3', seats['seat-3-top'] || seats['seat-3-bottom']);

    // Find and remove elements that left or cancelled
    Object.keys(this.customerNodes).forEach(id => {
      if (!currentCustomersMap[id]) {
        const node = this.customerNodes[id];
        const dest = this.toIso(520, 345);
        gsap.to(node, {
          attr: { transform: `translate(${dest.x}, ${dest.y})` },
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
