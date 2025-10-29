import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Room, 
  RoomEvent, 
  Track,
  RemoteTrackPublication,
  RemoteTrack,
  RemoteParticipant
} from 'livekit-client';
import { getCallRoomName, getParticipantIdentity } from './livekit-config';

interface UseVoiceCallProps {
  userId: number;
  userName: string;
  onIncomingCall?: (callerId: number, callerName: string) => void;
  onCallEnded?: () => void;
  onCallAccepted?: () => void;
}

interface VoiceCallState {
  isConnected: boolean;
  isInCall: boolean;
  isMuted: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useVoiceCall({ 
  userId, 
  userName, 
  onIncomingCall, 
  onCallEnded,
  onCallAccepted 
}: UseVoiceCallProps) {
  const [state, setState] = useState<VoiceCallState>({
    isConnected: false,
    isInCall: false,
    isMuted: false,
    isConnecting: false,
    error: null
  });

  const roomRef = useRef<Room | null>(null);
  const remoteUserIdRef = useRef<number | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    // Create ringing audio (for outgoing calls)
    ringingAudioRef.current = new Audio('/sounds/ringing.wav');
    ringingAudioRef.current.loop = true;
    ringingAudioRef.current.volume = 0.5;

    // Create incoming call audio
    incomingAudioRef.current = new Audio('/sounds/incoming-call.wav');
    incomingAudioRef.current.loop = true;
    incomingAudioRef.current.volume = 0.7;

    return () => {
      // Cleanup audio on unmount
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current = null;
      }
      if (incomingAudioRef.current) {
        incomingAudioRef.current.pause();
        incomingAudioRef.current = null;
      }
    };
  }, []);

  // Stop all ringtones
  const stopRingtones = useCallback(() => {
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }
    if (incomingAudioRef.current) {
      incomingAudioRef.current.pause();
      incomingAudioRef.current.currentTime = 0;
    }
  }, []);

  // Play ringing sound (outgoing call)
  const playRinging = useCallback(() => {
    if (ringingAudioRef.current) {
      ringingAudioRef.current.currentTime = 0;
      ringingAudioRef.current.play().catch(err => {
        console.error('Failed to play ringing sound:', err);
      });
    }
  }, []);

  // Play incoming call sound
  const playIncomingSound = useCallback(() => {
    if (incomingAudioRef.current) {
      incomingAudioRef.current.currentTime = 0;
      incomingAudioRef.current.play().catch(err => {
        console.error('Failed to play incoming call sound:', err);
      });
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop all ringtones
    stopRingtones();

    // Remove all audio elements
    audioElementsRef.current.forEach(el => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current = [];

    // Disconnect from room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    setState({
      isConnected: false,
      isInCall: false,
      isMuted: false,
      isConnecting: false,
      error: null
    });

    remoteUserIdRef.current = null;
  }, [stopRingtones]);

  // Start a call
  const startCall = useCallback(async (targetUserId: number, targetUserName: string) => {
    try {
      console.log('[Voice Call] Starting call to:', targetUserId, targetUserName);
      
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Play ringing sound
      playRinging();

      // Create call in database
      const response = await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          targetUserId,
          targetUserName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start call');
      }

      const { roomName, token } = await response.json();
      console.log('[Voice Call] Got room and token:', roomName);

      // Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      roomRef.current = room;
      remoteUserIdRef.current = targetUserId;

      // Handle remote participant audio
      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('[Voice Call] Track subscribed:', track.kind);
        
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.play();
          audioElementsRef.current.push(audioElement);
          
          // Stop ringing when audio starts
          stopRingtones();
          
          setState(prev => ({ ...prev, isConnected: true, isInCall: true, isConnecting: false }));
          
          // Notify that call was accepted
          if (onCallAccepted) {
            onCallAccepted();
          }
        }
      });

      // Handle participant disconnection
      room.on(RoomEvent.ParticipantDisconnected, () => {
        console.log('[Voice Call] Participant disconnected');
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      // Handle room disconnection
      room.on(RoomEvent.Disconnected, () => {
        console.log('[Voice Call] Room disconnected');
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      // Connect to room
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      console.log('[Voice Call] Connected to room');

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('[Voice Call] Microphone enabled');

    } catch (error) {
      console.error('[Voice Call] Error starting call:', error);
      stopRingtones();
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to start call', 
        isConnecting: false 
      }));
      cleanup();
    }
  }, [cleanup, onCallAccepted, onCallEnded, playRinging, stopRingtones]);

  // Accept an incoming call
  const acceptCall = useCallback(async (callerId: number, callerName: string) => {
    try {
      console.log('[Voice Call] Accepting call from:', callerId, callerName);
      
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Stop incoming call sound
      stopRingtones();

      // Notify backend that call was accepted
      const response = await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          callerId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to accept call');
      }

      const { roomName, token } = await response.json();
      console.log('[Voice Call] Got room and token:', roomName);

      // Connect to LiveKit room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      roomRef.current = room;
      remoteUserIdRef.current = callerId;

      // Handle remote participant audio
      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log('[Voice Call] Track subscribed:', track.kind);
        
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.play();
          audioElementsRef.current.push(audioElement);
          
          setState(prev => ({ ...prev, isConnected: true, isInCall: true, isConnecting: false }));
        }
      });

      // Handle participant disconnection
      room.on(RoomEvent.ParticipantDisconnected, () => {
        console.log('[Voice Call] Participant disconnected');
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      // Handle room disconnection
      room.on(RoomEvent.Disconnected, () => {
        console.log('[Voice Call] Room disconnected');
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      // Connect to room
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
      console.log('[Voice Call] Connected to room');

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log('[Voice Call] Microphone enabled');

      setState(prev => ({ ...prev, isConnected: true, isInCall: true, isConnecting: false }));

      // Notify that call was accepted
      if (onCallAccepted) {
        onCallAccepted();
      }

    } catch (error) {
      console.error('[Voice Call] Error accepting call:', error);
      stopRingtones();
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to accept call', 
        isConnecting: false 
      }));
      cleanup();
    }
  }, [cleanup, onCallAccepted, onCallEnded, stopRingtones]);

  // Reject an incoming call
  const rejectCall = useCallback(async (callerId: number) => {
    try {
      console.log('[Voice Call] Rejecting call from:', callerId);
      
      // Stop incoming call sound
      stopRingtones();

      // Notify backend that call was rejected
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          callerId
        })
      });

      cleanup();

    } catch (error) {
      console.error('[Voice Call] Error rejecting call:', error);
      stopRingtones();
      cleanup();
    }
  }, [cleanup, stopRingtones]);

  // End the current call
  const endCall = useCallback(async () => {
    try {
      console.log('[Voice Call] Ending call');
      
      // Stop all ringtones
      stopRingtones();

      // Notify backend
      if (remoteUserIdRef.current) {
        await fetch('/api/webrtc/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            targetUserId: remoteUserIdRef.current
          })
        });
      }

      cleanup();

      if (onCallEnded) {
        onCallEnded();
      }

    } catch (error) {
      console.error('[Voice Call] Error ending call:', error);
      stopRingtones();
      cleanup();
    }
  }, [cleanup, onCallEnded, stopRingtones]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;

    try {
      const newMutedState = !state.isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
      setState(prev => ({ ...prev, isMuted: newMutedState }));
      console.log('[Voice Call] Mute toggled:', newMutedState);
    } catch (error) {
      console.error('[Voice Call] Error toggling mute:', error);
    }
  }, [state.isMuted]);

  // Check for incoming calls
  useEffect(() => {
    if (!userId) return;

    const checkIncomingCalls = async () => {
      try {
        const response = await fetch('/api/webrtc/incoming-calls');
        if (response.ok) {
          const { hasIncomingCall, callerId, callerName } = await response.json();
          
          if (hasIncomingCall && callerId && onIncomingCall) {
            console.log('[Voice Call] Incoming call from:', callerId, callerName);
            
            // Play incoming call sound
            playIncomingSound();
            
            // Notify parent component
            onIncomingCall(callerId, callerName);
          }
        }
      } catch (error) {
        console.error('[Voice Call] Error checking incoming calls:', error);
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkIncomingCalls, 2000);

    return () => clearInterval(interval);
  }, [userId, onIncomingCall, playIncomingSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute
  };
}
