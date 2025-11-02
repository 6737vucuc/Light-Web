'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LiveStreamBroadcaster from '@/components/live/LiveStreamBroadcaster';
import LiveStreamViewer from '@/components/live/LiveStreamViewer';
import SecurityLoading from '@/components/SecurityLoading';

export default function LiveStreamPage() {
  const router = useRouter();
  const params = useParams();
  const streamId = parseInt(params?.streamId as string);

  const [loading, setLoading] = useState(true);
  const [streamData, setStreamData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (streamId) {
      fetchUserAndStream();
    }
  }, [streamId]);

  const fetchUserAndStream = async () => {
    try {
      // Get current user
      const userResponse = await fetch('/api/auth/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUserId(userData.user.id);
      }

      // Get stream data
      const streamResponse = await fetch(`/api/live/${streamId}`);
      if (streamResponse.ok) {
        const data = await streamResponse.json();
        setStreamData(data.stream);
      } else {
        setError('Stream not found');
      }
    } catch (error) {
      console.error('Error fetching stream:', error);
      setError('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    router.push('/community');
  };

  if (loading) {
    return <SecurityLoading />;
  }

  if (error || !streamData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Stream not found'}</p>
          <button
            onClick={() => router.push('/community')}
            className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isBroadcaster = currentUserId === streamData.userId;

  return isBroadcaster ? (
    <LiveStreamBroadcaster streamId={streamId} onEndStream={handleLeave} />
  ) : (
    <LiveStreamViewer
      streamId={streamId}
      streamTitle={streamData.title}
      broadcasterName={streamData.userName}
      broadcasterAvatar={streamData.userAvatar}
      onLeave={handleLeave}
    />
  );
}
