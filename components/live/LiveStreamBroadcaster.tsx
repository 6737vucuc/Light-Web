'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Eye, X, Users } from 'lucide-react';

interface LiveStreamBroadcasterProps {
  streamId: number;
  onEndStream: () => void;
}

function StreamStats() {
  const room = useRoomContext();
  const [viewersCount, setViewersCount] = useState(0);

  useEffect(() => {
    const updateViewers = () => {
      // Count participants excluding broadcaster
      const viewers = Array.from(room.participants.values()).filter(
        (p) => p.identity !== room.localParticipant.identity
      ).length;
      setViewersCount(viewers);
    };

    updateViewers();
    room.on('participantConnected', updateViewers);
    room.on('participantDisconnected', updateViewers);

    return () => {
      room.off('participantConnected', updateViewers);
      room.off('participantDisconnected', updateViewers);
    };
  }, [room]);

  return (
    <div className="absolute top-4 left-4 z-50 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2">
      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
      <span className="text-white font-semibold">LIVE</span>
      <div className="flex items-center gap-1 ml-2">
        <Eye className="w-4 h-4 text-white" />
        <span className="text-white font-semibold">{viewersCount}</span>
      </div>
    </div>
  );
}

export default function LiveStreamBroadcaster({
  streamId,
  onEndStream,
}: LiveStreamBroadcasterProps) {
  const [token, setToken] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  useEffect(() => {
    fetchToken();
  }, [streamId]);

  const fetchToken = async () => {
    try {
      const response = await fetch('/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, role: 'broadcaster' }),
      });

      if (!response.ok) {
        throw new Error('Failed to get stream token');
      }

      const data = await response.json();
      setToken(data.token);
      setRoomId(data.roomId);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching token:', error);
      setError('Failed to start stream');
      setLoading(false);
    }
  };

  const handleEndStream = async () => {
    // End stream
    await fetch(`/api/live/${streamId}`, {
      method: 'PATCH',
    });

    onEndStream();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Starting stream...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <button
            onClick={onEndStream}
            className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={handleEndStream}
      >
        <StreamStats />
        
        <button
          onClick={handleEndStream}
          className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg transition-all"
        >
          <X className="w-5 h-5" />
          End Stream
        </button>

        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
