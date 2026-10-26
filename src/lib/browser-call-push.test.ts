import { describe, expect, it } from "vitest";
import { waitForActiveServiceWorker } from "./browser-call-push";

class WorkerState extends EventTarget {
  state: ServiceWorkerState = "installing";
}

class RegistrationState extends EventTarget {
  active: WorkerState | null = null;
  installing: WorkerState | null;
  waiting: WorkerState | null = null;

  constructor(worker: WorkerState) {
    super();
    this.installing = worker;
  }
}

describe("browser call push registration", () => {
  it("waits for the exact newly registered worker to activate", async () => {
    const worker = new WorkerState();
    const registration = new RegistrationState(worker);
    const ready = waitForActiveServiceWorker(
      registration as unknown as ServiceWorkerRegistration,
      1_000,
    );

    worker.state = "activated";
    registration.active = worker;
    worker.dispatchEvent(new Event("statechange"));

    await expect(ready).resolves.toBe(registration);
  });

  it("rejects a redundant first installation instead of subscribing", async () => {
    const worker = new WorkerState();
    const registration = new RegistrationState(worker);
    const ready = waitForActiveServiceWorker(
      registration as unknown as ServiceWorkerRegistration,
      1_000,
    );

    worker.state = "redundant";
    worker.dispatchEvent(new Event("statechange"));

    await expect(ready).rejects.toThrow("installation was rejected");
  });
});