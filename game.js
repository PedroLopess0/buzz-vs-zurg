/**
 * ============================================================================
 * SPACE INVADERS NEON - MODERN ARCADE GAME ENGINE
 * Pure HTML5 Canvas, CSS3 & JavaScript (No external libraries)
 * ============================================================================
 */

(function () {
  'use strict';

  // --- CONFIGURAÇÃO E DIMENSÕES VIRTUAIS ---
  const V_WIDTH = 800;
  const V_HEIGHT = 700;

  // --- ESTADOS DO JOGO ---
  const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    WAVE_TRANSITION: 'WAVE_TRANSITION',
    GAMEOVER: 'GAMEOVER'
  };

  let currentState = STATE.MENU;

  // --- ELEMENTOS DOM ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const canvasViewport = document.getElementById('canvasViewport');

  const scoreDisplay = document.getElementById('scoreDisplay');
  const waveDisplay = document.getElementById('waveDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');
  const livesContainer = document.getElementById('livesContainer');

  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const waveScreen = document.getElementById('waveScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');

  const startGameBtn = document.getElementById('startGameBtn');
  const resumeGameBtn = document.getElementById('resumeGameBtn');
  const restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
  const restartGameBtn = document.getElementById('restartGameBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const pauseToggleBtn = document.getElementById('pauseToggleBtn');
  const soundIcon = document.getElementById('soundIcon');

  const finalScoreDisplay = document.getElementById('finalScoreDisplay');
  const finalWaveDisplay = document.getElementById('finalWaveDisplay');
  const newHighScoreBadge = document.getElementById('newHighScoreBadge');
  const waveBonusPoints = document.getElementById('waveBonusPoints');
  const waveLoadingFill = document.getElementById('waveLoadingFill');

  const touchLeftBtn = document.getElementById('touchLeftBtn');
  const touchRightBtn = document.getElementById('touchRightBtn');
  const touchShootBtn = document.getElementById('touchShootBtn');

  const previewPlayerImg = document.getElementById('previewPlayerImg');
  const previewAlienImg = document.getElementById('previewAlienImg');
  const customPlayerInput = document.getElementById('customPlayerInput');
  const customAlienInput = document.getElementById('customAlienInput');

  // --- ESCALA E RESPONSIVIDADE ---
  let scale = 1;
  let canvasOffsetX = 0;
  let canvasOffsetY = 0;

  function resizeCanvas() {
    const containerWidth = canvasViewport.clientWidth;
    const containerHeight = canvasViewport.clientHeight;

    const aspect = V_WIDTH / V_HEIGHT;
    let w = containerWidth;
    let h = w / aspect;

    if (h > containerHeight) {
      h = containerHeight;
      w = h * aspect;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    scale = (w * dpr) / V_WIDTH;
    canvasOffsetX = 0;
    canvasOffsetY = 0;

    // Desativa suavização para visual arcade pixel-art nítido
    ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));

  // --- SINTETIZADOR DE ÁUDIO PROCEDURAL (WEB AUDIO API) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = localStorage.getItem('space_invaders_muted') === 'true';
      this.marchToneStep = 0;
      this.marchFrequencies = [65.41, 58.27, 51.91, 46.25]; // C2, A#1, G#1, F#1
    }

    init() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('space_invaders_muted', this.isMuted);
      this.updateIcon();
    }

    updateIcon() {
      if (soundIcon) {
        soundIcon.textContent = this.isMuted ? '🔇' : '🔊';
      }
    }

    playLaser() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
      } catch (e) {}
    }

    playAlienLaser() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.2);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.21);
      } catch (e) {}
    }

    playExplosion() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.28);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.3);
      } catch (e) {}
    }

    playPlayerDeath() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 0.58);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.6);
      } catch (e) {}
    }

    playMarchStep() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freq = this.marchFrequencies[this.marchToneStep % this.marchFrequencies.length];
        this.marchToneStep++;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) {}
    }

    playUfoSound() {
      if (this.isMuted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(380, now + 0.1);
        osc.frequency.linearRampToValueAtTime(320, now + 0.2);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.21);
      } catch (e) {}
    }

    playWaveClear() {
      if (this.isMuted || !this.ctx) return;
      try {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.1;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.26);
        });
      } catch (e) {}
    }

    playGameOver() {
      if (this.isMuted || !this.ctx) return;
      try {
        const notes = [330, 293.66, 261.63, 220];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.22;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.36);
        });
      } catch (e) {}
    }
  }

  const sound = new SoundEngine();
  sound.updateIcon();

  // --- CARREGAMENTO DE SPRITES ---
  const playerSprite = new Image();
  playerSprite.src = 'assets/buzz.png';
  let playerSpriteReady = false;
  playerSprite.onload = () => { playerSpriteReady = true; };

  const alienSprite = new Image();
  alienSprite.src = 'assets/zurg.png';
  let alienSpriteReady = false;
  alienSprite.onload = () => { alienSpriteReady = true; };

  // Suporte a upload customizado de sprites
  function handleCustomSprite(input, imgElement, targetSprite, onReady) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imgElement.src = e.target.result;
        targetSprite.src = e.target.result;
        targetSprite.onload = () => { onReady(); };
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  customPlayerInput.addEventListener('change', (e) => {
    handleCustomSprite(e.target, previewPlayerImg, playerSprite, () => { playerSpriteReady = true; });
  });

  customAlienInput.addEventListener('change', (e) => {
    handleCustomSprite(e.target, previewAlienImg, alienSprite, () => { alienSpriteReady = true; });
  });

  // Drag and drop de imagens no jogo
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        // Se soltar, pergunta ou substitui o alien se for verde, senão player
        if (confirm('Deseja carregar esta imagem como sprite da NAVE do jogador? (Cancelar para definir como ALIENÍGENA)')) {
          playerSprite.src = ev.target.result;
          previewPlayerImg.src = ev.target.result;
          playerSpriteReady = true;
        } else {
          alienSprite.src = ev.target.result;
          previewAlienImg.src = ev.target.result;
          alienSpriteReady = true;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // --- SISTEMA DE CONTROLE DE ENTRADA (INPUT) ---
  const keys = {
    left: false,
    right: false,
    shoot: false,
    pauseJustPressed: false
  };

  window.addEventListener('keydown', (e) => {
    sound.init();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
    }
    if (e.code === 'Space') {
      keys.shoot = true;
      e.preventDefault();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!keys.pauseJustPressed) {
        togglePause();
        keys.pauseJustPressed = true;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = false;
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = false;
    }
    if (e.code === 'Space') {
      keys.shoot = false;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      keys.pauseJustPressed = false;
    }
  });

  // Controles Touch Mobile
  function setupTouchButton(btn, onDown, onUp) {
    if (!btn) return;
    const handleStart = (e) => {
      e.preventDefault();
      sound.init();
      btn.classList.add('pressed');
      onDown();
    };
    const handleEnd = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      onUp();
    };

    btn.addEventListener('touchstart', handleStart, { passive: false });
    btn.addEventListener('touchend', handleEnd, { passive: false });
    btn.addEventListener('touchcancel', handleEnd, { passive: false });
    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', handleEnd);
  }

  setupTouchButton(touchLeftBtn, () => { keys.left = true; }, () => { keys.left = false; });
  setupTouchButton(touchRightBtn, () => { keys.right = true; }, () => { keys.right = false; });
  setupTouchButton(touchShootBtn, () => { keys.shoot = true; }, () => { keys.shoot = false; });

  // --- FUNDO ESPACIAL: STARFIELD PARALLAX ---
  class Starfield {
    constructor(count = 140) {
      this.stars = [];
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * V_WIDTH,
          y: Math.random() * V_HEIGHT,
          size: Math.random() < 0.6 ? 1 : (Math.random() < 0.85 ? 1.8 : 2.6),
          speed: Math.random() * 0.8 + 0.2,
          color: Math.random() < 0.25 ? '#00f3ff' : (Math.random() < 0.15 ? '#ff007f' : '#ffffff'),
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }

    update() {
      for (const s of this.stars) {
        s.y += s.speed;
        s.twinkle += 0.04;
        if (s.y > V_HEIGHT) {
          s.y = 0;
          s.x = Math.random() * V_WIDTH;
        }
      }
    }

    draw(ctx) {
      ctx.save();
      for (const s of this.stars) {
        const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0.1, alpha);
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      ctx.restore();
    }
  }

  const starfield = new Starfield();

  // --- SISTEMA DE PARTÍCULAS E SCREEN SHAKE ---
  let screenShakeTimer = 0;
  let screenShakeIntensity = 0;

  function triggerScreenShake(intensity = 6, duration = 12) {
    screenShakeIntensity = intensity;
    screenShakeTimer = duration;
  }

  class Particle {
    constructor(x, y, color, speedScale = 1) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 4 + 1.5) * speedScale;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.size = Math.random() * 3 + 1.5;
      this.color = color;
      this.alpha = 1;
      this.decay = Math.random() * 0.025 + 0.02;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.fillRect(this.x, this.y, this.size, this.size);
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color = '#ffd700') {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.alpha = 1;
      this.vy = -1.2;
    }

    update() {
      this.y += this.vy;
      this.alpha -= 0.02;
    }

    draw(ctx) {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  const particles = [];
  const floatingTexts = [];

  function spawnExplosion(x, y, color = '#39ff14', count = 28) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color, 1.2));
    }
  }

  // --- NAVE DO JOGADOR ---
  class Player {
    constructor() {
      this.width = 48;
      this.height = 48;
      this.x = V_WIDTH / 2 - this.width / 2;
      this.y = V_HEIGHT - 65;
      this.speed = 2.8;
      this.shootCooldown = 0;
      this.invulnerableTimer = 0;
      this.thrusterAnim = 0;
    }

    resetPosition() {
      this.x = V_WIDTH / 2 - this.width / 2;
      this.y = V_HEIGHT - 65;
      this.invulnerableTimer = 120; // ~2 segundos de invulnerabilidade
    }

    update() {
      if (keys.left) {
        this.x -= this.speed;
      }
      if (keys.right) {
        this.x += this.speed;
      }

      // Limites da tela
      if (this.x < 15) this.x = 15;
      if (this.x > V_WIDTH - this.width - 15) this.x = V_WIDTH - this.width - 15;

      if (this.shootCooldown > 0) {
        this.shootCooldown--;
      }

      if (keys.shoot && this.shootCooldown === 0) {
        this.shoot();
      }

      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer--;
      }

      this.thrusterAnim += 0.2;

      // Partículas das turbinas neon
      if (Math.random() < 0.6) {
        particles.push(new Particle(
          this.x + this.width * 0.35 + (Math.random() * 4 - 2),
          this.y + this.height - 4,
          '#ff0000',
          0.6
        ));
        particles.push(new Particle(
          this.x + this.width * 0.65 + (Math.random() * 4 - 2),
          this.y + this.height - 4,
          '#ff0000',
          0.6
        ));
      }
    }

    shoot() {
      // Máximo de 3 lasers do jogador na tela simultaneamente
      if (playerLasers.length < 3) {
        playerLasers.push(new Laser(this.x + this.width / 2, this.y - 4, -9.5, '#ff0000', true));
        sound.playLaser();
        this.shootCooldown = 15; // 250ms de intervalo
      }
    }

    draw(ctx) {
      ctx.save();

      // Efeito piscante se invulnerável
      if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 6) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }

      if (playerSpriteReady) {
        // Desenha sprite da nave
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(0, 243, 255, 0.8)';
        ctx.drawImage(playerSprite, this.x, this.y, this.width, this.height);
      } else {
        // Fallback gráfico vetorial neon caso a imagem falhe
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.strokeStyle = '#00f3ff';
        ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 10);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // --- PROJÉTEIS (LASERS) ---
  class Laser {
    constructor(x, y, vy, color, isPlayer = false) {
      this.x = x;
      this.y = y;
      this.vy = vy;
      this.color = color;
      this.isPlayer = isPlayer;
      this.width = isPlayer ? 4 : 5;
      this.height = isPlayer ? 16 : 14;
      this.active = true;
    }

    update() {
      this.y += this.vy;
      if (this.y < -30 || this.y > V_HEIGHT + 30) {
        this.active = false;
      }

      // Efeito de rastro neon
      if (Math.random() < 0.4) {
        particles.push(new Particle(this.x, this.y, this.color, 0.3));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;

      if (this.isPlayer) {
        // Laser do jogador estilizado
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - 1, this.y + 2, 2, this.height - 4);
      } else {
        // Plasma alienígena zig-zag ou bolt
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  let playerLasers = [];
  let alienLasers = [];

  // --- FORMAÇÃO DE ALIENÍGENAS (INIMIGOS) ---
  class Alien {
    constructor(x, y, row, col, type = 0) {
      this.x = x;
      this.y = y;
      this.row = row;
      this.col = col;
      this.width = 40;
      this.height = 40;
      this.type = type; // 0: Scout, 1: Raider, 2: Commander
      this.alive = true;
      this.animFrame = 0;

      // Pontuação por tipo
      this.points = type === 2 ? 30 : (type === 1 ? 20 : 10);
    }

    draw(ctx) {
      if (!this.alive) return;
      ctx.save();

      // Brilho neon característico do invasor verde
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#7802ff';

      if (alienSpriteReady) {
        ctx.drawImage(alienSprite, this.x, this.y, this.width, this.height);
      } else {
        // Fallback vetorial neon
        ctx.fillStyle = '#39ff14';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.fillRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12);
      }

      ctx.restore();
    }
  }

  class AlienFleet {
    constructor() {
      this.aliens = [];
      this.rows = 5;
      this.cols = 10;
      this.stepX = 14;
      this.stepDown = 20;
      this.direction = 1; // 1 = direita, -1 = esquerda
      this.stepTimer = 0;
      this.stepInterval = 50; // Diminui conforme aliens morrem
      this.shootCooldown = 60;
    }

    init(wave = 1) {
      this.aliens = [];
      this.direction = 1;
      this.stepDown = 18 + Math.min(wave * 2, 8);

      const startX = 60;
      const startY = 85;
      const spacingX = 58;
      const spacingY = 48;

      for (let r = 0; r < this.rows; r++) {
        const type = r === 0 ? 2 : (r < 3 ? 1 : 0);
        for (let c = 0; c < this.cols; c++) {
          const x = startX + c * spacingX;
          const y = startY + r * spacingY;
          this.aliens.push(new Alien(x, y, r, c, type));
        }
      }

      this.stepInterval = Math.max(16, 50 - wave * 4);
    }

    getAliveCount() {
      return this.aliens.filter(a => a.alive).length;
    }

    update(wave = 1) {
      const aliveAliens = this.aliens.filter(a => a.alive);
      const aliveCount = aliveAliens.length;

      if (aliveCount === 0) return;

      // Cadência de marcha acelera dinamicamente quanto menos aliens vivos restarem!
      const minInterval = 4;
      const maxInterval = Math.max(18, 50 - wave * 4);
      const ratio = aliveCount / (this.rows * this.cols);
      const currentInterval = Math.max(minInterval, Math.floor(ratio * maxInterval));

      this.stepTimer++;
      if (this.stepTimer >= currentInterval) {
        this.stepTimer = 0;
        this.step();
        sound.playMarchStep();
      }

      // Disparos dos alienígenas
      this.shootCooldown--;
      if (this.shootCooldown <= 0) {
        this.shoot(wave);
        // Intervalo de tiro diminui a cada wave
        this.shootCooldown = Math.max(25, Math.floor((Math.random() * 40 + 35) - wave * 3));
      }
    }

    step() {
      let hitEdge = false;
      const alive = this.aliens.filter(a => a.alive);

      for (const a of alive) {
        const nextX = a.x + this.stepX * this.direction;
        if (nextX < 15 || nextX + a.width > V_WIDTH - 15) {
          hitEdge = true;
          break;
        }
      }

      if (hitEdge) {
        this.direction *= -1;
        for (const a of alive) {
          a.y += this.stepDown;
        }
      } else {
        for (const a of alive) {
          a.x += this.stepX * this.direction;
        }
      }
    }

    shoot(wave = 1) {
      // Apenas os alienígenas na base de cada coluna podem atirar
      const alive = this.aliens.filter(a => a.alive);
      if (alive.length === 0) return;

      const bottomAliensMap = new Map();
      for (const a of alive) {
        if (!bottomAliensMap.has(a.col) || a.row > bottomAliensMap.get(a.col).row) {
          bottomAliensMap.set(a.col, a);
        }
      }

      const bottomAliens = Array.from(bottomAliensMap.values());
      if (bottomAliens.length > 0) {
        const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
        const laserSpeed = 4.2 + Math.min(wave * 0.35, 3.5);
        alienLasers.push(new Laser(shooter.x + shooter.width / 2, shooter.y + shooter.height, laserSpeed, '#39ff14', false));
        sound.playAlienLaser();
      }
    }

    draw(ctx) {
      for (const a of this.aliens) {
        a.draw(ctx);
      }
    }
  }

  // --- NAVE MÃE BÔNUS (UFO) ---
  class Ufo {
    constructor() {
      this.width = 52;
      this.height = 24;
      this.x = -60;
      this.y = 48;
      this.speed = 3.2;
      this.active = false;
      this.spawnTimer = Math.random() * 800 + 700; // a cada 15-25s
      this.soundTimer = 0;
    }

    reset() {
      this.active = false;
      this.spawnTimer = Math.random() * 900 + 800;
    }

    update() {
      if (!this.active) {
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
          this.active = true;
          this.x = -this.width;
          this.speed = Math.random() < 0.5 ? 3.2 : -3.2;
          if (this.speed < 0) {
            this.x = V_WIDTH + 10;
          }
        }
      } else {
        this.x += this.speed;

        this.soundTimer++;
        if (this.soundTimer % 20 === 0) {
          sound.playUfoSound();
        }

        if (this.speed > 0 && this.x > V_WIDTH + 50) {
          this.reset();
        } else if (this.speed < 0 && this.x < -60) {
          this.reset();
        }
      }
    }

    draw(ctx) {
      if (!this.active) return;
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff007f';

      // Desenho da nave mãe alienígena neon magenta
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cúpula superior
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2 - 4, 10, Math.PI, 0);
      ctx.fill();

      // Luzes neon da base
      const lights = 4;
      ctx.fillStyle = '#ffd700';
      for (let i = 0; i < lights; i++) {
        const lx = this.x + 8 + i * 11;
        const ly = this.y + this.height / 2 + 4;
        ctx.fillRect(lx, ly, 4, 3);
      }

      ctx.restore();
    }
  }

  // --- BARREIRAS DEFENSIVAS NEON (BUNKERS DESTRUTÍVEIS) ---
  class Bunker {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.blockSize = 6;
      this.cols = 9;
      this.rows = 7;
      this.grid = [];

      // Molde do bunker clássico em arco
      const shape = [
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 0, 0, 0, 1, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1]
      ];

      for (let r = 0; r < this.rows; r++) {
        this.grid[r] = [];
        for (let c = 0; c < this.cols; c++) {
          this.grid[r][c] = shape[r][c];
        }
      }
    }

    checkHit(laser) {
      if (
        laser.x < this.x ||
        laser.x > this.x + this.cols * this.blockSize ||
        laser.y < this.y ||
        laser.y > this.y + this.rows * this.blockSize
      ) {
        return false;
      }

      const col = Math.floor((laser.x - this.x) / this.blockSize);
      const row = Math.floor((laser.y - this.y) / this.blockSize);

      if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
        if (this.grid[row][col] === 1) {
          // Destrói o bloco e causa dano radial sutil
          this.grid[row][col] = 0;
          if (Math.random() < 0.5 && col + 1 < this.cols) this.grid[row][col + 1] = 0;
          if (Math.random() < 0.5 && col - 1 >= 0) this.grid[row][col - 1] = 0;

          spawnExplosion(laser.x, laser.y, '#00f3ff', 8);
          return true;
        }
      }
      return false;
    }

    draw(ctx) {
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00f3ff';
      ctx.fillStyle = '#00e5ff';

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] === 1) {
            ctx.fillRect(
              this.x + c * this.blockSize,
              this.y + r * this.blockSize,
              this.blockSize - 1,
              this.blockSize - 1
            );
          }
        }
      }
      ctx.restore();
    }
  }

  // --- GERENCIADOR PRINCIPAL DO JOGO ---
  class GameManager {
    constructor() {
      this.score = 0;
      this.highScore = parseInt(localStorage.getItem('space_invaders_highscore') || '0', 10);
      this.lives = 5;
      this.wave = 1;

      this.player = new Player();
      this.fleet = new AlienFleet();
      this.ufo = new Ufo();
      this.bunkers = [];

      this.initBunkers();
      this.updateHUD();
    }

    initBunkers() {
      this.bunkers = [];
      const bunkerCount = 4;
      const totalWidth = V_WIDTH;
      const bunkerSpacing = totalWidth / (bunkerCount + 1);
      const bunkerY = V_HEIGHT - 165;

      for (let i = 1; i <= bunkerCount; i++) {
        const bunkerX = i * bunkerSpacing - 27;
        this.bunkers.push(new Bunker(bunkerX, bunkerY));
      }
    }

    startNewGame() {
      this.score = 0;
      this.lives = 5;
      this.wave = 1;
      playerLasers = [];
      alienLasers = [];
      particles.length = 0;
      floatingTexts.length = 0;

      this.player.resetPosition();
      this.fleet.init(this.wave);
      this.ufo.reset();
      this.initBunkers();
      this.updateHUD();

      switchScreen(null);
      currentState = STATE.PLAYING;
    }

    startNextWave() {
      this.wave++;
      playerLasers = [];
      alienLasers = [];

      this.player.resetPosition();
      this.fleet.init(this.wave);
      this.ufo.reset();
      // Repara bunkers parcialmente
      this.initBunkers();
      this.updateHUD();

      switchScreen(null);
      currentState = STATE.PLAYING;
    }

    addScore(pts, x, y) {
      this.score += pts;
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('space_invaders_highscore', this.highScore);
      }
      this.updateHUD();

      if (x !== undefined && y !== undefined) {
        floatingTexts.push(new FloatingText(x, y, `+${pts}`, '#ffd700'));
      }
    }

    updateHUD() {
      if (scoreDisplay) scoreDisplay.textContent = String(this.score).padStart(5, '0');
      if (waveDisplay) waveDisplay.textContent = String(this.wave).padStart(2, '0');
      if (highScoreDisplay) highScoreDisplay.textContent = String(this.highScore).padStart(5, '0');

      // Vidas representadas por ícones de nave neon
      if (livesContainer) {
        livesContainer.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const icon = document.createElement('span');
          icon.className = 'life-icon' + (i >= this.lives ? ' lost' : '');
          icon.textContent = '🚀';
          livesContainer.appendChild(icon);
        }
      }
    }

    handlePlayerHit() {
      if (this.player.invulnerableTimer > 0) return;

      this.lives--;
      this.updateHUD();
      sound.playPlayerDeath();
      triggerScreenShake(12, 20);
      spawnExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#00f3ff', 40);

      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.player.resetPosition();
      }
    }

    gameOver() {
      currentState = STATE.GAMEOVER;
      sound.playGameOver();

      if (finalScoreDisplay) finalScoreDisplay.textContent = String(this.score).padStart(5, '0');
      if (finalWaveDisplay) finalWaveDisplay.textContent = String(this.wave).padStart(2, '0');

      const isNewRecord = this.score === this.highScore && this.score > 0;
      if (newHighScoreBadge) {
        newHighScoreBadge.classList.toggle('hidden', !isNewRecord);
      }

      switchScreen(gameOverScreen);
    }

    checkCollisions() {
      // 1. Lasers do jogador vs Aliens
      for (const laser of playerLasers) {
        if (!laser.active) continue;

        // Contra UFO
        if (this.ufo.active) {
          if (
            laser.x > this.ufo.x &&
            laser.x < this.ufo.x + this.ufo.width &&
            laser.y > this.ufo.y &&
            laser.y < this.ufo.y + this.ufo.height
          ) {
            laser.active = false;
            this.ufo.active = false;
            const bonus = [100, 150, 200, 300][Math.floor(Math.random() * 4)];
            this.addScore(bonus, this.ufo.x, this.ufo.y);
            spawnExplosion(this.ufo.x + this.ufo.width / 2, this.ufo.y + this.ufo.height / 2, '#ff007f', 40);
            sound.playExplosion();
            triggerScreenShake(6, 10);
            continue;
          }
        }

        // Contra formação alienígena
        for (const alien of this.fleet.aliens) {
          if (!alien.alive) continue;

          if (
            laser.x > alien.x &&
            laser.x < alien.x + alien.width &&
            laser.y > alien.y &&
            laser.y < alien.y + alien.height
          ) {
            laser.active = false;
            alien.alive = false;
            this.addScore(alien.points, alien.x, alien.y);
            spawnExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, '#39ff14', 25);
            sound.playExplosion();
            triggerScreenShake(3, 6);
            break;
          }
        }

        // Contra Bunkers
        for (const bunker of this.bunkers) {
          if (laser.active && bunker.checkHit(laser)) {
            laser.active = false;
            break;
          }
        }
      }

      // 2. Lasers alienígenas vs Bunkers e Player
      for (const laser of alienLasers) {
        if (!laser.active) continue;

        // Contra Bunkers
        for (const bunker of this.bunkers) {
          if (laser.active && bunker.checkHit(laser)) {
            laser.active = false;
            break;
          }
        }

        // Contra o Jogador
        if (laser.active && this.player.invulnerableTimer === 0) {
          if (
            laser.x > this.player.x + 6 &&
            laser.x < this.player.x + this.player.width - 6 &&
            laser.y > this.player.y &&
            laser.y < this.player.y + this.player.height
          ) {
            laser.active = false;
            this.handlePlayerHit();
          }
        }
      }

      // 3. Colisão dos aliens com os bunkers ou linha do jogador
      for (const alien of this.fleet.aliens) {
        if (!alien.alive) continue;

        // Destrói bunkers se aliens colidirem
        for (const bunker of this.bunkers) {
          if (
            alien.x + alien.width > bunker.x &&
            alien.x < bunker.x + bunker.cols * bunker.blockSize &&
            alien.y + alien.height > bunker.y &&
            alien.y < bunker.y + bunker.rows * bunker.blockSize
          ) {
            bunker.checkHit({ x: alien.x + alien.width / 2, y: alien.y + alien.height });
          }
        }

        // Se algum alienígena alcançar a linha do jogador: Invasão completa (Game Over direto)
        if (alien.y + alien.height >= this.player.y + 10) {
          this.lives = 0;
          this.updateHUD();
          this.gameOver();
          return;
        }
      }

      // 4. Verificação de Wave Concluída
      if (this.fleet.getAliveCount() === 0 && currentState === STATE.PLAYING) {
        this.triggerWaveCleared();
      }

      // Limpeza de lasers inativos
      playerLasers = playerLasers.filter(l => l.active);
      alienLasers = alienLasers.filter(l => l.active);
    }

    triggerWaveCleared() {
      currentState = STATE.WAVE_TRANSITION;
      sound.playWaveClear();

      const waveBonus = 500 * this.wave;
      this.addScore(waveBonus);
      if (waveBonusPoints) waveBonusPoints.textContent = `+${waveBonus} PTS`;

      if (waveLoadingFill) {
        waveLoadingFill.style.width = '0%';
        setTimeout(() => { waveLoadingFill.style.width = '100%'; }, 50);
      }

      switchScreen(waveScreen);

      setTimeout(() => {
        if (currentState === STATE.WAVE_TRANSITION) {
          this.startNextWave();
        }
      }, 2000);
    }

    update() {
      starfield.update();

      // Screen Shake
      if (screenShakeTimer > 0) {
        screenShakeTimer--;
      }

      if (currentState === STATE.PLAYING) {
        this.player.update();
        this.fleet.update(this.wave);
        this.ufo.update();

        playerLasers.forEach(l => l.update());
        alienLasers.forEach(l => l.update());

        this.checkCollisions();
      }

      // Atualiza partículas e textos flutuantes
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        if (floatingTexts[i].alpha <= 0) floatingTexts.splice(i, 1);
      }
    }

    draw() {
      ctx.save();

      // Resolução interna escalada para tamanho do canvas
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      // Aplica tremor de tela
      if (screenShakeTimer > 0) {
        const rx = (Math.random() * 2 - 1) * screenShakeIntensity;
        const ry = (Math.random() * 2 - 1) * screenShakeIntensity;
        ctx.translate(rx, ry);
      }

      // Fundo preto espacial
      ctx.fillStyle = '#03030b';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Estrelas
      starfield.draw(ctx);

      // Entidades do jogo
      this.bunkers.forEach(b => b.draw(ctx));
      this.ufo.draw(ctx);
      this.fleet.draw(ctx);

      playerLasers.forEach(l => l.draw(ctx));
      alienLasers.forEach(l => l.draw(ctx));

      if (currentState === STATE.PLAYING || currentState === STATE.PAUSED || currentState === STATE.WAVE_TRANSITION) {
        this.player.draw(ctx);
      }

      // Partículas e FX
      particles.forEach(p => p.draw(ctx));
      floatingTexts.forEach(t => t.draw(ctx));

      // Linha de defesa de neon no fundo
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, V_HEIGHT - 22);
      ctx.lineTo(V_WIDTH, V_HEIGHT - 22);
      ctx.stroke();

      ctx.restore();
    }
  }

  const game = new GameManager();

  // --- GERENCIADOR DE TELAS (OVERLAYS) ---
  function switchScreen(targetScreen) {
    [startScreen, pauseScreen, waveScreen, gameOverScreen].forEach(scr => {
      if (scr) {
        scr.classList.remove('active');
        scr.classList.add('hidden');
      }
    });

    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      targetScreen.classList.add('active');
    }
  }

  function togglePause() {
    if (currentState === STATE.PLAYING) {
      currentState = STATE.PAUSED;
      switchScreen(pauseScreen);
    } else if (currentState === STATE.PAUSED) {
      currentState = STATE.PLAYING;
      switchScreen(null);
    }
  }

  // --- EVENT LISTENERS DA INTERFACE ---
  startGameBtn.addEventListener('click', () => {
    sound.init();
    game.startNewGame();
  });

  resumeGameBtn.addEventListener('click', () => {
    sound.init();
    togglePause();
  });

  restartFromPauseBtn.addEventListener('click', () => {
    sound.init();
    game.startNewGame();
  });

  restartGameBtn.addEventListener('click', () => {
    sound.init();
    game.startNewGame();
  });

  pauseToggleBtn.addEventListener('click', () => {
    sound.init();
    togglePause();
  });

  soundToggleBtn.addEventListener('click', () => {
    sound.init();
    sound.toggleMute();
  });

  // --- GAME LOOP COM requestAnimationFrame ---
  function gameLoop() {
    game.update();
    game.draw();
    requestAnimationFrame(gameLoop);
  }

  // Inicialização
  resizeCanvas();
  requestAnimationFrame(gameLoop);

})();
