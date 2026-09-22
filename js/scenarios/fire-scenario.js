import * as THREE from 'three';
import { FireParticleSystem, SmokeParticleSystem, ExtinguisherSpraySystem } from '../particles.js';

export class FireScenario {
  constructor(app) {
    this.app = app;
    this.id = 'fire';
    this.title = 'Office Fire & P.A.S.S. Protocol';
    this.objective = 'Suppress workstation fire and evacuate safely';
    this.tag = 'Class ABC Fire Emergency';

    this.group = new THREE.Group();
    this.fireSystem = null;
    this.smokeSystem = null;
    this.spraySystem = null;

    this.extinguisher = null;
    this.alarmStation = null;
    this.exitDoor = null;

    this.firePosition = new THREE.Vector3(2.0, 0.4, -2.0);
    this.fireHealth = 100.0;
    this.currentStepIndex = 0;

    this.steps = [
      { id: 'alarm', label: '1. Pull wall Fire Alarm station', completed: false },
      { id: 'retrieve', label: '2. Retrieve Fire Extinguisher from wall', completed: false },
      { id: 'pin', label: '3. [P] Pull the safety ring pin', completed: false },
      { id: 'aim_squeeze', label: '4. [A/S] Aim at BASE & Squeeze trigger', completed: false },
      { id: 'sweep', label: '5. [S] Sweep side-to-side until out', completed: false },
      { id: 'evacuate', label: '6. Evacuate through Emergency Exit door', completed: false }
    ];

    this.stats = {
      startTime: 0,
      pulledAlarmFirst: false,
      pinPulledBeforeSqueeze: false,
      aimedAtBasePercentage: 100,
      timeTaken: 0,
      mistakes: 0,
    };
  }

  init() {
    const mb = this.app.modelBuilder;

    // 1. Office Room
    const room = mb.createOfficeEnvironment(10, 12, 3.6);
    this.group.add(room);

    // 2. Fire Alarm Station (on wall near entrance)
    this.alarmStation = mb.createFireAlarmStation();
    this.alarmStation.position.set(-4.96, 1.4, 1.5);
    this.alarmStation.rotation.y = Math.PI / 2;
    this.group.add(this.alarmStation);

    // 3. Fire Extinguisher (on wall bracket)
    this.extinguisher = mb.createFireExtinguisher();
    this.extinguisher.position.set(-4.94, 0.9, -0.5);
    this.extinguisher.rotation.y = Math.PI / 2;
    this.group.add(this.extinguisher);

    // 4. Emergency Exit Door
    this.exitDoor = mb.createEmergencyExitDoor();
    this.exitDoor.position.set(0, 0, 5.96);
    this.exitDoor.rotation.y = Math.PI;
    this.group.add(this.exitDoor);

    // 5. Fire & Smoke Particle Systems
    this.fireSystem = new FireParticleSystem(this.group, this.firePosition, 300);
    this.smokeSystem = new SmokeParticleSystem(this.group, this.firePosition, 140);
    this.spraySystem = new ExtinguisherSpraySystem(this.group, 350);

    // Collect interactive objects
    this.interactiveObjects = [
      this.alarmStation,
      this.extinguisher,
      this.extinguisher.userData.pinGroup,
      this.exitDoor
    ];

    this.stats.startTime = performance.now();
    this.app.audio.startFireSound(1.0);
  }

  handleInteract(target, type, controller) {
    // 1. Fire Alarm Pull Station
    if (this.isDescendantOf(target, this.alarmStation)) {
      if (!this.alarmStation.userData.isPulled) {
        this.alarmStation.userData.pull();
        this.app.audio.playClick();
        this.app.audio.startAlarm();
        this.alarmStation.userData.strobeLight.intensity = 2.5;

        if (this.currentStepIndex === 0) {
          this.stats.pulledAlarmFirst = true;
          this.completeStep(0);
        }
      }
      return;
    }

    // 2. Extinguisher Safety Pin
    if (this.isDescendantOf(target, this.extinguisher.userData.pinGroup)) {
      if (!this.extinguisher.userData.pinPulled) {
        this.extinguisher.userData.pullPin();
        this.app.audio.playSuccess();
        if (this.currentStepIndex === 2) {
          this.stats.pinPulledBeforeSqueeze = true;
          this.completeStep(2);
        }
      }
      return;
    }

    // 3. Extinguisher Grabbed
    if (this.isDescendantOf(target, this.extinguisher)) {
      if (this.currentStepIndex === 1) {
        this.completeStep(1);
      }
      return;
    }

    // 4. Emergency Exit Door
    if (this.isDescendantOf(target, this.exitDoor)) {
      if (this.currentStepIndex >= 4) {
        this.exitDoor.userData.openDoor();
        this.app.audio.playSuccess();
        this.completeStep(5);
        this.finishScenario();
      }
    }
  }

  handleSqueeze(isSqueezing, extinguisher) {
    if (!extinguisher || !extinguisher.userData) return;

    if (!extinguisher.userData.pinPulled) {
      if (isSqueezing) {
        this.app.audio.playWarning();
        this.app.ui.showToast('Safety Pin is still locked! Pull the pin first.');
        this.stats.mistakes++;
      }
      return;
    }

    this.spraySystem.trigger(isSqueezing);
    this.app.audio.setExtinguisherSpray(isSqueezing);

    if (isSqueezing && this.currentStepIndex === 3) {
      this.completeStep(3);
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
    // 1. Update particles
    if (this.fireSystem) this.fireSystem.update(delta);
    if (this.smokeSystem) this.smokeSystem.update(delta);

    // 2. Update extinguisher spray position & orientation
    if (this.extinguisher && this.spraySystem) {
      const nozzlePos = new THREE.Vector3();
      const nozzleDir = new THREE.Vector3();
      this.extinguisher.userData.getNozzleWorldInfo(nozzlePos, nozzleDir);

      this.spraySystem.update(delta, nozzlePos, nozzleDir);

      // Check if spray is hitting fire base
      if (this.spraySystem.active && this.fireHealth > 0) {
        const isHitting = this.spraySystem.isHittingTarget(this.firePosition, 1.1);
        if (isHitting) {
          // Extinguish fire!
          this.fireHealth = Math.max(0, this.fireHealth - 22 * delta);
          const intensity = this.fireHealth / 100.0;
          this.fireSystem.setIntensity(intensity);
          this.smokeSystem.setIntensity(intensity);
          this.app.audio.updateFireIntensity(intensity);
          this.app.ui.updateTelemetry('Fire Heat', this.fireHealth, 100, true);

          if (this.fireHealth <= 0) {
            this.app.audio.stopFireSound();
            this.app.audio.playSuccess();
            this.completeStep(4);
          }
        }
      }
    }

    // 3. Strobe light flicker if alarm active
    if (this.alarmStation && this.alarmStation.userData.isPulled) {
      const strobe = this.alarmStation.userData.strobeLight;
      if (strobe) {
        strobe.intensity = (Math.sin(performance.now() * 0.015) > 0.4) ? 3.0 : 0;
      }
    }

    // Proximity check for exit door evacuation
    if (this.currentStepIndex >= 4) {
      const playerPos = new THREE.Vector3();
      this.app.camera.getWorldPosition(playerPos);
      if (playerPos.distanceTo(new THREE.Vector3(0, 0, 5.5)) < 1.8) {
        this.exitDoor.userData.openDoor();
        this.completeStep(5);
        this.finishScenario();
      }
    }
  }

  updateHUDText() {
    const current = this.steps[this.currentStepIndex];
    if (current) {
      this.app.controls.updateVRHUD(
        'FIRE EMERGENCY',
        this.objective,
        current.label
      );
    }
  }

  finishScenario() {
    this.stats.timeTaken = ((performance.now() - this.stats.startTime) / 1000).toFixed(1);

    // Calculate score
    let score = 100;
    if (!this.stats.pulledAlarmFirst) score -= 15;
    if (!this.stats.pinPulledBeforeSqueeze) score -= 10;
    if (this.stats.mistakes > 0) score -= (this.stats.mistakes * 5);
    if (this.stats.timeTaken > 45) score -= Math.min(25, (this.stats.timeTaken - 45) * 0.5);

    score = Math.max(10, Math.round(score));
    let grade = 'A+';
    if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';
    else if (score < 95) grade = 'A';

    const feedback = [
      { text: this.stats.pulledAlarmFirst ? 'Correctly pulled building fire alarm first.' : 'Tip: Always alert building occupants before attempting to fight fire.', type: this.stats.pulledAlarmFirst ? 'success' : 'warning' },
      { text: 'Executed P.A.S.S. sequence (Pull pin, Aim at base, Squeeze trigger, Sweep side-to-side).', type: 'success' },
      { text: `Total scenario response time: ${this.stats.timeTaken} seconds.`, type: 'info' }
    ];

    this.app.scenarioManager.showDebrief({
      title: 'Office Fire Suppression Debrief',
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
    this.app.audio.stopFireSound();
    this.app.audio.stopAlarm();
    this.app.audio.setExtinguisherSpray(false);

    if (this.fireSystem) this.fireSystem.dispose();
    if (this.smokeSystem) this.smokeSystem.dispose();
    if (this.spraySystem) this.spraySystem.dispose();

    this.app.scene.remove(this.group);
  }
}
