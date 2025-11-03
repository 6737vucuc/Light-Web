'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useToken,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { PhoneOff } from 'lucide-react';

interface VideoCallProps {
  callId: number;
  callType: 'video' | 'voice';
  onEndCall: () => void;
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
      
      console.log('Successfully connected to LiveKit room:', roomName);
      
    } catch (error: any) {
      console.error('Error fetching call details or token:', error);
      setError(error.message || 'Failed to join call');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    // End call
    try {
      await fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      });
      console.log('Call ended successfully');
    } catch (error) {
      console.error('Error ending call:', error);
    }

    onEndCall();
  };

  const handleError = (error: Error) => {
    console.error('LiveKit connection error:', error);
    setError(`Connection error: ${error.message}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">
            Connecting to call...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Initializing LiveKit connection
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md px-4">
          <PhoneOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Call Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={onEndCall}
            className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!token || !roomId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Preparing LiveKit room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900">
      <LiveKitRoom
        video={callType === 'video'}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={handleDisconnect}
        onError={handleError}
        connect={true}
        connectOptions={{
          autoSubscribe: true,
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <ControlBar 
          variation="verbose"
          controls={{
            camera: callType === 'video',
            microphone: true,
            screenShare: callType === 'video',
            leave: true,
          }}
        />
      </LiveKitRoom>
    </div>
  );
}
