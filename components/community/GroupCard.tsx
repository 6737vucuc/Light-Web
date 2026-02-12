'use client';

import { useState } from 'react';
import { ChevronRight, Users, MessageCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface GroupCardProps {
  group: any;
  onSelect: (group: any) => void;
}

export default function GroupCard({ group, onSelect }: GroupCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const DynamicIcon = ({ name, size = 24 }: { name: string; size?: number }) => {
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.Users;
    return <IconComponent size={size} />;
  };

  return (
    <div
      onClick={() => onSelect(group)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 hover:border-purple-200 hover:shadow-[0_30px_60px_-20px_rgba(124,58,237,0.15)] transition-all duration-500 cursor-pointer overflow-hidden group"
    >
      {/* Animated Background Accent */}
      <div
        className={`absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-[0.08] transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
        style={{
          backgroundColor: group.color,
          borderRadius: '0 0 0 100%',
        }}
      ></div>

      {/* Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/0 to-indigo-50/0 group-hover:from-purple-50/20 group-hover:to-indigo-50/20 transition-all duration-500 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-8">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-500 ${
              isHovered ? 'rotate-6 scale-110' : 'rotate-0 scale-100'
            }`}
            style={{
              backgroundColor: group.color,
              boxShadow: `0 10px 25px -5px ${group.color}40`,
            }}
          >
            <DynamicIcon name={group.icon} size={32} />
          </div>
          <div className="px-4 py-2 bg-gray-50 group-hover:bg-purple-50 rounded-2xl text-[10px] font-black text-gray-400 group-hover:text-purple-600 transition-colors uppercase tracking-widest">
            {group.members_count || 0} عضو
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-8 flex-1">
          <h4 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-purple-600 transition-colors line-clamp-1">
            {group.name}
          </h4>
          <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">
            {group.description || 'لا يوجد وصف متاح لهذه المجموعة حالياً.'}
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-gray-50 group-hover:border-purple-50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">الأعضاء</p>
              <p className="text-lg font-black text-gray-900">{group.members_count || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase">الرسائل</p>
              <p className="text-lg font-black text-gray-900">{group.messages_count || 0}</p>
            </div>
          </div>
        </div>

        {/* Footer with Avatar Stack and CTA */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-50 group-hover:border-purple-50 transition-colors">
          <div className="flex -space-x-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-xl border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 shadow-sm"
              ></div>
            ))}
            {group.members_count > 3 && (
              <div className="w-9 h-9 rounded-xl border-2 border-white bg-purple-50 flex items-center justify-center text-[10px] font-black text-purple-600 shadow-sm">
                +{group.members_count - 3}
              </div>
            )}
          </div>
          <div className={`w-10 h-10 bg-gray-50 group-hover:bg-purple-600 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-white transition-all transform ${
            isHovered ? 'translate-x-2' : 'translate-x-0'
          }`}>
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
