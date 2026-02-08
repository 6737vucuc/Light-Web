/**
 * WebRTC Statistics Monitoring
 * Tracks call quality metrics (latency, packet loss, bitrate, etc.)
 */

export interface CallStats {
  timestamp: number;
  rtt?: number;                    // Round-trip time (ms)
  packetLoss?: number;             // Packet loss percentage (0-1)
  jitter?: number;                 // Jitter (ms)
  bitrate?: number;                // Current bitrate (bps)
  audioLevel?: number;             // Audio level (0-1)
  bytesReceived?: number;
  bytesSent?: number;
  packetsReceived?: number;
  packetsSent?: number;
  packetsLost?: number;
}

export interface CallQuality {
  level: 'excellent' | 'good' | 'poor' | 'bad';
  rtt: number;
  packetLoss: number;
  message: string;
}

/**
 * Monitor WebRTC connection statistics
 */
export class WebRTCStatsMonitor {
  private peerConnection: RTCPeerConnection | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private lastStats: CallStats | null = null;
  private onStatsUpdate?: (stats: CallStats) => void;
  private onQualityChange?: (quality: CallQuality) => void;

  constructor(
    onStatsUpdate?: (stats: CallStats) => void,
    onQualityChange?: (quality: CallQuality) => void
  ) {
    this.onStatsUpdate = onStatsUpdate;
    this.onQualityChange = onQualityChange;
  }

  /**
   * Start monitoring a peer connection
   */
  start(peerConnection: RTCPeerConnection, intervalMs: number = 1000) {
    this.peerConnection = peerConnection;
    
    // Clear any existing interval
    this.stop();

    // Start collecting stats
    this.statsInterval = setInterval(async () => {
      await this.collectStats();
    }, intervalMs);

    console.log('[WebRTC Stats] Monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.peerConnection = null;
    this.lastStats = null;
    console.log('[WebRTC Stats] Monitoring stopped');
  }

  /**
   * Collect statistics from peer connection
   */
  private async collectStats() {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const callStats: CallStats = {
        timestamp: Date.now()
      };

      stats.forEach((report) => {
        // Inbound RTP (receiving audio)
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          callStats.packetsReceived = report.packetsReceived;
          callStats.packetsLost = report.packetsLost;
          callStats.bytesReceived = report.bytesReceived;
          callStats.jitter = report.jitter ? report.jitter * 1000 : undefined; // Convert to ms
          
          // Calculate packet loss percentage
          if (report.packetsReceived && report.packetsLost) {
            const totalPackets = report.packetsReceived + report.packetsLost;
            callStats.packetLoss = report.packetsLost / totalPackets;
          }

          // Calculate bitrate
          if (this.lastStats?.bytesReceived && this.lastStats?.timestamp) {
            const bytesDiff = report.bytesReceived - this.lastStats.bytesReceived;
            const timeDiff = (callStats.timestamp - this.lastStats.timestamp) / 1000; // Convert to seconds
            callStats.bitrate = (bytesDiff * 8) / timeDiff; // bits per second
          }
        }

        // Outbound RTP (sending audio)
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          callStats.packetsSent = report.packetsSent;
          callStats.bytesSent = report.bytesSent;
        }

        // Candidate pair (connection info)
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          callStats.rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : undefined; // Convert to ms
        }

        // Track (audio level)
        if (report.type === 'track' && report.kind === 'audio') {
          callStats.audioLevel = report.audioLevel;
        }
      });

      // Update last stats for next calculation
      this.lastStats = callStats;

      // Notify listeners
      if (this.onStatsUpdate) {
        this.onStatsUpdate(callStats);
      }

      // Check quality and notify if changed
      const quality = this.evaluateQuality(callStats);
      if (this.onQualityChange) {
        this.onQualityChange(quality);
      }

      // Log stats to console
      this.logStats(callStats, quality);

    } catch (error) {
      console.error('[WebRTC Stats] Error collecting stats:', error);
    }
  }

  /**
   * Evaluate call quality based on stats
   */
  private evaluateQuality(stats: CallStats): CallQuality {
    const rtt = stats.rtt || 0;
    const packetLoss = stats.packetLoss || 0;

    if (rtt < 100 && packetLoss < 0.01) {
      return {
        level: 'excellent',
        rtt,
        packetLoss: packetLoss * 100,
        message: 'Excellent call quality'
      };
    } else if (rtt < 200 && packetLoss < 0.03) {
      return {
        level: 'good',
        rtt,
        packetLoss: packetLoss * 100,
        message: 'Good call quality'
      };
    } else if (rtt < 400 && packetLoss < 0.05) {
      return {
        level: 'poor',
        rtt,
        packetLoss: packetLoss * 100,
        message: 'Poor call quality - connection may be unstable'
      };
    } else {
      return {
        level: 'bad',
        rtt,
        packetLoss: packetLoss * 100,
        message: 'Bad call quality - please check your connection'
      };
    }
  }

  /**
   * Log stats to console in a readable format
   */
  private logStats(stats: CallStats, quality: CallQuality) {
    const logData: any = {
      quality: quality.level,
      rtt: stats.rtt ? `${stats.rtt.toFixed(0)}ms` : 'N/A',
      packetLoss: stats.packetLoss ? `${(stats.packetLoss * 100).toFixed(2)}%` : 'N/A',
      jitter: stats.jitter ? `${stats.jitter.toFixed(2)}ms` : 'N/A',
      bitrate: stats.bitrate ? `${(stats.bitrate / 1000).toFixed(1)} kbps` : 'N/A'
    };

    console.log('[WebRTC Stats]', logData);
  }

  /**
   * Get current stats snapshot
   */
  getCurrentStats(): CallStats | null {
    return this.lastStats;
  }
}

/**
 * Helper function to create and start monitoring
 */
export function startStatsMonitoring(
  peerConnection: RTCPeerConnection,
  onStatsUpdate?: (stats: CallStats) => void,
  onQualityChange?: (quality: CallQuality) => void
): WebRTCStatsMonitor {
  const monitor = new WebRTCStatsMonitor(onStatsUpdate, onQualityChange);
  monitor.start(peerConnection);
  return monitor;
}

/**
 * Format stats for display
 */
export function formatStatsForDisplay(stats: CallStats): string {
  const parts: string[] = [];

  if (stats.rtt !== undefined) {
    parts.push(`RTT: ${stats.rtt.toFixed(0)}ms`);
  }

  if (stats.packetLoss !== undefined) {
    parts.push(`Loss: ${(stats.packetLoss * 100).toFixed(1)}%`);
  }

  if (stats.bitrate !== undefined) {
    parts.push(`Bitrate: ${(stats.bitrate / 1000).toFixed(0)} kbps`);
  }

  if (stats.jitter !== undefined) {
    parts.push(`Jitter: ${stats.jitter.toFixed(1)}ms`);
  }

  return parts.join(' | ');
}
