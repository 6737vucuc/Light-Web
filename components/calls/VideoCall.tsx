'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Track } from 'livekit-client';

interface VideoCallProps {
  callId: number;
  callType: 'voice';
  onEndCall: () => void;
}

function VoiceCallUI({ onEndCall, callId }: { onEndCall: () => void; callId: number }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Microphone], { onlySubscribed: false });

  // Start timer when connected
  useEffect(() => {
    if (room && room.state === 'connected') {
      setIsConnected(true);
    }
  }, [room]);

  // Call duration timer
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = async () => {
    if (room?.localParticipant) {
      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (audioTrack) {
        if (isMuted) {
          await audioTrack.unmute();
        } else {
          await audioTrack.mute();
        }
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Note: Speaker control is handled by the device
  };

  const handleEndCall = async () => {
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended', duration: callDuration }),
      });
    } catch (error) {
      console.error('Error ending call:', error);
    }
    
    if (room) {
      room.disconnect();
    }
    onEndCall();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="text-center mb-12">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-lg mx-auto mb-6 flex items-center justify-center">
          <Volume2 className="w-16 h-16 text-white animate-pulse" />
        </div>

        {/* Call Status */}
        <h2 className="text-white text-2xl font-bold mb-2">
          {isConnected ? 'Voice Call' : 'Connecting...'}
        </h2>
        
        {/* Call Duration */}
        <div className="text-white/80 text-lg font-mono">
          {isConnected ? formatDuration(callDuration) : '00:00'}
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-6 items-center">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white/20 hover:bg-white/30 backdrop-blur-lg'
          }`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOff className="w-7 h-7 text-white" />
          ) : (
            <Mic className="w-7 h-7 text-white" />
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
          aria-label="End Call"
        >
          <PhoneOff className="w-9 h-9 text-white" />
        </button>

        {/* Speaker Button */}
        <button
          onClick={toggleSpeaker}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            isSpeakerOn
              ? 'bg-white/20 hover:bg-white/30 backdrop-blur-lg'
              : 'bg-gray-500 hover:bg-gray-600'
          }`}
          aria-label={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
        >
          {isSpeakerOn ? (
            <Volume2 className="w-7 h-7 text-white" />
          ) : (
            <VolumeX className="w-7 h-7 text-white" />
          )}
        </button>
      </div>

      {/* Audio Renderer */}
      <RoomAudioRenderer />
    </div>
  );
}

export default function VideoCall({ callId, callType, onEndCall }: VideoCallProps) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Get LiveKit URL from environment variable
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://light-web-4bn0nvjb.livekit.cloud';

  useEffect(() => {
    fetchCallDetailsAndToken();
  }, [callId]);

  const fetchCallDetailsAndToken = async () => {
    try {
      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (permError: any) {
        console.error('Microphone permission error:', permError);
        if (permError.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access in your browser settings and refresh the page.');
        } else if (permError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw new Error(`Microphone error: ${permError.message}`);
        }
      }

      // 1. Fetch call details to get the LiveKit room ID
      const callDetailsResponse = await fetch(`/api/calls/${callId}`);
      if (!callDetailsResponse.ok) {
        const errorData = await callDetailsResponse.json();
        throw new Error(errorData.error || 'Failed to fetch call details');
      }
      const callDetails = await callDetailsResponse.json();
      const roomName = callDetails.call.roomId;

      if (!roomName) {
        throw new Error('Room ID not found in call details');
      }

      // 2. Fetch token from the LiveKit API route
      const tokenResponse = await fetch(`/api/livekit/token?room=${roomName}&publisher=true`);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get call token');
      }

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.token) {
        throw new Error('Token not received from server');
      }

      setToken(tokenData.token);
      setRoomId(roomName);
      setLoading(false);
      
      console.log('Successfully prepared LiveKit connection:', roomName);
      
    } catch (error: any) {
      console.error('Error fetching call details or token:', error);
      setError(error.message || 'Failed to join call');
      setLoading(false);
    }
  };

  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error);
    if (error.message.includes('denied') || error.message.includes('permission')) {
      setError('Microphone access denied. Please allow microphone access in your browser settings.');
    } else {
      setError(`Connection error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">
            Connecting to call...
          </p>
          <p className="text-white/60 text-sm mt-2">
            Requesting microphone access
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center max-w-md px-4">
          <PhoneOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Call Failed</h2>
          <p className="text-white/80 mb-6">{error}</p>
          <button
            onClick={onEndCall}
            className="px-6 py-3 bg-white text-purple-900 rounded-lg hover:bg-gray-100 transition font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!token || !roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Preparing call...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={livekitUrl}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onError={handleError}
      connect={true}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <VoiceCallUI onEndCall={onEndCall} callId={callId} />
    </LiveKitRoom>
  );
}
