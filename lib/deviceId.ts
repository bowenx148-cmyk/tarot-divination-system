// 设备标识（规格 R3）：无登录系统下免费试用的用户识别。
// 非敏感数据，明文存 localStorage；清除后生成新 id（尽力而为，见决策 D9）。

const DEVICE_ID_KEY = "tarot-device-id";

// 生成 UUID v4：crypto.randomUUID 仅在 HTTPS/localhost 等安全上下文可用，
// 公网 IP 直连（HTTP）下为 undefined，会导致设备标识生成失败。
// 改用 crypto.getRandomValues（HTTP 下同样可用）手写 UUID，保证 HTTP 部署也能正常生成设备标识。
function generateDeviceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
