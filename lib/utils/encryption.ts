// Client-side encryption utilities using Web Crypto API
// AES-256-GCM for message encryption
// RSA-OAEP for key exchange

export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey(
    key.type === 'secret' ? 'raw' : 'spki',
    key
  );
  return arrayBufferToBase64(exported);
}

export async function importAESKey(keyData: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'raw',
    buffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate a random encryption key for a conversation
export async function generateConversationKey(): Promise<string> {
  const key = await generateAESKey();
  return await exportKey(key);
}

// Encrypt a key with RSA public key (for key exchange)
export async function encryptKeyWithRSA(
  aesKey: string,
  publicKey: CryptoKey
): Promise<string> {
  const keyBuffer = base64ToArrayBuffer(aesKey);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    keyBuffer
  );
  return arrayBufferToBase64(encrypted);
}

// Decrypt a key with RSA private key
export async function decryptKeyWithRSA(
  encryptedKey: string,
  privateKey: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedBuffer
  );
  return arrayBufferToBase64(decrypted);
}

