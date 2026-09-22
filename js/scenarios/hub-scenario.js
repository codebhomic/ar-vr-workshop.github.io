import * as THREE from 'three';

export class HubScenario {
  constructor(app) {
    this.app = app;
    this.id = 'hub';
    this.title = 'VR Emergency Command & Briefing Hub';
    this.objective = 'Select an emergency scenario to begin interactive VR training';
    this.tag = 'Training Operations Center';

    this.group = new THREE.Group();
    this.buttons = [];
    this.inspectableExtinguisher = null;
    this.inspectableAED = null;
  }

  init() {
    const mb = this.app.modelBuilder;

    // 1. Hub Environment
    const hub = mb.createHubEnvironment();
    this.group.add(hub);

    // 2. Holographic Mission Selection Console (3 Floating 3D holographic screens)
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(0, 1.4, -1.8);

    const scenariosData = [
      { id: 'fire', title: '1. OFFICE FIRE', sub: 'P.A.S.S. Protocol & Evac', icon: '🔥', color: 0xff3366, offset: -1.2 },
      { id: 'earthquake', title: '2. EARTHQUAKE', sub: 'Drop, Cover, Hazard Mit', icon: '⚡', color: 0xffb703, offset: 0 },
      { id: 'cpr_aed', title: '3. CARDIAC ARREST', sub: 'CPR Rhythm & AED Shock', icon: '❤️', color: 0x10b981, offset: 1.2 }
    ];

    scenariosData.forEach((data) => {
      const card = this.createHoloCard(data);
      card.position.set(data.offset, 0, 0);
      consoleGroup.add(card);
      this.buttons.push(card);
    });

    this.group.add(consoleGroup);

    // 3. Equipment Inspection Pedestals (Left & Right)
    // Left: Fire Extinguisher
    const leftPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.8, 20),
      mb.materials.darkMetal
    );
    leftPedestal.position.set(-2.2, 0.4, -1.2);
    this.group.add(leftPedestal);

    this.inspectableExtinguisher = mb.createFireExtinguisher();
    this.inspectableExtinguisher.position.set(-2.2, 0.8, -1.2);
    this.group.add(this.inspectableExtinguisher);

    // Right: AED Unit
    const rightPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.8, 20),
      mb.materials.darkMetal
    );
    rightPedestal.position.set(2.2, 0.4, -1.2);
    this.group.add(rightPedestal);

    this.inspectableAED = mb.createAEDUnit();
    this.inspectableAED.position.set(2.2, 0.8, -1.2);
    this.group.add(this.inspectableAED);

    this.interactiveObjects = [
      ...this.buttons,
      this.inspectableExtinguisher,
      this.inspectableExtinguisher.userData.pinGroup,
      this.inspectableAED
    ];

    this.updateHUDText();
  }

  createHoloCard(data) {
    const cardGroup = new THREE.Group();
    cardGroup.name = `HoloBtn_${data.id}`;

    // Backing glass plate
    const plateGeo = new THREE.BoxGeometry(1.0, 0.7, 0.04);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    cardGroup.add(plate);

    // Glowing border frame
    const frameGeo = new THREE.BoxGeometry(1.04, 0.74, 0.02);
    const frameMat = new THREE.MeshBasicMaterial({
      color: data.color,
      wireframe: true,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    cardGroup.add(frame);

    // Canvas face
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 360);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 340);

    ctx.font = '70px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(data.icon, 256, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(data.title, 256, 175);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px sans-serif';
    ctx.fillText(data.sub, 256, 225);

    ctx.fillStyle = '#00f0ff';
    ctx.roundRect(96, 270, 320, 60, 12);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('START SCENARIO ➜', 256, 310);

    const tex = new THREE.CanvasTexture(canvas);
    const faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.66),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    faceMesh.position.z = 0.025;
    cardGroup.add(faceMesh);

    cardGroup.userData = {
      isInteractive: true,
      scenarioId: data.id,
    };

    return cardGroup;
  }

  handleInteract(target, type, controller) {
    let curr = target;
    while (curr) {
      if (curr.userData && curr.userData.scenarioId) {
        this.app.audio.playSuccess();
        this.app.scenarioManager.loadScenario(curr.userData.scenarioId);
        return;
      }
      curr = curr.parent;
    }

    // Interactive equipment inspection in hub
    if (this.isDescendantOf(target, this.inspectableExtinguisher.userData.pinGroup)) {
      this.inspectableExtinguisher.userData.pullPin();
      this.app.audio.playSuccess();
      this.app.ui.showToast('Safety pin removed! Extinguisher is now ready to discharge.');
    }
  }

  update(delta) {
    // Gentle floating hover animation on holographic cards
    const t = performance.now() * 0.002;
    this.buttons.forEach((btn, i) => {
      btn.position.y = Math.sin(t + i * 1.5) * 0.03;
    });

    // Slow rotation of inspectable equipment
    if (this.inspectableExtinguisher && !this.inspectableExtinguisher.parent?.userData?.isGrabbable) {
      this.inspectableExtinguisher.rotation.y += 0.005;
    }
    if (this.inspectableAED && !this.inspectableAED.parent?.userData?.isGrabbable) {
      this.inspectableAED.rotation.y += 0.005;
    }
  }

  updateHUDText() {
    this.app.controls.updateVRHUD(
      'BRIEFING HUB',
      'Select a Scenario Console',
      'Aim ray and press Trigger'
    );
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
    this.app.scene.remove(this.group);
  }
}
