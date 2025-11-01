'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import Peer, { MediaConnection } from 'peerjs';

interface VoiceCallProps {
  currentUserId: number;
  targetUserId: number;
  targetUserName: string;
  onClose: () => void;
  isIncoming?: boolean;
  incomingCall?: MediaConnection;
}

export default function VoiceCall({
  currentUserId,
  targetUserId,
  targetUserName,
  onClose,
  isIncoming = false,
  incomingCall,
}: VoiceCallProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializePeer();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);

  const initializePeer = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      localStreamRef.current = stream;

      // Initialize PeerJS
      const peer = new Peer(`user-${currentUserId}`, {
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        
        if (isIncoming && incomingCall) {
          // Answer incoming call
          answerCall(incomingCall);
        } else {
          // Make outgoing call
          makeCall();
        }
      });

      peer.on('call', (call) => {
        // Answer the call with local stream
        call.answer(stream);
        handleCall(call);
      });

      peer.on('error', (error) => {
        console.error('Peer error:', error);
        setCallStatus('ended');
      });

    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access microphone. Please check permissions.');
      onClose();
    }
  };

  const makeCall = () => {
    if (!peerRef.current || !localStreamRef.current) return;

    setCallStatus('ringing');
    
    const call = peerRef.current.call(
      `user-${targetUserId}`,
      localStreamRef.current
    );

    if (call) {
      callRef.current = call;
      handleCall(call);
    }
  };

  const answerCall = (call: MediaConnection) => {
    if (!localStreamRef.current) return;

    setCallStatus('connecting');
    call.answer(localStreamRef.current);
    callRef.current = call;
    handleCall(call);
  };

  const handleCall = (call: MediaConnection) => {
    call.on('stream', (remoteStream) => {
      setCallStatus('connected');
      
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play();
      }
    });

    call.on('close', () => {
      setCallStatus('ended');
      setTimeout(onClose, 2000);
    });

    call.on('error', (error) => {
      console.error('Call error:', error);
      setCallStatus('ended');
      setTimeout(onClose, 2000);
    });
  };

  const endCall = () => {
    setCallStatus('ended');
    cleanup();
    setTimeout(onClose, 1000);
  };

  const cleanup = () => {
    if (callRef.current) {
      callRef.current.close();
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerRef.current) {
      peerRef.current.destroy();
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay />
      
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-blue-500 z-50 flex items-center justify-center">
        <div className="text-center text-white p-8 max-w-md w-full">
          {/* Avatar */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-2xl">
              <span className="text-6xl font-bold text-white">
                {targetUserName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Name */}
          <h2 className="text-3xl font-bold mb-2">{targetUserName}</h2>

          {/* Status */}
          <p className="text-xl text-white/90 mb-12">
            {getStatusText()}
          </p>

          {/* Call Animation */}
          {callStatus === 'ringing' && (
            <div className="mb-12 flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-white/30 animate-ping absolute"></div>
                <div className="w-16 h-16 rounded-full bg-white/40 relative flex items-center justify-center">
                  <Phone className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
          )}

          {/* Connected Indicator */}
          {callStatus === 'connected' && (
            <div className="mb-12 flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-white rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 30}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-6">
            {callStatus === 'connected' && (
              <>
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    isMuted
                      ? 'bg-white text-purple-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-7 h-7" />
                  ) : (
                    <Mic className="w-7 h-7" />
                  )}
                </button>

                {/* Speaker Button */}
                <button
                  onClick={toggleSpeaker}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    !isSpeakerOn
                      ? 'bg-white text-purple-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isSpeakerOn ? (
                    <Volume2 className="w-7 h-7" />
                  ) : (
                    <VolumeX className="w-7 h-7" />
                  )}
                </button>
              </>
            )}

            {/* End Call Button */}
            {callStatus !== 'ended' && (
              <button
                onClick={endCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-xl"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
            )}
          </div>

          {/* Call Ended Message */}
          {callStatus === 'ended' && (
            <div className="mt-8">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
                <PhoneOff className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg text-white/80">Call ended</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
