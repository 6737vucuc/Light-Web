/**
 * WebRTC Configuration for PeerJS
 * Optimized for high-quality audio calls with Google STUN/TURN servers
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize: number;
  iceTransportPolicy: RTCIceTransportPolicy;
  bundlePolicy: RTCBundlePolicy;
  rtcpMuxPolicy: RTCRtcpMuxPolicy;
}

/**
 * High-quality audio constraints for voice calls
 */
export const audioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,        // High quality sample rate (48kHz)
  channelCount: 1,          // Mono for voice calls (reduces bandwidth)
  latency: 0.01,            // Low latency (10ms)
  volume: 1.0
};

/**
 * Google STUN/TURN servers (free)
 * Priority order: Google STUN → Google TURN → OpenRelay (fallback)
 */
export const iceServers: RTCIceServer[] = [
  // Google STUN servers (primary)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Additional STUN servers for redundancy
  { urls: 'stun:stun.services.mozilla.com' },
  
  // OpenRelay TURN servers (fallback - free but may be slower)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

/**
 * Optimized WebRTC configuration
 */
export const webrtcConfig: WebRTCConfig = {
  iceServers,
  iceCandidatePoolSize: 10,           // Pre-gather ICE candidates
  iceTransportPolicy: 'all',          // Use all available transports (relay + direct)
  bundlePolicy: 'max-bundle',         // Bundle all media on single transport (better performance)
  rtcpMuxPolicy: 'require'            // Multiplex RTP and RTCP (reduces port usage)
};

/**
 * PeerJS configuration with optimized WebRTC settings
 */
export const peerJSConfig = {
  debug: 1,                           // Enable debug logging (1 = errors, 2 = warnings, 3 = all)
  secure: true,                       // Use secure connection
  config: webrtcConfig
};

/**
 * Audio element configuration for remote stream playback
 */
export const audioElementConfig = {
  autoplay: true,
  volume: 1.0,
  muted: false
};

/**
 * Call quality thresholds for monitoring
 */
export const qualityThresholds = {
  excellent: {
    rtt: 100,           // Round-trip time < 100ms
    packetLoss: 0.01    // Packet loss < 1%
  },
  good: {
    rtt: 200,           // Round-trip time < 200ms
    packetLoss: 0.03    // Packet loss < 3%
  },
  poor: {
    rtt: 400,           // Round-trip time < 400ms
    packetLoss: 0.05    // Packet loss < 5%
  }
  // Anything worse is considered "bad"
};

/**
 * Retry configuration for failed connections
 */
export const retryConfig = {
  maxRetries: 5,
  initialDelay: 2000,     // 2 seconds
  maxDelay: 10000,        // 10 seconds
  backoffMultiplier: 1.5  // Exponential backoff
};

/**
 * Get user-friendly error messages
 */
export function getErrorMessage(error: any): string {
  if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    return 'Microphone permission denied. Please allow microphone access.';
  }
  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return 'No microphone found. Please connect a microphone.';
  }
  if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    return 'Microphone is already in use by another application.';
  }
  if (error.name === 'OverconstrainedError') {
    return 'Microphone does not support the requested settings.';
  }
  if (error.type === 'network') {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error.type === 'peer-unavailable') {
    return 'The other user is not available for calls.';
  }
  if (error.type === 'unavailable-id') {
    return 'Connection ID is already in use. Retrying...';
  }
  return error.message || 'An unknown error occurred. Please try again.';
}

/**
 * Check if browser supports required WebRTC features
 */
export function checkWebRTCSupport(): { supported: boolean; message?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, message: 'Not running in browser environment' };
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, message: 'Your browser does not support audio calls' };
  }

  if (!window.RTCPeerConnection) {
    return { supported: false, message: 'Your browser does not support WebRTC' };
  }

  return { supported: true };
}
