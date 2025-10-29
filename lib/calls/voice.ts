// Voice Call System using WebRTC
export class VoiceCallService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor() {
    this.initializePeerConnection();
  }

  private initializePeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer
        console.log('ICE candidate:', event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      console.log('Remote stream received');
    };
  }

  async startCall(): Promise<MediaStream | null> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      return this.localStream;
    } catch (error) {
      console.error('Start call error:', error);
      return null;
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    try {
      const offer = await this.peerConnection?.createOffer();
      await this.peerConnection?.setLocalDescription(offer);
      return offer || null;
    } catch (error) {
      console.error('Create offer error:', error);
      return null;
    }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit | null> {
    try {
      const answer = await this.peerConnection?.createAnswer();
      await this.peerConnection?.setLocalDescription(answer);
      return answer || null;
    } catch (error) {
      console.error('Create answer error:', error);
      return null;
    }
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.peerConnection?.setRemoteDescription(description);
    } catch (error) {
      console.error('Set remote description error:', error);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection?.addIceCandidate(candidate);
    } catch (error) {
      console.error('Add ICE candidate error:', error);
    }
  }

  endCall(): void {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.localStream = null;
    this.remoteStream = null;
  }

  muteAudio(): void {
    this.localStream?.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
  }

  unmuteAudio(): void {
    this.localStream?.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}
