import * as Crypto from "expo-crypto";
import { getOrCreateTxnCryptoKey } from "@/lib/auth-storage";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VERSION = "v1";

const hexToBytes = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

const bytesToHex = (bytes: Uint8Array) => {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
};

const createKeystream = async (key: string, nonce: string, byteLength: number) => {
  const stream = new Uint8Array(byteLength);
  let offset = 0;
  let counter = 0;

  while (offset < byteLength) {
    const digestHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${nonce}:${counter}`,
    );
    const block = hexToBytes(digestHex);
    const chunk = Math.min(block.length, byteLength - offset);
    stream.set(block.slice(0, chunk), offset);
    offset += chunk;
    counter += 1;
  }

  return stream;
};

export const encryptSensitive = async (plainText: string) => {
  if (!plainText) return "";
  const key = await getOrCreateTxnCryptoKey();
  const nonce = Crypto.randomUUID();
  const plainBytes = encoder.encode(plainText);
  const stream = await createKeystream(key, nonce, plainBytes.length);
  const cipherBytes = new Uint8Array(plainBytes.length);

  for (let i = 0; i < plainBytes.length; i += 1) {
    cipherBytes[i] = plainBytes[i] ^ stream[i];
  }

  return `${VERSION}:${nonce}:${bytesToHex(cipherBytes)}`;
};

export const decryptSensitive = async (cipherText: string) => {
  if (!cipherText) return "";
  if (!cipherText.startsWith(`${VERSION}:`)) return cipherText;

  const [version, nonce, cipherHex] = cipherText.split(":");
  if (version !== VERSION || !nonce || !cipherHex) return "";

  const key = await getOrCreateTxnCryptoKey();
  const cipherBytes = hexToBytes(cipherHex);
  const stream = await createKeystream(key, nonce, cipherBytes.length);
  const plainBytes = new Uint8Array(cipherBytes.length);

  for (let i = 0; i < cipherBytes.length; i += 1) {
    plainBytes[i] = cipherBytes[i] ^ stream[i];
  }

  return decoder.decode(plainBytes);
};

