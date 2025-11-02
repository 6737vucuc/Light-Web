import Image from 'next/image';
import { Shield } from 'lucide-react';

export default function SecurityLoading() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/30">
            <Image
              src="/logo.png"
              alt="Light of Life"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
            <Shield className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white" />
          </div>
        </div>

        {/* Message */}
        <p className="text-purple-100 text-sm">
          Loading...
        </p>
      </div>
    </div>
  );
}
