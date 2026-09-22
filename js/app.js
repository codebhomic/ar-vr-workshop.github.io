import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { AudioManager } from './audio.js';
import { ModelBuilder } from './models.js';
import { XRControlsManager } from './xr-controls.js';
import { ScenarioManager } from './scenario-manager.js';

class UIManager {
  constructor(app) {
    this.app = app;

    // Cache DOM Elements
    this.scenarioCard = document.getElementById('scenario-card');
    this.scenarioTag = document.getElementById('scenario-tag');
    this.scenarioTitle = document.getElementById('scenario-title');
    this.scenarioObjective = document.getElementById('scenario-objective');
    this.stepsList = document.getElementById('steps-checklist');
    this.scenarioTimer = document.getElementById('scenario-timer');

    this.telemetryLabel = document.getElementById('telemetry-label');
    this.telemetryVal = document.getElementById('telemetry-val');
    this.telemetryFill = document.getElementById('telemetry-bar-fill');

    this.debriefModal = document.getElementById('debrief-modal');
    this.hubModal = document.getElementById('hub-modal');
    this.toastEl = document.getElementById('toast-notification');

    this.muteBtn = document.getElementById('btn-mute');
    this.hubBtn = document.getElementById('btn-hub');
    this.restartBtn = document.getElementById('btn-restart');

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        const isMuted = this.app.audio.toggleMute();
        this.muteBtn.textContent = isMuted ? '🔇 Audio: OFF' : '🔊 Audio: ON';
        this.muteBtn.classList.toggle('active', !isMuted);
      });
    }

    if (this.hubBtn) {
      this.hubBtn.addEventListener('click', () => {
        this.app.scenarioManager.returnToHub();
      });
    }

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        this.app.scenarioManager.restartCurrentScenario();
      });
    }

    // Modal buttons
    const debriefClose = document.getElementById('btn-debrief-hub');
    if (debriefClose) {
      debriefClose.addEventListener('click', () => {
        this.closeDebriefModal();
        this.app.scenarioManager.returnToHub();
      });
    }

    const debriefRetry = document.getElementById('btn-debrief-retry');
    if (debriefRetry) {
      debriefRetry.addEventListener('click', () => {
        this.closeDebriefModal();
        this.app.scenarioManager.restartCurrentScenario();
      });
    }

    // Scenario Choice Cards in Menu
    document.querySelectorAll('.scenario-choice-card').forEach((card) => {
      card.addEventListener('click', () => {
        const scenarioId = card.getAttribute('data-scenario');
        if (scenarioId) {
          this.closeHubModal();
          this.app.scenarioManager.loadScenario(scenarioId);
        }
      });
    });

    const closeHubBtn = document.getElementById('btn-close-hub-modal');
    if (closeHubBtn) {
      closeHubBtn.addEventListener('click', () => this.closeHubModal());
    }

    const openScenariosBtn = document.getElementById('btn-scenarios-menu');
    if (openScenariosBtn) {
      openScenariosBtn.addEventListener('click', () => this.openHubModal());
    }
  }

  setScenario(scenario) {
    if (!scenario) return;

    if (scenario.id === 'hub') {
      if (this.scenarioCard) this.scenarioCard.style.display = 'none';
      return;
    }

    if (this.scenarioCard) {
      this.scenarioCard.style.display = 'block';
      this.scenarioCard.className = `scenario-card ${scenario.id}`;
    }

    if (this.scenarioTag) this.scenarioTag.textContent = scenario.tag || 'EMERGENCY SCENARIO';
    if (this.scenarioTitle) this.scenarioTitle.textContent = scenario.title || '';
    if (this.scenarioObjective) this.scenarioObjective.textContent = scenario.objective || '';

    this.updateSteps(scenario.steps || [], scenario.currentStepIndex || 0);
  }

  updateTimer(scenario) {
    if (!this.scenarioTimer || !scenario || !scenario.stats || !scenario.stats.startTime) return;
    const elapsedSec = Math.floor((performance.now() - scenario.stats.startTime) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');
    this.scenarioTimer.textContent = `${mins}:${secs}`;
  }

  updateSteps(steps, currentIndex) {
    if (!this.stepsList) return;
    this.stepsList.innerHTML = '';

    steps.forEach((step, idx) => {
      const li = document.createElement('li');
      li.className = 'step-item';
      if (step.completed) li.classList.add('completed');
      else if (idx === currentIndex) li.classList.add('active');

      const icon = document.createElement('span');
      icon.className = 'step-icon';
      icon.textContent = step.completed ? '✓' : (idx + 1);

      const label = document.createElement('span');
      label.textContent = step.label;

      li.appendChild(icon);
      li.appendChild(label);
      this.stepsList.appendChild(li);
    });
  }

  updateTelemetry(label, value, maxValue = 100, isDanger = false) {
    if (this.telemetryLabel) this.telemetryLabel.textContent = label;
    const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));
    if (this.telemetryVal) this.telemetryVal.textContent = `${Math.round(pct)}%`;
    if (this.telemetryFill) {
      this.telemetryFill.style.width = `${pct}%`;
      this.telemetryFill.classList.toggle('danger', isDanger);
    }
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.style.opacity = '1';
    this.toastEl.style.transform = 'translateY(0)';

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.style.opacity = '0';
      this.toastEl.style.transform = 'translateY(10px)';
    }, 3200);
  }

  showDebriefModal(data) {
    if (!this.debriefModal) return;

    const gradeEl = document.getElementById('debrief-grade');
    const titleEl = document.getElementById('debrief-title');
    const scoreEl = document.getElementById('debrief-score');
    const timeEl = document.getElementById('debrief-time');
    const mistakesEl = document.getElementById('debrief-mistakes');
    const feedbackList = document.getElementById('debrief-feedback-list');

    if (gradeEl) {
      gradeEl.textContent = data.grade;
      gradeEl.className = `debrief-grade grade-${data.grade.toLowerCase().charAt(0)}`;
    }
    if (titleEl) titleEl.textContent = data.title;
    if (scoreEl) scoreEl.textContent = `${data.score}%`;
    if (timeEl) timeEl.textContent = data.time;
    if (mistakesEl) mistakesEl.textContent = data.mistakes;

    if (feedbackList && data.feedback) {
      feedbackList.innerHTML = '';
      data.feedback.forEach((item) => {
        const div = document.createElement('div');
        div.className = `feedback-item ${item.type || 'info'}`;
        div.innerHTML = `<span>${item.type === 'success' ? '✔' : '⚠'}</span> <span>${item.text}</span>`;
        feedbackList.appendChild(div);
      });
    }

    this.debriefModal.classList.add('open');
  }

  closeDebriefModal() {
    if (this.debriefModal) this.debriefModal.classList.remove('open');
  }

  openHubModal() {
    if (this.hubModal) this.hubModal.classList.add('open');
  }

  closeHubModal() {
    if (this.hubModal) this.hubModal.classList.remove('open');
  }
}

export class App {
  constructor() {
    this.clock = new THREE.Clock();

    this.initThree();
    this.initAudio();
    this.initModels();
    this.initXRControls();
    this.initScenarioManager();
    this.initUI();

    // Start in Training Hub
    this.scenarioManager.loadScenario('hub');

    // Handle Window Resizing
    window.addEventListener('resize', () => this.onWindowResize());

    // Check WebXR Device Support for Meta Quest 3S
    this.checkXRSupport();
  }

  initThree() {
    const container = document.getElementById('canvas-container');

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a12);
    this.scene.fog = new THREE.FogExp2(0x070a12, 0.04);

    // 2. Camera & Camera Rig for WebXR
    this.cameraRig = new THREE.Group();
    this.cameraRig.position.set(0, 0, 2.5);
    this.scene.add(this.cameraRig);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      50
    );
    this.camera.position.set(0, 1.6, 0); // Eye-level
    this.cameraRig.add(this.camera);

    // 3. WebGL Renderer with WebXR enabled
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.xr.enabled = true;

    container.appendChild(this.renderer.domElement);

    // 4. VR Button Integration
    const vrButton = VRButton.createButton(this.renderer);
    const vrSlot = document.getElementById('vr-button-slot');
    if (vrSlot) {
      vrSlot.appendChild(vrButton);
    } else {
      document.body.appendChild(vrButton);
    }

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xeef4ff, 1.2);
    dirLight.position.set(5, 8, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // Main animation loop
    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
  }

  initAudio() {
    this.audio = new AudioManager();
    // Warm up audio context on first user touch / click
    const startAudio = () => {
      this.audio.resume();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
      window.removeEventListener('touchstart', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
    window.addEventListener('touchstart', startAudio);
  }

  initModels() {
    this.modelBuilder = new ModelBuilder();
  }

  initXRControls() {
    this.controls = new XRControlsManager(
      this.renderer,
      this.scene,
      this.camera,
      this.cameraRig
    );

    // Connect control events to active scenario
    this.controls.onInteract = (target, type, controller) => {
      this.scenarioManager.handleInteract(target, type, controller);
    };

    this.controls.onSqueeze = (isSqueezing, object) => {
      this.scenarioManager.handleSqueeze(isSqueezing, object);
    };
  }

  initScenarioManager() {
    this.scenarioManager = new ScenarioManager(this);
  }

  initUI() {
    this.ui = new UIManager(this);
  }

  checkXRSupport() {
    const badge = document.getElementById('device-badge-text');
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported && badge) {
          badge.textContent = 'Meta Quest 3S / WebXR Detected';
          const dot = document.querySelector('.pulse-dot');
          if (dot) dot.style.background = '#10b981';
        }
      });
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time, frame) {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update(delta);
    this.scenarioManager.update(delta);
    if (this.scenarioManager.currentScenario && this.scenarioManager.currentScenario.id !== 'hub') {
      this.ui.updateTimer(this.scenarioManager.currentScenario);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Bootstrap application on window load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
