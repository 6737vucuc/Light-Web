'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';

interface CallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  callerId: number | null;
  callerName: string | null;
  callerAvatar: string | null;
  receiverId: number | null;
  isMuted: boolean;
  isSpeaker: boolean;
  callDuration: number;
}

interface UseVoiceCallProps {
  currentUserId: number;
  currentUserName: string;
  currentUserAvatar?: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export function useVoiceCall({ currentUserId, currentUserName, currentUserAvatar }: UseVoiceCallProps) {
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isCalling: false,
    isReceivingCall: false,
    callerId: null,
    callerName: null,
    callerAvatar: null,
    receiverId: null,
    isMuted: false,
    isSpeaker: false,
    callDuration: 0,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Pusher for signaling
  useEffect(() => {
    if (!currentUserId) return;

    pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusherRef.current.subscribe(`private-calls-${currentUserId}`);
    channelRef.current = channel;

    // Listen for incoming calls
    channel.bind('incoming-call', async (data: any) => {
      console.log('Incoming call:', data);
      setCallState(prev => ({
        ...prev,
        isReceivingCall: true,
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
      }));
    });

    // Listen for call accepted
    channel.bind('call-accepted', async (data: any) => {
      console.log('Call accepted:', data);
      if (data.answer && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
        setCallState(prev => ({
          ...prev,
          isCalling: false,
          isInCall: true,
        }));
        startCallTimer();
      }
    });

    // Listen for ICE candidates
    channel.bind('ice-candidate', async (data: any) => {
      if (data.candidate && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Listen for call ended
    channel.bind('call-ended', () => {
      endCall();
    });

    // Listen for call declined
    channel.bind('call-declined', () => {
      setCallState(prev => ({
        ...prev,
        isCalling: false,
        isReceivingCall: false,
      }));
      cleanup();
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`private-calls-${currentUserId}`);
        pusherRef.current.disconnect();
      }
    };
  }, [currentUserId]);

  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallState(prev => ({
        ...prev,
        callDuration: prev.callDuration + 1,
      }));
    }, 1000);
  };

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallState({
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      callerId: null,
      callerName: null,
      callerAvatar: null,
      receiverId: null,
      isMuted: false,
      isSpeaker: false,
      callDuration: 0,
    });
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const targetId = callState.receiverId || callState.callerId;
        await fetch('/api/calls/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ice-candidate',
            targetUserId: targetId,
            candidate: event.candidate,
          }),
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, [callState.receiverId, callState.callerId]);

  const startCall = useCallback(async (receiverId: number, receiverName: string) => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send call request
      await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          offer,
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
        }),
      });

      setCallState(prev => ({
        ...prev,
        isCalling: true,
        receiverId,
      }));

      // Auto-end call after 30 seconds if no answer
      setTimeout(() => {
        if (callState.isCalling && !callState.isInCall) {
          endCall();
        }
      }, 30000);

    } catch (error) {
      console.error('Error starting call:', error);
      cleanup();
    }
  }, [currentUserName, currentUserAvatar, createPeerConnection, cleanup]);

  const acceptCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add local stream
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      await fetch('/api/calls/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: callState.callerId,
          answer,
        }),
      });

      setCallState(prev => ({
        ...prev,
        isReceivingCall: false,
        isInCall: true,
      }));

      startCallTimer();

    } catch (error) {
      console.error('Error accepting call:', error);
      cleanup();
    }
  }, [callState.callerId, createPeerConnection, cleanup]);

  const declineCall = useCallback(async () => {
    await fetch('/api/calls/decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callerId: callState.callerId,
      }),
    });
    cleanup();
  }, [callState.callerId, cleanup]);

  const endCall = useCallback(async () => {
    const targetId = callState.receiverId || callState.callerId;
    if (targetId) {
      await fetch('/api/calls/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetId,
        }),
      });
    }
    cleanup();
  }, [callState.receiverId, callState.callerId, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setCallState(prev => ({ ...prev, isSpeaker: !prev.isSpeaker }));
    // Note: Speaker toggle requires native app support, not available in web
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    callState,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
    formatDuration,
    remoteAudioRef,
  };
}
