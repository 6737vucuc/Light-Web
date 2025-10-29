import Image from 'next/image';
import { Shield, Lock, Key, CheckCircle } from 'lucide-react';

export default function SecurityLoading() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 animate-pulse">
          <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/30">
            <Image
              src="/logo.png"
              alt="Light of Life"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Securing Your Connection
        </h1>

        {/* Security Features */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-center text-purple-200">
            <Shield className="w-5 h-5 mr-2" />
            <span className="text-sm">End-to-End Encryption Enabled</span>
          </div>
          <div className="flex items-center justify-center text-purple-200">
            <Lock className="w-5 h-5 mr-2" />
            <span className="text-sm">AES-256-GCM Protection</span>
          </div>
          <div className="flex items-center justify-center text-purple-200">
            <Key className="w-5 h-5 mr-2" />
            <span className="text-sm">RSA-OAEP Key Exchange</span>
          </div>
          <div className="flex items-center justify-center text-green-300">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold">Your Privacy is Protected</span>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
            <Shield className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white" />
          </div>
        </div>

        {/* Message */}
        <p className="text-purple-100 text-sm">
          Initializing secure communication channel...
        </p>

        {/* Security Badge */}
        <div className="mt-8 inline-block px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
          <p className="text-white text-xs font-semibold">
            🔒 ULTRA-SECURE ENVIRONMENT
          </p>
        </div>
      </div>
    </div>
  );
}

