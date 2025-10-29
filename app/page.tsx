import Image from 'next/image';
import Link from 'next/link';
import { Heart, BookOpen, Users, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 to-blue-500 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-2xl ring-4 ring-white/30">
                <Image
                  src="/logo.png"
                  alt="Light of Life"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ✨ Spreading the Love and Peace of Jesus Christ ✨
            </h1>
            <p className="text-lg md:text-xl text-purple-100 max-w-3xl mx-auto italic">
              "Illuminating hearts with His love, walking in His grace, and sharing His eternal peace."
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Our Ministry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<BookOpen className="w-12 h-12" />}
              title="Biblical Lessons"
              description="Explore in-depth Bible studies and teachings to grow in faith"
            />
            <FeatureCard
              icon={<Heart className="w-12 h-12" />}
              title="Prayer Support"
              description="Share your prayer requests and receive support from our community"
            />
            <FeatureCard
              icon={<Users className="w-12 h-12" />}
              title="Community"
              description="Connect with believers worldwide through our chat and forums"
            />
            <FeatureCard
              icon={<Shield className="w-12 h-12" />}
              title="Secure & Private"
              description="End-to-end encrypted messaging for your privacy and security"
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Begin Your Journey with Christ
          </h2>
          <p className="text-xl mb-8">
            Join thousands of believers growing in faith together
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
      <div className="text-purple-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

