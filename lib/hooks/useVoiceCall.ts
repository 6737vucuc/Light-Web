import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent } from '@/lib/realtime/chat';
import { peerJSConfig, audioConstraints, getErrorMessage } from '@/lib/webrtc/config';
import { videoConstraints, getVideoConstraints } from '@/lib/webrtc/video-config';
import { WebRTCStatsMonitor, CallQuality } from '@/lib/webrtc/stats';
import { CallHistoryService } from '@/lib/services/call-history';
import { NotificationService } from '@/lib/services/notifications';

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
  isVideoEnabled: boolean;
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
  isVideoEnabled: false,
  duration: 0,
};

export function useVoiceCall(currentUserId: number, currentUserName: string, currentUserAvatar: string | null) {
  const [callState, setCallState] = useState<CallState>(initialState);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const statsMonitorRef = useRef<WebRTCStatsMonitor | null>(null);
  const callStartTimeRef = useRef<number>(0);

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
      
      // Handle video stream if video call
      if (remoteVideoRef.current && callState.callType === 'video') {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      
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
        
        // Show incoming call notification
        NotificationService.showIncomingCallNotification(
          payload.callerName,
          payload.callerAvatar,
          payload.callType
        );
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
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
  };

  const initiateCall = async (receiverId: number, callType: 'voice' | 'video' = 'voice') => {
    setCallState(prev => ({ ...prev, isCalling: true, receiverId, callType }));
    
    try {
      // Get media constraints based on call type
      const constraints = callType === 'video' ? getVideoConstraints() : { audio: audioConstraints };
      
      // Request permission for media
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      // If video call, set up local video
      if (callType === 'video' && remoteVideoRef.current) {
        // Local video would be displayed in a separate element
        console.log('Local video stream ready for video call');
      }
    } catch (err) {
      console.error('Failed to get media for call initiation:', err);
    }
    
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
      const constraints = callState.callType === 'video' ? getVideoConstraints() : { audio: audioConstraints };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
    const callDuration = callState.duration;
    
    if (targetId) {
      // Log the call to history
      const callStatus = callState.isInCall ? 'completed' : 'rejected';
      await CallHistoryService.logCall({
        callerId: callState.callerId || currentUserId,
        callerName: currentUserName,
        callerAvatar: currentUserAvatar,
        receiverId: targetId,
        receiverName: '',
        callType: callState.callType,
        status: callStatus,
        duration: callDuration,
        startedAt: new Date(Date.now() - callDuration * 1000).toISOString(),
        endedAt: new Date().toISOString(),
      });

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

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: videoTrack.enabled }));
      }
    }
  };

  const toggleSpeaker = () => {
    setCallState(prev => ({ ...prev, isSpeaker: !prev.isSpeaker }));
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
    toggleVideo,
    toggleSpeaker,
    formatDuration,
    remoteAudioRef,
    remoteVideoRef,
  };
}
