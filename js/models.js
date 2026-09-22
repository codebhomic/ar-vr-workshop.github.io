import * as THREE from 'three';

/**
 * 3D Procedural Models & Interactive Equipment Builder
 * Crafted with Three.js geometries and PBR materials for Quest 3S WebXR
 */

export class ModelBuilder {
  constructor() {
    this.materials = this.initMaterials();
  }

  initMaterials() {
    return {
      extinguisherRed: new THREE.MeshStandardMaterial({
        color: 0xcc1111,
        metalness: 0.6,
        roughness: 0.25,
      }),
      darkMetal: new THREE.MeshStandardMaterial({
        color: 0x1f242d,
        metalness: 0.8,
        roughness: 0.3,
      }),
      chromeMetal: new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        metalness: 0.95,
        roughness: 0.1,
      }),
      brassMetal: new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.85,
        roughness: 0.25,
      }),
      blackRubber: new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.8,
        metalness: 0.1,
      }),
      alarmRed: new THREE.MeshStandardMaterial({
        color: 0xdd1c1a,
        roughness: 0.35,
        metalness: 0.2,
      }),
      aedYellow: new THREE.MeshStandardMaterial({
        color: 0xffcc00,
        roughness: 0.35,
        metalness: 0.1,
      }),
      aedShockRed: new THREE.MeshStandardMaterial({
        color: 0xff2222,
        roughness: 0.2,
        emissive: 0xaa0000,
        emissiveIntensity: 0.6,
      }),
      glowCyan: new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00d2e0,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
      glowGreen: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.9,
      }),
      wallMat: new THREE.MeshStandardMaterial({
        color: 0x242b38,
        roughness: 0.75,
        metalness: 0.1,
      }),
      floorMat: new THREE.MeshStandardMaterial({
        color: 0x141824,
        roughness: 0.45,
        metalness: 0.3,
      }),
      ceilingMat: new THREE.MeshStandardMaterial({
        color: 0x1c212e,
        roughness: 0.85,
      }),
      deskWood: new THREE.MeshStandardMaterial({
        color: 0x3d485c,
        roughness: 0.6,
        metalness: 0.15,
      }),
      skinMat: new THREE.MeshStandardMaterial({
        color: 0xe0ac69,
        roughness: 0.65,
        metalness: 0.05,
      })
    };
  }

  /**
   * Fire Extinguisher with pullable safety pin, pressure gauge, hose and nozzle
   */
  createFireExtinguisher() {
    const group = new THREE.Group();
    group.name = 'FireExtinguisher';

    // Main Cylinder
    const cylinderGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.42, 24);
    const cylinder = new THREE.Mesh(cylinderGeo, this.materials.extinguisherRed);
    cylinder.position.y = 0.21;
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    group.add(cylinder);

    // Domed Top and Bottom Caps
    const topCapGeo = new THREE.SphereGeometry(0.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const topCap = new THREE.Mesh(topCapGeo, this.materials.extinguisherRed);
    topCap.position.y = 0.42;
    group.add(topCap);

    const bottomCapGeo = new THREE.CylinderGeometry(0.082, 0.084, 0.04, 24);
    const bottomCap = new THREE.Mesh(bottomCapGeo, this.materials.darkMetal);
    bottomCap.position.y = 0.02;
    group.add(bottomCap);

    // Label Band
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 256;
    const lCtx = labelCanvas.getContext('2d');
    lCtx.fillStyle = '#ffffff';
    lCtx.fillRect(0, 0, 512, 256);
    lCtx.fillStyle = '#cc1111';
    lCtx.fillRect(10, 10, 492, 40);
    lCtx.fillStyle = '#ffffff';
    lCtx.font = 'bold 26px sans-serif';
    lCtx.fillText('FIRE EXTINGUISHER - CLASS ABC', 30, 40);
    lCtx.fillStyle = '#111827';
    lCtx.font = 'bold 22px sans-serif';
    lCtx.fillText('INSTRUCTIONS: P - A - S - S', 30, 95);
    lCtx.font = '18px sans-serif';
    lCtx.fillText('1. PULL the safety ring pin', 35, 130);
    lCtx.fillText('2. AIM nozzle at base of fire', 35, 160);
    lCtx.fillText('3. SQUEEZE operating lever', 35, 190);
    lCtx.fillText('4. SWEEP side to side', 35, 220);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.4,
    });
    const labelGeo = new THREE.CylinderGeometry(0.081, 0.081, 0.22, 24, 1, true, 0, Math.PI * 1.5);
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.position.y = 0.22;
    labelMesh.rotation.y = Math.PI * 0.25;
    group.add(labelMesh);

    // Valve Neck & Brass Collar
    const collarGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.05, 16);
    const collar = new THREE.Mesh(collarGeo, this.materials.brassMetal);
    collar.position.y = 0.51;
    group.add(collar);

    // Pressure Gauge
    const gaugeBodyGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 16);
    const gaugeBody = new THREE.Mesh(gaugeBodyGeo, this.materials.brassMetal);
    gaugeBody.rotation.x = Math.PI / 2;
    gaugeBody.position.set(0.04, 0.52, 0);
    group.add(gaugeBody);

    const gaugeDialGeo = new THREE.CircleGeometry(0.018, 16);
    const dialCanvas = document.createElement('canvas');
    dialCanvas.width = 128;
    dialCanvas.height = 128;
    const dCtx = dialCanvas.getContext('2d');
    dCtx.fillStyle = '#ffffff';
    dCtx.beginPath();
    dCtx.arc(64, 64, 60, 0, Math.PI * 2);
    dCtx.fill();
    // Green Zone
    dCtx.fillStyle = '#10b981';
    dCtx.beginPath();
    dCtx.moveTo(64, 64);
    dCtx.arc(64, 64, 55, -Math.PI * 0.75, -Math.PI * 0.25);
    dCtx.fill();
    // Needle
    dCtx.strokeStyle = '#000000';
    dCtx.lineWidth = 4;
    dCtx.beginPath();
    dCtx.moveTo(64, 64);
    dCtx.lineTo(64, 20);
    dCtx.stroke();
    const dialTex = new THREE.CanvasTexture(dialCanvas);
    const dialMat = new THREE.MeshBasicMaterial({ map: dialTex });
    const dialMesh = new THREE.Mesh(gaugeDialGeo, dialMat);
    dialMesh.position.set(0.049, 0.52, 0);
    dialMesh.rotation.y = Math.PI / 2;
    group.add(dialMesh);

    // Valve Mechanism & Fixed Carrying Handle
    const handleGeo = new THREE.BoxGeometry(0.02, 0.03, 0.16);
    const handleMesh = new THREE.Mesh(handleGeo, this.materials.darkMetal);
    handleMesh.position.set(0, 0.54, -0.05);
    group.add(handleMesh);

    // Operating Squeeze Lever (Animates when squeezed)
    const leverGroup = new THREE.Group();
    leverGroup.position.set(0, 0.56, 0.01);
    const leverGeo = new THREE.BoxGeometry(0.018, 0.015, 0.15);
    const leverMesh = new THREE.Mesh(leverGeo, this.materials.darkMetal);
    leverMesh.position.set(0, 0, -0.06);
    leverGroup.add(leverMesh);
    group.add(leverGroup);

    // Safety Pull Pin with Ring (Interactive!)
    const pinGroup = new THREE.Group();
    pinGroup.name = 'SafetyPin';
    pinGroup.position.set(0, 0.54, 0.01);

    const pinShaftGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8);
    const pinShaft = new THREE.Mesh(pinShaftGeo, this.materials.chromeMetal);
    pinShaft.rotation.z = Math.PI / 2;
    pinGroup.add(pinShaft);

    const ringGeo = new THREE.TorusGeometry(0.02, 0.004, 8, 16);
    const ring = new THREE.Mesh(ringGeo, this.materials.chromeMetal);
    ring.position.x = 0.035;
    ring.rotation.y = Math.PI / 2;
    pinGroup.add(ring);
    group.add(pinGroup);

    // Flexible Hose & Conical Discharge Nozzle Horn
    const hoseCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.51, 0.03),
      new THREE.Vector3(0.12, 0.42, 0.1),
      new THREE.Vector3(0.08, 0.24, 0.12)
    );
    const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.012, 8, false);
    const hoseMesh = new THREE.Mesh(hoseGeo, this.materials.blackRubber);
    group.add(hoseMesh);

    // Nozzle Horn
    const nozzleGroup = new THREE.Group();
    nozzleGroup.name = 'ExtinguisherNozzle';
    nozzleGroup.position.set(0.08, 0.22, 0.12);

    const hornGeo = new THREE.CylinderGeometry(0.022, 0.012, 0.12, 12);
    const horn = new THREE.Mesh(hornGeo, this.materials.blackRubber);
    horn.rotation.x = Math.PI / 3;
    nozzleGroup.add(horn);

    // Nozzle tip marker for particle emission
    const tipMarker = new THREE.Object3D();
    tipMarker.position.set(0, -0.06, 0.08);
    nozzleGroup.add(tipMarker);
    group.add(nozzleGroup);

    // Physics / Interaction Metadata
    group.userData = {
      isGrabbable: true,
      type: 'extinguisher',
      pinPulled: false,
      isSqueezing: false,
      pinGroup: pinGroup,
      leverGroup: leverGroup,
      nozzleGroup: nozzleGroup,
      tipMarker: tipMarker,
      pullPin: () => {
        if (!group.userData.pinPulled) {
          group.userData.pinPulled = true;
          // Animate pin sliding out
          pinGroup.position.x += 0.12;
          pinGroup.visible = false;
          return true;
        }
        return false;
      },
      setSqueeze: (squeeze) => {
        group.userData.isSqueezing = squeeze;
        leverGroup.rotation.x = squeeze ? 0.22 : 0;
      },
      getNozzleWorldInfo: (targetPos, targetDir) => {
        tipMarker.getWorldPosition(targetPos);
        const forward = new THREE.Vector3(0, 0, -1);
        nozzleGroup.getWorldDirection(targetDir);
      }
    };

    return group;
  }

  /**
   * Wall-Mounted Manual Fire Alarm Pull Station with T-Bar
   */
  createFireAlarmStation() {
    const group = new THREE.Group();
    group.name = 'FireAlarmStation';

    // Wall Backplate
    const plateGeo = new THREE.BoxGeometry(0.2, 0.28, 0.04);
    const plate = new THREE.Mesh(plateGeo, this.materials.alarmRed);
    plate.castShadow = true;
    group.add(plate);

    // Front White Decal / Text Label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#dd1c1a';
    ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FIRE', 128, 60);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('PULL DOWN', 128, 100);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(128, 120);
    ctx.lineTo(128, 160);
    ctx.lineTo(115, 145);
    ctx.moveTo(128, 160);
    ctx.lineTo(141, 145);
    ctx.stroke();

    const decalTex = new THREE.CanvasTexture(canvas);
    const decalMat = new THREE.MeshStandardMaterial({ map: decalTex, roughness: 0.4 });
    const decalMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), decalMat);
    decalMesh.position.set(0, 0, 0.021);
    group.add(decalMesh);

    // Pull T-Bar Lever (Hinged at bottom)
    const leverGroup = new THREE.Group();
    leverGroup.position.set(0, -0.04, 0.025);

    const tBarGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
    const tBar = new THREE.Mesh(tBarGeo, this.materials.chromeMetal);
    tBar.position.y = 0.04;
    leverGroup.add(tBar);

    const stemGeo = new THREE.BoxGeometry(0.02, 0.06, 0.015);
    const stem = new THREE.Mesh(stemGeo, this.materials.chromeMetal);
    stem.position.y = 0.01;
    leverGroup.add(stem);
    group.add(leverGroup);

    // Strobe Horn on top of station
    const strobeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16);
    const strobeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const strobe = new THREE.Mesh(strobeGeo, strobeMat);
    strobe.position.set(0, 0.18, 0.02);
    group.add(strobe);

    const strobeLight = new THREE.PointLight(0xff2222, 0, 8.0);
    strobeLight.position.set(0, 0.2, 0.06);
    group.add(strobeLight);

    group.userData = {
      isInteractive: true,
      isPulled: false,
      strobeLight: strobeLight,
      pull: () => {
        if (!group.userData.isPulled) {
          group.userData.isPulled = true;
          leverGroup.rotation.x = Math.PI * 0.35; // T-bar drops
          return true;
        }
        return false;
      }
    };

    return group;
  }

  /**
   * Automated External Defibrillator (AED) Unit with Screen & Flashing Shock Button
   */
  createAEDUnit() {
    const group = new THREE.Group();
    group.name = 'AEDUnit';

    // Main Portable Tough Case
    const caseGeo = new THREE.BoxGeometry(0.32, 0.14, 0.28);
    const caseMesh = new THREE.Mesh(caseGeo, this.materials.aedYellow);
    caseMesh.position.y = 0.07;
    caseMesh.castShadow = true;
    group.add(caseMesh);

    // Carrying Handle
    const handleGeo = new THREE.TorusGeometry(0.05, 0.014, 8, 16, Math.PI);
    const handle = new THREE.Mesh(handleGeo, this.materials.darkMetal);
    handle.rotation.x = -Math.PI / 2;
    handle.position.set(0, 0.07, 0.17);
    group.add(handle);

    // Top Face Interface Panel
    const topPanelGeo = new THREE.PlaneGeometry(0.28, 0.24);
    const topPanel = new THREE.Mesh(topPanelGeo, this.materials.darkMetal);
    topPanel.rotation.x = -Math.PI / 2;
    topPanel.position.set(0, 0.141, 0);
    group.add(topPanel);

    // LCD Status Display Screen
    const screenGeo = new THREE.PlaneGeometry(0.14, 0.08);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 128;
    const sCtx = screenCanvas.getContext('2d');
    sCtx.fillStyle = '#061a14';
    sCtx.fillRect(0, 0, 256, 128);
    sCtx.fillStyle = '#10b981';
    sCtx.font = 'bold 20px monospace';
    sCtx.fillText('AED DEFIBRILLATOR', 16, 32);
    sCtx.font = '16px monospace';
    sCtx.fillText('STATUS: STANDBY', 16, 64);
    sCtx.fillText('RHYTHM: ANALYZING', 16, 96);
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.rotation.x = -Math.PI / 2;
    screenMesh.position.set(-0.05, 0.142, -0.04);
    group.add(screenMesh);

    // Prominent Flashing Red SHOCK Button
    const shockBtnGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.02, 24);
    const shockBtn = new THREE.Mesh(shockBtnGeo, this.materials.aedShockRed);
    shockBtn.position.set(0.08, 0.145, -0.04);
    group.add(shockBtn);

    // Shock Button Lightning Bolt Decal
    const boltCanvas = document.createElement('canvas');
    boltCanvas.width = 64;
    boltCanvas.height = 64;
    const bCtx = boltCanvas.getContext('2d');
    bCtx.fillStyle = '#ff2222';
    bCtx.fillRect(0, 0, 64, 64);
    bCtx.fillStyle = '#ffff00';
    bCtx.beginPath();
    bCtx.moveTo(36, 6);
    bCtx.lineTo(16, 34);
    bCtx.lineTo(32, 34);
    bCtx.lineTo(26, 58);
    bCtx.lineTo(48, 28);
    bCtx.lineTo(32, 28);
    bCtx.closePath();
    bCtx.fill();
    const boltTex = new THREE.CanvasTexture(boltCanvas);
    const boltMat = new THREE.MeshBasicMaterial({ map: boltTex });
    const boltMesh = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), boltMat);
    boltMesh.rotation.x = -Math.PI / 2;
    boltMesh.position.set(0.08, 0.156, -0.04);
    group.add(boltMesh);

    // Pad Storage Compartment
    const padBayGeo = new THREE.BoxGeometry(0.24, 0.02, 0.09);
    const padBay = new THREE.Mesh(padBayGeo, this.materials.floorMat);
    padBay.position.set(0, 0.141, 0.06);
    group.add(padBay);

    // Two Interactive Electrode Pads with Wires
    const pad1 = this.createElectrodePad('PAD 1: Upper Right Chest');
    pad1.position.set(-0.06, 0.16, 0.06);
    group.add(pad1);

    const pad2 = this.createElectrodePad('PAD 2: Lower Left Rib');
    pad2.position.set(0.06, 0.16, 0.06);
    group.add(pad2);

    group.userData = {
      isInteractive: true,
      shockButton: shockBtn,
      pad1: pad1,
      pad2: pad2,
      screenMesh: screenMesh,
      screenCanvas: screenCanvas,
      screenCtx: sCtx,
      screenTex: screenTex,
      shockArmed: false,
      updateScreen: (line1, line2, line3) => {
        sCtx.fillStyle = '#061a14';
        sCtx.fillRect(0, 0, 256, 128);
        sCtx.fillStyle = '#10b981';
        sCtx.font = 'bold 20px monospace';
        sCtx.fillText(line1 || '', 16, 32);
        sCtx.font = '16px monospace';
        sCtx.fillText(line2 || '', 16, 64);
        sCtx.fillText(line3 || '', 16, 96);
        screenTex.needsUpdate = true;
      }
    };

    return group;
  }

  createElectrodePad(label) {
    const padGroup = new THREE.Group();
    padGroup.name = label;

    // Oval adhesive pad
    const padGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.006, 20);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.5,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padGroup.add(padMesh);

    // Placement graphic on pad
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAD', 64, 40);
    ctx.font = '12px sans-serif';
    ctx.fillText('PEEL & PLACE', 64, 70);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(64, 98, 14, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    const decalMat = new THREE.MeshBasicMaterial({ map: tex });
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), decalMat);
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = 0.004;
    padGroup.add(decal);

    padGroup.userData = {
      isGrabbable: true,
      isPad: true,
      label: label,
      isPlaced: false,
    };

    return padGroup;
  }

  /**
   * Realistic CPR Training Mannequin Torso
   */
  createCPRMannequin() {
    const group = new THREE.Group();
    group.name = 'CPRMannequin';

    // Torso Base / Foam Cushion
    const matGeo = new THREE.BoxGeometry(0.6, 0.04, 0.9);
    const matMesh = new THREE.Mesh(matGeo, this.materials.darkMetal);
    matMesh.position.y = 0.02;
    group.add(matMesh);

    // Anatomical Torso Shape
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.22, 0.65);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.materials.skinMat);
    torsoMesh.position.set(0, 0.13, 0);
    torsoMesh.castShadow = true;
    group.add(torsoMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeo, this.materials.skinMat);
    head.position.set(0, 0.16, -0.42);
    group.add(head);

    // Sternum Chest Compression Target (Interactive spring-loaded zone)
    const sternumGroup = new THREE.Group();
    sternumGroup.name = 'Sternum';
    sternumGroup.position.set(0, 0.245, 0);

    const targetGeo = new THREE.CircleGeometry(0.065, 24);
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 128;
    tCanvas.height = 128;
    const tCtx = tCanvas.getContext('2d');
    tCtx.fillStyle = '#e0ac69';
    tCtx.fillRect(0, 0, 128, 128);
    tCtx.strokeStyle = '#ff3366';
    tCtx.lineWidth = 8;
    tCtx.beginPath();
    tCtx.arc(64, 64, 48, 0, Math.PI * 2);
    tCtx.stroke();
    tCtx.fillStyle = '#ff3366';
    tCtx.font = 'bold 22px sans-serif';
    tCtx.textAlign = 'center';
    tCtx.fillText('PRESS', 64, 70);
    const targetTex = new THREE.CanvasTexture(tCanvas);
    const targetMat = new THREE.MeshBasicMaterial({ map: targetTex });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.rotation.x = -Math.PI / 2;
    sternumGroup.add(targetMesh);
    group.add(sternumGroup);

    // Target Pad Placement Indicators (Ghost outlines on chest)
    const pad1Target = this.createGhostPadTarget('Upper Right Chest');
    pad1Target.position.set(-0.11, 0.242, -0.12);
    group.add(pad1Target);

    const pad2Target = this.createGhostPadTarget('Lower Left Rib');
    pad2Target.position.set(0.12, 0.242, 0.12);
    group.add(pad2Target);

    group.userData = {
      isInteractive: true,
      sternum: sternumGroup,
      pad1Target: pad1Target,
      pad2Target: pad2Target,
      compressionCount: 0,
      lastCompressionTime: 0,
      pressCompression: () => {
        // Bounce down 4cm and return
        sternumGroup.position.y = 0.205;
        setTimeout(() => {
          sternumGroup.position.y = 0.245;
        }, 120);
      }
    };

    return group;
  }

  createGhostPadTarget(label) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.04, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.45,
        wireframe: true,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = { label: label };
    return mesh;
  }

  /**
   * Main Electrical Distribution Breaker Box
   */
  createBreakerBox() {
    const group = new THREE.Group();
    group.name = 'BreakerBox';

    // Metal Box Housing
    const boxGeo = new THREE.BoxGeometry(0.34, 0.48, 0.1);
    const boxMesh = new THREE.Mesh(boxGeo, this.materials.darkMetal);
    group.add(boxMesh);

    // Front Panel with warning label
    const panelGeo = new THREE.PlaneGeometry(0.3, 0.44);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#242b38';
    ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = '#ffb703';
    ctx.fillRect(20, 20, 216, 40);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAIN POWER', 128, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('HIGH VOLTAGE: 480V', 128, 100);
    ctx.fillText('[ UP = ON ]', 128, 140);
    ctx.fillText('[ DOWN = OFF ]', 128, 170);

    const panelTex = new THREE.CanvasTexture(canvas);
    const panelMesh = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial({ map: panelTex }));
    panelMesh.position.set(0, 0, 0.051);
    group.add(panelMesh);

    // Master Switch Toggle Lever
    const switchGroup = new THREE.Group();
    switchGroup.name = 'MainBreakerSwitch';
    switchGroup.position.set(0, -0.05, 0.055);

    const switchGeo = new THREE.BoxGeometry(0.04, 0.08, 0.06);
    const switchMesh = new THREE.Mesh(switchGeo, this.materials.alarmRed);
    switchGroup.add(switchMesh);
    group.add(switchGroup);

    // Spark emitter anchor
    const sparkAnchor = new THREE.Object3D();
    sparkAnchor.position.set(0, 0.12, 0.06);
    group.add(sparkAnchor);

    group.userData = {
      isInteractive: true,
      isOn: true,
      switchGroup: switchGroup,
      sparkAnchor: sparkAnchor,
      toggle: () => {
        if (group.userData.isOn) {
          group.userData.isOn = false;
          switchGroup.rotation.x = -Math.PI * 0.35; // Flip switch down
          return true;
        }
        return false;
      }
    };

    return group;
  }

  /**
   * Gas Supply Shut-off Valve
   */
  createGasValve() {
    const group = new THREE.Group();
    group.name = 'GasValve';

    // Yellow Pipe
    const pipeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 16);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.4 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    group.add(pipe);

    // Valve body junction
    const juncGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const junc = new THREE.Mesh(juncGeo, this.materials.darkMetal);
    group.add(junc);

    // Red Circular Handwheel Valve
    const wheelGroup = new THREE.Group();
    wheelGroup.name = 'GasWheel';
    wheelGroup.position.set(0, 0, 0.08);

    const rimGeo = new THREE.TorusGeometry(0.09, 0.015, 8, 20);
    const rim = new THREE.Mesh(rimGeo, this.materials.alarmRed);
    wheelGroup.add(rim);

    const spoke1Geo = new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8);
    const spoke1 = new THREE.Mesh(spoke1Geo, this.materials.alarmRed);
    wheelGroup.add(spoke1);

    const spoke2 = new THREE.Mesh(spoke1Geo, this.materials.alarmRed);
    spoke2.rotation.z = Math.PI / 2;
    wheelGroup.add(spoke2);

    group.add(wheelGroup);

    group.userData = {
      isInteractive: true,
      isOpen: true,
      wheelGroup: wheelGroup,
      closeValve: () => {
        if (group.userData.isOpen) {
          group.userData.isOpen = false;
          wheelGroup.rotation.z += Math.PI / 2; // Turn valve 90 deg
          return true;
        }
        return false;
      }
    };

    return group;
  }

  /**
   * Emergency Exit Door with Illuminated Glow Sign
   */
  createEmergencyExitDoor() {
    const group = new THREE.Group();
    group.name = 'EmergencyExitDoor';

    // Frame
    const frameGeo = new THREE.BoxGeometry(1.24, 2.3, 0.12);
    const frame = new THREE.Mesh(frameGeo, this.materials.darkMetal);
    frame.position.y = 1.15;
    group.add(frame);

    // Door Panel
    const doorGeo = new THREE.BoxGeometry(1.1, 2.18, 0.06);
    const door = new THREE.Mesh(doorGeo, this.materials.wallMat);
    door.position.set(0, 1.12, 0.02);
    group.add(door);

    // Push Bar Crash Handle
    const barGeo = new THREE.BoxGeometry(0.9, 0.04, 0.06);
    const bar = new THREE.Mesh(barGeo, this.materials.chromeMetal);
    bar.position.set(0, 1.05, 0.07);
    group.add(bar);

    // Glowing Illuminated "EXIT" Sign on top
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 2.45, 0.08);

    const signBoxGeo = new THREE.BoxGeometry(0.48, 0.22, 0.08);
    const signBox = new THREE.Mesh(signBoxGeo, this.materials.darkMetal);
    signGroup.add(signBox);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#059669';
    sCtx.fillRect(0, 0, 256, 128);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 50px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('EXIT ➜', 128, 85);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
    });
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.18), signMat);
    signFace.position.z = 0.041;
    signGroup.add(signFace);

    // Green emergency illumination light
    const exitLight = new THREE.PointLight(0x10b981, 1.8, 5.0);
    exitLight.position.set(0, 0, 0.2);
    signGroup.add(exitLight);

    group.add(signGroup);

    group.userData = {
      isInteractive: true,
      isOpen: false,
      openDoor: () => {
        if (!group.userData.isOpen) {
          group.userData.isOpen = true;
          // Swing door open
          door.rotation.y = -Math.PI * 0.45;
          door.position.x = -0.4;
          return true;
        }
        return false;
      }
    };

    return group;
  }

  /**
   * Detailed Room Environment: Office / Laboratory
   */
  createOfficeEnvironment(width = 10, depth = 12, height = 3.5) {
    const room = new THREE.Group();
    room.name = 'OfficeEnvironment';

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, this.materials.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(width, depth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.materials.ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    room.add(ceiling);

    // Walls
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.materials.wallMat);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    room.add(backWall);

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.materials.wallMat);
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    room.add(frontWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), this.materials.wallMat);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    room.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), this.materials.wallMat);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    room.add(rightWall);

    // Fluorescent Overhead Lighting Fixtures
    const lightPositions = [
      new THREE.Vector3(-2.2, height - 0.05, -2.5),
      new THREE.Vector3(2.2, height - 0.05, -2.5),
      new THREE.Vector3(-2.2, height - 0.05, 2.5),
      new THREE.Vector3(2.2, height - 0.05, 2.5),
    ];

    lightPositions.forEach((pos) => {
      const fixtureGeo = new THREE.BoxGeometry(0.4, 0.06, 1.4);
      const fixtureMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xddeeff,
        emissiveIntensity: 0.8,
      });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.copy(pos);
      room.add(fixture);

      const light = new THREE.PointLight(0xffffff, 0.8, 7.0);
      light.position.set(pos.x, pos.y - 0.2, pos.z);
      room.add(light);
    });

    // Office Furniture (Reinforced Heavy Desks & Workstations)
    const desk1 = this.createOfficeDesk();
    desk1.position.set(-2.0, 0, -2.0);
    room.add(desk1);

    const desk2 = this.createOfficeDesk();
    desk2.position.set(2.0, 0, -2.0);
    room.add(desk2);

    return room;
  }

  createOfficeDesk() {
    const desk = new THREE.Group();
    desk.name = 'ReinforcedDesk';

    // Thick tabletop
    const topGeo = new THREE.BoxGeometry(1.6, 0.06, 0.9);
    const top = new THREE.Mesh(topGeo, this.materials.deskWood);
    top.position.y = 0.74;
    top.castShadow = true;
    top.receiveShadow = true;
    desk.add(top);

    // Heavy Steel Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.72, 12);
    const legPositions = [
      [-0.72, 0.36, -0.38],
      [0.72, 0.36, -0.38],
      [-0.72, 0.36, 0.38],
      [0.72, 0.36, 0.38],
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, this.materials.darkMetal);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      desk.add(leg);
    });

    // Desktop Monitor
    const monBaseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.015, 16);
    const monBase = new THREE.Mesh(monBaseGeo, this.materials.darkMetal);
    monBase.position.set(0, 0.78, -0.2);
    desk.add(monBase);

    const monScreenGeo = new THREE.BoxGeometry(0.52, 0.32, 0.02);
    const monScreen = new THREE.Mesh(monScreenGeo, this.materials.darkMetal);
    monScreen.position.set(0, 0.98, -0.2);
    desk.add(monScreen);

    // Monitor display canvas
    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    screenFace.position.set(0, 0.98, -0.189);
    desk.add(screenFace);

    // Desk bounding box for Drop-and-Cover detection
    desk.userData = {
      isShelter: true,
      safeBounds: new THREE.Box3(
        new THREE.Vector3(-0.7, 0, -0.4),
        new THREE.Vector3(0.7, 0.72, 0.4)
      )
    };

    return desk;
  }

  /**
   * Training Command Hub (Futuristic Operations Deck)
   */
  createHubEnvironment() {
    const hub = new THREE.Group();
    hub.name = 'CommandHub';

    // Circular Holodeck Platform
    const platformGeo = new THREE.CylinderGeometry(6, 6.2, 0.2, 32);
    const platform = new THREE.Mesh(platformGeo, this.materials.floorMat);
    platform.position.y = -0.1;
    platform.receiveShadow = true;
    hub.add(platform);

    // Glowing Cyan Trim Ring
    const ringGeo = new THREE.TorusGeometry(5.9, 0.04, 8, 32);
    const ring = new THREE.Mesh(ringGeo, this.materials.glowCyan);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    hub.add(ring);

    // Central Holographic Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.85, 24);
    const pedestal = new THREE.Mesh(pedestalGeo, this.materials.darkMetal);
    pedestal.position.set(0, 0.425, -1.8);
    pedestal.castShadow = true;
    hub.add(pedestal);

    // Pedestal Top Holo Emitter Disc
    const discGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 24);
    const disc = new THREE.Mesh(discGeo, this.materials.glowCyan);
    disc.position.set(0, 0.86, -1.8);
    hub.add(disc);

    // Soft Ambient Blue/Cyan Lights
    const hubLight = new THREE.PointLight(0x00f0ff, 1.2, 10.0);
    hubLight.position.set(0, 2.5, -1.8);
    hub.add(hubLight);

    return hub;
  }
}
