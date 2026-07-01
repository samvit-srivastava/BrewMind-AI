/* -------------------------------------------------------------
 * BREWMIND AI - App Controller & Core Orchestrator
 * ------------------------------------------------------------- */
import { soundEffects, formatCurrency, formatSimulationTime } from './utils.js?v=2.0';
import { memory } from './memory.js?v=2.0';
import { simulation, DRINK_MENU } from './simulation.js?v=2.0';
import { twin } from './twin.js?v=2.0';
import { inventoryController } from './inventory.js?v=2.0';
import { analyticsController } from './analytics.js?v=2.0';
import { copilot } from './copilot.js?v=2.0';
import { demoController } from './demo.js?v=2.0';
import { sandboxController } from './scenarios.js?v=2.0';

/**
 * Web Audio API synthesizer for the cinematic splash screen.
 * Generates all sound effects dynamically without assets.
 */
class SplashAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  playBeanDrop() {
    try {
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio drop play blocked or failed:", e);
    }
  }

  playSwirl() {
    try {
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      
      const bufferSize = ctx.sampleRate * 2.0;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 8.0;
      filter.frequency.setValueAtTime(180, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.8);
      filter.frequency.linearRampToValueAtTime(220, ctx.currentTime + 1.6);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      noise.start();
      noise.stop(ctx.currentTime + 2.0);
    } catch (e) {
      console.warn("Audio swirl play blocked or failed:", e);
    }
  }

  playCompletionChime() {
    try {
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        
        gain.gain.setValueAtTime(0.0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 1.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 1.25);
      });
    } catch (e) {
      console.warn("Audio chime play blocked or failed:", e);
    }
  }
}

const splashAudio = new SplashAudio();

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.clockInterval = null;
    this.kpiHistory = {
      revenue: [], orders: [], queue: [], wait: [],
      inventoryHealth: [], machineHealth: [], satisfaction: [],
      reputation: [], staff: [], ai: []
    };
  }

  /**
   * Application Bootstrapper
   */
  init() {
    // 1. Initialize State and Theme immediately
    this.setupTheme();
    this.setupStateSync();

    // 2. Initialize Navigation and Forms
    this.setupNavigation();
    this.setupSettingsForm();
    this.setupOnboardingForm();
    this.setupToastsListener();
    this.setupSimulationClockControls();

    // 3. Start sub-drawers
    copilot.init();
    demoController.init();

    // 4. Run Loading Splash Timeline
    this.setupSplashScreen();
    
    // 5. Setup Interactive Mouseglow coordinates for SaaS look
    this.setupCardGlows();
  }

  /**
   * Tracks mousemove across card elements to update CSS custom variables
   * creating a premium dynamic spotlight/glowing border hover effect.
   */
  setupCardGlows() {
    document.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.card-kpi, .panel-container, .nav-item, .float-btn');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      });
    });
  }

  /**
   * Redesigned Premium Cinematic Splash Loading Animation
   */
  setupSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const appLayout = document.getElementById('app-layout');
    const onboarding = document.getElementById('onboarding-overlay');
    const skipBtn = document.getElementById('btn-skip-splash');

    if (!splash) return;

    // Check if user has already run the app and skip is cached in LocalStorage
    const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isFirstRun = isDev || localStorage.getItem('brewmind_launched') === null;

    const completeSplash = () => {
      localStorage.setItem('brewmind_launched', 'true');
      this.stopBeanTrail();
      
      // Stop canvas animation loop if it was created
      if (this.cancelSplashCanvasAnim) {
        this.cancelSplashCanvasAnim();
      }

      gsap.to(splash, {
        opacity: 0,
        scale: 1.15,
        duration: 0.75,
        ease: 'power3.inOut',
        onComplete: () => {
          splash.style.display = 'none';
          if (!memory.hasProfile()) {
            this.showOnboarding(onboarding);
          } else {
            this.revealApp(appLayout);
          }
        }
      });
    };

    // Bind Skip Button immediately
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        gsap.killTweensOf('*');
        completeSplash();
      });
    }

    if (!isFirstRun) {
      completeSplash();
      return;
    }

    // Initialize the wow interactive canvas background
    this.setupSplashCanvas(splash);

    // Split title characters for premium staggered reveal
    const title = document.getElementById('splash-title');
    if (title) {
      const text = title.innerText;
      title.innerHTML = '';
      [...text].forEach((char, idx) => {
        const span = document.createElement('span');
        span.innerText = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.transform = 'translateY(20px) scale(0.8)';
        span.style.filter = 'blur(6px)';
        span.className = 'splash-char';
        
        if (idx < 4) { // "Brew"
          span.style.color = 'var(--color-primary)';
          span.style.fontWeight = '300';
        } else { // "Mind AI"
          span.style.color = '#FFF';
        }
        title.appendChild(span);
      });
    }

    // --- Cinematic Animation Sequence ---
    const tl = gsap.timeline({
      onComplete: () => {
        completeSplash();
      }
    });
    const bean = document.getElementById('coffee-bean');
    const cup = document.getElementById('glass-cup');
    const subtitle = document.getElementById('splash-subtitle');
    const glow = document.getElementById('splash-logo-glow');
    const swirls = [document.getElementById('liquid-swirl1'), document.getElementById('liquid-swirl2')];
    const ripples = [document.getElementById('ripple-circle1'), document.getElementById('ripple-circle2')];
    const dots = document.querySelectorAll('.splash-dot');
    const steam = document.getElementById('splash-steam-container');

    // Initialize components as pre-revealed so the animation starts with the action
    gsap.set(cup, { opacity: 1, scale: 1 });
    gsap.set(subtitle, { opacity: 0.6, y: 0 });
    gsap.set(title, { opacity: 1 });
    gsap.set('.splash-char', { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' });

    // Reset cup elements to tilted perspective
    const rim = document.getElementById('glass-rim');
    const bodyPath = document.getElementById('glass-body-path');
    const handle = document.getElementById('mug-handle');
    const liqSurf = document.getElementById('liquid-surface');
    const liqShadow = document.getElementById('liquid-shadow');
    const liqBody = document.getElementById('liquid-body');
    const latteArt = document.getElementById('latte-art-group');
    if (rim && bodyPath && handle && liqSurf && liqShadow && liqBody && latteArt) {
      gsap.set(cup, { scale: 1, rotation: 0, y: 0 });
      gsap.set([bodyPath, liqBody], { clearProps: 'opacity', opacity: 1 });
      gsap.set(handle, { clearProps: 'all', opacity: 0, rotation: 120, transformOrigin: '60px 60px' });
      gsap.set(rim, { clearProps: 'all', attr: { cx: 60, cy: 30, rx: 40, ry: 12 } });
      gsap.set(liqSurf, { clearProps: 'all', attr: { cx: 60, cy: 50, rx: 36, ry: 10 }, fill: '#FFFFFF' });
      gsap.set(liqShadow, { clearProps: 'all', attr: { cx: 60, cy: 50, rx: 36, ry: 10 }, opacity: 0 });
      gsap.set('#crema-marbling', { clearProps: 'all', transformOrigin: '60px 60px', scaleX: 0.95, scaleY: 0.28, y: -10, opacity: 0 });
      gsap.set(latteArt, { clearProps: 'all', transformOrigin: '60px 60px', scaleX: 0.95, scaleY: 0.28, y: -10, opacity: 0 });
      // Reset individual paths inside latte art
      gsap.set('.latte-stem', { strokeDashoffset: 65, opacity: 0 });
      gsap.set(['.latte-leaf', '.latte-petal'], { opacity: 0 });
    }

    // Run letter-spacing expansion in the background independently of the timeline
    gsap.to(title, { letterSpacing: '0.12em', duration: 3.8, ease: 'power1.out' });

    // Stage 2: Coffee bean appears and falls rotating instantly at time 0
    tl.to(bean, {
      opacity: 1,
      y: 190, // Falls to the surface
      rotationX: 380,
      rotationY: 760,
      scaleY: 1.15,
      scaleX: 0.85,
      duration: 1.2,
      ease: 'power2.in',
      onStart: () => {
        this.spawnAromaParticles();
        this.startBeanTrail(bean);
      }
    }, 0);

    // Stage 3: Bean touches milk -> Squash wave liquid physics + shake + ripples
    tl.add(() => {
      this.stopBeanTrail();
      splashAudio.playBeanDrop();
      
      // Squash & Stretch entry animation
      gsap.to(bean, {
        scaleX: 1.4,
        scaleY: 0.5,
        opacity: 0,
        duration: 0.12,
        ease: 'power1.out'
      });
      
      // Cup quick shake reaction on bean impact
      gsap.fromTo(cup,
        { y: 5 },
        { y: 0, duration: 0.25, ease: 'elastic.out(2, 0.4)' }
      );

      // Latte art bloom is deferred until after the camera view rotation settles.

      // Liquid wave ripples & squash-stretch physics
      const liqSurfVal = document.getElementById('liquid-surface');
      const liqBodyVal = document.getElementById('liquid-body');
      if (liqSurfVal && liqBodyVal) {
        gsap.fromTo(liqSurfVal,
          { attr: { ry: 10 }, y: 0 },
          { attr: { ry: 16 }, y: 3, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' }
        );
        gsap.fromTo(liqBodyVal,
          { scaleY: 1, y: 0 },
          { scaleY: 0.94, y: 2, transformOrigin: 'center bottom', duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' }
        );
      }
      
      // Ripples
      ripples.forEach((rip, idx) => {
        gsap.fromTo(rip,
          { rx: 0, ry: 0, opacity: 1 },
          { rx: 34 + idx * 10, ry: 9 + idx * 3, opacity: 0, duration: 0.8, delay: idx * 0.12, ease: 'power2.out' }
        );
      });

      // Burst splash dots
      dots.forEach((dot, idx) => {
        const angle = (idx / dots.length) * Math.PI * 2;
        const dist = 30 + Math.random() * 25;
        const destX = Math.cos(angle) * dist;
        const destY = -20 - Math.random() * 30; // Splashing up
        
        gsap.fromTo(dot,
          { x: 0, y: 0, opacity: 1, scale: 1.5 },
          { x: destX, y: destY, opacity: 0, scale: 0.1, duration: 0.7, ease: 'power3.out' }
        );
      });
    });

    // Stage 4: Swirling + Gradual color transition over 1.6s
    tl.add(() => {
      splashAudio.playSwirl();
    }, '+=0.05');

    tl.to(swirls, { opacity: 0.45, scale: 1.15, rotation: 30, duration: 0.8, stagger: 0.12, ease: 'power2.out' }, '+=0.05');
    
    // Gradual color transition white -> rich coffee bronze
    const liqStop1 = document.getElementById('liq-stop1');
    const liqStop2 = document.getElementById('liq-stop2');

    if (liqStop1 && liqStop2 && liqSurf) {
      tl.to(liqStop1, { attr: { 'stop-color': '#7F4F24' }, duration: 1.5, ease: 'sine.inOut' }, '-=0.5');
      tl.to(liqStop2, { attr: { 'stop-color': '#3C220F' }, duration: 1.5, ease: 'sine.inOut' }, '-=1.5');
      tl.to(liqSurf, { fill: '#6F4E37', duration: 1.5, ease: 'sine.inOut' }, '-=1.5');
      
      // Camera Morph to Circular Mug top view directly on timeline
      if (rim && bodyPath && handle && liqSurf && liqShadow && liqBody) {
        // Camera Pan & Zoom: scale up, translate down, and pivot rotation
        tl.to(cup, { scale: 1.25, rotation: -8, y: 15, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        tl.to([bodyPath, liqBody], { opacity: 0, duration: 1.3, ease: 'power2.inOut' }, '-=1.3');
        
        // Morph both the liquid surface and the 3D depth shadow circle
        tl.to(liqSurf, { attr: { cx: 60, cy: 60, rx: 50, ry: 50 }, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        tl.to(liqShadow, { attr: { cx: 60, cy: 60, rx: 50, ry: 50 }, opacity: 0.95, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        
        // Morph and fade in the crema tiger-striping marbling waves
        tl.to('#crema-marbling', { y: 0, scaleX: 1.05, scaleY: 1.05, opacity: 1, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        
        tl.to(rim, { attr: { cx: 60, cy: 60, rx: 54, ry: 54 }, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        
        // Sweep the handle in a circular 3D rotation arc around the rim
        tl.to(handle, { opacity: 1, rotation: 0, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
        tl.to(latteArt, { y: 0, scaleX: 1.05, scaleY: 1.05, duration: 1.3, ease: 'power3.inOut' }, '-=1.3');
      }
    }

    // Stage 5: Bloom the high-fidelity latte art rosetta/tulip after morph rotation settles
    if (latteArt) {
      // 1. Fade in the group wrapper
      tl.to(latteArt, { opacity: 1, duration: 0.15 }, '+=0.05');

      // 2. Draw central stem (grows upwards from base)
      tl.to('.latte-stem', {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power1.inOut'
      }, '-=0.05');

      // 3. Bloom the side leaves (staggered scale & fade from local origins)
      tl.to('.latte-leaf', {
        opacity: 0.95,
        scale: 1,
        duration: 0.75,
        stagger: 0.08,
        ease: 'back.out(1.3)'
      }, '-=0.3');

      // 4. Bloom the central nested tulip cups (staggered scale & fade from local origins)
      tl.to('.latte-petal', {
        opacity: 0.95,
        scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'back.out(1.4)'
      }, '-=0.4');
    }

    // Steam fades in and rises
    tl.to(steam, { opacity: 1, duration: 1.0 }, '-=0.4');

    // Stage 6: Cup glows + Aroma, title gold completion
    tl.to(glow, { width: 240, height: 240, opacity: 0.35, duration: 1.0, ease: 'power3.out' }, '-=0.5');
    
    tl.add(() => {
      // Glow characters and trigger chime
      splashAudio.playCompletionChime();
      gsap.to('.splash-char', {
        textShadow: '0 0 25px rgba(212, 163, 115, 0.55)',
        scale: 1.03,
        duration: 0.8,
        ease: 'power2.out'
      });
    }, '-=0.2');

    // Hold completion state briefly
    tl.to({}, { duration: 0.7 });
  }

  /**
   * Generates Stripe-quality interactive background canvas.
   */
  setupSplashCanvas(splash) {
    const canvas = document.createElement('canvas');
    canvas.id = 'splash-canvas';
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
      opacity: 0.85;
    `;
    
    // Insert canvas as first child of splash screen
    splash.insertBefore(canvas, splash.firstChild);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const resizeHandler = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeHandler);

    // Particles array
    const particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.4,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.5,
        color: ['#D4A373', '#FAEDCD', '#E6CCB2'][Math.floor(Math.random() * 3)]
      });
    }

    // Mouse coordinates
    let mouse = { x: width / 2, y: height / 2, tx: width / 2, ty: height / 2 };
    const moveHandler = (e) => {
      if (splash.style.display !== 'none') {
        mouse.tx = e.clientX;
        mouse.ty = e.clientY;
      }
    };
    window.addEventListener('mousemove', moveHandler);

    // Nebula spots
    const nebulas = [
      { x: width * 0.3, y: height * 0.4, tx: width * 0.3, ty: height * 0.4, r: 250, color: 'rgba(127, 79, 36, 0.15)' },
      { x: width * 0.7, y: height * 0.6, tx: width * 0.7, ty: height * 0.6, r: 350, color: 'rgba(212, 163, 115, 0.12)' }
    ];

    let animFrame;
    const draw = () => {
      if (splash.style.display === 'none') {
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;

      // 1. Draw Nebula Glows
      nebulas.forEach((n, idx) => {
        const time = Date.now() * 0.0005 + idx * 100;
        n.tx = (width / 2) + Math.cos(time) * 100 + (mouse.x - width / 2) * 0.15;
        n.ty = (height / 2) + Math.sin(time) * 100 + (mouse.y - height / 2) * 0.15;
        n.x += (n.tx - n.x) * 0.05;
        n.y += (n.ty - n.y) * 0.05;

        const radGrad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        radGrad.addColorStop(0, n.color);
        radGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      });

      // 2. Draw Interactive Spotlight following cursor
      const spotGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 200);
      spotGrad.addColorStop(0, 'rgba(212, 163, 115, 0.05)');
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw particles drift
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 180) {
          p.x += (dx / dist) * 0.15;
          p.y += (dy / dist) * 0.15;
        }

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10 || p.x > width + 10) {
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    // Export cancel function
    this.cancelSplashCanvasAnim = () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('mousemove', moveHandler);
      cancelAnimationFrame(animFrame);
    };
  }

  /**
   * Spawns floating particles drifting upwards in stage area
   */
  spawnAromaParticles() {
    const area = document.getElementById('splash-stage-area');
    if (!area) return;

    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'aroma-particle';
      const size = 3 + Math.random() * 6;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${30 + Math.random() * 140}px`;
      p.style.bottom = '20px';

      area.appendChild(p);

      gsap.fromTo(p,
        { opacity: 0, y: 0, scale: 0.4 },
        {
          opacity: 0.5,
          y: -140 - Math.random() * 60,
          x: (Math.random() - 0.5) * 50,
          scale: 1.8,
          duration: 1.8 + Math.random() * 1.5,
          delay: Math.random() * 1.4,
          ease: 'power2.out',
          onComplete: () => p.remove()
        }
      );
    }
  }

  /**
   * Spawns floating sparkle trails behind the falling coffee bean.
   */
  startBeanTrail(bean) {
    const area = document.getElementById('splash-stage-area');
    if (!area) return;
    
    this.beanTrailInterval = setInterval(() => {
      const yVal = gsap.getProperty(bean, "y");
      const p = document.createElement('div');
      p.className = 'bean-trail-spark';
      p.style.cssText = `
        position: absolute;
        width: 5px;
        height: 5px;
        background: radial-gradient(circle, #D4A373, transparent);
        border-radius: 50%;
        left: calc(50% - 2.5px);
        top: ${yVal - 140}px;
        opacity: 0.8;
        pointer-events: none;
        z-index: 5;
        box-shadow: 0 0 10px #D4A373;
      `;
      area.appendChild(p);
      
      gsap.to(p, {
        opacity: 0,
        scale: 0.1,
        y: "+=20",
        duration: 0.45,
        onComplete: () => p.remove()
      });
    }, 20);
  }

  stopBeanTrail() {
    if (this.beanTrailInterval) {
      clearInterval(this.beanTrailInterval);
      this.beanTrailInterval = null;
    }
  }

  /**
   * Opens the onboarding form overlay.
   */
  showOnboarding(overlay) {
    if (!overlay) return;
    overlay.style.display = 'flex';
    
    // Spring pop-in animation
    gsap.fromTo(overlay.querySelector('.panel-container'),
      { scale: 0.85, opacity: 0, y: 40 },
      { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.6)' }
    );

    // Initial Lucide icons inside onboarding modal
    if (window.lucide) lucide.createIcons();
  }

  revealApp(layout) {
    if (!layout) return;
    
    // Sync UI fields with profile memory values
    this.applyProfileToUI();
    simulation.dispatchStateChange();
    
    // Trigger real weather API fetch on startup
    this.fetchLiveWeather(memory.profile.city || 'San Francisco');

    // Trigger periodic weather updates every 30 real-world minutes (avoid spamming ticks)
    if (this.weatherUpdateInterval) clearInterval(this.weatherUpdateInterval);
    this.weatherUpdateInterval = setInterval(() => {
      const city = memory.profile.city || 'San Francisco';
      this.fetchLiveWeather(city);
    }, 30 * 60 * 1000);

    // Fade in layout with gentle zoom/bounce
    gsap.fromTo(layout,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }
    );

    // Slide down header
    gsap.fromTo('.header', {
      y: -40,
      opacity: 0
    }, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      ease: 'back.out(1.2)'
    });

    // Slide in sidebar
    gsap.fromTo('.sidebar', {
      x: -60,
      opacity: 0
    }, {
      x: 0,
      opacity: 1,
      duration: 0.7,
      ease: 'back.out(1.2)',
      delay: 0.1
    });

    // Fade in active view metrics
    gsap.fromTo('.card-kpi', {
      opacity: 0,
      y: 20
    }, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.5)',
      delay: 0.2
    });

    // Start Simulation Clock Ticker Loop
    this.startSimulationClock();

    // Spawn a welcoming toast alert
    setTimeout(() => {
      soundEffects.playSuccess();
      this.showToast(
        `Welcome to BrewMind AI`, 
        `Management workspace active for ${memory.profile.cafeName || 'Your Campus Café'}.`, 
        'success'
      );
    }, 600);
  }

  /**
   * Operational clock intervals driving the simulation timeline.
   */
  startSimulationClock() {
    simulation.start();
  }

  setupTheme() {
    let theme = memory.preferences.theme;
    if (theme === 'latte-light') {
      theme = 'dark';
      memory.updatePreferences({ theme: 'dark' });
    }
    document.body.className = `theme-${theme}`;
  }

  /**
   * Switch active themes programmatically.
   * @param {string} themeName 
   */
  changeTheme(themeName) {
    document.body.className = `theme-${themeName}`;
    memory.updatePreferences({ theme: themeName });
    
    // Play light success alert
    soundEffects.playClick();
    this.showToast('Theme Updated', `Switched layout colors to ${themeName.replace('-', ' ')}.`, 'info');
  }

  /**
   * SPA View Router
   */
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        if (viewId === this.currentView) return;

        soundEffects.playClick();

        // Update Nav Menu UI Active states
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const currentSection = document.getElementById(`view-${this.currentView}`);
        const targetSection = document.getElementById(`view-${viewId}`);

        if (targetSection) {
          // 1. Premium fade & slide out of current section
          if (currentSection) {
            gsap.to(currentSection, {
              opacity: 0,
              y: -8,
              duration: 0.15,
              ease: 'power2.in',
              onComplete: () => {
                currentSection.style.display = 'none';
                currentSection.classList.remove('active');

                // 2. Setup and display target section
                targetSection.style.display = 'block';
                targetSection.classList.add('active');
                this.currentView = viewId;

                // Dispatch changes
                window.BrewMind.updateState({
                  navigation: { currentView: viewId }
                });
                window.BrewMind.dispatch('brewmind:navigation', viewId);

                // 3. Premium fade & slide in of target section with back spring easing
                gsap.fromTo(targetSection,
                  { opacity: 0, y: 15, scale: 0.98 },
                  { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.2)' }
                );

                // 4. Stagger child components across all active views for consistent premium entry
                const children = targetSection.querySelectorAll('.card-kpi, .panel-container, .form-container, .settings-grid, table');
                if (children.length > 0) {
                  gsap.fromTo(children,
                    { opacity: 0, y: 25 },
                    { opacity: 1, y: 0, duration: 0.65, stagger: 0.08, ease: 'back.out(1.4)' }
                  );
                }

                // Lazy load
                this.lazyInitializeView(viewId, targetSection);
              }
            });
          } else {
            // Fallback if no current view is displayed
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
            this.currentView = viewId;
            this.lazyInitializeView(viewId, targetSection);
          }
        }
      });
    });

    const twinShortcut = document.getElementById('action-view-twin');
    if (twinShortcut) {
      twinShortcut.addEventListener('click', () => {
        const twinNavItem = document.getElementById('nav-twin');
        if (twinNavItem) twinNavItem.click();
      });
    }
  }

  lazyInitializeView(viewId, sectionElement) {
    switch (viewId) {
      case 'twin':
        twin.init(sectionElement);
        simulation.dispatchStateChange();
        break;
      case 'inventory':
        inventoryController.init(sectionElement);
        simulation.dispatchStateChange();
        break;
      case 'analytics':
        analyticsController.init(sectionElement);
        simulation.dispatchStateChange();
        break;
      case 'scenarios':
        sandboxController.init(sectionElement);
        break;
      case 'settings':
        this.applyProfileToUI();
        this.renderMemoryInspector('short-term');
        break;
    }
  }

  /**
   * First Run Onboarding Form Handler
   */
  setupOnboardingForm() {
    const form = document.getElementById('onboarding-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const manager = document.getElementById('onboard-manager-name').value.trim();
      const cafe = document.getElementById('onboard-cafe-name').value.trim();
      const type = document.getElementById('onboard-store-type').value;
      const city = document.getElementById('onboard-city').value.trim();
      const hours = document.getElementById('onboard-hours').value.trim();
      const theme = document.getElementById('onboard-theme').value;

      // Persist profile
      memory.updateProfile({
        managerName: manager,
        cafeName: cafe,
        storeType: type,
        city: city,
        operatingHours: hours
      });

      // Persist theme
      this.changeTheme(theme);

      // Hide onboarding overlay
      const overlay = document.getElementById('onboarding-overlay');
      gsap.to(overlay, {
        opacity: 0,
        y: -35,
        duration: 0.45,
        ease: 'power2.in',
        onComplete: () => {
          overlay.style.display = 'none';
          // Start the application layout
          this.revealApp(document.getElementById('app-layout'));
        }
      });
    });
  }

  /**
   * Settings Configuration Form Binds
   */
  setupSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('input-manager-name').value.trim();
      const cafe = document.getElementById('input-cafe-name').value.trim();
      const type = document.getElementById('input-store-type').value;
      const city = document.getElementById('input-city').value.trim();
      const hours = document.getElementById('input-hours').value.trim();
      const theme = document.getElementById('input-theme').value;
      const key = document.getElementById('input-gemini-key').value.trim();
      
      const provider = document.getElementById('input-ai-provider').value;
      const endpoint = document.getElementById('input-ai-endpoint').value.trim();

      const soundOn = document.getElementById('input-sound-enabled').checked;
      const voiceOn = document.getElementById('input-voice-enabled').checked;
      const notifsMuted = document.getElementById('input-notifications-muted').checked;

      // Update storage
      memory.updateProfile({
        managerName: name,
        cafeName: cafe,
        storeType: type,
        city: city,
        operatingHours: hours,
        geminiKey: key,
        aiProvider: provider,
        aiEndpoint: endpoint
      });

      memory.updatePreferences({
        theme,
        soundEnabled: soundOn,
        voiceEnabled: voiceOn,
        notificationsMuted: notifsMuted
      });

      // Apply theme switch
      this.changeTheme(theme);
      this.applyProfileToUI();
      soundEffects.playSuccess();
      this.showToast('Profile Configuration Saved', 'Your store parameters have been updated persistently.', 'success');
    });

    // Sound Diagnostics Test button
    const testBtn = document.getElementById('btn-sound-test');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        if (memory.preferences.soundEnabled) {
          soundEffects.playAlert();
          this.showToast('Audio Pulse Diagnostic', 'Wave oscillator chime triggered successfully.', 'info');
        } else {
          this.showToast('Audio Disabled', 'Enable sound effects checkbox in settings to play alerts.', 'warning');
        }
      });
    }

    // Reset Memory button
    const resetBtn = document.getElementById('btn-reset-all');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset all LocalStorage memory? This will wipe your profile and trigger the onboarding experience again.")) {
          memory.clearAllMemory();
          location.reload();
        }
      });
    }

    // Memory Inspector Category Tab Clicks
    const memTabs = document.querySelectorAll('.memory-tab');
    memTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        memTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const cat = tab.getAttribute('data-cat');
        soundEffects.playClick();
        this.renderMemoryInspector(cat);
      });
    });

    // Delete individual memory item via event delegation on container
    const memContainer = document.getElementById('memory-items-container');
    if (memContainer) {
      memContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-memory');
        if (delBtn) {
          const cat = delBtn.getAttribute('data-cat');
          const id = delBtn.getAttribute('data-id');
          soundEffects.playClick();
          
          if (confirm("Delete this individual operational memory node?")) {
            memory.deleteMemoryItem(cat, id);
            this.renderMemoryInspector(cat);
            this.showToast('Memory Inspector', 'Memory node successfully deleted.', 'info');
          }
        }
      });
    }
  }

  renderMemoryInspector(category = 'short-term') {
    const container = document.getElementById('memory-items-container');
    if (!container) return;

    const items = memory.getMemoriesByCategory(category);
    if (items.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 1.5rem 0;">
          No active memories stored in this category.
        </div>
      `;
      return;
    }

    let html = '';
    items.forEach(item => {
      const canDelete = item.id !== 'profile_settings' && item.id !== 'ai_settings' && item.id !== 'st_scenario';
      const delButton = canDelete 
        ? `<button type="button" class="btn-delete-memory" data-cat="${category}" data-id="${item.id}" style="background:transparent; border:none; color:var(--color-danger); cursor:pointer; font-size:0.8rem; padding:0 0.25rem;">&times;</button>`
        : '';

      html += `
        <div class="brain-insight-card" style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0.75rem; border-radius:8px; gap:0.5rem; margin-bottom:0.25rem;">
          <div style="display:flex; flex-direction:column; gap:0.1rem; flex-grow:1;">
            <span style="font-size:0.6rem; color:var(--text-muted); font-weight:700;">${item.type.toUpperCase()}</span>
            <span style="font-size:0.7rem; color:#FFF; line-height:1.3;">${item.desc}</span>
          </div>
          ${delButton}
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Syncs UI fields with cached profile states
   */
  applyProfileToUI() {
    const { managerName, cafeName, storeType, city, operatingHours, geminiKey, aiProvider, aiEndpoint } = memory.profile;
    const { theme, soundEnabled, voiceEnabled, notificationsMuted } = memory.preferences;

    // Header greeting text
    const welcome = document.getElementById('header-welcome');
    if (welcome && managerName) {
      welcome.innerText = `${this.getGreeting()}, ${managerName}`;
    }

    // Sidebar footer profile label
    const profileName = document.getElementById('display-manager-name');
    const profileCafe = document.getElementById('display-cafe-name');
    const avatar = document.getElementById('avatar-letters');

    if (profileName) profileName.innerText = managerName || 'New Manager';
    if (profileCafe) profileCafe.innerText = cafeName || 'New Store';
    if (avatar && managerName) {
      avatar.innerText = managerName.substring(0, 2).toUpperCase();
    }

    // Populate Settings forms inputs
    const mInput = document.getElementById('input-manager-name');
    const cInput = document.getElementById('input-cafe-name');
    const tSelect = document.getElementById('input-store-type');
    const cityInput = document.getElementById('input-city');
    const hoursInput = document.getElementById('input-hours');
    const themeSelect = document.getElementById('input-theme');
    const kInput = document.getElementById('input-gemini-key');
    const pSelect = document.getElementById('input-ai-provider');
    const epInput = document.getElementById('input-ai-endpoint');
    const soundCheck = document.getElementById('input-sound-enabled');
    const voiceCheck = document.getElementById('input-voice-enabled');
    const notifCheck = document.getElementById('input-notifications-muted');

    if (mInput) mInput.value = managerName;
    if (cInput) cInput.value = cafeName;
    if (tSelect) tSelect.value = storeType;
    if (cityInput) cityInput.value = city;
    if (hoursInput) hoursInput.value = operatingHours;
    if (themeSelect) themeSelect.value = theme;
    if (kInput) kInput.value = geminiKey;
    if (pSelect) pSelect.value = aiProvider || 'gemini';
    if (epInput) epInput.value = aiEndpoint || '';
    if (soundCheck) soundCheck.checked = soundEnabled;
    if (voiceCheck) voiceCheck.checked = voiceEnabled;
    if (notifCheck) notifCheck.checked = notificationsMuted || false;
  }

  /**
   * Computes dynamic greetings based on hours.
   */
  getGreeting(hours) {
    if (hours === undefined) {
      try {
        const state = window.BrewMind.getState();
        hours = state?.clock?.hours !== undefined ? state.clock.hours : 7;
      } catch (e) {
        hours = 7;
      }
    }
    if (hours < 12) return 'Good Morning';
    if (hours < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * Subscribe layout toasts to window alerts.
   */
  setupToastsListener() {
    window.BrewMind.subscribe('brewmind:toast', (e) => {
      const { title, message, type } = e.detail;
      this.showToast(title, message, type);
    });
  }

  showToast(title, message, type = 'info') {
    if (memory.preferences && memory.preferences.notificationsMuted) {
      console.log(`Notification muted: ${title} - ${message}`);
      return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Trigger program audio chime
    if (memory.preferences.soundEnabled) {
      if (type === 'success') soundEffects.playSuccess();
      else if (type === 'info') soundEffects.playClick();
      else soundEffects.playAlert();
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icons
    let iconName = 'bell';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'danger') iconName = 'x-octagon';
    
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon" style="color: var(--color-${type === 'info' ? 'primary' : type})"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${message}</div>
      </div>
      <button class="toast-close"><i data-lucide="x"></i></button>
      <div class="toast-progress" style="position: absolute; bottom: 0; left: 0; height: 3px; background: var(--color-${type === 'info' ? 'primary' : type}); width: 100%; transform-origin: left; transform: scaleX(1); opacity: 0.8; border-radius: 0 0 12px 12px;"></div>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // GSAP pop-in
    gsap.fromTo(toast,
      { x: 380, opacity: 0, scale: 0.9 },
      { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)' }
    );

    // Animate progress bar shrinking
    const progress = toast.querySelector('.toast-progress');
    if (progress) {
      gsap.to(progress, {
        scaleX: 0,
        duration: 4.5,
        ease: 'none'
      });
    }

    // Close button events
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      gsap.to(toast, {
        x: 380,
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => toast.remove()
      });
    });

    // Auto dismiss
    setTimeout(() => {
      if (toast.parentNode) {
        gsap.to(toast, {
          x: 380,
          opacity: 0,
          scale: 0.9,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => toast.remove()
        });
      }
    }, 4500);
  }

  /**
   * Fetches real-time weather metrics from Open-Meteo geocoder and forecasts.
   * @param {string} city
   */
  async fetchLiveWeather(city) {
    if (!city) city = 'San Francisco';
    console.log(`Weather Engine: Fetching live data for ${city}...`);
    try {
      // 1. Geocode lookup
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (geoData.results && geoData.results.length > 0) {
        const result = geoData.results[0];
        const { latitude, longitude, timezone } = result;
        
        // Sync timezone hours/minutes if no saved state or city changed
        const state = window.BrewMind.getState();
        const hasSavedState = localStorage.getItem('brewmind_sim_state') !== null;
        if (!hasSavedState || state.shop.city !== result.name) {
          try {
            const tz = timezone || 'UTC';
            const options = { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false };
            const formatter = new Intl.DateTimeFormat([], options);
            const parts = formatter.formatToParts(new Date());
            const hours = parseInt(parts.find(p => p.type === 'hour').value, 10);
            const minutes = parseInt(parts.find(p => p.type === 'minute').value, 10);
            
            window.BrewMind.updateState({
              clock: { hours, minutes },
              shop: { city: result.name }
            });
            console.log(`Weather Engine: Synced city ${result.name} local timezone (${tz}) time: ${hours}:${minutes}`);
          } catch (tzErr) {
            console.warn("Timezone parsing error, fallback clock active:", tzErr);
          }
        }

        // 2. Fetch forecast conditions
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`);
        const weatherData = await weatherRes.json();
        
        if (weatherData.current) {
          const current = weatherData.current;
          const temp = Math.round(current.temperature_2m);
          const humidity = current.relative_humidity_2m;
          const wind = Math.round(current.wind_speed_10m);
          const code = current.weather_code;
          
          let condition = 'Sunny';
          if (code >= 1 && code <= 3) condition = 'Cloudy';
          else if (code >= 51 && code <= 82) condition = 'Rainy';
          else if (code >= 95) condition = 'Rainy';
          if (wind > 20 && condition === 'Sunny') condition = 'Windy';

          window.BrewMind.updateState({
            weather: { condition, temp, wind, humidity }
          });
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live Open-Meteo weather, loading offline profile rules:", e);
    }

    // Baseline offline rules based on city names
    let temp = 22;
    let condition = 'Sunny';
    let wind = 10;
    let humidity = 55;

    const name = city.toLowerCase();
    if (name.includes('seattle') || name.includes('london')) {
      condition = 'Rainy';
      temp = 12;
      humidity = 85;
      wind = 14;
    } else if (name.includes('chicago') || name.includes('boston')) {
      condition = 'Windy';
      temp = 15;
      humidity = 48;
      wind = 24;
    } else if (name.includes('paris') || name.includes('tokyo')) {
      condition = 'Cloudy';
      temp = 17;
      humidity = 68;
      wind = 8;
    }

    window.BrewMind.updateState({
      weather: { condition, temp, wind, humidity }
    });
  }

  /**
   * Continuous update functions for Dashboard panels.
   */
  updateDashboardKPIs(state) {
    // 1. Campus Command Center Update (Animated with progress rings)
    const cmdAct = document.getElementById('cmd-activity');
    const cmdPop = document.getElementById('cmd-population');
    const cmdCust = document.getElementById('cmd-customers');
    const cmdRush = document.getElementById('cmd-next-rush');
    const cmdRev = document.getElementById('cmd-pred-revenue');
    
    if (cmdAct) cmdAct.innerText = state.campusActivity || 'Normal';
    if (cmdRush) cmdRush.innerText = state.expectedNextRush || 'Closed';

    // Animate command center values
    const animateElementCount = (el, target, prefix = '', suffix = '', isFloat = false) => {
      if (!el) return;
      const current = parseFloat(el.innerText.replace(/[^0-9.]/g, '')) || 0;
      const obj = { val: current };
      gsap.to(obj, {
        val: target,
        duration: 0.5,
        onUpdate: () => {
          el.innerText = isFloat 
            ? `${prefix}${obj.val.toFixed(2)}${suffix}`
            : `${prefix}${Math.round(obj.val).toLocaleString()}${suffix}`;
        }
      });
    };

    animateElementCount(cmdPop, state.campusPopulation || 11966);
    animateElementCount(cmdCust, state.customers.inside);
    animateElementCount(cmdRev, state.predictions?.closingRevenue || 0, '$', '', true);

    // Update campus population ring
    const popRing = document.getElementById('cmd-population-ring');
    const popPctText = document.getElementById('cmd-population-pct');
    if (popRing && popPctText) {
      const maxCampusCap = 25000;
      const pct = Math.min(Math.round((state.campusPopulation / maxCampusCap) * 100), 100);
      popPctText.innerText = `${pct}%`;
      const offset = 113 - (113 * pct) / 100;
      popRing.setAttribute('stroke-dashoffset', offset);
    }

    // Update active customers ring
    const custRing = document.getElementById('cmd-customers-ring');
    const custPctText = document.getElementById('cmd-customers-pct');
    if (custRing && custPctText) {
      const maxShopCapacity = 50;
      const pct = Math.min(Math.round((state.customers.inside / maxShopCapacity) * 100), 100);
      custPctText.innerText = `${pct}%`;
      const offset = 113 - (113 * pct) / 100;
      custRing.setAttribute('stroke-dashoffset', offset);
    }

    // 2. Rolling history updates for 10 Sparklines
    const pushHistory = (key, val) => {
      this.kpiHistory[key] = this.kpiHistory[key] || [];
      this.kpiHistory[key].push(val);
      if (this.kpiHistory[key].length > 15) this.kpiHistory[key].shift();
    };

    let totalPct = 0;
    let invCount = 0;
    Object.keys(state.inventory).forEach(k => {
      totalPct += (state.inventory[k].current / state.inventory[k].max) * 100;
      invCount++;
    });
    const invHealth = Math.round(totalPct / invCount);

    pushHistory('revenue', state.revenue);
    pushHistory('orders', state.orders.completed);
    pushHistory('queue', state.customers.queueLength);
    pushHistory('wait', state.customers.avgWaitTime);
    pushHistory('inventoryHealth', invHealth);
    pushHistory('machineHealth', state.machineHealth);
    pushHistory('satisfaction', state.customerSatisfaction);
    pushHistory('reputation', state.cafeReputation);
    
    const staffEff = state.staff.list.reduce((acc, c) => acc + c.efficiency, 0) / state.staff.list.length;
    pushHistory('staff', staffEff);
    pushHistory('ai', state.aiConfidence);

    // Render sparklines
    this.drawSparkline('spark-revenue', this.kpiHistory.revenue);
    this.drawSparkline('spark-orders', this.kpiHistory.orders);
    this.drawSparkline('spark-queue', this.kpiHistory.queue);
    this.drawSparkline('spark-wait', this.kpiHistory.wait);
    this.drawSparkline('spark-inventory-health', this.kpiHistory.inventoryHealth);
    this.drawSparkline('spark-machine-health', this.kpiHistory.machineHealth);
    this.drawSparkline('spark-satisfaction', this.kpiHistory.satisfaction);
    this.drawSparkline('spark-reputation', this.kpiHistory.reputation);
    this.drawSparkline('spark-staff', this.kpiHistory.staff);
    this.drawSparkline('spark-ai', this.kpiHistory.ai);

    // Update trend badges dynamically - minimalist text format
    const updateTrend = (badgeId, history, isPercentage = false) => {
      const el = document.getElementById(badgeId);
      if (!el || !history || history.length < 2) return;
      
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      
      let diff = current - previous;
      let pct = 0;
      if (previous !== 0) {
        pct = (diff / Math.abs(previous)) * 100;
      } else if (current !== 0) {
        pct = 100;
      }
      
      let text = '';
      let color = '#938075'; // default muted
      
      if (badgeId.includes('revenue')) {
        text = diff > 0.001 ? `↑ ${pct.toFixed(1)}%` : (diff < -0.001 ? `↓ ${Math.abs(pct).toFixed(1)}%` : 'Stable');
        color = diff >= 0 ? '#10B981' : '#EF4444';
      } else if (badgeId.includes('orders')) {
        text = diff > 0.001 ? `↑ ${pct.toFixed(0)}%` : (diff < -0.001 ? `↓ ${Math.abs(pct).toFixed(0)}%` : 'Stable');
        color = diff >= 0 ? '#10B981' : '#EF4444';
      } else if (badgeId.includes('queue')) {
        text = diff > 0.1 ? `↑ ${diff.toFixed(0)}` : (diff < -0.1 ? `↓ ${Math.abs(diff).toFixed(0)}` : 'Stable');
        // Queue size increasing is BAD (red), decreasing is GOOD (green)
        color = diff > 0.1 ? '#EF4444' : '#10B981';
      } else if (badgeId.includes('wait')) {
        text = diff > 0.01 ? `↑ ${pct.toFixed(0)}%` : (diff < -0.01 ? `↓ ${Math.abs(pct).toFixed(0)}%` : 'Optimal');
        // Wait time increasing is BAD (red), decreasing is GOOD (green)
        color = diff > 0.01 ? '#EF4444' : '#10B981';
      } else if (badgeId.includes('inventory')) {
        text = diff > 0.01 ? `↑ ${pct.toFixed(0)}%` : (diff < -0.01 ? `↓ ${Math.abs(pct).toFixed(0)}%` : 'Optimal');
        color = diff >= 0 ? '#10B981' : '#EF4444';
      } else if (badgeId.includes('machine')) {
        text = diff > 0.1 ? `↑ ${pct.toFixed(0)}%` : (diff < -0.1 ? `↓ ${Math.abs(pct).toFixed(0)}%` : 'Stable');
        color = current >= 80 ? '#10B981' : (current >= 50 ? '#F59E0B' : '#EF4444');
      } else if (badgeId.includes('satisfaction')) {
        text = diff > 0.01 ? `↑ ${pct.toFixed(0)}%` : (diff < -0.01 ? `↓ ${Math.abs(pct).toFixed(0)}%` : 'Stable');
        color = diff >= 0 ? '#10B981' : '#EF4444';
      } else if (badgeId.includes('reputation')) {
        text = diff > 0.1 ? `↑ ${diff.toFixed(0)} pts` : (diff < -0.1 ? `↓ ${Math.abs(diff).toFixed(0)} pts` : 'Stable');
        color = diff >= 0 ? '#F59E0B' : '#EF4444';
      } else if (badgeId.includes('staff')) {
        text = current >= 1.0 ? 'Active' : 'Standby';
        color = '#10B981';
      } else if (badgeId.includes('ai')) {
        text = current >= 80 ? 'High' : (current >= 50 ? 'Medium' : 'Low');
        color = '#10B981';
      }
      
      el.style.color = color;
      el.style.background = 'none';
      el.style.border = 'none';
      el.style.padding = '0';
      el.textContent = text;
    };
    
    updateTrend('trend-revenue', this.kpiHistory.revenue);
    updateTrend('trend-orders', this.kpiHistory.orders, true);
    updateTrend('trend-queue', this.kpiHistory.queue, true);
    updateTrend('trend-wait', this.kpiHistory.wait);
    updateTrend('trend-inventory-health', this.kpiHistory.inventoryHealth, true);
    updateTrend('trend-machine-health', this.kpiHistory.machineHealth, true);
    updateTrend('trend-satisfaction', this.kpiHistory.satisfaction, true);
    updateTrend('trend-reputation', this.kpiHistory.reputation, true);
    updateTrend('trend-staff', this.kpiHistory.staff);
    updateTrend('trend-ai', this.kpiHistory.ai, true);
    
    if (window.lucide) lucide.createIcons();

    // 3. KPI values update (with GSAP counters - animated all 10 cards)
    const updateVal = (id, targetVal, prefix = '', suffix = '', decimals = 0) => {
      const el = document.getElementById(id);
      if (!el) return;
      
      if (el._lastVal === undefined) {
        let cleanText = el.innerText;
        if (suffix) {
          cleanText = cleanText.replace(suffix, '');
        }
        el._lastVal = parseFloat(cleanText.replace(/[^0-9.-]/g, '')) || 0;
      }
      
      const obj = { val: el._lastVal };
      
      gsap.to(obj, {
        val: targetVal,
        duration: 0.5,
        onUpdate: () => {
          el.innerText = `${prefix}${obj.val.toFixed(decimals)}${suffix}`;
          el._lastVal = obj.val;
        }
      });
    };

    updateVal('val-revenue', state.revenue, '$', '', 2);
    updateVal('val-orders', state.orders.completed, '', '', 0);
    updateVal('val-queue', state.customers.queueLength, '', '', 0);
    updateVal('val-wait', state.customers.avgWaitTime, '', 'm', 1);
    updateVal('val-inventory-health', invHealth, '', '%', 0);
    updateVal('val-machine-health', state.machineHealth, '', '%', 0);
    updateVal('val-satisfaction', state.customerSatisfaction, '', '%', 0);
    updateVal('val-reputation', state.cafeReputation, '', '/100', 0);
    updateVal('val-staff', staffEff, '', 'x', 1);
    updateVal('val-ai', state.aiConfidence, '', '%', 0);

    // 4. Threshold alarm glow classes
    const toggleGlow = (cardId, trigger) => {
      const el = document.getElementById(cardId);
      if (el) {
        if (trigger) el.classList.add('critical-glow');
        else el.classList.remove('critical-glow');
      }
    };
    toggleGlow('kpi-queue', state.customers.queueLength > 8);
    toggleGlow('kpi-satisfaction', state.customerSatisfaction < 80);
    toggleGlow('kpi-machine-health', state.machineHealth < 60);
    toggleGlow('kpi-inventory-health', invHealth < 40);

    // 5. Circular Performance Gauge
    const gaugeFill = document.getElementById('radial-gauge-fill');
    const scoreVal = document.getElementById('radial-score-val');
    if (gaugeFill && scoreVal) {
      scoreVal.innerText = state.performanceScore;
      const offset = 238.7 - (238.7 * state.performanceScore) / 100;
      gaugeFill.setAttribute('stroke-dashoffset', offset);
    }

    // 6. Smart Goals update
    const goalType = document.getElementById('goal-active-type');
    const goalProgress = document.getElementById('goal-active-progress');
    const goalBar = document.getElementById('goal-progress-fill');
    const goalEta = document.getElementById('goal-active-eta');
    const goalStrategy = document.getElementById('goal-active-strategy');

    if (goalType) goalType.innerText = state.activeGoal.type;
    if (goalProgress) goalProgress.innerText = `${state.activeGoal.progress}%`;
    if (goalBar) goalBar.style.width = `${state.activeGoal.progress}%`;
    if (goalEta) goalEta.innerText = state.activeGoal.eta;
    if (goalStrategy) goalStrategy.innerText = state.activeGoal.strategy;

    // 7. Predictions Updates
    const predRev = document.getElementById('pred-closing-revenue');
    const predQ = document.getElementById('pred-queue-30m');
    const predInv = document.getElementById('pred-inventory-remaining');
    const predSat = document.getElementById('pred-satisfaction');

    if (predRev) predRev.innerHTML = `$${state.predictions.closingRevenue.toFixed(2)} <span style="font-size:0.6rem; font-weight:normal; color:var(--text-muted);">(85% conf)</span>`;
    if (predQ) predQ.innerHTML = `${state.predictions.queue30Min} students <span style="font-size:0.6rem; font-weight:normal; color:var(--text-muted);">(91% conf)</span>`;
    if (predInv) predInv.innerHTML = `${state.predictions.inventoryHoursRemaining} hours <span style="font-size:0.6rem; font-weight:normal; color:var(--text-muted);">(95% conf)</span>`;
    if (predSat) predSat.innerHTML = `${state.predictions.expectedSatisfaction}% <span style="font-size:0.6rem; font-weight:normal; color:var(--text-muted);">(88% conf)</span>`;

    // Update simulated "Updated [Time]" telemetry strings
    const simTimeStr = formatSimulationTime(state.clock.hours, state.clock.minutes);
    const timeKeys = ['revenue', 'orders', 'queue', 'wait', 'inventory-health', 'machine-health', 'satisfaction', 'reputation', 'staff', 'ai'];
    timeKeys.forEach(k => {
      const timeEl = document.getElementById(`time-${k}`);
      if (timeEl) timeEl.innerText = `${simTimeStr} (sim)`;
    });

    // 8. Call extra panels update sub-methods
    this.updateBrainObservationsUI(state);
    this.updateDailyJournalUI(state);
    this.updateProductIntelligenceUI(state);
    this.updateOperationsTimelineUI(state);
  }

  drawSparkline(svgPathId, dataArray) {
    const path = document.getElementById(svgPathId);
    if (!path || !dataArray || dataArray.length < 2) return;
    
    const min = Math.min(...dataArray);
    const max = Math.max(...dataArray);
    const range = max - min || 1;
    
    const points = dataArray.map((val, idx) => {
      const x = (idx / (dataArray.length - 1)) * 100;
      const y = 26 - ((val - min) / range) * 22; // Keep 4px vertical safety margin
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    
    path.setAttribute('d', `M ${points.join(' L ')}`);
    
    // Update the smooth gradient area fill path
    const areaPath = document.getElementById(svgPathId + '-area');
    if (areaPath) {
      areaPath.setAttribute('d', `M 0 30 L ${points.join(' L ')} L 100 30 Z`);
    }
  }

  updateBrainObservationsUI(state) {
    const container = document.getElementById('brain-observations-container');
    if (!container) return;



    if (!state.brainInsights || state.brainInsights.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; margin-top: 1.5rem;">
          No operational insights generated.
        </div>
      `;
      return;
    }

    let html = '';
    state.brainInsights.forEach(ins => {
      html += `
        <div class="brain-insight-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #FFF; line-height: 1.2;">${ins.observation}</div>
            <span style="font-size: 0.65rem; background: rgba(212,163,115,0.15); color: var(--color-primary); padding: 0.05rem 0.25rem; border-radius: 4px; font-weight: 600; flex-shrink: 0; margin-left: 0.5rem;">${ins.confidence}% Conf</span>
          </div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.3;">${ins.reasoning}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.4rem; font-size: 0.68rem;">
            <span style="color: var(--color-warning); font-weight: 600;">Impact: ${ins.impact}</span>
            <button class="btn-primary brain-apply-btn" data-flag="${ins.autoApplyFlag}" style="height: 20px; font-size: 0.65rem; padding: 0 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
              <span>Auto Apply</span>
              <i data-lucide="zap" style="width: 10px; height: 10px;"></i>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();

    // Bind apply click events
    container.querySelectorAll('.brain-apply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const flag = btn.getAttribute('data-flag');
        this.handleBrainAutoApply(flag);
      });
    });
  }

  handleBrainAutoApply(flag) {
    if (!flag) return;
    const state = window.BrewMind.getState();
    
    if (flag === 'restock-milk') {
      const targetLimit = state.inventory.milk.max * 0.45;
      const diff = Math.max(0, parseFloat((targetLimit - state.inventory.milk.current).toFixed(1)));
      const cost = diff * state.inventory.milk.price;
      if (diff <= 0) {
        this.showToast('Milk Already Fresh', 'No JIT replenishment required.', 'info');
        return;
      }
      if (state.revenue >= cost) {
        state.revenue = parseFloat((state.revenue - cost).toFixed(2));
        state.inventory.milk.current = parseFloat(targetLimit.toFixed(1));
        state.warnings.lowStock.milk = false;
        this.showToast('Restocked Milk', `Dairy supplies JIT filled. Cost: $${cost.toFixed(2)}`, 'success');
        if (memory.preferences.soundEnabled) soundEffects.playSuccess();
      } else {
        this.showToast('Insufficient Cash', 'Cannot afford stock replenishment.', 'danger');
      }
    } else if (flag === 'restock-beans') {
      const targetLimit = state.inventory.coffeeBeans.max * 0.60;
      const diff = Math.max(0, parseFloat((targetLimit - state.inventory.coffeeBeans.current).toFixed(1)));
      const cost = diff * state.inventory.coffeeBeans.price;
      if (diff <= 0) {
        this.showToast('Beans Already Fresh', 'No JIT replenishment required.', 'info');
        return;
      }
      if (state.revenue >= cost) {
        state.revenue = parseFloat((state.revenue - cost).toFixed(2));
        state.inventory.coffeeBeans.current = parseFloat(targetLimit.toFixed(1));
        state.warnings.lowStock.coffeeBeans = false;
        this.showToast('Restocked Beans', `Espresso roast JIT filled. Cost: $${cost.toFixed(2)}`, 'success');
        if (memory.preferences.soundEnabled) soundEffects.playSuccess();
      } else {
        this.showToast('Insufficient Cash', 'Cannot afford stock replenishment.', 'danger');
      }
    } else if (flag === 'repair-machine') {
      state.machineHealth = 100;
      state.demo.activeScenario = null;
      state.warnings.machineHealthCritical = false;
      this.showToast('Machine Serviced', 'Regulator boilers calibrated. Espresso Machine running at nominal.', 'success');
      if (memory.preferences.soundEnabled) soundEffects.playSuccess();
    } else if (flag === 'optimize-staff') {
      state.staff.list.forEach(b => {
        if (b.name === 'Liam') b.efficiency = 1.0;
        if (b.name === 'Emma') b.efficiency = 1.4;
      });
      this.showToast('Staff Optimizations Applied', 'Liam shifts registers, Emma shifts espresso bars.', 'success');
      if (memory.preferences.soundEnabled) soundEffects.playSuccess();
    } else if (flag === 'optimize-goal') {
      state.activeGoal.progress = Math.min(100, state.activeGoal.progress + 15);
      this.showToast('AI Strategy Optimized', 'Operational alignment boosted goal completion rate.', 'success');
      if (memory.preferences.soundEnabled) soundEffects.playSuccess();
    } else {
      this.showToast('Nominal Shift', 'No immediate actions required.', 'info');
    }

    window.BrewMind.setState(state);
  }

  updateDailyJournalUI(state) {
    const container = document.getElementById('operations-journal-container');
    if (!container) return;

    if (!state.journal || state.journal.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; margin-top: 1.5rem;">
          No journal entries compiled yet. Writes hourly logs.
        </div>
      `;
      return;
    }

    let html = '';
    state.journal.forEach(entry => {
      html += `
        <div class="journal-entry-card" style="margin-bottom:0.5rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem;">
            <span>Hour: ${entry.time}</span>
            <span style="font-size:0.65rem; color:var(--text-muted);">Executive Compilation</span>
          </div>
          <div style="color: var(--text-primary); margin-bottom: 0.35rem; font-size:0.7rem;">${entry.summary}</div>
          <div style="color: var(--text-secondary); border-top: 1px dashed rgba(255,255,255,0.03); padding-top: 0.25rem; font-style: italic; font-size:0.68rem;">
            Recommendation: ${entry.recommendation}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  updateProductIntelligenceUI(state) {
    const tableBody = document.querySelector('#best-sellers-table tbody');
    if (!tableBody) return;

    const sales = state.orders.sales || {};
    const menuKeys = Object.keys(DRINK_MENU);
    
    const productsData = menuKeys.map(key => {
      const item = DRINK_MENU[key];
      const count = sales[key] || 0;
      const rev = count * item.price;
      return { key, count, rev, item };
    });

    productsData.sort((a, b) => b.count - a.count);
    
    const maxSales = Math.max(...productsData.map(p => p.count), 1);
    
    let html = '';
    productsData.slice(0, 5).forEach((prod, idx) => {
      let factorText = 'Neutral';
      let factorColor = 'var(--text-muted)';
      if (state.weather.condition === 'Rainy') {
        if (prod.item.category === 'Coffee' || prod.key === 'Hot Chocolate') { factorText = 'High demand'; factorColor = 'var(--color-success)'; }
        if (prod.item.category === 'Cold Drinks') { factorText = 'Low demand'; factorColor = 'var(--color-danger)'; }
      } else if (state.weather.condition === 'Sunny') {
        if (prod.item.category === 'Cold Drinks') { factorText = 'High demand'; factorColor = 'var(--color-success)'; }
      }

      const fillPct = (prod.count / maxSales) * 100;

      html += `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.025);">
          <td style="padding: 0.6rem 0; vertical-align: middle;">
            <div style="font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.72rem; color: var(--color-primary); font-family: var(--font-display); width: 14px; text-align: center;">#${idx+1}</span>
              <span>${prod.key}</span>
            </div>
            <div style="width: 100px; height: 3px; background: rgba(255,255,255,0.04); border-radius: 2px; margin-top: 0.35rem; overflow: hidden;">
              <div style="width: ${fillPct}%; height: 100%; background: linear-gradient(90deg, var(--color-primary), #8C5A3C); border-radius: 2px;"></div>
            </div>
          </td>
          <td style="padding: 0.6rem 0; text-align: right; font-weight: 600; color: #FFF; vertical-align: middle;">${prod.count}</td>
          <td style="padding: 0.6rem 0; text-align: right; color: var(--color-success); font-weight: 700; vertical-align: middle;">$${prod.rev.toFixed(2)}</td>
          <td style="padding: 0.6rem 0; text-align: right; vertical-align: middle;">
            <span style="font-size: 0.62rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 0.12rem 0.35rem; border-radius: 4px; color: ${factorColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px;">${factorText}</span>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  updateOperationsTimelineUI(state) {
    const timeline = document.getElementById('operations-timeline');
    if (!timeline) return;

    const logs = state.notifications.items.slice(0, 15);
    if (logs.length === 0) {
      timeline.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; margin-top: 1rem;">
          No operational events logged in timeline.
        </div>
      `;
      return;
    }

    const groupedLogs = [];
    let arrivalBuffer = [];

    logs.forEach(log => {
      if (log.title.includes('Arrival') || log.title.includes('Entered') || log.title.includes('manual') || log.message.includes('queue') || log.title.includes('Left')) {
        arrivalBuffer.push(log);
      } else {
        if (arrivalBuffer.length > 0) {
          groupedLogs.push({
            id: 'group_' + Date.now() + '_' + Math.random(),
            title: `${arrivalBuffer.length} Students Joined Line`,
            message: `Group of students arrived during campus break schedules.`,
            type: 'info',
            time: arrivalBuffer[0].time
          });
          arrivalBuffer = [];
        }
        groupedLogs.push(log);
      }
    });

    if (arrivalBuffer.length > 0) {
      groupedLogs.push({
        id: 'group_' + Date.now() + '_' + Math.random(),
        title: `${arrivalBuffer.length} Students Joined Line`,
        message: `Group of students arrived during campus break schedules.`,
        type: 'info',
        time: arrivalBuffer[0].time
      });
    }

    let html = '';
    groupedLogs.slice(0, 8).forEach(item => {
      let icon = 'info';
      let color = 'var(--color-primary)';
      if (item.type === 'success') { icon = 'check-circle'; color = 'var(--color-success)'; }
      else if (item.type === 'warning') { icon = 'alert-triangle'; color = 'var(--color-warning)'; }
      else if (item.type === 'danger') { icon = 'alert-octagon'; color = 'var(--color-danger)'; }

      html += `
        <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 8px; padding: 0.5rem 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; margin-bottom: 0.35rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="${icon}" style="width: 14px; height: 14px; color: ${color};"></i>
            <div>
              <span style="font-weight: 600; color: #FFF;">${item.title}:</span>
              <span style="color: var(--text-secondary); margin-left: 0.25rem;">${item.message}</span>
            </div>
          </div>
          <span style="font-size: 0.65rem; color: var(--text-muted);">${item.time}</span>
        </div>
      `;
    });

    timeline.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  setupSimulationClockControls() {
    const playToggleBtn = document.getElementById('sim-btn-play-toggle');
    const speedButtons = document.querySelectorAll('.sim-speed-btn');

    if (playToggleBtn) {
      playToggleBtn.addEventListener('click', () => {
        const isRunning = simulation.isRunning;
        if (isRunning) {
          simulation.pause();
        } else {
          simulation.start();
        }
        if (memory.preferences.soundEnabled) soundEffects.playClick();
        this.syncSimulationPlayToggleUI();
      });
    }

    // Set initial speed active state
    const currentSpeed = simulation.speed || 5;
    speedButtons.forEach(btn => {
      const speedVal = parseInt(btn.getAttribute('data-speed'), 10);
      if (speedVal === currentSpeed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }

      btn.addEventListener('click', (e) => {
        const speed = parseInt(e.target.getAttribute('data-speed'), 10);
        simulation.changeSpeed(speed);
        if (memory.preferences.soundEnabled) soundEffects.playClick();

        // Highlight active button
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  syncSimulationPlayToggleUI() {
    const isRunning = simulation.isRunning;
    const statusBadge = document.getElementById('sim-status-badge');
    const statusLabel = document.getElementById('sim-status-label');
    const playToggleBtn = document.getElementById('sim-btn-play-toggle');

    if (playToggleBtn) {
      if (isRunning) {
        playToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause" style="display: block;"><rect width="4" height="16" x="14" y="4" rx="1"/><rect width="4" height="16" x="6" y="4" rx="1"/></svg>`;
        playToggleBtn.setAttribute('title', 'Pause Simulation');
      } else {
        playToggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play" style="display: block;"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;
        playToggleBtn.setAttribute('title', 'Resume Simulation');
      }
    }

    if (statusLabel) {
      statusLabel.innerText = isRunning ? 'Simulation Running' : 'Simulation Paused';
    }

    if (statusBadge) {
      if (isRunning) {
        statusBadge.classList.remove('paused');
      } else {
        statusBadge.classList.add('paused');
      }
    }
  }

  updateActiveQueueUI(state) {
    const queuePanel = document.getElementById('active-queue-panel');
    if (!queuePanel) return;

    const customers = state.customers.list.filter(c => c.status === 'Queue' || c.status === 'Entering' || c.status === 'Preparing' || c.status === 'Completed');

    if (customers.length === 0) {
      queuePanel.innerHTML = `
        <div class="panel-header">
          <h3 class="panel-title">Active Queue & Workflow</h3>
          <span class="panel-action" id="action-view-twin" style="cursor:pointer; color:var(--color-primary); font-size:0.8rem; font-weight:600;">Go to Digital Twin</span>
        </div>
        <div class="placeholder-graphic" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; text-align:center; opacity:0.6;">
          <i data-lucide="users" style="width:36px; height:36px; margin-bottom:0.75rem; color:var(--text-muted);"></i>
          <p style="font-size:0.82rem; color:var(--text-secondary);">No active customers in queue. Live simulation feed will display here.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      const twinShortcut = document.getElementById('action-view-twin');
      if (twinShortcut) {
        twinShortcut.addEventListener('click', () => {
          const item = document.getElementById('nav-twin');
          if (item) item.click();
        });
      }
      return;
    }

    let listHtml = `<div class="queue-list-container" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 280px; overflow-y: auto; padding-right: 5px; margin-top: 1rem;">`;
    customers.forEach(c => {
      let moodIcon = 'smile';
      let moodColor = 'var(--color-success)';
      if (c.mood === 'Bored') { moodIcon = 'meh'; moodColor = 'var(--color-warning)'; }
      else if (c.mood === 'Impatient' || c.mood === 'Angry') { moodIcon = 'frown'; moodColor = 'var(--color-danger)'; }

      const progressPercent = Math.min(100, Math.round((c.waitingTime / c.waitingTolerance) * 100));

      let statusLabel = c.status;
      let statusColor = 'var(--text-secondary)';
      if (c.status === 'Preparing') { statusColor = 'var(--color-primary)'; statusLabel = '☕ Preparing'; }
      else if (c.status === 'Completed') { statusColor = 'var(--color-success)'; statusLabel = '✅ Dining'; moodIcon = 'coffee'; moodColor = 'var(--color-success)'; }
      else if (c.status === 'Entering') { statusColor = '#3B82F6'; statusLabel = '🚶 Entering'; }
      else if (c.status === 'Queue') { statusLabel = '⏳ In Queue'; }

      listHtml += `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i data-lucide="${moodIcon}" style="width: 20px; height: 20px; color: ${moodColor};"></i>
            <div>
              <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${c.name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${c.archetype} &bull; Ordered ${c.drinkType}</div>
            </div>
          </div>
          <div style="text-align: right; min-width: 120px;">
            <div style="font-size: 0.78rem; font-weight: 600; color: ${statusColor};">${statusLabel}</div>
            <div style="width: 100px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-top: 0.25rem; display: inline-block;">
              <div style="width: ${progressPercent}%; height: 100%; background: ${moodColor}; transition: width 0.4s ease;"></div>
            </div>
          </div>
        </div>
      `;
    });
    listHtml += `</div>`;

    queuePanel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Active Queue & Workflow (${customers.length})</h3>
        <span class="panel-action" id="action-view-twin" style="cursor:pointer; color:var(--color-primary); font-size:0.8rem; font-weight:600;">Go to Digital Twin</span>
      </div>
      ${listHtml}
    `;
    if (window.lucide) lucide.createIcons();
    const twinShortcut = document.getElementById('action-view-twin');
    if (twinShortcut) {
      twinShortcut.addEventListener('click', () => {
        const item = document.getElementById('nav-twin');
        if (item) item.click();
      });
    }
  }

  updateAdvisoryUI(state) {
    const advisoryPanel = document.getElementById('operational-advisory-panel');
    if (!advisoryPanel) return;

    const alerts = state.notifications.items.slice(0, 4);

    if (alerts.length === 0) {
      advisoryPanel.innerHTML = `
        <div class="panel-header">
          <h3 class="panel-title">Operational Advisory</h3>
        </div>
        <div class="placeholder-graphic" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem; text-align:center; opacity:0.6;">
          <i data-lucide="bell" style="width:36px; height:36px; margin-bottom:0.75rem; color:var(--text-muted);"></i>
          <p style="font-size:0.82rem; color:var(--text-secondary);">System operational. No active anomalies detected.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    let alertsHtml = `<div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">`;
    alerts.forEach(a => {
      let icon = 'info';
      let color = 'var(--color-primary)';
      if (a.type === 'danger') { icon = 'alert-octagon'; color = 'var(--color-danger)'; }
      else if (a.type === 'warning') { icon = 'alert-triangle'; color = 'var(--color-warning)'; }
      else if (a.type === 'success') { icon = 'check-circle'; color = 'var(--color-success)'; }

      alertsHtml += `
        <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: flex-start; gap: 0.75rem;">
          <i data-lucide="${icon}" style="width: 16px; height: 16px; color: ${color}; flex-shrink: 0; margin-top: 0.15rem;"></i>
          <div>
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary);">${a.title}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.1rem; line-height: 1.3;">${a.message}</div>
            <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.25rem;">${a.time}</div>
          </div>
        </div>
      `;
    });
    alertsHtml += `</div>`;

    advisoryPanel.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Operational Advisory</h3>
      </div>
      ${alertsHtml}
    `;
    if (window.lucide) lucide.createIcons();
  }

  /**
   * Binds Custom event channels to metrics.
   */
  setupStateSync() {
    window.BrewMind.subscribe('brewmind:statechange', (e) => {
      const state = e.detail;

      // 1. Live Clock & Dynamic Date display
      const dateWidget = document.getElementById('header-date');
      if (dateWidget) {
        const dayNum = state.clock.day || 1;
        const baseDate = new Date('2026-06-30T07:00:00');
        baseDate.setDate(baseDate.getDate() + (dayNum - 1));
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = baseDate.toLocaleDateString('en-US', dateOptions);
        const timeStr = formatSimulationTime(state.clock.hours, state.clock.minutes);
        dateWidget.innerHTML = `${dateStr} &bull; ${timeStr}`;
      }

      // 2. Greeting displays
      const welcome = document.getElementById('header-welcome');
      if (welcome) {
        const mgrName = state.manager.name || memory.profile.managerName || 'Alex';
        welcome.innerHTML = `${this.getGreeting(state.clock.hours)}, ${mgrName} 👋`;
      }

      // 3. Live Weather displays
      const weatherMain = document.getElementById('widget-weather-main');
      const weatherFeels = document.getElementById('widget-weather-feels');
      const weatherIcon = document.getElementById('widget-weather-icon');
      if (weatherMain && weatherFeels) {
        weatherMain.innerText = `${state.weather.condition}, ${state.weather.temp}°C`;
        const feelsLike = state.weather.temp + (state.weather.humidity > 60 ? 3 : (state.weather.humidity < 40 ? -1 : 1));
        weatherFeels.innerText = `Feels like ${feelsLike}°C`;
      }
      if (weatherIcon) {
        let name = 'sun';
        if (state.weather.condition === 'Rainy') name = 'cloud-rain';
        else if (state.weather.condition === 'Cloudy') name = 'cloud';
        else if (state.weather.condition === 'Windy') name = 'wind';
        weatherIcon.setAttribute('data-lucide', name);
        if (window.lucide) lucide.createIcons();
      }

      // 4. Store Health states indicators
      const statusDot = document.getElementById('system-status-dot');
      const statusLabel = document.getElementById('system-status-label');
      const statusBadge = document.getElementById('system-status-badge');
      if (statusDot && statusLabel) {
        if (state.health === 'Nominal') {
          statusDot.style.backgroundColor = '#10B981';
          statusDot.style.boxShadow = '0 0 10px #10B981';
          statusLabel.innerText = 'System Stable';
          if (statusBadge) {
            statusBadge.style.color = '#10B981';
            statusBadge.style.background = 'rgba(16, 185, 129, 0.06)';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
          }
        } else if (state.health === 'Degraded') {
          statusDot.style.backgroundColor = '#F59E0B';
          statusDot.style.boxShadow = '0 0 10px #F59E0B';
          statusLabel.innerText = 'Service Congestion';
          if (statusBadge) {
            statusBadge.style.color = '#F59E0B';
            statusBadge.style.background = 'rgba(245, 158, 11, 0.06)';
            statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.2)';
          }
        } else {
          statusDot.style.backgroundColor = '#EF4444';
          statusDot.style.boxShadow = '0 0 10px #EF4444';
          statusLabel.innerText = 'Critical Outage';
          if (statusBadge) {
            statusBadge.style.color = '#EF4444';
            statusBadge.style.background = 'rgba(239, 68, 68, 0.06)';
            statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }
        }
      }

      // 4b. Sync play/pause indicators
      this.syncSimulationPlayToggleUI();

      // 5. Update notifications badge count
      const notifCount = document.getElementById('notifications-count');
      if (notifCount) {
        notifCount.innerText = state.notifications.unreadCount;
        notifCount.style.display = state.notifications.unreadCount > 0 ? 'flex' : 'none';
      }

      // 6. Update Goal select dropdown value
      const goalSelect = document.getElementById('goal-select-dropdown');
      if (goalSelect) {
        goalSelect.value = state.activeGoal?.type || 'Reduce Wait Time';
        if (!goalSelect.dataset.listenerBound) {
          goalSelect.dataset.listenerBound = 'true';
          goalSelect.addEventListener('change', (evt) => {
            window.BrewMind.updateState({ activeGoal: { type: evt.target.value } });
            if (memory.preferences.soundEnabled) soundEffects.playClick();
          });
        }
      }

      // 7. Update Dashboard metrics
      this.updateDashboardKPIs(state);

      // 8. Update active lists
      this.updateActiveQueueUI(state);
      this.updateAdvisoryUI(state);
    });

    // Profile updates event listener
    window.BrewMind.subscribe('brewmind:profilechange', (e) => {
      this.applyProfileToUI();
      this.fetchLiveWeather(e.detail.city);
    });

    // Alert Clear bind
    const notifBtn = document.getElementById('btn-notifications');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        soundEffects.playClick();
        const state = window.BrewMind.getState();
        state.notifications.unreadCount = 0;
        window.BrewMind.setState(state);
        this.showToast('Alert Center', 'Notifications acknowledged.', 'info');
      });
    }

    // Mute toggle bind
    const muteBtn = document.getElementById('btn-mute-toggle');
    if (muteBtn) {
      // Restore icon on load
      const isMuted = memory.preferences.notificationsMuted || false;
      const muteIcon = document.getElementById('mute-icon');
      if (isMuted && muteIcon) {
        muteIcon.setAttribute('data-lucide', 'bell-off');
        if (window.lucide) lucide.createIcons();
      }

      muteBtn.addEventListener('click', () => {
        const currentlyMuted = memory.preferences.notificationsMuted || false;
        const newMuted = !currentlyMuted;
        memory.updatePreferences({ notificationsMuted: newMuted });

        const icon = document.getElementById('mute-icon');
        if (icon) {
          icon.setAttribute('data-lucide', newMuted ? 'bell-off' : 'bell');
          if (window.lucide) lucide.createIcons();
        }

        // Also sync the settings checkbox
        const settingsCheck = document.getElementById('input-notifications-muted');
        if (settingsCheck) settingsCheck.checked = newMuted;

        if (!newMuted) {
          soundEffects.playClick();
          this.showToast('Notifications Unmuted', 'Toast alerts are now visible.', 'info');
        }
      });
    }
  }
}

// Initializing orchestrator on launch, supporting cases where document is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new AppController();
    app.init();
  });
} else {
  const app = new AppController();
  app.init();
}
