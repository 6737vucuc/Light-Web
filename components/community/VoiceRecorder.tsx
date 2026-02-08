'use client';

import { Mic, X, Check, Trash2 } from 'lucide-react';
import { useVoiceMessage } from '@/lib/hooks/useVoiceMessage';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceRecorder({ onSend, isOpen, onClose }: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    isPlaying,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    cancelRecording,
    formatDuration,
  } = useVoiceMessage();

  if (!isOpen) return null;

  const handleSend = async () => {
    if (audioBlob) {
      await onSend(audioBlob);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-sm w-full border border-white/20 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-black text-gray-900">Voice Message</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Recording Area */}
        <div className="flex flex-col items-center gap-6">
          
          {/* Waveform Visualization */}
          {isRecording && (
            <div className="flex items-center gap-1 h-16">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-600 to-blue-600 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                ></div>
              ))}
            </div>
          )}

          {/* Duration Display */}
          <div className="text-center">
            <p className="text-4xl font-black text-purple-600 tracking-tight">
              {formatDuration(duration)}
            </p>
            <p className="text-sm text-gray-500 font-bold mt-2">
              {isRecording ? 'Recording...' : audioBlob ? 'Ready to send' : 'Ready to record'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 w-full">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-200"
              >
                <Mic size={24} />
                Start Recording
              </button>
            )}

            {isRecording && (
              <>
                <button
                  onClick={stopRecording}
                  className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all"
                >
                  Stop
                </button>
                <button
                  onClick={cancelRecording}
                  className="w-14 h-14 bg-red-500 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}

            {audioBlob && !isRecording && (
              <>
                <button
                  onClick={isPlaying ? stopPlayback : playRecording}
                  className="flex-1 bg-blue-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all"
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
                <button
                  onClick={handleSend}
                  className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  <Check size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
