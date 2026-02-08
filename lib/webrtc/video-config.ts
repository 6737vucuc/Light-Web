/**
 * Video Streaming Configuration for WebRTC
 * Optimized for real-time video calls with Google STUN/TURN servers
 */

export const videoConstraints = {
  // Standard HD quality for video calls
  ideal: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    aspectRatio: { ideal: 16 / 9 },
  },
  // Fallback to lower quality if HD not available
  min: {
    width: 320,
    height: 240,
    frameRate: 15,
  },
  // Mobile-optimized constraints
  mobile: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 },
    aspectRatio: { ideal: 4 / 3 },
  },
};

export const videoCodecs = {
  // Preferred video codecs in order of preference
  preferred: ['VP9', 'VP8', 'H264'],
  // Audio codecs
  audio: ['opus', 'PCMU', 'PCMA'],
};

export const videoRtcConfig = {
  // ICE servers with Google STUN/TURN
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
      ],
    },
    {
      urls: [
        'turn:turn.bistri.com:80',
        'turn:turn.bistri.com:443?transport=tcp',
      ],
      username: 'homeo',
      credential: 'homeo',
    },
  ],
  // Connection settings
  bundlePolicy: 'max-bundle' as RTCBundlePolicy,
  rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  iceCandidatePoolSize: 10,
};

export const getVideoConstraints = (isMobile: boolean = false) => {
  if (isMobile) {
    return { video: videoConstraints.mobile, audio: true };
  }
  return { video: videoConstraints.ideal, audio: true };
};

export const videoQualityLevels = {
  high: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000, // 2.5 Mbps
  },
  medium: {
    width: 640,
    height: 480,
    frameRate: 24,
    bitrate: 1000000, // 1 Mbps
  },
  low: {
    width: 320,
    height: 240,
    frameRate: 15,
    bitrate: 500000, // 500 Kbps
  },
};

export const getOptimalVideoQuality = (bandwidth: number) => {
  if (bandwidth > 2000) return videoQualityLevels.high;
  if (bandwidth > 1000) return videoQualityLevels.medium;
  return videoQualityLevels.low;
};
