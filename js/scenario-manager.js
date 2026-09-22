import { HubScenario } from './scenarios/hub-scenario.js';
import { FireScenario } from './scenarios/fire-scenario.js';
import { EarthquakeScenario } from './scenarios/earthquake-scenario.js';
import { CPRAEDScenario } from './scenarios/cpr-aed-scenario.js';

export class ScenarioManager {
  constructor(app) {
    this.app = app;
    this.currentScenario = null;
    this.scenarioClasses = {
      hub: HubScenario,
      fire: FireScenario,
      earthquake: EarthquakeScenario,
      cpr_aed: CPRAEDScenario,
    };
  }

  loadScenario(id) {
    // 1. Dispose old scenario
    if (this.currentScenario) {
      if (this.currentScenario.dispose) {
        this.currentScenario.dispose();
      }
      this.app.scene.remove(this.currentScenario.group);
      this.currentScenario = null;
    }

    // 2. Reset audio
    this.app.audio.stopAll();

    // 3. Reset player position
    this.app.cameraRig.position.set(0, 0, id === 'hub' ? 1.8 : 3.2);
    this.app.cameraRig.rotation.set(0, 0, 0);
    this.app.camera.position.set(0, 1.6, 0);
    this.app.camera.rotation.set(0, 0, 0);

    // Release any grabbed items
    this.app.controls.releaseObject();

    // 4. Instantiate new scenario
    const ScenarioClass = this.scenarioClasses[id] || this.scenarioClasses.hub;
    this.currentScenario = new ScenarioClass(this.app);
    this.app.scene.add(this.currentScenario.group);
    this.currentScenario.init();

    // 5. Update interactive objects list for Quest 3S controllers
    this.app.controls.setInteractiveObjects(this.currentScenario.interactiveObjects || []);

    // 6. Update UI
    this.app.ui.setScenario(this.currentScenario);

    console.log(`Loaded scenario: ${id}`);
  }

  restartCurrentScenario() {
    if (this.currentScenario) {
      this.loadScenario(this.currentScenario.id);
    }
  }

  returnToHub() {
    this.loadScenario('hub');
  }

  update(delta) {
    if (this.currentScenario && this.currentScenario.update) {
      this.currentScenario.update(delta);
    }
  }

  handleInteract(target, type, controller) {
    if (this.currentScenario && this.currentScenario.handleInteract) {
      this.currentScenario.handleInteract(target, type, controller);
    }
  }

  handleSqueeze(isSqueezing, object) {
    if (this.currentScenario && this.currentScenario.handleSqueeze) {
      this.currentScenario.handleSqueeze(isSqueezing, object);
    }
  }

  showDebrief(data) {
    this.app.ui.showDebriefModal(data);
  }
}
