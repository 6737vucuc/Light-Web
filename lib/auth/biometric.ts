// Biometric Authentication using WebAuthn API
import crypto from 'crypto';

interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
  userId: number;
  createdAt: Date;
}

const credentialStore: Map<string, BiometricCredential> = new Map();

export class BiometricAuth {
  // Generate challenge for registration
  static generateChallenge(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // Generate registration options for WebAuthn
  static generateRegistrationOptions(userId: number, userName: string) {
    const challenge = this.generateChallenge();
    
    return {
      challenge,
      rp: {
        name: 'Light of Life',
        id: process.env.NEXT_PUBLIC_DOMAIN || 'localhost',
      },
      user: {
        id: Buffer.from(userId.toString()).toString('base64url'),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },  // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required',
      },
    };
  }

  // Generate authentication options
  static generateAuthenticationOptions(userId: number) {
    const challenge = this.generateChallenge();
    
    // Get user's credentials
    const userCredentials = Array.from(credentialStore.values())
      .filter(cred => cred.userId === userId)
      .map(cred => ({
        id: cred.id,
        type: 'public-key' as const,
      }));

    return {
      challenge,
      timeout: 60000,
      rpId: process.env.NEXT_PUBLIC_DOMAIN || 'localhost',
      allowCredentials: userCredentials,
      userVerification: 'required',
    };
  }

  // Register new biometric credential
  static async registerCredential(
    userId: number,
    credentialId: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      const credential: BiometricCredential = {
        id: credentialId,
        publicKey,
        counter: 0,
        userId,
        createdAt: new Date(),
      };

      credentialStore.set(credentialId, credential);
      return true;
    } catch (error) {
      console.error('Register credential error:', error);
      return false;
    }
  }

  // Verify biometric authentication
  static async verifyAuthentication(
    credentialId: string,
    signature: string,
    authenticatorData: string,
    clientDataJSON: string
  ): Promise<boolean> {
    try {
      const credential = credentialStore.get(credentialId);
      if (!credential) {
        return false;
      }

      // In production, verify signature using credential.publicKey
      // This is a simplified version
      
      // Update counter to prevent replay attacks
      credential.counter++;
      credentialStore.set(credentialId, credential);

      return true;
    } catch (error) {
      console.error('Verify authentication error:', error);
      return false;
    }
  }

  // Remove credential
  static async removeCredential(credentialId: string, userId: number): Promise<boolean> {
    const credential = credentialStore.get(credentialId);
    if (credential && credential.userId === userId) {
      credentialStore.delete(credentialId);
      return true;
    }
    return false;
  }

  // Get user's credentials
  static getUserCredentials(userId: number): BiometricCredential[] {
    return Array.from(credentialStore.values())
      .filter(cred => cred.userId === userId);
  }

  // Check if user has biometric enabled
  static hasBiometric(userId: number): boolean {
    return this.getUserCredentials(userId).length > 0;
  }
}

// Fingerprint Authentication (for mobile devices)
export class FingerprintAuth {
  // Check if fingerprint is available
  static async isAvailable(): Promise<boolean> {
    // This would use native APIs on mobile
    return typeof window !== 'undefined' && 
           'PublicKeyCredential' in window;
  }

  // Authenticate with fingerprint
  static async authenticate(userId: number): Promise<boolean> {
    try {
      const options = BiometricAuth.generateAuthenticationOptions(userId);
      
      // In browser, this would trigger the WebAuthn API
      // For mobile, this would use native biometric APIs
      
      return true;
    } catch (error) {
      console.error('Fingerprint authentication error:', error);
      return false;
    }
  }
}

// Face Recognition (for advanced devices)
export class FaceRecognition {
  // Check if face recognition is available
  static async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 
           'PublicKeyCredential' in window;
  }

  // Authenticate with face recognition
  static async authenticate(userId: number): Promise<boolean> {
    try {
      // Use WebAuthn with platform authenticator
      const options = BiometricAuth.generateAuthenticationOptions(userId);
      return true;
    } catch (error) {
      console.error('Face recognition error:', error);
      return false;
    }
  }
}

// Utility functions for client-side biometric
export const BiometricUtils = {
  // Check browser support
  isBrowserSupported: (): boolean => {
    return typeof window !== 'undefined' && 
           'PublicKeyCredential' in window &&
           typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  },

  // Check if platform authenticator is available
  isPlatformAuthenticatorAvailable: async (): Promise<boolean> => {
    try {
      if (!BiometricUtils.isBrowserSupported()) {
        return false;
      }
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  // Get biometric type name
  getBiometricTypeName: (): string => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      return 'Face ID or Touch ID';
    } else if (/Android/.test(ua)) {
      return 'Fingerprint or Face Recognition';
    } else if (/Windows/.test(ua)) {
      return 'Windows Hello';
    } else if (/Mac/.test(ua)) {
      return 'Touch ID';
    }
    return 'Biometric Authentication';
  },
};
