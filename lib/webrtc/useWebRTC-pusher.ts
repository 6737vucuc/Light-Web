import { useEffect, useRef, useState, useCallback } from 'react';
import { getPusherClient, getUserChannel, getCallChannel, WEBRTC_EVENTS } from './pusher-signaling';
import type { Channel } from 'pusher-js';

interface UseWebRTCProps {
  userId: number;
  userName: string;
  onIncomingCall?: (callerId: number, callerName: string) => void;
  onCallEnded?: () => void;
  onCallAccepted?: (remoteUserId: number) => void;
}

interface WebRTCState {
  isConnected: boolean;
  isInCall: boolean;
  isMuted: boolean;
  remoteUserId: number | null;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export function useWebRTC({ userId, userName, onIncomingCall, onCallEnded, onCallAccepted }: UseWebRTCProps) {
  const [state, setState] = useState<WebRTCState>({
    isConnected: false,
    isInCall: false,
    isMuted: false,
    remoteUserId: null
  });

  const pusherRef = useRef<any>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const callChannelRef = useRef<Channel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize Pusher connection
  useEffect(() => {
    // Only run on client side and when userId is valid
    if (typeof window === 'undefined' || !userId || userId === 0) return;
    
    const pusher = getPusherClient();
    pusherRef.current = pusher;

    // Subscribe to user's private channel
    const userChannel = pusher.subscribe(getUserChannel(userId));
    userChannelRef.current = userChannel;

    userChannel.bind('pusher:subscription_succeeded', () => {
      console.log('Connected to Pusher');
      setState(prev => ({ ...prev, isConnected: true }));
    });

    userChannel.bind('pusher:subscription_error', (error: any) => {
      console.error('Pusher subscription error:', error);
    });

    // Listen for incoming calls
    userChannel.bind(WEBRTC_EVENTS.CALL_REQUEST, (data: any) => {
      console.log('Incoming call from:', data.callerId);
      if (onIncomingCall) {
        onIncomingCall(data.callerId, data.callerName);
      }
    });

    // Listen for call accepted
    userChannel.bind(WEBRTC_EVENTS.CALL_ACCEPTED, async (data: any) => {
      console.log('Call accepted by:', data.userId);
      await createOffer(data.userId);
      if (onCallAccepted) {
        onCallAccepted(data.userId);
      }
    });

    // Listen for call rejected
    userChannel.bind(WEBRTC_EVENTS.CALL_REJECTED, (data: any) => {
      console.log('Call rejected by:', data.userId);
      alert('Call was rejected');
      cleanupCall();
    });

    // Listen for call ended
    userChannel.bind(WEBRTC_EVENTS.CALL_ENDED, (data: any) => {
      console.log('Call ended by:', data.userId);
      cleanupCall();
      if (onCallEnded) {
        onCallEnded();
      }
    });

    return () => {
      if (userChannelRef.current) {
        pusher.unsubscribe(getUserChannel(userId));
      }
      if (callChannelRef.current && state.remoteUserId) {
        pusher.unsubscribe(getCallChannel(userId, state.remoteUserId));
      }
      pusher.disconnect();
    };
  }, [userId, onIncomingCall, onCallEnded]);

  const subscribeToCallChannel = useCallback((remoteUserId: number) => {
    if (!pusherRef.current) return;

    const callChannel = pusherRef.current.subscribe(getCallChannel(userId, remoteUserId));
    callChannelRef.current = callChannel;

    callChannel.bind('pusher:subscription_succeeded', () => {
      console.log('Subscribed to call channel');
    });

    // Listen for WebRTC offer
    callChannel.bind(WEBRTC_EVENTS.OFFER, async (data: any) => {
      if (data.from !== userId) {
        console.log('Received offer from:', data.from);
        await handleOffer(data.from, data.signal);
      }
    });

    // Listen for WebRTC answer
    callChannel.bind(WEBRTC_EVENTS.ANSWER, async (data: any) => {
      if (data.from !== userId) {
        console.log('Received answer from:', data.from);
        await handleAnswer(data.signal);
      }
    });

    // Listen for ICE candidates
    callChannel.bind(WEBRTC_EVENTS.ICE_CANDIDATE, async (data: any) => {
      if (data.from !== userId) {
        console.log('Received ICE candidate from:', data.from);
        await handleIceCandidate(data.candidate);
      }
    });
  }, [userId]);

  const initializePeerConnection = useCallback((remoteUserId: number) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await fetch('/api/webrtc/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ice-candidate',
              targetUserId: remoteUserId,
              signal: event.candidate
            })
          });
        } catch (error) {
          console.error('Error sending ICE candidate:', error);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track');
      // Attach to audio element if needed
      const remoteStream = event.streams[0];
      if (!remoteStream) return;

      // Handle audio track
      const audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
      if (audioElement && remoteStream.getAudioTracks().length > 0) {
        audioElement.srcObject = remoteStream;
        audioElement.play().catch(e => console.error('Error playing audio:', e));
      }

      // Handle video track
      const videoElement = document.getElementById('remote-video') as HTMLVideoElement;
      if (videoElement && remoteStream.getVideoTracks().length > 0) {
        videoElement.srcObject = remoteStream;
        videoElement.play().catch(e => console.error('Error playing video:', e));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setState(prev => ({ ...prev, isInCall: true }));
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall();
      }
    };

    return pc;
  }, []);

  const startCall = useCallback(async (targetUserId: number) => {
    try {
      // Request microphone and camera access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;

      // Attach local stream to local video element
      const localVideoElement = document.getElementById('local-video') as HTMLVideoElement;
      if (localVideoElement) {
        localVideoElement.srcObject = stream;
        localVideoElement.play().catch(e => console.error('Error playing local video:', e));
      }

      // Subscribe to call channel
      subscribeToCallChannel(targetUserId);

      // Send call request
      const response = await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          targetUserId
        })
      });

      if (response.ok) {
        setState(prev => ({ ...prev, remoteUserId: targetUserId }));
      } else {
        throw new Error('Failed to start call');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please check your microphone permissions.');
      cleanupCall();
    }
  }, [subscribeToCallChannel]);

  const acceptCall = useCallback(async (callerUserId: number) => {
    try {
      // Request microphone and camera access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;

      // Attach local stream to local video element
      const localVideoElement = document.getElementById('local-video') as HTMLVideoElement;
      if (localVideoElement) {
        localVideoElement.srcObject = stream;
        localVideoElement.play().catch(e => console.error('Error playing local video:', e));
      }

      // Subscribe to call channel
      subscribeToCallChannel(callerUserId);

      // Send acceptance
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          targetUserId: callerUserId
        })
      });

      setState(prev => ({ ...prev, remoteUserId: callerUserId }));
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call. Please check your microphone permissions.');
      cleanupCall();
    }
  }, [subscribeToCallChannel]);

  const rejectCall = useCallback(async (callerUserId: number) => {
    try {
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          targetUserId: callerUserId
        })
      });
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, []);

  const createOffer = async (targetUserId: number) => {
    try {
      const pc = initializePeerConnection(targetUserId);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offer',
          targetUserId,
          signal: offer
        })
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      cleanupCall();
    }
  };

  const handleOffer = async (fromUserId: number, offer: RTCSessionDescriptionInit) => {
    try {
      const pc = initializePeerConnection(fromUserId);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'answer',
          targetUserId: fromUserId,
          signal: answer
        })
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      cleanupCall();
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const endCall = useCallback(async () => {
    if (state.remoteUserId) {
      try {
        await fetch('/api/webrtc/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            targetUserId: state.remoteUserId
          })
        });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    cleanupCall();
  }, [state.remoteUserId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
      // Also mute video if needed (though usually only audio is muted)
      // const videoTrack = localStreamRef.current.getVideoTracks()[0];
      // if (videoTrack) {
      //   videoTrack.enabled = !videoTrack.enabled;
      // }
    }
  }, []);

  const cleanupCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Unsubscribe from call channel
    if (callChannelRef.current && state.remoteUserId && pusherRef.current) {
      pusherRef.current.unsubscribe(getCallChannel(userId, state.remoteUserId));
      callChannelRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isInCall: false, 
      isMuted: false,
      remoteUserId: null 
    }));
  };

  return {
    ...state,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute
  };
}
