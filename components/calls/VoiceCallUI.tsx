'use client';

import { Phone, PhoneOff, Mic, MicOff, Volume2, X } from 'lucide-react';
import Image from 'next/image';

interface VoiceCallUIProps {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  callerName: string | null;
  callerAvatar: string | null;
  receiverName?: string;
  receiverAvatar?: string;
  isMuted: boolean;
  isSpeaker: boolean;
  callDuration: string;
  onAccept: () => void;
  onDecline: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
}

export default function VoiceCallUI({
  isInCall,
  isCalling,
  isReceivingCall,
  callerName,
  callerAvatar,
  receiverName,
  receiverAvatar,
  isMuted,
  isSpeaker,
  callDuration,
  onAccept,
  onDecline,
  onEndCall,
  onToggleMute,
  onToggleSpeaker,
}: VoiceCallUIProps) {
  const displayName = isReceivingCall ? callerName : receiverName;
  const displayAvatar = isReceivingCall ? callerAvatar : receiverAvatar;

  const getAvatarUrl = (avatar: string | null): string => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (!isInCall && !isCalling && !isReceivingCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 z-50 flex flex-col items-center justify-center">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar */}
        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-white/10 shadow-2xl mb-6 ${isCalling || isReceivingCall ? 'animate-pulse' : ''}`}>
          {displayAvatar ? (
            <Image
              src={getAvatarUrl(displayAvatar)}
              alt={displayName || 'User'}
              width={160}
              height={160}
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-4xl">
              {displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Name */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {displayName || 'Unknown'}
        </h2>

        {/* Status */}
        <p className="text-white/70 text-lg mb-8">
          {isReceivingCall && 'Incoming Call...'}
          {isCalling && 'Calling...'}
          {isInCall && callDuration}
        </p>

        {/* Call Animation for Incoming/Outgoing */}
        {(isCalling || isReceivingCall) && (
          <div className="mb-8 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce delay-200"></div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          {/* In Call Controls */}
          {isInCall && (
            <>
              <button
                onClick={onToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={onEndCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-500/50"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={onToggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isSpeaker ? 'bg-blue-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Calling Controls */}
          {isCalling && (
            <button
              onClick={onEndCall}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-500/50"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          )}

          {/* Incoming Call Controls */}
          {isReceivingCall && (
            <>
              <button
                onClick={onDecline}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-500/50"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={onAccept}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg shadow-green-500/50 animate-pulse"
              >
                <Phone className="w-7 h-7" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio id="remote-audio" autoPlay playsInline className="hidden" />
    </div>
  );
}
