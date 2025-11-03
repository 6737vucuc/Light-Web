'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
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
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const livekitUrl = process.env.LIVEKIT_URL || 'wss://light-web-4bn0nvjb.livekit.cloud';

  useEffect(() => {
    fetchToken();
  }, [callId]);

  const fetchToken = async () => {
    try {
      // Use the callId as the LiveKit room name
      const roomName = `call-${callId}`;
      
      // Fetch token from the new LiveKit API route
      const response = await fetch(`/api/livekit/token?room=${roomName}&publisher=true`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get call token');
      }

      const data = await response.json();
      setToken(data.token);
      setRoomId(roomName);
      setLoading(false);

      // NOTE: The call status update logic is removed here. 
      // It should be handled by the application's core logic 
      // (e.g., when a user initiates a call).
      
    } catch (error: any) {
      console.error('Error fetching token:', error);
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
    } catch (error) {
      console.error('Error ending call:', error);
    }

    onEndCall();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">
            Connecting to call...
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
            className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
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
        onDisconnected={onEndCall}
        onError={(error) => {
          console.error('LiveKit error:', error);
          setError('Connection error: ' + error.message);
        }}
        connect={true}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <ControlBar />
      </LiveKitRoom>
    </div>
  );
}
