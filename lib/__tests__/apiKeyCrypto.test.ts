import { describe, expect, it } from "vitest";
import {
  ApiKeyDecryptError,
  decryptApiKey,
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from "@/lib/apiKeyCrypto";

describe("R1-B apiKeyCrypto 加密存储", () => {
  it("加密→解密往返", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const payload = await encryptApiKey("sk-test-12345", key);
    expect(await decryptApiKey(payload, key)).toBe("sk-test-12345");
  });

  it("错误密钥解密认证失败", async () => {
    const keyA = await importSessionKey(await generateSessionKey());
    const keyB = await importSessionKey(await generateSessionKey());
    const payload = await encryptApiKey("sk-test", keyA);
    await expect(decryptApiKey(payload, keyB)).rejects.toThrow(
      ApiKeyDecryptError,
    );
  });

  it("同明文两次加密密文不同（随机 iv）", async () => {
    const key = await importSessionKey(await generateSessionKey());
    const p1 = await encryptApiKey("sk-same", key);
    const p2 = await encryptApiKey("sk-same", key);
    expect(p1).not.toBe(p2);
  });

  it("密钥导出→导入后解密成功（会话恢复场景）", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const payload = await encryptApiKey("sk-persist", key);
    // 模拟跨刷新：仅持有 base64 密钥与密文
    const recoveredKey = await importSessionKey(b64);
    expect(await decryptApiKey(payload, recoveredKey)).toBe("sk-persist");
  });

  it("篡改密文抛 ApiKeyDecryptError", async () => {
    const key = await importSessionKey(await generateSessionKey());
    const payload = await encryptApiKey("sk-tamper", key);
    const tampered = payload.slice(0, -4) + "AAAA";
    await expect(decryptApiKey(tampered, key)).rejects.toThrow(
      ApiKeyDecryptError,
    );
  });

  it("非 base64 输入抛 ApiKeyDecryptError", async () => {
    const key = await importSessionKey(await generateSessionKey());
    await expect(decryptApiKey("!!!not-base64!!!", key)).rejects.toThrow(
      ApiKeyDecryptError,
    );
  });

  it("密文不包含明文内容（base64 解码后不含原文）", async () => {
    const key = await importSessionKey(await generateSessionKey());
    const payload = await encryptApiKey("sk-secret-value", key);
    expect(payload).not.toContain("sk-secret-value");
  });
});
