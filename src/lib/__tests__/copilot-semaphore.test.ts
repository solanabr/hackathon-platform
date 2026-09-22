import { describe, it, expect } from "vitest";
import { Semaphore, SemaphoreTimeout } from "@/lib/copilot/semaphore";

describe("Semaphore", () => {
  it("lets N through and queues the rest in order", async () => {
    const s = new Semaphore(2);
    const r1 = await s.acquire(100);
    const r2 = await s.acquire(100);
    expect(s.inFlight).toBe(2);
    const order: number[] = [];
    const p3 = s.acquire(1000).then((r) => { order.push(3); return r; });
    const p4 = s.acquire(1000).then((r) => { order.push(4); return r; });
    r1();
    const r3 = await p3;
    expect(order).toEqual([3]);
    r2(); r3();
    const r4 = await p4;
    expect(order).toEqual([3, 4]);
    r4();
    expect(s.inFlight).toBe(0);
  });

  it("times out a waiter", async () => {
    const s = new Semaphore(1);
    const r = await s.acquire(10);
    await expect(s.acquire(20)).rejects.toBeInstanceOf(SemaphoreTimeout);
    r();
  });

  it("releasing twice is a no-op", async () => {
    const s = new Semaphore(1);
    const r = await s.acquire(10);
    r(); r();
    expect(s.inFlight).toBe(0);
  });
});
