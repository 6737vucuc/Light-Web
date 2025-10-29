import { useEffect, useRef, useState, useCallback } from 'react';
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

  // Cleanup function
  const cleanup = useCallback(() => {
    // Remove all audio elements
    audioElementsRef.current.forEach(el => {
      el.pause();
      el.srcObject = null;
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    audioElementsRef.current = [];

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    remoteUserIdRef.current = null;
    setState({
      isConnected: false,
      isInCall: false,
      isMuted: false,
      isConnecting: false,
      error: null
    });
  }, []);

  // Listen for incoming calls via polling
  useEffect(() => {
    if (!userId || userId === 0) return;

    const checkIncomingCalls = async () => {
      try {
        const response = await fetch('/api/webrtc/call');
        if (response.ok) {
          const data = await response.json();
          if (data.incomingCall && onIncomingCall) {
            onIncomingCall(data.incomingCall.callerId, data.incomingCall.callerName);
          }
        }
      } catch (error) {
        console.error('Error checking incoming calls:', error);
      }
    };

    const interval = setInterval(checkIncomingCalls, 2000);
    return () => clearInterval(interval);
  }, [userId, onIncomingCall]);

  // Start a voice call
  const startCall = useCallback(async (targetUserId: number) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Notify the target user about incoming call
      const notifyResponse = await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          targetUserId
        })
      });

      if (!notifyResponse.ok) {
        throw new Error('Failed to notify target user');
      }

      // Get LiveKit token from server
      const tokenResponse = await fetch('/api/webrtc/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: getCallRoomName(userId, targetUserId),
          participantIdentity: getParticipantIdentity(userId, userName)
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const { token, url } = await tokenResponse.json();

      // Create and connect to room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      roomRef.current = room;
      remoteUserIdRef.current = targetUserId;

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
          audioElementsRef.current.push(audioElement);
          audioElement.play().catch(e => console.error('Error playing audio:', e));
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        setState(prev => ({ ...prev, isInCall: true, isConnecting: false }));
        if (onCallAccepted) {
          onCallAccepted();
        }
      });

      // Connect to room
      await room.connect(url, token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        isConnecting: false
      }));

    } catch (error) {
      console.error('Error starting call:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start call',
        isConnecting: false
      }));
      cleanup();
    }
  }, [userId, userName, cleanup, onCallEnded, onCallAccepted]);

  // Accept an incoming call
  const acceptCall = useCallback(async (callerUserId: number) => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }));

      // Notify caller that call was accepted
      await fetch('/api/webrtc/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          targetUserId: callerUserId
        })
      });

      // Get LiveKit token
      const tokenResponse = await fetch('/api/webrtc/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: getCallRoomName(userId, callerUserId),
          participantIdentity: getParticipantIdentity(userId, userName)
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const { token, url } = await tokenResponse.json();

      // Create and connect to room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      roomRef.current = room;
      remoteUserIdRef.current = callerUserId;

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
          audioElementsRef.current.push(audioElement);
          audioElement.play().catch(e => console.error('Error playing audio:', e));
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        cleanup();
        if (onCallEnded) {
          onCallEnded();
        }
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
      });

      // Connect to room
      await room.connect(url, token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);

      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        isInCall: true,
        isConnecting: false
      }));

      if (onCallAccepted) {
        onCallAccepted();
      }

    } catch (error) {
      console.error('Error accepting call:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to accept call',
        isConnecting: false
      }));
      cleanup();
    }
  }, [userId, userName, cleanup, onCallEnded, onCallAccepted]);

  // Reject an incoming call
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

  // End the current call
  const endCall = useCallback(async () => {
    if (remoteUserIdRef.current) {
      try {
        await fetch('/api/webrtc/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            targetUserId: remoteUserIdRef.current
          })
        });
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }
    cleanup();
    if (onCallEnded) {
      onCallEnded();
    }
  }, [cleanup, onCallEnded]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (roomRef.current) {
      const newMutedState = !state.isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState);
      setState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [state.isMuted]);

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
