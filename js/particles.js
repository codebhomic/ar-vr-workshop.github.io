import * as THREE from 'three';

/**
 * High-performance GPU Particle Systems for WebVR on Meta Quest 3S
 */

export class FireParticleSystem {
  constructor(scene, origin = new THREE.Vector3(0, 0, 0), count = 250) {
    this.scene = scene;
    this.origin = origin.clone();
    this.count = count;
    this.intensity = 1.0; // 1.0 = fully burning, 0 = extinguished

    // Particle geometries & attributes
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, positions, colors, sizes, life, maxLife, velocities, true);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom circular soft particle texture generated on canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 200, 50, 0.8)');
    grad.addColorStop(0.7, 'rgba(255, 80, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.positions = positions;
    this.colors = colors;
    this.sizes = sizes;
    this.life = life;
    this.maxLife = maxLife;
    this.velocities = velocities;

    // Dynamic point light for realistic fire flicker
    this.light = new THREE.PointLight(0xff6600, 2.5, 6.0);
    this.light.position.copy(this.origin).add(new THREE.Vector3(0, 0.4, 0));
    this.scene.add(this.light);
  }

  resetParticle(i, positions, colors, sizes, life, maxLife, velocities, initial = false) {
    const idx = i * 3;
    const spread = 0.25 * this.intensity;

    positions[idx] = this.origin.x + (Math.random() - 0.5) * spread;
    positions[idx + 1] = this.origin.y + (initial ? Math.random() * 0.5 : 0);
    positions[idx + 2] = this.origin.z + (Math.random() - 0.5) * spread;

    velocities[idx] = (Math.random() - 0.5) * 0.25;
    velocities[idx + 1] = 0.7 + Math.random() * 0.8;
    velocities[idx + 2] = (Math.random() - 0.5) * 0.25;

    maxLife[i] = 0.5 + Math.random() * 0.6;
    life[i] = initial ? Math.random() * maxLife[i] : 0;
    sizes[i] = (0.2 + Math.random() * 0.25) * this.intensity;

    colors[idx] = 1.0;
    colors[idx + 1] = 0.8;
    colors[idx + 2] = 0.2;
  }

  update(delta) {
    if (this.intensity <= 0.001) {
      this.points.visible = false;
      this.light.intensity = 0;
      return;
    }
    this.points.visible = true;

    const count = this.count;
    const pos = this.positions;
    const col = this.colors;
    const sz = this.sizes;
    const lf = this.life;
    const maxLf = this.maxLife;
    const vel = this.velocities;

    for (let i = 0; i < count; i++) {
      lf[i] += delta;
      if (lf[i] >= maxLf[i]) {
        this.resetParticle(i, pos, col, sz, lf, maxLf, vel);
        continue;
      }

      const idx = i * 3;
      const progress = lf[i] / maxLf[i];

      pos[idx] += vel[idx] * delta;
      pos[idx + 1] += vel[idx + 1] * delta;
      pos[idx + 2] += vel[idx + 2] * delta;

      // Color shifts: Bright yellow/white -> fiery orange -> dark red/black
      if (progress < 0.3) {
        col[idx] = 1.0;
        col[idx + 1] = 0.9 - progress * 0.8;
        col[idx + 2] = 0.3 - progress;
      } else if (progress < 0.7) {
        col[idx] = 1.0 - (progress - 0.3) * 0.6;
        col[idx + 1] = 0.4 - (progress - 0.3) * 0.8;
        col[idx + 2] = 0.05;
      } else {
        col[idx] = Math.max(0, 0.4 - (progress - 0.7) * 1.2);
        col[idx + 1] = 0.02;
        col[idx + 2] = 0.01;
      }

      sz[i] = (0.35 * (1 - progress * 0.5)) * this.intensity;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;

    // Flicker light
    const flicker = 0.8 + Math.random() * 0.4;
    this.light.intensity = 2.5 * this.intensity * flicker;
    this.light.color.setHex(this.intensity > 0.4 ? 0xff6600 : 0xff3300);
  }

  setIntensity(val) {
    this.intensity = Math.max(0, Math.min(1, val));
  }

  dispose() {
    this.scene.remove(this.points);
    this.scene.remove(this.light);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

/**
 * Smoke Particle System
 */
export class SmokeParticleSystem {
  constructor(scene, origin = new THREE.Vector3(0, 0.4, 0), count = 120) {
    this.scene = scene;
    this.origin = origin.clone();
    this.count = count;
    this.intensity = 1.0;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, positions, colors, sizes, life, maxLife, velocities, true);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Soft puff smoke texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(80, 80, 85, 0.7)');
    grad.addColorStop(0.5, 'rgba(50, 50, 55, 0.35)');
    grad.addColorStop(1, 'rgba(30, 30, 30, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.8,
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
      vertexColors: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.positions = positions;
    this.colors = colors;
    this.sizes = sizes;
    this.life = life;
    this.maxLife = maxLife;
    this.velocities = velocities;
  }

  resetParticle(i, positions, colors, sizes, life, maxLife, velocities, initial = false) {
    const idx = i * 3;
    const spread = 0.3;

    positions[idx] = this.origin.x + (Math.random() - 0.5) * spread;
    positions[idx + 1] = this.origin.y + (initial ? Math.random() * 1.5 : 0.2);
    positions[idx + 2] = this.origin.z + (Math.random() - 0.5) * spread;

    velocities[idx] = (Math.random() - 0.5) * 0.15;
    velocities[idx + 1] = 0.4 + Math.random() * 0.4;
    velocities[idx + 2] = (Math.random() - 0.5) * 0.15;

    maxLife[i] = 2.0 + Math.random() * 1.8;
    life[i] = initial ? Math.random() * maxLife[i] : 0;
    sizes[i] = 0.3;

    const shade = 0.2 + Math.random() * 0.15;
    colors[idx] = shade;
    colors[idx + 1] = shade;
    colors[idx + 2] = shade;
  }

  update(delta) {
    if (this.intensity <= 0.001) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;

    const count = this.count;
    const pos = this.positions;
    const sz = this.sizes;
    const lf = this.life;
    const maxLf = this.maxLife;
    const vel = this.velocities;

    for (let i = 0; i < count; i++) {
      lf[i] += delta;
      if (lf[i] >= maxLf[i]) {
        this.resetParticle(i, pos, this.colors, sz, lf, maxLf, vel);
        continue;
      }

      const idx = i * 3;
      pos[idx] += vel[idx] * delta;
      pos[idx + 1] += vel[idx + 1] * delta;
      pos[idx + 2] += vel[idx + 2] * delta;

      // Expand as smoke climbs
      const prog = lf[i] / maxLf[i];
      sz[i] = (0.4 + prog * 0.9) * this.intensity;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
  }

  setIntensity(val) {
    this.intensity = Math.max(0, Math.min(1, val));
    this.points.material.opacity = 0.5 * this.intensity;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

/**
 * Pressurized Fire Extinguisher Foam/CO2 Powder Spray Cone
 */
export class ExtinguisherSpraySystem {
  constructor(scene, count = 350) {
    this.scene = scene;
    this.count = count;
    this.active = false;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const life = new Float32Array(count);
    const maxLife = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      life[i] = 999; // inactive initially
      maxLife[i] = 0.35 + Math.random() * 0.25;
      sizes[i] = 0.15;
      colors[i * 3] = 0.92;
      colors[i * 3 + 1] = 0.96;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Crisp pressurized powder texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(230, 245, 255, 0.6)');
    grad.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.2,
      map: texture,
      transparent: true,
      blending: THREE.NormalBlending,
      opacity: 0.8,
      depthWrite: false,
      vertexColors: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.visible = false;
    this.scene.add(this.points);

    this.positions = positions;
    this.sizes = sizes;
    this.life = life;
    this.maxLife = maxLife;
    this.velocities = velocities;

    this.nozzlePosition = new THREE.Vector3();
    this.nozzleDirection = new THREE.Vector3(0, 0, -1);
    this.sprayRange = 4.5; // effective meters
  }

  trigger(active, nozzlePos, nozzleDir) {
    this.active = active;
    this.points.visible = active;
    if (nozzlePos) this.nozzlePosition.copy(nozzlePos);
    if (nozzleDir) this.nozzleDirection.copy(nozzleDir).normalize();
  }

  update(delta, nozzlePos, nozzleDir) {
    if (nozzlePos) this.nozzlePosition.copy(nozzlePos);
    if (nozzleDir) this.nozzleDirection.copy(nozzleDir).normalize();

    if (!this.active) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;

    const count = this.count;
    const pos = this.positions;
    const sz = this.sizes;
    const lf = this.life;
    const maxLf = this.maxLife;
    const vel = this.velocities;
    const dir = this.nozzleDirection;
    const origin = this.nozzlePosition;

    // Build perpendicular cone spread vectors
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();

    const speed = 9.0; // high exit velocity

    for (let i = 0; i < count; i++) {
      lf[i] += delta;
      if (lf[i] >= maxLf[i]) {
        // Respawn particle at nozzle
        lf[i] = 0;
        const idx = i * 3;
        pos[idx] = origin.x;
        pos[idx + 1] = origin.y;
        pos[idx + 2] = origin.z;

        // Cone dispersion angle
        const angle = Math.random() * Math.PI * 2;
        const spreadRadius = Math.random() * 0.22;
        const spreadX = Math.cos(angle) * spreadRadius;
        const spreadY = Math.sin(angle) * spreadRadius;

        const pVel = new THREE.Vector3()
          .copy(dir)
          .multiplyScalar(speed * (0.8 + Math.random() * 0.4))
          .addScaledVector(right, spreadX * speed)
          .addScaledVector(realUp, spreadY * speed);

        vel[idx] = pVel.x;
        vel[idx + 1] = pVel.y;
        vel[idx + 2] = pVel.z;
        sz[i] = 0.08;
      } else {
        const idx = i * 3;
        pos[idx] += vel[idx] * delta;
        pos[idx + 1] += vel[idx + 1] * delta;
        pos[idx + 2] += vel[idx + 2] * delta;

        // Gravity drag + expansion
        vel[idx + 1] -= 1.8 * delta;
        const prog = lf[i] / maxLf[i];
        sz[i] = 0.08 + prog * 0.35;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
  }

  // Check if spray stream is hitting the target point (base of fire)
  isHittingTarget(targetPos, targetRadius = 0.9) {
    if (!this.active) return false;

    // Vector from nozzle to target
    const toTarget = new THREE.Vector3().subVectors(targetPos, this.nozzlePosition);
    const dist = toTarget.length();

    if (dist > this.sprayRange) return false;

    // Dot product to check angle
    toTarget.normalize();
    const alignment = this.nozzleDirection.dot(toTarget);

    // If within ~25 degree cone
    if (alignment > 0.88) {
      return true;
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

/**
 * Electrical Sparks System (for broken breaker / exposed wires)
 */
export class SparkParticleSystem {
  constructor(scene, origin = new THREE.Vector3(0, 0, 0), count = 60) {
    this.scene = scene;
    this.origin = origin.clone();
    this.count = count;
    this.active = true;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      life[i] = 999;
      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.positions = positions;
    this.velocities = velocities;
    this.life = life;
    this.colors = colors;
    this.burstTimer = 0;
  }

  update(delta) {
    if (!this.active) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;

    this.burstTimer -= delta;
    if (this.burstTimer <= 0) {
      this.triggerBurst();
      this.burstTimer = 0.4 + Math.random() * 1.2;
    }

    const count = this.count;
    const pos = this.positions;
    const vel = this.velocities;
    const lf = this.life;

    for (let i = 0; i < count; i++) {
      if (lf[i] < 0.3) {
        lf[i] += delta;
        const idx = i * 3;
        pos[idx] += vel[idx] * delta;
        pos[idx + 1] += vel[idx + 1] * delta;
        pos[idx + 2] += vel[idx + 2] * delta;

        vel[idx + 1] -= 9.8 * delta; // Gravity
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  triggerBurst() {
    const burstCount = 15 + Math.floor(Math.random() * 25);
    const pos = this.positions;
    const vel = this.velocities;
    const lf = this.life;

    for (let i = 0; i < burstCount; i++) {
      const idx = i * 3;
      pos[idx] = this.origin.x;
      pos[idx + 1] = this.origin.y;
      pos[idx + 2] = this.origin.z;

      vel[idx] = (Math.random() - 0.5) * 4.0;
      vel[idx + 1] = Math.random() * 3.5;
      vel[idx + 2] = (Math.random() - 0.5) * 4.0;

      lf[i] = 0;
    }
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
