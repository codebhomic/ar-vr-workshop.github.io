import * as THREE from 'three';

/**
 * WebXR Controller & Desktop Input Manager
 * Supports Meta Quest 3S (Touch Plus controllers, haptics, rays, grab/trigger)
 * and seamless Desktop/Mobile First-Person fallback.
 */

export class XRControlsManager {
  constructor(renderer, scene, camera, cameraRig) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.cameraRig = cameraRig;

    this.controllers = [];
    this.controllerGrips = [];
    this.raycasters = [];

    this.grabbedObject = null;
    this.grabbedController = null;
    this.grabOffset = new THREE.Vector3();
    this.grabQuatOffset = new THREE.Quaternion();

    this.interactiveObjects = [];
    this.hoveredObject = null;

    // Desktop controls state
    this.isDesktopMode = true;
    this.keys = {};
    this.isPointerLocked = false;
    this.moveSpeed = 3.2;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.crouched = false;

    // VR Wrist / Floating HUD
    this.vrHudMesh = null;
    this.vrHudCanvas = null;
    this.vrHudCtx = null;
    this.vrHudTex = null;

    // Event callbacks
    this.onInteract = null;
    this.onSqueeze = null;

    this.initVRControllers();
    this.initDesktopControls();
    this.initVRHUD();
  }

  setInteractiveObjects(list) {
    this.interactiveObjects = list;
  }

  // --- Meta Quest 3S Controllers ---
  initVRControllers() {
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.userData.index = i;
      controller.userData.isSelecting = false;
      controller.userData.isSqueezing = false;

      // Laser Ray Line
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -4.0),
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.6,
      });
      const ray = new THREE.Line(rayGeo, rayMat);
      ray.name = 'ray';
      controller.add(ray);

      // Reticle pointer dot
      const reticleGeo = new THREE.RingGeometry(0.012, 0.02, 16);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
      });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.z = -2.0;
      reticle.name = 'reticle';
      controller.add(reticle);

      // Visual Controller Model / Hand representation
      const grip = this.renderer.xr.getControllerGrip(i);
      const handMesh = this.createControllerMesh(i === 0 ? 'Left' : 'Right');
      grip.add(handMesh);

      this.cameraRig.add(controller);
      this.cameraRig.add(grip);

      this.controllers.push(controller);
      this.controllerGrips.push(grip);

      // Trigger Button (Select)
      controller.addEventListener('selectstart', () => this.handleSelectStart(controller));
      controller.addEventListener('selectend', () => this.handleSelectEnd(controller));

      // Grip Button (Squeeze)
      controller.addEventListener('squeezestart', () => this.handleSqueezeStart(controller));
      controller.addEventListener('squeezeend', () => this.handleSqueezeEnd(controller));
    }
  }

  createControllerMesh(side) {
    const group = new THREE.Group();
    // Quest Touch Plus controller ringless handle
    const handleGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.12, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, mat);
    handle.rotation.x = Math.PI / 4;
    handle.position.set(0, -0.03, 0.02);
    group.add(handle);

    // Thumb rest dome
    const topGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.set(0, 0.02, 0);
    group.add(top);

    // Accent status light
    const led = new THREE.Mesh(
      new THREE.SphereGeometry(0.004, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    led.position.set(0, 0.035, -0.01);
    group.add(led);

    return group;
  }

  // --- Interaction Handlers ---
  handleSelectStart(controller) {
    controller.userData.isSelecting = true;
    this.pulseHaptic(controller, 0.6, 50);

    // If holding fire extinguisher, squeeze trigger to spray!
    if (this.grabbedObject && this.grabbedObject.userData.type === 'extinguisher') {
      this.grabbedObject.userData.setSqueeze(true);
      if (this.onSqueeze) this.onSqueeze(true, this.grabbedObject);
      return;
    }

    // Raycast target check
    const target = this.getRaycastHit(controller);
    if (target && this.onInteract) {
      this.onInteract(target, 'trigger', controller);
    }
  }

  handleSelectEnd(controller) {
    controller.userData.isSelecting = false;
    if (this.grabbedObject && this.grabbedObject.userData.type === 'extinguisher') {
      this.grabbedObject.userData.setSqueeze(false);
      if (this.onSqueeze) this.onSqueeze(false, this.grabbedObject);
    }
  }

  handleSqueezeStart(controller) {
    controller.userData.isSqueezing = true;
    this.pulseHaptic(controller, 0.8, 60);

    // Check if we are pointing at or close to a grabbable object
    const hit = this.getRaycastHit(controller, 3.5);
    if (hit) {
      let grabbable = hit;
      while (grabbable && !grabbable.userData.isGrabbable && grabbable.parent) {
        grabbable = grabbable.parent;
      }

      if (grabbable && grabbable.userData.isGrabbable) {
        this.grabObject(grabbable, controller);
        return;
      }
    }

    // Direct proximity grab (within 0.35m of controller)
    const ctrlPos = new THREE.Vector3();
    controller.getWorldPosition(ctrlPos);

    for (const obj of this.interactiveObjects) {
      if (obj.userData.isGrabbable) {
        const objPos = new THREE.Vector3();
        obj.getWorldPosition(objPos);
        if (ctrlPos.distanceTo(objPos) < 0.45) {
          this.grabObject(obj, controller);
          break;
        }
      }
    }
  }

  handleSqueezeEnd(controller) {
    controller.userData.isSqueezing = false;
    if (this.grabbedController === controller) {
      this.releaseObject();
    }
  }

  grabObject(obj, controller) {
    this.grabbedObject = obj;
    this.grabbedController = controller;
    this.pulseHaptic(controller, 0.9, 80);

    // Save initial relative transform
    const ctrlWorldPos = new THREE.Vector3();
    const ctrlWorldQuat = new THREE.Quaternion();
    controller.getWorldPosition(ctrlWorldPos);
    controller.getWorldQuaternion(ctrlWorldQuat);

    const objWorldPos = new THREE.Vector3();
    const objWorldQuat = new THREE.Quaternion();
    obj.getWorldPosition(objWorldPos);
    obj.getWorldQuaternion(objWorldQuat);

    // Offset in controller local space
    const invCtrlQuat = ctrlWorldQuat.clone().invert();
    this.grabOffset = objWorldPos.clone().sub(ctrlWorldPos).applyQuaternion(invCtrlQuat);
    this.grabQuatOffset = invCtrlQuat.multiply(objWorldQuat);
  }

  releaseObject() {
    if (this.grabbedObject) {
      if (this.grabbedObject.userData.type === 'extinguisher') {
        this.grabbedObject.userData.setSqueeze(false);
        if (this.onSqueeze) this.onSqueeze(false, this.grabbedObject);
      }
      this.grabbedObject = null;
      this.grabbedController = null;
    }
  }

  getRaycastHit(controller, maxDistance = 5.0) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    raycaster.far = maxDistance;

    const intersects = raycaster.intersectObjects(this.interactiveObjects, true);
    if (intersects.length > 0) {
      return intersects[0].object;
    }
    return null;
  }

  pulseHaptic(controller, intensity = 0.5, durationMs = 40) {
    if (!controller) return;
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (source.gamepad && source.gamepad.hapticActuators && source.gamepad.hapticActuators.length > 0) {
        try {
          source.gamepad.hapticActuators[0].pulse(intensity, durationMs);
        } catch (e) {}
      }
    }
  }

  // --- In-VR Floating / Wrist HUD Panel ---
  initVRHUD() {
    this.vrHudCanvas = document.createElement('canvas');
    this.vrHudCanvas.width = 512;
    this.vrHudCanvas.height = 256;
    this.vrHudCtx = this.vrHudCanvas.getContext('2d');

    this.vrHudTex = new THREE.CanvasTexture(this.vrHudCanvas);
    const hudMat = new THREE.MeshBasicMaterial({
      map: this.vrHudTex,
      transparent: true,
      depthWrite: false,
    });
    const hudGeo = new THREE.PlaneGeometry(0.36, 0.18);
    this.vrHudMesh = new THREE.Mesh(hudGeo, hudMat);

    // Mount to left controller (wrist HUD)
    this.controllers[0].add(this.vrHudMesh);
    this.vrHudMesh.position.set(0.04, 0.09, -0.06);
    this.vrHudMesh.rotation.set(-Math.PI / 4, 0, Math.PI / 8);

    this.updateVRHUD('EMERGENCY SIMULATOR', 'Select Scenario on Console', 'Use Ray + Trigger to interact');
  }

  updateVRHUD(title, objective, stepHint) {
    const ctx = this.vrHudCtx;
    if (!ctx) return;

    ctx.clearRect(0, 0, 512, 256);

    // Background glass plate
    ctx.fillStyle = 'rgba(7, 10, 18, 0.88)';
    ctx.roundRect(10, 10, 492, 236, 16);
    ctx.fill();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(title || 'EMERGENCY PROTOCOL', 30, 55);

    // Objective
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(objective || '', 30, 105);

    // Step hint
    ctx.fillStyle = '#00f0ff';
    ctx.font = '18px monospace';
    ctx.fillText(stepHint || '', 30, 160);

    // Controller legend
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px sans-serif';
    ctx.fillText('• Grip: Grab items   • Trigger: Squeeze / Actuate', 30, 215);

    this.vrHudTex.needsUpdate = true;
  }

  // --- Desktop / Keyboard & Mouse Controls ---
  initDesktopControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyC') {
        this.crouched = !this.crouched;
        this.camera.position.y = this.crouched ? 0.6 : 1.6;
      }
      if (e.code === 'KeyE') {
        this.handleDesktopInteract();
      }
      if (e.code === 'Space') {
        // Space to toggle extinguisher squeeze on desktop
        if (this.grabbedObject && this.grabbedObject.userData.type === 'extinguisher') {
          const isSq = !this.grabbedObject.userData.isSqueezing;
          this.grabbedObject.userData.setSqueeze(isSq);
          if (this.onSqueeze) this.onSqueeze(isSq, this.grabbedObject);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse drag rotation when pointer lock is not active
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    window.addEventListener('mousedown', (e) => {
      if (this.renderer.xr.isPresenting) return;
      if (e.target.tagName === 'CANVAS') {
        isMouseDown = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.renderer.xr.isPresenting) return;
      if (!isMouseDown && !this.isPointerLocked) return;

      const movementX = this.isPointerLocked ? e.movementX : (e.clientX - prevMouseX);
      const movementY = this.isPointerLocked ? e.movementY : (e.clientY - prevMouseY);

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= movementX * 0.003;
      this.euler.x -= movementY * 0.003;
      this.euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    window.addEventListener('click', (e) => {
      if (this.renderer.xr.isPresenting) return;
      if (e.target.tagName === 'CANVAS') {
        this.handleDesktopInteract();
      }
    });
  }

  handleDesktopInteract() {
    // Center screen raycast
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = 4.0;

    const hits = raycaster.intersectObjects(this.interactiveObjects, true);
    if (hits.length > 0) {
      let target = hits[0].object;
      let grabbable = target;
      while (grabbable && !grabbable.userData.isGrabbable && grabbable.parent) {
        grabbable = grabbable.parent;
      }

      if (grabbable && grabbable.userData.isGrabbable) {
        if (this.grabbedObject === grabbable) {
          // Toggle release or toggle squeeze
          if (grabbable.userData.type === 'extinguisher') {
            const isSq = !grabbable.userData.isSqueezing;
            grabbable.userData.setSqueeze(isSq);
            if (this.onSqueeze) this.onSqueeze(isSq, grabbable);
          } else {
            this.releaseObject();
          }
        } else {
          this.grabObjectDesktop(grabbable);
        }
        return;
      }

      if (this.onInteract) {
        this.onInteract(target, 'desktop', null);
      }
    }
  }

  grabObjectDesktop(obj) {
    this.grabbedObject = obj;
    // Attach to front of camera view
    this.camera.add(obj);
    obj.position.set(0.24, -0.25, -0.65);
    obj.rotation.set(0, Math.PI, 0);
  }

  // --- Frame Update ---
  update(delta) {
    const isXR = this.renderer.xr.isPresenting;

    if (isXR) {
      this.updateXRThumbsticks(delta);
      this.updateGrabbedObjectInVR();
      this.updateXRRayVisuals();
    } else {
      this.updateDesktopMovement(delta);
    }
  }

  updateGrabbedObjectInVR() {
    if (this.grabbedObject && this.grabbedController) {
      const ctrlWorldPos = new THREE.Vector3();
      const ctrlWorldQuat = new THREE.Quaternion();
      this.grabbedController.getWorldPosition(ctrlWorldPos);
      this.grabbedController.getWorldQuaternion(ctrlWorldQuat);

      const targetPos = ctrlWorldPos.add(this.grabOffset.clone().applyQuaternion(ctrlWorldQuat));
      const targetQuat = ctrlWorldQuat.clone().multiply(this.grabQuatOffset);

      this.grabbedObject.position.lerp(targetPos, 0.4);
      this.grabbedObject.quaternion.slerp(targetQuat, 0.4);
    }
  }

  updateXRThumbsticks(delta) {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source.gamepad || !source.gamepad.axes) continue;
      const axes = source.gamepad.axes;

      if (source.handedness === 'left') {
        // Left thumbstick: Smooth Locomotion (move forward/back/strafe)
        const deadzone = 0.15;
        const x = Math.abs(axes[2]) > deadzone ? axes[2] : 0;
        const y = Math.abs(axes[3]) > deadzone ? axes[3] : 0;

        if (x !== 0 || y !== 0) {
          const forward = new THREE.Vector3();
          this.camera.getWorldDirection(forward);
          forward.y = 0;
          forward.normalize();

          const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

          const move = new THREE.Vector3()
            .addScaledVector(forward, -y * this.moveSpeed * delta)
            .addScaledVector(right, x * this.moveSpeed * delta);

          this.cameraRig.position.add(move);
        }
      } else if (source.handedness === 'right') {
        // Right thumbstick: Snap Turn (45 degrees)
        const snapDeadzone = 0.65;
        const turnAxis = axes[2];

        if (Math.abs(turnAxis) > snapDeadzone) {
          if (!source.userData) source.userData = {};
          if (!source.userData.hasSnapped) {
            source.userData.hasSnapped = true;
            const turnAngle = turnAxis > 0 ? -Math.PI / 4 : Math.PI / 4;
            this.cameraRig.rotation.y += turnAngle;
            this.pulseHaptic(this.controllers[1], 0.4, 25);
          }
        } else {
          if (source.userData) source.userData.hasSnapped = false;
        }
      }
    }
  }

  updateXRRayVisuals() {
    this.controllers.forEach((controller) => {
      const ray = controller.getObjectByName('ray');
      const reticle = controller.getObjectByName('reticle');
      if (!ray || !reticle) return;

      const hit = this.getRaycastHit(controller, 5.0);
      if (hit) {
        reticle.visible = true;
        ray.material.color.setHex(0x10b981); // Green on hover
      } else {
        reticle.visible = true;
        ray.material.color.setHex(0x00f0ff); // Cyan default
      }
    });
  }

  updateDesktopMovement(delta) {
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.cameraRig.position.addScaledVector(moveDir, this.moveSpeed * delta);
    }
  }
}
