import * as THREE from 'three';

export class CPRAEDScenario {
  constructor(app) {
    this.app = app;
    this.id = 'cpr_aed';
    this.title = 'Cardiac Arrest: CPR & AED Defibrillation';
    this.objective = 'Perform high-quality CPR and deploy AED to restore heartbeat';
    this.tag = 'Life-Critical Medical Emergency';

    this.group = new THREE.Group();
    this.mannequin = null;
    this.aed = null;

    this.currentStepIndex = 0;
    this.targetCompressions = 30;
    this.compressionsDelivered = 0;
    this.lastCompTime = 0;
    this.rhythmScores = [];

    this.pad1Attached = false;
    this.pad2Attached = false;
    this.isAnalyzing = false;
    this.analyzeTimer = 0;
    this.shockArmed = false;

    this.steps = [
      { id: 'assess', label: '1. Check responsiveness & call 911', completed: false },
      { id: 'compressions', label: '2. Perform 30 chest compressions (100-120 BPM)', completed: false },
      { id: 'pad1', label: '3. Attach PAD 1 to Upper Right Chest', completed: false },
      { id: 'pad2', label: '4. Attach PAD 2 to Lower Left Ribcage', completed: false },
      { id: 'analyze', label: '5. Stand clear! AED analyzing rhythm', completed: false },
      { id: 'shock', label: '6. Press flashing SHOCK button', completed: false }
    ];

    this.stats = {
      startTime: 0,
      avgBpm: 110,
      rhythmAccuracy: 100,
      timeTaken: 0,
      mistakes: 0,
    };
  }

  init() {
    const mb = this.app.modelBuilder;

    // 1. Training Room
    const room = mb.createOfficeEnvironment(8, 10, 3.4);
    this.group.add(room);

    // 2. CPR Mannequin on Floor
    this.mannequin = mb.createCPRMannequin();
    this.mannequin.position.set(0, 0, -1.2);
    this.group.add(this.mannequin);

    // 3. AED Unit on Medical Tray / Table next to patient
    this.aed = mb.createAEDUnit();
    this.aed.position.set(0.65, 0.05, -1.2);
    this.group.add(this.aed);

    this.interactiveObjects = [
      this.mannequin,
      this.mannequin.userData.sternum,
      this.aed,
      this.aed.userData.shockButton,
      this.aed.userData.pad1,
      this.aed.userData.pad2,
    ];

    this.stats.startTime = performance.now();
    this.updateHUDText();
  }

  handleInteract(target, type, controller) {
    // 1. Initial Assessment (Tap shoulder or mannequin)
    if (this.currentStepIndex === 0 && this.isDescendantOf(target, this.mannequin)) {
      this.app.audio.playSuccess();
      this.app.ui.showToast('Victim unresponsive! 911 dispatched. Starting CPR!');
      this.completeStep(0);
      this.app.audio.startCPRMetronome(110);
      return;
    }

    // 2. Chest Compressions (Press Sternum)
    if (this.currentStepIndex === 1 && (this.isDescendantOf(target, this.mannequin.userData.sternum) || this.isDescendantOf(target, this.mannequin))) {
      this.handleCompression(controller);
      return;
    }

    // 3. Attach Electrode Pads
    if (this.isDescendantOf(target, this.aed.userData.pad1) || this.isDescendantOf(target, this.mannequin.userData.pad1Target)) {
      if (!this.pad1Attached && (this.currentStepIndex === 2 || this.currentStepIndex === 3)) {
        this.pad1Attached = true;
        this.snapPadToChest(this.aed.userData.pad1, this.mannequin.userData.pad1Target);
        this.app.audio.playSuccess();
        this.completeStep(2);
        if (this.pad1Attached && this.pad2Attached) {
          this.startAEDAnalysis();
        }
      }
      return;
    }

    if (this.isDescendantOf(target, this.aed.userData.pad2) || this.isDescendantOf(target, this.mannequin.userData.pad2Target)) {
      if (!this.pad2Attached && (this.currentStepIndex === 2 || this.currentStepIndex === 3)) {
        this.pad2Attached = true;
        this.snapPadToChest(this.aed.userData.pad2, this.mannequin.userData.pad2Target);
        this.app.audio.playSuccess();
        this.completeStep(3);
        if (this.pad1Attached && this.pad2Attached) {
          this.startAEDAnalysis();
        }
      }
      return;
    }

    // 4. Press Flashing Shock Button
    if (this.currentStepIndex === 5 && this.shockArmed && this.isDescendantOf(target, this.aed.userData.shockButton)) {
      this.deliverShock(controller);
    }
  }

  handleCompression(controller) {
    const now = performance.now();
    this.mannequin.userData.pressCompression();
    this.app.audio.playClick();
    if (controller) {
      this.app.controls.pulseHaptic(controller, 0.9, 65);
    }

    if (this.lastCompTime > 0) {
      const deltaSec = (now - this.lastCompTime) / 1000;
      const bpm = 60 / deltaSec;
      if (bpm >= 60 && bpm <= 180) {
        this.rhythmScores.push(bpm);
      }
    }
    this.lastCompTime = now;

    this.compressionsDelivered++;
    this.app.ui.updateTelemetry('Compressions', this.compressionsDelivered, this.targetCompressions, false);

    if (this.compressionsDelivered >= this.targetCompressions) {
      this.app.audio.stopCPRMetronome();
      this.app.audio.playSuccess();
      this.completeStep(1);
      this.app.ui.showToast('30 compressions delivered! Deploy AED electrode pads.');
      this.aed.userData.updateScreen('AED ACTIVE', 'ATTACH PADS', 'FOLLOW DIAGRAM');
    }
  }

  snapPadToChest(pad, target) {
    const targetWorldPos = new THREE.Vector3();
    target.getWorldPosition(targetWorldPos);
    pad.position.copy(target.position);
    pad.position.y += 0.005;
    target.parent.add(pad);
  }

  startAEDAnalysis() {
    this.currentStepIndex = 4;
    this.isAnalyzing = true;
    this.analyzeTimer = 3.5;
    this.aed.userData.updateScreen('ANALYZING...', 'DO NOT TOUCH PATIENT', 'STAND CLEAR!');
    this.app.ui.showToast('AED analyzing cardiac rhythm. Stand clear of patient!');
    this.updateHUDText();
  }

  armShock() {
    this.isAnalyzing = false;
    this.shockArmed = true;
    this.completeStep(4);
    this.currentStepIndex = 5;
    this.aed.userData.updateScreen('SHOCK ADVISED', 'CHARGING UNIT...', 'PRESS SHOCK BUTTON');
    this.app.audio.playAEDCharge();
    this.app.ui.showToast('SHOCK ADVISED! Stand clear and press the flashing SHOCK button.');
    this.updateHUDText();
  }

  deliverShock(controller) {
    this.shockArmed = false;
    this.app.audio.playAEDShock();
    if (controller) {
      this.app.controls.pulseHaptic(controller, 1.0, 150);
    }

    this.aed.userData.updateScreen('SHOCK DELIVERED', 'PULSE RESTORED', 'PATIENT STABILIZED');
    this.completeStep(5);
    this.app.ui.showToast('Shock delivered! Normal sinus rhythm restored.');

    setTimeout(() => {
      this.finishScenario();
    }, 1800);
  }

  completeStep(index) {
    if (this.steps[index]) {
      this.steps[index].completed = true;
      if (index === this.currentStepIndex) {
        this.currentStepIndex = Math.min(this.steps.length - 1, index + 1);
      }
      this.app.ui.updateSteps(this.steps, this.currentStepIndex);
      this.updateHUDText();
    }
  }

  update(delta) {
    // AED Shock button flashing
    if (this.shockArmed && this.aed) {
      const shockBtn = this.aed.userData.shockButton;
      if (shockBtn && shockBtn.material) {
        const flash = Math.sin(performance.now() * 0.015) > 0;
        shockBtn.material.emissiveIntensity = flash ? 1.5 : 0.2;
      }
    }

    // Analyzing countdown
    if (this.isAnalyzing) {
      this.analyzeTimer -= delta;
      if (this.analyzeTimer <= 0) {
        this.armShock();
      }
    }
  }

  updateHUDText() {
    const current = this.steps[this.currentStepIndex];
    if (current) {
      this.app.controls.updateVRHUD(
        'CARDIAC EMERGENCY',
        this.objective,
        current.label
      );
    }
  }

  finishScenario() {
    this.stats.timeTaken = ((performance.now() - this.stats.startTime) / 1000).toFixed(1);

    // Calculate CPR BPM accuracy
    let validBpmCount = 0;
    let sumBpm = 0;
    this.rhythmScores.forEach((bpm) => {
      if (bpm >= 95 && bpm <= 125) validBpmCount++;
      sumBpm += bpm;
    });

    const accuracyPct = this.rhythmScores.length > 0 ? Math.round((validBpmCount / this.rhythmScores.length) * 100) : 90;
    const avgBpm = this.rhythmScores.length > 0 ? Math.round(sumBpm / this.rhythmScores.length) : 112;

    let score = Math.round((accuracyPct * 0.5) + 50);
    score = Math.max(20, Math.min(100, score));

    let grade = 'A+';
    if (score < 70) grade = 'C';
    else if (score < 85) grade = 'B';
    else if (score < 95) grade = 'A';

    const feedback = [
      { text: `High-quality CPR compressions delivered: average rate ${avgBpm} BPM (${accuracyPct}% within target 100-120 BPM).`, type: accuracyPct > 70 ? 'success' : 'warning' },
      { text: 'Correct electrode pad placement: Upper Right Chest & Lower Left Ribcage.', type: 'success' },
      { text: 'Followed safety protocol: Stood clear during rhythm analysis and shock discharge.', type: 'success' },
      { text: `Total resuscitation time: ${this.stats.timeTaken} seconds.`, type: 'info' }
    ];

    this.app.scenarioManager.showDebrief({
      title: 'Cardiac Arrest Resuscitation Debrief',
      grade: grade,
      score: score,
      time: `${this.stats.timeTaken}s`,
      mistakes: 0,
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
    this.app.audio.stopCPRMetronome();
    this.app.scene.remove(this.group);
  }
}
