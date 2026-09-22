import * as THREE from 'three';
import { SparkParticleSystem } from '../particles.js';

export class EarthquakeScenario {
  constructor(app) {
    this.app = app;
    this.id = 'earthquake';
    this.title = 'Earthquake: Drop, Cover & Hazard Mitigation';
    this.objective = 'Protect yourself during tremor, then secure gas & electrical hazards';
    this.tag = 'Seismic Disaster';

    this.group = new THREE.Group();
    this.sparkSystem = null;

    this.shelterDesk = null;
    this.breakerBox = null;
    this.gasValve = null;
    this.exitDoor = null;

    this.isShaking = true;
    this.shakeDuration = 12.0; // seconds of earthquake
    this.shakeElapsed = 0;
    this.currentStepIndex = 0;

    this.steps = [
      { id: 'drop_cover', label: '1. DROP & COVER under reinforced desk', completed: false },
      { id: 'hold_on', label: '2. HOLD ON until shaking ceases', completed: false },
      { id: 'breaker', label: '3. Flip OFF Main Breaker switch', completed: false },
      { id: 'gas', label: '4. Turn Gas Valve 90° to isolate line', completed: false },
      { id: 'evacuate', label: '5. Evacuate through Emergency Exit', completed: false }
    ];

    this.stats = {
      startTime: 0,
      shelteredPromptly: false,
      waitedForTremorToEnd: true,
      securedBreaker: false,
      securedGas: false,
      timeTaken: 0,
      mistakes: 0,
    };
  }

  init() {
    const mb = this.app.modelBuilder;

    // 1. Office Room
    const room = mb.createOfficeEnvironment(10, 12, 3.6);
    this.group.add(room);

    // Identify shelter desk
    this.shelterDesk = room.getObjectByName('ReinforcedDesk');

    // 2. Electrical Breaker Box on Left Wall
    this.breakerBox = mb.createBreakerBox();
    this.breakerBox.position.set(-4.94, 1.5, -1.2);
    this.breakerBox.rotation.y = Math.PI / 2;
    this.group.add(this.breakerBox);

    // 3. Electrical Sparks at Breaker Box
    const sparkPos = new THREE.Vector3(-4.88, 1.62, -1.2);
    this.sparkSystem = new SparkParticleSystem(this.group, sparkPos, 70);

    // 4. Gas Shut-off Valve on Right Wall
    this.gasValve = mb.createGasValve();
    this.gasValve.position.set(4.94, 1.1, 0.5);
    this.gasValve.rotation.y = -Math.PI / 2;
    this.group.add(this.gasValve);

    // 5. Emergency Exit Door
    this.exitDoor = mb.createEmergencyExitDoor();
    this.exitDoor.position.set(0, 0, 5.96);
    this.exitDoor.rotation.y = Math.PI;
    this.group.add(this.exitDoor);

    this.interactiveObjects = [
      this.breakerBox,
      this.gasValve,
      this.exitDoor
    ];

    this.stats.startTime = performance.now();
    this.app.audio.startEarthquakeRumble(1.0);
    this.updateHUDText();
  }

  handleInteract(target, type, controller) {
    // 1. Breaker Switch
    if (this.isDescendantOf(target, this.breakerBox)) {
      if (this.breakerBox.userData.isOn) {
        if (this.isShaking) {
          this.app.audio.playWarning();
          this.app.ui.showToast('Do NOT move during active shaking! Stay sheltered.');
          this.stats.mistakes++;
          return;
        }

        this.breakerBox.userData.toggle();
        this.app.audio.playSuccess();
        this.sparkSystem.active = false;
        this.stats.securedBreaker = true;
        this.completeStep(2);
      }
      return;
    }

    // 2. Gas Valve
    if (this.isDescendantOf(target, this.gasValve)) {
      if (this.gasValve.userData.isOpen) {
        if (this.isShaking) {
          this.app.audio.playWarning();
          this.app.ui.showToast('Wait for tremor to stop before moving!');
          this.stats.mistakes++;
          return;
        }

        this.gasValve.userData.closeValve();
        this.app.audio.playSuccess();
        this.stats.securedGas = true;
        this.completeStep(3);
      }
      return;
    }

    // 3. Exit Door
    if (this.isDescendantOf(target, this.exitDoor)) {
      if (this.currentStepIndex >= 3) {
        this.exitDoor.userData.openDoor();
        this.app.audio.playSuccess();
        this.completeStep(4);
        this.finishScenario();
      }
    }
  }

  completeStep(index) {
    if (this.steps[index]) {
      this.steps[index].completed = true;
      this.app.audio.playSuccess();
      if (index === this.currentStepIndex) {
        this.currentStepIndex = Math.min(this.steps.length - 1, index + 1);
      }
      this.app.ui.updateSteps(this.steps, this.currentStepIndex);
      this.updateHUDText();
    }
  }

  update(delta) {
    if (this.sparkSystem) this.sparkSystem.update(delta);

    // Active Seismic Tremor Phase
    if (this.isShaking) {
      this.shakeElapsed += delta;

      // Camera tremor displacement
      const shakeMag = Math.max(0, 1 - (this.shakeElapsed / this.shakeDuration)) * 0.035;
      this.app.camera.position.x += (Math.random() - 0.5) * shakeMag;
      this.app.camera.position.z += (Math.random() - 0.5) * shakeMag;

      // Check if user is taking shelter under desk
      const playerPos = new THREE.Vector3();
      this.app.camera.getWorldPosition(playerPos);

      // Desk bounds check
      const underDesk = (playerPos.x > -2.8 && playerPos.x < -1.2 && playerPos.z > -2.6 && playerPos.z < -1.4) ||
                        (playerPos.x > 1.2 && playerPos.x < 2.8 && playerPos.z > -2.6 && playerPos.z < -1.4);
      const isCrouchedOrLow = playerPos.y < 1.35;

      if (underDesk && isCrouchedOrLow) {
        if (!this.steps[0].completed) {
          this.stats.shelteredPromptly = true;
          this.completeStep(0);
          this.app.ui.showToast('Good! Stay low and HOLD ON until shaking ceases.');
        }
      }

      this.app.ui.updateTelemetry('Tremor Intensity', (1 - this.shakeElapsed / this.shakeDuration) * 100, 100, true);

      if (this.shakeElapsed >= this.shakeDuration) {
        // Shaking stops!
        this.isShaking = false;
        this.app.audio.stopEarthquakeRumble();
        this.app.audio.playSuccess();
        this.completeStep(1);
        this.app.ui.showToast('Tremor ceased! Inspect room and secure electrical & gas hazards.');
      }
    } else {
      // Shaking ended
      this.app.ui.updateTelemetry('Tremor Intensity', 0, 100, false);

      // Proximity check for evacuation
      if (this.currentStepIndex >= 3) {
        const playerPos = new THREE.Vector3();
        this.app.camera.getWorldPosition(playerPos);
        if (playerPos.distanceTo(new THREE.Vector3(0, 0, 5.5)) < 1.8) {
          this.exitDoor.userData.openDoor();
          this.completeStep(4);
          this.finishScenario();
        }
      }
    }
  }

  updateHUDText() {
    const current = this.steps[this.currentStepIndex];
    if (current) {
      this.app.controls.updateVRHUD(
        'EARTHQUAKE HAZARD',
        this.objective,
        current.label
      );
    }
  }

  finishScenario() {
    this.stats.timeTaken = ((performance.now() - this.stats.startTime) / 1000).toFixed(1);

    let score = 100;
    if (!this.stats.shelteredPromptly) score -= 20;
    if (this.stats.mistakes > 0) score -= (this.stats.mistakes * 10);
    if (!this.stats.securedBreaker) score -= 15;
    if (!this.stats.securedGas) score -= 15;

    score = Math.max(15, Math.round(score));
    let grade = 'A+';
    if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';
    else if (score < 95) grade = 'A';

    const feedback = [
      { text: this.stats.shelteredPromptly ? 'Successfully performed Drop, Cover & Hold On under reinforced furniture.' : 'Warning: Stood in open space during active tremor; severe falling debris risk.', type: this.stats.shelteredPromptly ? 'success' : 'warning' },
      { text: 'Secured secondary hazards: flipped electrical breaker to prevent fire and closed gas supply line.', type: 'success' },
      { text: `Total scenario time: ${this.stats.timeTaken} seconds.`, type: 'info' }
    ];

    this.app.scenarioManager.showDebrief({
      title: 'Earthquake Response Debrief',
      grade: grade,
      score: score,
      time: `${this.stats.timeTaken}s`,
      mistakes: this.stats.mistakes,
      feedback: feedback
    });
  }

  isDescendantOf(child, parent) {
    let curr = child;
    while (curr) {
      if (curr === parent) return true;
      curr = curr.parent;
    }
    return false;
  }

  dispose() {
    this.app.audio.stopEarthquakeRumble();
    if (this.sparkSystem) this.sparkSystem.dispose();
    this.app.scene.remove(this.group);
  }
}
