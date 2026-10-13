// API Key 加密存储（AES-GCM 256）
//
// 设计（规格 R1-B / 决策 D2、D8）：
// - 密文存 localStorage（持久层）；随机会话密钥以 base64 存 sessionStorage（会话层）；
// - 同一会话刷新：从 sessionStorage 导入密钥 → 解密恢复，无需重输；
// - 关闭浏览器：sessionStorage 清空 → 密文不可解，需重新输入 Key；
// - 边界：纯浏览器加密防"静态窃取"，不防 XSS（解密在客户端进行）——XSS 消毒是 R1-A 的核心。

export class ApiKeyDecryptError extends Error {
  constructor(message = "API Key 解密失败，可能已被篡改或会话已过期") {
    super(message);
    this.name = "ApiKeyDecryptError";
  }
}

const ALGORITHM: AesKeyAlgorithm = { name: "AES-GCM", length: 256 };
const IV_LENGTH = 12; // AES-GCM 推荐 96-bit IV

function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64decode(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** 生成随机会话密钥，返回 base64（调用方负责写入 sessionStorage） */
export async function generateSessionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(ALGORITHM, true, [
    "encrypt",
    "decrypt",
  ]);
  const raw = await crypto.subtle.exportKey("raw", key);
  return b64encode(new Uint8Array(raw));
}

/** 从 base64 导入会话密钥 */
export async function importSessionKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", b64decode(b64), ALGORITHM, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** 加密：base64(iv + ciphertext + authTag) */
export async function encryptApiKey(
  apiKey: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(apiKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return b64encode(combined);
}

/** 解密；认证失败或输入非法时抛 ApiKeyDecryptError */
export async function decryptApiKey(
  payload: string,
  key: CryptoKey,
): Promise<string> {
  try {
    const combined = b64decode(payload);
    if (combined.length <= IV_LENGTH) {
      throw new Error("payload too short");
    }
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new ApiKeyDecryptError();
  }
}
