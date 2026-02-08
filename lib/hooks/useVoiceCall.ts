import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent } from '@/lib/realtime/chat';
import { peerJSConfig, audioConstraints, getErrorMessage } from '@/lib/webrtc/config';
import { WebRTCStatsMonitor, CallQuality } from '@/lib/webrtc/stats';

interface CallState {
  isCalling: boolean;
  isReceivingCall: boolean;
  isInCall: boolean;
  callerId: number | null;
  callerName: string;
  callerAvatar: string | null;
  receiverId: number | null;
  callType: 'voice' | 'video';
  isMuted: boolean;
  isSpeaker: boolean;
  duration: number;
}

const initialState: CallState = {
  isCalling: false,
  isReceivingCall: false,
  isInCall: false,
  callerId: null,
  callerName: '',
  callerAvatar: null,
  receiverId: null,
  callType: 'voice',
  isMuted: false,
  isSpeaker: false,
  duration: 0,
};

export function useVoiceCall(currentUserId: number, currentUserName: string, currentUserAvatar: string | null) {
  const [callState, setCallState] = useState<CallState>(initialState);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const statsMonitorRef = useRef<WebRTCStatsMonitor | null>(null);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statsMonitorRef.current) {
      statsMonitorRef.current.stop();
      statsMonitorRef.current = null;
    }
    setCallState(initialState);
  }, []);

  const setupCallEvents = useCallback((call: any) => {
    console.log('[Call] Setting up call event handlers');
    
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('[Call] Received remote stream:', remoteStream);
      remoteStreamRef.current = remoteStream;
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        
        const playAudio = async (retries = 3) => {
          try {
            await remoteAudioRef.current!.play();
            console.log('[Call] Remote audio playing successfully');
          } catch (e) {
            console.error('[Call] Audio play error:', e);
            if (retries > 0) {
              setTimeout(() => playAudio(retries - 1), 500);
            }
          }
        };
        
        playAudio();
      }
      
      // Start WebRTC stats monitoring
      if (call.peerConnection && !statsMonitorRef.current) {
        statsMonitorRef.current = new WebRTCStatsMonitor(
          (stats) => {
            // Stats update logged in monitor
          },
          (quality: CallQuality) => {
            if (quality.level === 'poor' || quality.level === 'bad') {
              console.warn(`[Call] ${quality.message}`);
            }
          }
        );
        statsMonitorRef.current.start(call.peerConnection, 2000);
      }
    });

    call.on('close', () => {
      console.log('[Call] Call stream closed');
      cleanup();
    });

    call.on('error', (err: any) => {
      console.error('[Call] Call stream error:', err);
      cleanup();
    });
  }, [cleanup]);

  useEffect(() => {
    if (!currentUserId) return;

    // Initialize PeerJS with optimized Google STUN/TURN servers
    const peer = new Peer(`user-${currentUserId}`, peerJSConfig);

    peer.on('open', (id) => {
      console.log('PeerJS connected with ID:', id);
    });

    peer.on('call', async (call) => {
      // This is handled via Supabase broadcast for better UI control
      // But we need to be ready to answer
      console.log('Incoming PeerJS call');
    });

    peerRef.current = peer;

    // Initialize Supabase Channel for signaling
    const channel = supabase.channel(`user-${currentUserId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: ChatEvent.INCOMING_CALL }, ({ payload }) => {
        setCallState(prev => ({
          ...prev,
          isReceivingCall: true,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
          callType: payload.callType,
        }));
      })
      .on('broadcast', { event: ChatEvent.CALL_ACCEPTED }, async ({ payload }) => {
        if (callState.isCalling || callState.receiverId === payload.acceptorId) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: audioConstraints, 
              video: callState.callType === 'video' 
            });
            localStreamRef.current = stream;
            
            const call = peerRef.current!.call(payload.receiverPeerId, stream);
            setupCallEvents(call);

            setCallState(prev => ({ ...prev, isCalling: false, isInCall: true }));
            startTimer();
          } catch (err) {
            console.error('Failed to get local stream', err);
            endCall();
          }
        }
      })
      .on('broadcast', { event: ChatEvent.CALL_REJECTED }, () => {
        cleanup();
      })
      .on('broadcast', { event: ChatEvent.CALL_ENDED }, () => {
        cleanup();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      peer.destroy();
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [currentUserId, cleanup, callState.isCalling, callState.receiverId, callState.callType, setupCallEvents]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const initiateCall = async (receiverId: number, callType: 'voice' | 'video' = 'voice') => {
    setCallState(prev => ({ ...prev, isCalling: true, receiverId, callType }));
    
    await fetch('/api/calls/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId,
        callerId: currentUserId,
        callerPeerId: `user-${currentUserId}`,
        callerName: currentUserName,
        callerAvatar: currentUserAvatar,
        callType,
      }),
    });
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints, 
        video: callState.callType === 'video' 
      });
      localStreamRef.current = stream;

      peerRef.current!.on('call', (call) => {
        call.answer(stream);
        setupCallEvents(call);
      });

      await fetch('/api/calls/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerId: callState.callerId,
          acceptorId: currentUserId,
          receiverPeerId: `user-${currentUserId}`,
        }),
      });

      setCallState(prev => ({ ...prev, isReceivingCall: false, isInCall: true }));
      startTimer();
    } catch (err) {
      console.error('Failed to accept call', err);
      cleanup();
    }
  };

  const rejectCall = async () => {
    await fetch('/api/calls/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerId: callState.callerId }),
    });
    cleanup();
  };

  const endCall = async () => {
    const targetId = callState.receiverId || callState.callerId;
    if (targetId) {
      await fetch('/api/calls/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetId, endedBy: currentUserId }),
      });
    }
    cleanup();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    callState,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    formatDuration,
    remoteAudioRef,
  };
}
