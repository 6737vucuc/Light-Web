'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, BookOpen, Users, Shield } from 'lucide-react';
import DailyVerse from '@/components/verses/DailyVerse';
import DailyVerseSection from '@/components/verses/DailyVerseSection';
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('home');
  const tCommon = useTranslations('common');

  return (
    <div className="min-h-screen">
      {/* Daily Verse Modal */}
      <DailyVerse />
      
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
              ✨ {t('heroTitle')} ✨
            </h1>
            <p className="text-lg md:text-xl text-purple-100 max-w-3xl mx-auto italic">
              "{t('heroSubtitle')}"
            </p>
          </div>
        </div>
      </section>

      {/* Daily Verse Section */}
      <DailyVerseSection />

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            {t('ourMinistry')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<BookOpen className="w-12 h-12" />}
              title={t('biblicalLessons')}
              description={t('biblicalLessonsDesc')}
            />
            <FeatureCard
              icon={<Heart className="w-12 h-12" />}
              title={t('prayerSupport')}
              description={t('prayerSupportDesc')}
            />
            <FeatureCard
              icon={<Users className="w-12 h-12" />}
              title={t('communityTitle')}
              description={t('communityDesc')}
            />
            <FeatureCard
              icon={<Shield className="w-12 h-12" />}
              title={t('securePrivate')}
              description={t('securePrivateDesc')}
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            {t('beginJourney')}
          </h2>
          <p className="text-xl mb-8">
            {t('joinThousands')}
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
