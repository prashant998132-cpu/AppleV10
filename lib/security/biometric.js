'use client';
// lib/security/biometric.js — JARVIS Biometric Lock
// ══════════════════════════════════════════════════════
// WebAuthn API — fingerprint/face ID browser-native
// Works on: Android Chrome, iOS Safari 16+
// No server needed — passkey stored on device only
// ══════════════════════════════════════════════════════

const CRED_KEY = 'jarvis_biometric_cred';
const APP_NAME = 'JARVIS AI';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'apple-v10.vercel.app';

// ─── CHECK SUPPORT ────────────────────────────────────
export function isBiometricSupported() {
  return typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
}

export async function isBiometricAvailable() {
  if (!isBiometricSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricRegistered() {
  try {
    return !!localStorage.getItem(CRED_KEY);
  } catch {
    return false;
  }
}

// ─── REGISTER FINGERPRINT ─────────────────────────────
export async function registerBiometric(userName = 'Pranshu') {
  if (!await isBiometricAvailable()) {
    throw new Error('Biometric not available on this device');
  }

  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const options = {
    challenge,
    rp: { name: APP_NAME, id: RP_ID },
    user: {
      id: userId,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      { alg: -7,   type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // device fingerprint/face
      userVerification: 'required',
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: 'none',
  };

  const credential = await navigator.credentials.create({ publicKey: options });

  if (!credential) throw new Error('Registration cancelled');

  // Save credential ID for future auth
  const credData = {
    id: credential.id,
    rawId: Array.from(new Uint8Array(credential.rawId)),
    type: credential.type,
    registeredAt: new Date().toISOString(),
    userName,
  };

  localStorage.setItem(CRED_KEY, JSON.stringify(credData));
  return true;
}

// ─── AUTHENTICATE ─────────────────────────────────────
export async function authenticateBiometric() {
  if (!isBiometricRegistered()) {
    throw new Error('Biometric not registered. Pehle setup karo.');
  }

  const credData = JSON.parse(localStorage.getItem(CRED_KEY));

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const options = {
    challenge,
    rpId: RP_ID,
    allowCredentials: [{
      id: new Uint8Array(credData.rawId),
      type: 'public-key',
      transports: ['internal'],
    }],
    userVerification: 'required',
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({ publicKey: options });

  if (!assertion) throw new Error('Authentication failed');

  // Save last auth time
  localStorage.setItem('jarvis_last_auth', Date.now().toString());
  return true;
}

// ─── REMOVE BIOMETRIC ─────────────────────────────────
export function removeBiometric() {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem('jarvis_last_auth');
  localStorage.removeItem('jarvis_biometric_lock');
}

// ─── LOCK / UNLOCK APP ────────────────────────────────
export function isAppLocked() {
  const lockEnabled = localStorage.getItem('jarvis_biometric_lock') === 'true';
  if (!lockEnabled) return false;
  const lastAuth = parseInt(localStorage.getItem('jarvis_last_auth') || '0');
  const lockAfterMs = 5 * 60 * 1000; // 5 min of inactivity = lock
  return (Date.now() - lastAuth) > lockAfterMs;
}

export function setBiometricLockEnabled(enabled) {
  localStorage.setItem('jarvis_biometric_lock', enabled ? 'true' : 'false');
}

export function isBiometricLockEnabled() {
  return localStorage.getItem('jarvis_biometric_lock') === 'true';
}

export function touchActivity() {
  localStorage.setItem('jarvis_last_auth', Date.now().toString());
}
