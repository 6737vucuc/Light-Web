'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface CallOverlayProps {
  callStatus: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  callType?: 'audio' | 'video';
  otherUser: {
    name: string;
    avatar: string | null;
  };
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export default function CallOverlay({ callStatus, callType = 'audio', otherUser, onAccept, onReject, onEnd }: CallOverlayProps) {
  const t = useTranslations('messages');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (callStatus === 'connected') {
      // Start timer when connected
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      // Stop ringing sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    } else if (callStatus === 'calling' || callStatus === 'incoming') {
      // Play ringing sound
      if (!audioRef.current && typeof window !== 'undefined') {
        audioRef.current = new Audio(
          callStatus === 'calling' 
            ? 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3' // Outgoing ring
            : 'https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3' // Incoming ring
        );
        audioRef.current.loop = true;
        audioRef.current.play().catch(e => console.error("Audio play error:", e));
      }
    } else {
      // Stop timer and sounds for idle/ended
      if (timerRef.current) clearInterval(timerRef.current);
      if (callStatus === 'idle' || callStatus === 'ended') {
        setDuration(0);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      }
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (callStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#1b1b1b] flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
      {/* Video Elements (Hidden or Visible) */}
      {callType === 'video' && callStatus === 'connected' && (
        <div className="absolute inset-0 z-0">
          <video id="remoteVideo" autoPlay playsInline className="w-full h-full object-cover" />
          <video id="localVideo" autoPlay playsInline muted className="absolute bottom-24 right-6 w-32 h-48 object-cover rounded-2xl border-2 border-white/20 shadow-2xl" />
        </div>
      )}

      {/* User Info Overlay */}
      <div className={`relative z-10 flex flex-col items-center ${callType === 'video' && callStatus === 'connected' ? 'mb-auto mt-12' : 'mb-12'}`}>
        <div className={`relative w-32 h-32 rounded-full overflow-hidden border-4 ${callStatus === 'connected' ? 'border-blue-500' : 'border-gray-600'} shadow-2xl mb-6 ${callStatus === 'calling' || callStatus === 'incoming' ? 'animate-pulse' : ''}`}>
          <Image 
            src={getAvatarUrl(otherUser.avatar)} 
            alt={otherUser.name} 
            fill 
            className="object-cover"
            unoptimized
          />
        </div>
        <h2 className="text-3xl font-bold mb-2 drop-shadow-lg">{otherUser.name}</h2>
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-1 rounded-full">
          {callStatus === 'connected' && <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>}
          <p className={`${callStatus === 'connected' ? 'text-green-400' : 'text-gray-300'} font-medium text-sm`}>
            {callStatus === 'calling' && (callType === 'video' ? 'Signal Video Calling...' : 'Signal Calling...')}
            {callStatus === 'incoming' && (callType === 'video' ? 'Incoming Video Call' : 'Incoming Voice Call')}
            {callStatus === 'connected' && formatDuration(duration)}
            {callStatus === 'ended' && 'Call Ended'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs">
        {callStatus === 'connected' && (
          <div className="flex justify-center gap-6 w-full mb-4">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-5 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20 backdrop-blur-md'}`}
            >
              {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            {callType === 'video' && (
              <button className="p-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all">
                <Camera className="w-7 h-7" />
              </button>
            )}
            <button 
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-5 rounded-full transition-all ${!isSpeakerOn ? 'bg-gray-600' : 'bg-white/10 hover:bg-white/20 backdrop-blur-md'}`}
            >
              {isSpeakerOn ? <Volume2 className="w-7 h-7" /> : <VolumeX className="w-7 h-7" />}
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
