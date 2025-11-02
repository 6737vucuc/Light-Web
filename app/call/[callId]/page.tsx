'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VideoCall from '@/components/calls/VideoCall';
import SecurityLoading from '@/components/SecurityLoading';

export default function CallPage() {
  const router = useRouter();
  const params = useParams();
  const callId = parseInt(params?.callId as string);

  const [loading, setLoading] = useState(true);
  const [callData, setCallData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (callId) {
      fetchCallData();
    }
  }, [callId]);

  const fetchCallData = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}`);
      if (response.ok) {
        const data = await response.json();
        setCallData(data.call);
      } else {
        setError('Call not found');
      }
    } catch (error) {
      console.error('Error fetching call:', error);
      setError('Failed to load call');
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    router.push('/messages');
  };

  if (loading) {
    return <SecurityLoading />;
  }

  if (error || !callData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || 'Call not found'}</p>
          <button
            onClick={() => router.push('/messages')}
            className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoCall
      callId={callId}
      callType={callData.callType}
      onEndCall={handleEndCall}
    />
  );
}
