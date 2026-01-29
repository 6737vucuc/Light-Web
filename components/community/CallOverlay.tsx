'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface CallOverlayProps {
  callStatus: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  otherUser: {
    name: string;
    avatar: string | null;
  };
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export default function CallOverlay({ callStatus, otherUser, onAccept, onReject, onEnd }: CallOverlayProps) {
  const t = useTranslations('messages');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callStatus === 'idle' || callStatus === 'ended') setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
      {/* User Info */}
      <div className="flex flex-col items-center mb-12">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500 shadow-2xl mb-6 animate-pulse">
          <Image 
            src={otherUser.avatar || '/default-avatar.png'} 
            alt={otherUser.name} 
            fill 
            className="object-cover"
            unoptimized
          />
        </div>
        <h2 className="text-3xl font-bold mb-2">{otherUser.name}</h2>
        <p className="text-purple-300 font-medium">
          {callStatus === 'calling' && t('calling')}
          {callStatus === 'incoming' && t('incomingCall')}
          {callStatus === 'connected' && formatDuration(duration)}
          {callStatus === 'ended' && t('callEnded')}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {callStatus === 'connected' && (
          <div className="flex justify-center gap-6 w-full mb-4">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button 
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-4 rounded-full transition-all ${!isSpeakerOn ? 'bg-gray-600' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-12 w-full">
          {callStatus === 'incoming' ? (
            <>
              <button 
                onClick={onReject}
                className="p-6 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-lg hover:scale-110"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              <button 
                onClick={onAccept}
                className="p-6 bg-green-500 rounded-full hover:bg-green-600 transition-all shadow-lg hover:scale-110 animate-bounce"
              >
                <Phone className="w-8 h-8" />
              </button>
            </>
          ) : (
            <button 
              onClick={onEnd}
              className="p-6 bg-red-500 rounded-full hover:bg-red-600 transition-all shadow-lg hover:scale-110"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
