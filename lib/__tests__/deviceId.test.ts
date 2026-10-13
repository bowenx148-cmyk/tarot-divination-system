import { beforeEach, describe, expect, it } from "vitest";
import { getOrCreateDeviceId } from "@/lib/deviceId";

describe("R3 deviceId 设备标识", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("首次生成 UUID 并持久化到 localStorage", () => {
    const id = getOrCreateDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(localStorage.getItem("tarot-device-id")).toBe(id);
  });

  it("再次调用返回同一值（不重复生成）", () => {
    const first = getOrCreateDeviceId();
    const second = getOrCreateDeviceId();
    expect(second).toBe(first);
  });
});
