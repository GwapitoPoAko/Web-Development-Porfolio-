const soluteMeta = {
  O2: { color: '#5a8eb1', radius: 5.6 },
  CO2: { color: '#4d7b5e', radius: 5.8 },
  'Na+': { color: '#c26d4d', radius: 6.1 },
  'K+': { color: '#d09b49', radius: 5.9 },
  Glucose: { color: '#8f7db3', radius: 7.2 },
  ATP: { color: '#5f9b68', radius: 7.5 },
  Ligand: { color: '#f3b35a', radius: 6.5 }
};

function drawPhospholipidBilayer(ctx, width, height, opts = {}) {
  const {
    halfWidth = 24,
    headRadius = 6.5,
    spacing = 20,
    wobble = 0
  } = opts;

  const centerX = width / 2;
  const outerX = centerX - halfWidth;
  const innerX = centerX + halfWidth;

  // Watery outside / inside compartments
  ctx.fillStyle = '#dbe9f5';
  ctx.fillRect(0, 0, outerX, height);
  ctx.fillStyle = '#e7f0f7';
  ctx.fillRect(innerX, 0, width - innerX, height);

  // Hydrophobic core (the fatty tail region)
  const coreGrad = ctx.createLinearGradient(outerX, 0, innerX, 0);
  coreGrad.addColorStop(0, '#fbeedd');
  coreGrad.addColorStop(0.5, '#fdf4e8');
  coreGrad.addColorStop(1, '#fbeedd');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(outerX, 0, innerX - outerX, height);

  const tailColorA = 'rgba(219, 128, 158, 0.9)';
  const tailColorB = 'rgba(219, 128, 158, 0.5)';
  const headFill = '#e3a94a';
  const headStroke = '#b9781f';

  const drawRow = (headsX, dir, phaseOffset) => {
    for (let y = headRadius; y < height + spacing; y += spacing) {
      const wob = Math.sin(y * 0.16 + wobble + phaseOffset) * (headRadius * 0.22);
      const headY = y + wob;

      for (let t = -1; t <= 1; t += 2) {
        ctx.beginPath();
        ctx.strokeStyle = t === -1 ? tailColorA : tailColorB;
        ctx.lineWidth = Math.max(1, headRadius * 0.24);
        const steps = 9;
        for (let s = 0; s <= steps; s++) {
          const p = s / steps;
          const x = headsX + dir * ((headRadius - 1) + p * (halfWidth - headRadius + 1));
          const bulge = Math.sin(p * Math.PI) * (headRadius * 0.55);
          const yy = headY + t * (headRadius * 0.32) + Math.sin(p * 6 + wobble + phaseOffset) * bulge * 0.4;
          if (s === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = headFill;
      ctx.arc(headsX, headY, headRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(0.6, headRadius * 0.14);
      ctx.strokeStyle = headStroke;
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.arc(headsX - headRadius * 0.32, headY - headRadius * 0.32, headRadius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawRow(outerX, 1, 0);
  drawRow(innerX, -1, 1.7);
}

class Particle {
  constructor(type, x, y, isInside) {
    const meta = soluteMeta[type];
    this.type = type;
    this.color = meta.color;
    this.radius = meta.radius;
    this.isInside = isInside;
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 1.3;
    this.vy = (Math.random() - 0.5) * 1.3;
    this.glow = 0;
  }

  update(bounds, controls) {
    const tempFactor = 0.4 + ((controls.temperature - 5) / 40) * 1.6;
    const drift = 0.8 + controls.simSpeed * 0.8;

    this.vx += (Math.random() - 0.5) * tempFactor * drift;
    this.vy += (Math.random() - 0.5) * tempFactor * drift;
    this.vx *= 0.94;
    this.vy *= 0.94;

    const maxVel = 1.8 * controls.simSpeed * tempFactor;
    if (Math.abs(this.vx) > maxVel) this.vx = Math.sign(this.vx || 1) * maxVel;
    if (Math.abs(this.vy) > maxVel) this.vy = Math.sign(this.vy || 1) * maxVel;

    this.x += this.vx;
    this.y += this.vy;

    const membraneBuffer = 29;
    const nearMembrane = this.isInside ? bounds.membraneX + membraneBuffer : bounds.membraneX - membraneBuffer;
    const minX = this.isInside ? nearMembrane : this.radius;
    const maxX = this.isInside ? bounds.width - this.radius : nearMembrane;
    if (this.x < minX) { this.x = minX; this.vx *= -1; }
    if (this.x > maxX) { this.x = maxX; this.vx *= -1; }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    if (this.y > bounds.height - this.radius) { this.y = bounds.height - this.radius; this.vy *= -1; }

    if (this.glow > 0) this.glow -= 1;
  }

  tryCrossing(membraneX, controls, system) {
    if (this.type === 'ATP' || this.type === 'Ligand') return false;
    const distance = Math.abs(this.x - membraneX);
    if (distance > 35) return false;

    const permeability = controls.permeability / 100;
    const sizeFactor = 1 - this.radius / 14;
    const insideCount = system.countByType(this.type, true);
    const outsideCount = system.countByType(this.type, false);
    const gradient = Math.abs(insideCount - outsideCount) / Math.max(insideCount + outsideCount, 1);
    const kineticFactor = 0.4 + ((controls.temperature - 5) / 40) * 1.6;
    const isIon = this.type === 'Na+' || this.type === 'K+';
    const voltageOpen = controls.membranePotential >= -50;
    const ligandOpen = controls.ligands > 0;
    const channelFactor = (isIon && controls.leakageChannels && controls.deviceCounts.leak ? 1.5 : 0)
      + (isIon && voltageOpen && controls.deviceCounts.voltage ? 1.4 : 0)
      + (this.type === 'Glucose' && ligandOpen && controls.deviceCounts.ligand ? 2.2 : 0);
    const activeMatch = controls.transporter === 'pump' ? isIon : (this.type === 'Na+' || this.type === 'Glucose');
    const atpAvailable = system.countByType('ATP', true) + system.countByType('ATP', false) > 0;
    const modeFactor = controls.mode === 'facilitated' && (isIon || this.type === 'Glucose') ? Math.max(0.15, channelFactor)
      : controls.mode === 'simple' && (isIon || this.type === 'Glucose') ? 0.08
      : 1;
    const movingAgainstGradient = (this.isInside && insideCount < outsideCount) || (!this.isInside && outsideCount < insideCount);
    const activeFactor = controls.mode === 'active' && movingAgainstGradient && activeMatch && atpAvailable && controls.deviceCounts.transporter ? 3 : 1;
    const chance = Math.max(0.003, permeability * sizeFactor * (0.1 + gradient * 0.9) * controls.simSpeed * kineticFactor * modeFactor * activeFactor * 0.25);

    if (Math.random() < chance) {
      this.isInside = !this.isInside;
      this.x = this.isInside ? membraneX + 30 + this.radius : membraneX - 30 - this.radius;
      this.vx *= -1;
      this.glow = 18;
      if (typeof controls.onCross === 'function') controls.onCross();
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (this.type === 'ATP') {
      ctx.fillStyle = '#a8d773';
      ctx.strokeStyle = '#4d7b5e';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = Math.PI / 3 * point;
        const x = this.x - 5 + Math.cos(angle) * 4.5;
        const y = this.y + Math.sin(angle) * 4.5;
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x - 1, this.y);
      ctx.lineTo(this.x + 2, this.y - 3);
      ctx.lineTo(this.x + 5, this.y + 3);
      ctx.lineTo(this.x + 8, this.y - 2);
      ctx.stroke();
      return;
    }

    if (this.type === 'Ligand') {
      ctx.fillStyle = this.variant === 'star' ? '#9dc2e1' : this.color;
      ctx.strokeStyle = 'rgba(27, 36, 42, 0.78)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (this.variant === 'star') {
        for (let point = 0; point < 10; point += 1) {
          const angle = -Math.PI / 2 + point * Math.PI / 5;
          const radius = point % 2 ? this.radius * 0.42 : this.radius;
          const x = this.x + Math.cos(angle) * radius;
          const y = this.y + Math.sin(angle) * radius;
          if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(this.x, this.y + this.radius);
        ctx.lineTo(this.x - this.radius, this.y - this.radius * 0.7);
        ctx.lineTo(this.x + this.radius, this.y - this.radius * 0.7);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      return;
    }

    if (this.type === 'O2' || this.type === 'CO2') {
      const colors = this.type === 'O2' ? ['#5a8eb1', '#8bb8d2'] : ['#4d7b5e', '#80a98b', '#4d7b5e'];
      const spacing = this.type === 'O2' ? 4 : 5;
      colors.forEach((color, index) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(this.x + (index - (colors.length - 1) / 2) * spacing, this.y, this.radius * 0.62, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(27,36,42,0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      return;
    }

    if (this.type === 'Glucose') {
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 3;
        const x = this.x + Math.cos(angle) * this.radius;
        const y = this.y + Math.sin(angle) * this.radius;
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(27,36,42,0.75)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      return;
    }

    if (this.glow > 0) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 210, 110, 0.6)';
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(27, 36, 42, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.moveTo(this.x - 2.5, this.y);
    ctx.lineTo(this.x + 2.5, this.y);
    ctx.moveTo(this.x, this.y - 2.5);
    ctx.lineTo(this.x, this.y + 2.5);
    ctx.stroke();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addParticles(type, count, side, bounds) {
    for (let i = 0; i < count; i++) {
      const x = side === 'inside'
        ? bounds.width * 0.56 + Math.random() * 120
        : bounds.width * 0.44 - Math.random() * 120;
      const y = 20 + Math.random() * (bounds.height - 40);
      const particle = new Particle(type, x, y, side === 'inside');
      if (type === 'Ligand') particle.variant = i % 2 ? 'star' : 'triangle';
      this.particles.push(particle);
    }
  }

  countByType(type, inside) {
    return this.particles.filter((p) => p.type === type && p.isInside === inside).length;
  }

  countAll(inside) {
    return this.particles.filter((p) => p.isInside === inside).length;
  }

  getGradient(type) {
    return Math.abs(this.countByType(type, true) - this.countByType(type, false));
  }

  clear() { this.particles = []; }

  update(bounds, controls) {
    for (const particle of this.particles) {
      particle.update(bounds, controls);
      particle.tryCrossing(bounds.membraneX, controls, this);
    }
    this.resolveCollisions(controls);
  }

  resolveCollisions(controls) {
    const collisionFactor = 0.35 + ((controls.temperature - 5) / 40) * 0.65;
    for (let i = 0; i < this.particles.length; i += 1) {
      for (let j = i + 1; j < this.particles.length; j += 1) {
        const first = this.particles[i];
        const second = this.particles[j];
        if (first.isInside !== second.isInside) continue;
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const minimumDistance = first.radius + second.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= minimumDistance * minimumDistance || Math.random() > collisionFactor) continue;

        const distance = Math.sqrt(distanceSquared) || 1;
        const normalX = dx / distance;
        const normalY = dy / distance;
        const overlap = (minimumDistance - distance) / 2;
        first.x -= normalX * overlap;
        first.y -= normalY * overlap;
        second.x += normalX * overlap;
        second.y += normalY * overlap;
        [first.vx, second.vx] = [second.vx, first.vx];
        [first.vy, second.vy] = [second.vy, first.vy];
      }
    }
  }
}

class LabAnalyst {
  analyze(system, controls) {
    const temperatureState = controls.temperature >= 32 ? 'High temperature is increasing kinetic motion, collision frequency, and transport rate.'
      : controls.temperature <= 14 ? 'Low temperature is reducing kinetic motion and slowing transport.'
      : 'Temperature is supporting steady molecular motion.';
    const atpPresent = system.countByType('ATP', true) + system.countByType('ATP', false) > 0;
    const guidance = {
      simple: {
        insight: `${temperatureState} Simple diffusion moves compatible solutes down their concentration gradient.`,
        question: 'What drives simple diffusion?',
        answer: 'Random kinetic motion moves particles from higher to lower concentration until the gradient is reduced.'
      },
      facilitated: {
        insight: `${temperatureState} Leakage channels are ${controls.leakageChannels ? 'open' : 'closed'}, while the membrane is set to ${controls.membranePotential} mV.`,
        question: 'How do channels change diffusion?',
        answer: 'Channels provide selective paths for ions or ligands, speeding passive movement without using ATP.'
      },
      active: {
        insight: atpPresent ? `${temperatureState} The selected transporter can use available ATP to move its matched solutes against a gradient.` : 'Active transport is waiting for ATP. Add ATP from the solute palette to power movement against a gradient.',
        question: 'Why does active transport need ATP?',
        answer: 'Moving a solute against its concentration gradient requires energy, which cells commonly supply with ATP.'
      }
    };
    return guidance[controls.mode];
  }

  generateInsight(system, controls) {
    const total = system.particles.length;
    const dominant = ['O2', 'CO2', 'Na+', 'K+', 'Glucose']
      .map((type) => ({ type, gradient: system.getGradient(type) }))
      .sort((a, b) => b.gradient - a.gradient)[0];

    if (!total) {
      return 'The membrane is stable. Add a few solutes to observe the first diffusion events.';
    }

    if (controls.permeability < 35) {
      return 'Permeability is low, so the membrane remains restrictive and transport stays slow.';
    }

    if (controls.simSpeed <= 0.9) {
      return 'Transport is in a slow diffusion phase, with motion steady and concentration differences gradually shifting.';
    }

    if (dominant && dominant.gradient > 8) {
      const direction = system.countByType(dominant.type, true) > system.countByType(dominant.type, false) ? 'inside' : 'outside';
      return `${dominant.type} is more concentrated on the ${direction}. That gradient is driving movement across the membrane.`;
    }

    if (controls.temperature > 30) {
      return 'Higher temperature increases kinetic energy, but the overall transport remains a slow, steady diffusion process.';
    }

    return 'The system is approaching equilibrium with slow passive diffusion balancing the concentration differences across the membrane.';
  }

  generateQuestion() {
    const prompts = [
      'Which direction is the concentration gradient driving movement?',
      'Why does membrane permeability alter transport speed?',
      'How does temperature affect molecular motion?',
      'What distinguishes passive diffusion from active transport?',
      'Why do neutral particles and ions react differently at the membrane?'
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  generateAnswer(question) {
    const answers = {
      'Which direction is the concentration gradient driving movement?': 'Gradients drive solutes from high to low concentration. Molecules naturally disperse to equalize the distribution across the membrane.',
      'Why does membrane permeability alter transport speed?': 'Permeability controls how easily molecules pass through. Higher permeability means more frequent crossings, faster equilibration.',
      'How does temperature affect molecular motion?': 'Higher temperatures increase kinetic energy, making molecules move faster and collide more often, speeding up diffusion.',
      'What distinguishes passive diffusion from active transport?': 'Passive diffusion is spontaneous and requires no energy. Active transport uses cellular energy to move molecules against gradients.',
      'Why do neutral particles and ions react differently at the membrane?': 'Neutral molecules pass through the lipid bilayer easily. Ions are charged and require channels or carriers to cross.'
    };
    return answers[question] || 'Observe the particle movement to understand the underlying biological principles.';
  }
}

class Simulator {
  constructor() {
    this.canvas = document.getElementById('simulationCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.membranePreviewCanvas = document.getElementById('membranePreviewCanvas');
    this.membranePreviewCtx = this.membranePreviewCanvas ? this.membranePreviewCanvas.getContext('2d') : null;
    this.cellMapImage = new Image();
    this.cellMapImage.src = 'Image/AnimalCell.jpg';
    this.cellMapImage.onload = () => {
      this.drawMembranePreview();
    };

    this.particleSystem = new ParticleSystem();
    this.labAnalyst = new LabAnalyst();
    this.selectedType = 'O2';
    this.isRunning = false;
    this.frameCount = 0;
    this.membraneDevices = [];
    this.controls = {
      temperature: 22,
      permeability: 58,
      simSpeed: 0.7,
      mode: 'simple',
      leakageChannels: true,
      membranePotential: -70,
      chargesVisible: false,
      ligands: 0,
      transporter: 'pump',
      deviceCounts: { leak: 0, voltage: 0, ligand: 0, transporter: 0 },
      crossingHighlights: true,
      crossingSounds: true,
      ambientSounds: false
    };
    this.audioCtx = null;

    this.initializeUI();
    this.resizeCanvas();
    this.updateThermalRateLabel();
    this.updateGuidance();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.animate();
  }

  initializeUI() {
    document.querySelectorAll('.solute-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.solute-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        this.selectedType = button.dataset.solute;
      });
    });

    document.getElementById('injectOutside').addEventListener('click', () => {
      this.particleSystem.addParticles(this.selectedType, 18, 'outside', this.getBounds());
      this.updateGuidance();
    });

    document.getElementById('injectInside').addEventListener('click', () => {
      this.particleSystem.addParticles(this.selectedType, 18, 'inside', this.getBounds());
      this.updateGuidance();
    });

    document.querySelectorAll('.concentration-slider').forEach((slider) => {
      const key = slider.id.replace('slider-', '');
      const output = document.getElementById(`value-${key}`);
      slider.addEventListener('input', (event) => {
        output.textContent = `${event.target.value}%`;
      });
    });

    document.getElementById('playBtn').addEventListener('click', () => {
      this.isRunning = true;
      if (this.controls.crossingSounds) this.initializeAudio();
      if (this.controls.ambientSounds) this.startAmbientSound();
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.isRunning = false;
      this.stopAmbientSound();
      this.stopCrossingSounds();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.particleSystem.clear();
      this.isRunning = false;
      this.frameCount = 0;
      this.stopAmbientSound();
      this.stopCrossingSounds();
      this.updateStats();
      this.updateGuidance();
    });

    document.getElementById('crossingHighlights').addEventListener('change', (event) => {
      this.controls.crossingHighlights = event.target.checked;
    });

    document.getElementById('crossingSounds').addEventListener('change', (event) => {
      this.controls.crossingSounds = event.target.checked;
      if (event.target.checked) this.initializeAudio();
    });

    document.getElementById('ambientSounds').addEventListener('change', (event) => {
      this.controls.ambientSounds = event.target.checked;
      if (event.target.checked && this.isRunning) this.startAmbientSound(); else this.stopAmbientSound();
    });

    document.getElementById('temperatureControl').addEventListener('input', (event) => {
      this.controls.temperature = Number(event.target.value);
      document.getElementById('headerTemp').textContent = `${this.controls.temperature}°C`;
      this.updateThermalRateLabel();
      this.updateGuidance();
    });

    document.querySelectorAll('.mode-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        this.controls.mode = button.dataset.mode;
        this.resetModeWorkspace();
        this.updateModePanel();
      });
    });

    document.getElementById('leakageChannels').addEventListener('change', (event) => {
      this.controls.leakageChannels = event.target.checked;
      this.updateGuidance();
    });

    document.getElementById('chargesToggle').addEventListener('change', (event) => {
      this.controls.chargesVisible = event.target.checked;
      this.updateGuidance();
    });

    document.querySelectorAll('.preset-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        this.controls.membranePotential = Number(button.dataset.potential);
        this.controls.chargesVisible = true;
        document.getElementById('chargesToggle').checked = true;
        this.updateGuidance();
      });
    });

    document.getElementById('addLigands').addEventListener('click', () => {
      if (this.controls.ligands) return;
      this.controls.ligands = 1;
      this.particleSystem.addParticles('Ligand', 1, 'outside', this.getBounds());
      document.getElementById('ligandCount').textContent = '1 ligand available';
      this.updateGuidance();
    });

    document.getElementById('removeLigand').addEventListener('click', () => {
      this.controls.ligands = 0;
      this.particleSystem.particles = this.particleSystem.particles.filter((particle) => particle.type !== 'Ligand');
      document.getElementById('ligandCount').textContent = '0 ligands available';
      this.updateGuidance();
    });

    document.querySelectorAll('.membrane-device-btn').forEach((button) => {
      button.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', button.dataset.device));
    });

    document.querySelectorAll('.remove-device-btn').forEach((button) => {
      button.addEventListener('click', () => this.removeMembraneDevice(button.dataset.kind));
    });

    document.querySelectorAll('.transporter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.transporter-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        this.controls.transporter = button.dataset.transporter;
        this.updateGuidance();
      });
      button.addEventListener('dragstart', (event) => {
        this.controls.transporter = button.dataset.transporter;
        document.querySelectorAll('.transporter-btn').forEach((btn) => btn.classList.toggle('active', btn === button));
        event.dataTransfer.setData('text/plain', button.dataset.device);
      });
    });

    this.canvas.addEventListener('dragover', (event) => event.preventDefault());
    this.canvas.addEventListener('drop', (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('text/plain');
      const rect = this.canvas.getBoundingClientRect();
      const localY = (event.clientY - rect.top) * (this.canvas.height / rect.height);
      const localX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      this.addMembraneDevice(type, null, localY, localX);
    });

    this.controls.onCross = () => this.playCrossingSound();

    document.querySelectorAll('.speed-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.speed-btn').forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        this.controls.simSpeed = Number(button.dataset.rate);
        this.updateThermalRateLabel();
      });
    });
  }

  initializeAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  playCrossingSound() {
    if (!this.isRunning || !this.controls.crossingSounds) return;

    const now = performance.now();
    if (this.lastSoundTime && now - this.lastSoundTime < 45) return;
    this.lastSoundTime = now;

    this.initializeAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    this.crossingOscillators = this.crossingOscillators || [];
    this.crossingOscillators.push(osc);
    osc.addEventListener('ended', () => {
      this.crossingOscillators = this.crossingOscillators.filter((node) => node !== osc);
    });
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  }

  startAmbientSound() {
    this.initializeAudio();
    if (!this.audioCtx) return;
    if (this.ambientOscillator) return;

    const ctx = this.audioCtx;
    this.ambientOscillator = ctx.createOscillator();
    this.ambientGain = ctx.createGain();
    this.ambientOscillator.type = 'sine';
    this.ambientOscillator.frequency.value = 118;
    this.ambientGain.gain.value = 0.055;
    this.ambientOscillator.connect(this.ambientGain);
    this.ambientGain.connect(ctx.destination);
    this.ambientOscillator.start();
  }

  stopAmbientSound() {
    if (!this.ambientOscillator) return;
    this.ambientOscillator.stop();
    this.ambientOscillator.disconnect();
    this.ambientGain.disconnect();
    this.ambientOscillator = null;
    this.ambientGain = null;
  }

  stopCrossingSounds() {
    (this.crossingOscillators || []).forEach((osc) => {
      try { osc.stop(); } catch (_) { /* Oscillator already stopped. */ }
    });
    this.crossingOscillators = [];
  }

  updateModePanel() {
    document.getElementById('facilitatedPanel').hidden = this.controls.mode !== 'facilitated';
    document.getElementById('activePanel').hidden = this.controls.mode !== 'active';
  }

  resetModeWorkspace() {
    this.isRunning = false;
    this.frameCount = 0;
    this.particleSystem.clear();
    this.membraneDevices = [];
    this.stopAmbientSound();
    this.stopCrossingSounds();
    this.controls.ligands = 0;
    this.controls.leakageChannels = true;
    this.controls.membranePotential = -70;
    this.controls.chargesVisible = false;
    this.controls.transporter = 'pump';
    this.controls.deviceCounts = { leak: 0, voltage: 0, ligand: 0, transporter: 0 };
    document.getElementById('leakageChannels').checked = true;
    document.getElementById('chargesToggle').checked = false;
    document.getElementById('ligandCount').textContent = '0 ligands available';
    document.querySelectorAll('.preset-btn').forEach((button) => button.classList.toggle('active', button.dataset.potential === '-70'));
    document.querySelectorAll('.transporter-btn').forEach((button) => button.classList.toggle('active', button.dataset.transporter === 'pump'));
    document.querySelectorAll('.solute-btn').forEach((button) => button.classList.toggle('active', button.dataset.solute === 'O2'));
    document.querySelectorAll('.membrane-device-btn').forEach((button) => button.classList.remove('active'));
    this.selectedType = 'O2';
    this.updateStats();
    this.updateGuidance();
  }

  updateGuidance() {
    const guidance = this.labAnalyst.analyze(this.particleSystem, this.controls);
    document.getElementById('labInsight').textContent = guidance.insight;
    document.getElementById('labPrompt').innerHTML = `<div class="question-tag">Question</div><div>${guidance.question}</div><div class="answer-tag">Answer</div><div>${guidance.answer}</div>`;
  }

  getMembraneSlots() {
    const count = Math.max(5, Math.floor((this.canvas.height - 120) / 72));
    return Array.from({ length: count }, (_, index) => 70 + index * ((this.canvas.height - 140) / Math.max(1, count - 1)));
  }

  addMembraneDevice(type, button, requestedY, requestedX) {
    if (!type) return;
    if (requestedX !== undefined && Math.abs(requestedX - this.canvas.width / 2) > 70) return;
    const kind = type.startsWith('leak') ? 'leak' : type.startsWith('voltage') ? 'voltage' : type.startsWith('ligand') ? 'ligand' : 'transporter';
    const slots = this.getMembraneSlots();
    const occupied = new Set(this.membraneDevices.map((device) => device.slot));
    const available = slots.map((y, slot) => ({ y, slot })).filter(({ slot }) => !occupied.has(slot));
    if (!available.length) return;
    const target = available.reduce((closest, slot) => Math.abs(slot.y - (requestedY ?? this.canvas.height / 2)) < Math.abs(closest.y - (requestedY ?? this.canvas.height / 2)) ? slot : closest);
    this.membraneDevices.push({ type, kind, y: target.y, slot: target.slot });
    this.controls.deviceCounts[kind] += 1;
    (button || document.querySelector(`[data-device="${type}"]`))?.classList.add('active');
    this.updateGuidance();
  }

  removeMembraneDevice(kind) {
    const index = this.membraneDevices.map((device) => device.kind).lastIndexOf(kind);
    if (index === -1) return;
    const [device] = this.membraneDevices.splice(index, 1);
    this.controls.deviceCounts[device.kind] = Math.max(0, this.controls.deviceCounts[device.kind] - 1);
    if (!this.membraneDevices.some((item) => item.type === device.type)) {
      document.querySelector(`[data-device="${device.type}"]`)?.classList.remove('active');
    }
    this.updateGuidance();
  }

  updateThermalRateLabel() {
    const thermalFactor = 0.4 + ((this.controls.temperature - 5) / 40) * 1.6;
    const overallRate = this.controls.simSpeed * thermalFactor;
    document.getElementById('headerRate').textContent = overallRate < 0.75 ? 'Slow' : overallRate < 1.45 ? 'Normal' : 'Fast';
  }

  getBounds() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      membraneX: this.canvas.width / 2
    };
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(280, rect.height);
    this.canvas.width = width;
    this.canvas.height = height;
  }

  drawMembrane() {
    drawPhospholipidBilayer(this.ctx, this.canvas.width, this.canvas.height, {
      halfWidth: 26,
      headRadius: 6.6,
      spacing: 21,
      wobble: this.frameCount * 0.02
    });

    this.ctx.fillStyle = 'rgba(31, 41, 49, 0.74)';
    this.ctx.font = '700 12px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('OUTSIDE', this.canvas.width * 0.25, 24);
    this.ctx.fillText('INSIDE', this.canvas.width * 0.75, 24);

    if (this.controls.chargesVisible) {
      this.ctx.font = '700 16px Inter, sans-serif';
      const positiveOutside = this.controls.membranePotential < 0;
      const chargeCount = this.controls.membranePotential === -70 ? 8 : this.controls.membranePotential === -50 ? 5 : 3;
      for (let i = 0; i < chargeCount; i += 1) {
        const y = this.canvas.height / 2 - ((chargeCount - 1) * 24) / 2 + i * 24;
        this.ctx.fillStyle = positiveOutside ? 'rgba(194, 109, 77, 0.9)' : 'rgba(90, 142, 177, 0.9)';
        this.ctx.fillText(positiveOutside ? '+' : '−', this.canvas.width / 2 - 46, y);
        this.ctx.fillStyle = positiveOutside ? 'rgba(90, 142, 177, 0.9)' : 'rgba(194, 109, 77, 0.9)';
        this.ctx.fillText(positiveOutside ? '−' : '+', this.canvas.width / 2 + 46, y);
      }
    }

    this.drawMembraneDevices();
    this.drawWarnings();
  }

  drawMembraneDevices() {
    const ctx = this.ctx;
    const x = this.canvas.width / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(29,42,50,0.28)';
    ctx.setLineDash([3, 3]);
    for (const y of this.getMembraneSlots()) {
      ctx.strokeRect(x - 17, y - 25, 34, 50);
    }
    ctx.restore();

    for (const device of this.membraneDevices) {
      const y = Math.min(this.canvas.height - 54, Math.max(54, device.y));
      const isTransporter = device.kind === 'transporter';
      const isOpen = device.kind === 'leak' ? this.controls.leakageChannels
        : device.kind === 'voltage' ? this.controls.membranePotential >= -50
          : device.kind === 'ligand' ? this.controls.ligands > 0
            : this.particleSystem.countByType('ATP', true) + this.particleSystem.countByType('ATP', false) > 0;
      const color = device.type.includes('na') ? '#e3b42c' : device.type.includes('k') ? '#4f9fcb' : device.type === 'pump' ? '#41aa94' : '#c55e92';
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(27,36,42,0.78)';
      ctx.lineWidth = 1.3;
      if (isTransporter) {
        ctx.beginPath();
        ctx.moveTo(-14, -17); ctx.quadraticCurveTo(-19, 0, -13, 17);
        ctx.lineTo(13, 17); ctx.quadraticCurveTo(19, 0, 13, -17); ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.roundRect(-14, -21, 11, 42, 7);
        ctx.roundRect(3, -21, 11, 42, 7);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isOpen ? 'rgba(255,255,255,0.88)' : 'rgba(44,57,67,0.62)';
      ctx.fillRect(-2, -16, 4, 32);
      if (!isOpen) {
        ctx.strokeStyle = 'rgba(255,255,255,0.82)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(8, 10); ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawWarnings() {
    const outsideSodium = this.particleSystem.countByType('Na+', false);
    const insidePotassium = this.particleSystem.countByType('K+', true);
    const atpAvailable = this.particleSystem.countByType('ATP', true) + this.particleSystem.countByType('ATP', false);
    const warnings = [];
    if (outsideSodium < 8) warnings.push('Outside sodium too low');
    if (this.controls.mode === 'facilitated' && !this.membraneDevices.some((device) => device.kind !== 'transporter')) warnings.push('Place a channel on the membrane');
    if (this.controls.mode === 'facilitated' && this.controls.deviceCounts.ligand && !this.controls.ligands) warnings.push('Ligand-gated channel needs a ligand');
    if (this.controls.mode === 'active' && !this.controls.deviceCounts.transporter) warnings.push('Place an active transporter on the membrane');
    if (this.controls.mode === 'active' && !atpAvailable) warnings.push('ATP is required for active transport');
    if (this.controls.mode === 'active' && insidePotassium < 6) warnings.push('Inside potassium is low');
    if (!warnings.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    warnings.forEach((message, index) => {
      const width = ctx.measureText(message).width + 32;
      const y = 38 + index * 34;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(194,109,77,0.62)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(14, y, width, 27, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a95c35';
      ctx.fillText('!', 23, y + 18);
      ctx.fillStyle = '#75482f';
      ctx.fillText(message, 36, y + 18);
    });
    ctx.restore();
  }

  drawMembranePreview() {
    if (!this.membranePreviewCanvas || !this.membranePreviewCtx) return;

    const ctx = this.membranePreviewCtx;
    const w = this.membranePreviewCanvas.width;
    const h = this.membranePreviewCanvas.height;
    const bounds = this.getBounds();
    const membraneX = bounds.membraneX;
    
    // Scale factors from main canvas to preview canvas
    const scaleX = w / bounds.width;
    const scaleY = h / bounds.height;

    ctx.clearRect(0, 0, w, h);

    // Realistic phospholipid bilayer, scaled down for the preview
    drawPhospholipidBilayer(ctx, w, h, {
      halfWidth: Math.max(6, 9 * scaleX),
      headRadius: Math.max(2.2, 3.4 * scaleX),
      spacing: Math.max(8, 13 * scaleY),
      wobble: this.frameCount * 0.02
    });

    const previewMembraneX = membraneX * scaleX;

    // Draw particles with minimum visible size
    for (const particle of this.particleSystem.particles) {
      const x = particle.x * scaleX;
      const y = particle.y * scaleY;
      // Ensure particles are always visible with minimum radius of 2px
      const radius = Math.max(2.2, particle.radius * scaleX);

      ctx.beginPath();
      ctx.fillStyle = particle.color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Add dark border for visibility
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  updateStats() {
    const inside = this.particleSystem.countAll(true);
    const outside = this.particleSystem.countAll(false);
    const gradient = Math.abs(inside - outside);

    document.getElementById('statsInside').textContent = inside;
    document.getElementById('statsOutside').textContent = outside;
    document.getElementById('statsGradient').textContent = gradient;
    document.getElementById('headerGradient').textContent = gradient;
    const modeLabels = { simple: 'Simple', facilitated: 'Facilitated', active: 'Active' };
    document.getElementById('statsMode').textContent = modeLabels[this.controls.mode];

    if (this.frameCount % 280 === 0) {
      this.updateGuidance();
    }
  }

  animate() {
    this.frameCount += 1;

    const bounds = this.getBounds();
    if (this.isRunning) {
      this.particleSystem.update(bounds, this.controls);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#dfeaf3';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawMembrane();

    for (const particle of this.particleSystem.particles) {
      if (this.controls.crossingHighlights && particle.glow > 0) {
        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(255, 214, 120, 0.65)';
        this.ctx.arc(particle.x, particle.y, particle.radius + 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
      particle.draw(this.ctx);
    }

    this.updateStats();
    this.drawMembranePreview();
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Simulator();
});
