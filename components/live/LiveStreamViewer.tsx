'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  ParticipantTile,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Eye, X, Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface LiveStreamViewerProps {
  streamId: number;
  streamTitle: string;
  broadcasterName: string;
  broadcasterAvatar?: string;
  onLeave: () => void;
}

function ViewerStats() {
  const room = useRoomContext();
  const [viewersCount, setViewersCount] = useState(0);

  useEffect(() => {
    const updateViewers = () => {
      setViewersCount(room.numParticipants);
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
    <div className="flex items-center gap-1">
      <Eye className="w-4 h-4 text-white" />
      <span className="text-white font-semibold">{viewersCount}</span>
    </div>
  );
}

export default function LiveStreamViewer({
  streamId,
  streamTitle,
  broadcasterName,
  broadcasterAvatar,
  onLeave,
}: LiveStreamViewerProps) {
  const [token, setToken] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [comment, setComment] = useState('');

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  useEffect(() => {
    fetchToken();
    joinStream();

    return () => {
      leaveStream();
    };
  }, [streamId]);

  const fetchToken = async () => {
    try {
      const response = await fetch('/api/live/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId, role: 'viewer' }),
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
      setError('Failed to join stream');
      setLoading(false);
    }
  };

  const joinStream = async () => {
    try {
      await fetch(`/api/live/${streamId}/join`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error joining stream:', error);
    }
  };

  const leaveStream = async () => {
    try {
      await fetch(`/api/live/${streamId}/join`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  const handleLeave = () => {
    leaveStream();
    onLeave();
  };

  const handleSendComment = () => {
    if (comment.trim()) {
      // TODO: Send comment via LiveKit data channel
      setComment('');
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining stream...</p>
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
            onClick={onLeave}
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
        video={false}
        audio={true}
        token={token}
        serverUrl={livekitUrl}
        data-lk-theme="default"
        style={{ height: '100vh' }}
        onDisconnected={handleLeave}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                <Image
                  src={getAvatarUrl(broadcasterAvatar)}
                  alt={broadcasterName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="text-white font-semibold">{broadcasterName}</h3>
                <p className="text-white/80 text-sm">{streamTitle}</p>
              </div>
              <div className="ml-4 bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-semibold">LIVE</span>
              </div>
              <ViewerStats />
            </div>

            <button
              onClick={handleLeave}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Video */}
        <VideoConference />
        <RoomAudioRenderer />

        {/* Comment Input */}
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center gap-2">
            <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all">
              <Heart className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
              placeholder="Add a comment..."
              className="flex-1 bg-white/20 backdrop-blur-sm text-white placeholder-white/60 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              onClick={handleSendComment}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-all"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}
