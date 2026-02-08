'use client';

import { useState } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  senderName: string;
  timestamp: Date;
  isMine: boolean;
}

export default function VoiceMessagePlayer({
  audioUrl,
  duration = 0,
  senderName,
  timestamp,
  isMine
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audio] = useState(() => new Audio(audioUrl));

  const handlePlayPause = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-[1.5rem] ${
      isMine 
        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white' 
        : 'bg-white text-gray-800 border border-gray-100'
    }`}>
      <button
        onClick={handlePlayPause}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMine
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {isPlaying ? (
          <Pause size={18} className={isMine ? 'text-white' : 'text-gray-800'} />
        ) : (
          <Play size={18} className={isMine ? 'text-white' : 'text-gray-800'} />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
            <div
              className={`h-full ${isMine ? 'bg-white' : 'bg-purple-600'} transition-all`}
              style={{ width: `${(currentTime / duration) * 100}%` }}
            ></div>
          </div>
        </div>
        <span className="text-[10px] font-black opacity-70">{formatTime(duration)}</span>
      </div>

      <button className={`flex-shrink-0 p-2 rounded-full transition-all ${
        isMine ? 'hover:bg-white/10' : 'hover:bg-gray-100'
      }`}>
        <Download size={16} />
      </button>
    </div>
  );
}
