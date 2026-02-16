'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { useToast } from '@/lib/contexts/ToastContext';
import { Bell } from 'lucide-react';

interface GlobalNotificationListenerProps {
  currentUser: any;
}

export default function GlobalNotificationListener({ currentUser }: GlobalNotificationListenerProps) {
  const toast = useToast();
  const pathname = usePathname();
  const currentUserId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUserId) return;

    // Listen to the recipient's global notification channel
    const notificationChannelName = `user-notifications:${currentUserId}`;
    const channel = supabase.channel(notificationChannelName, {
      config: {
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        // IMPORTANT: Only show notification if the user is INSIDE the community/groups page
        // and NOT already in the private messages page
        const isCommunityPage = pathname.includes('/community');
        const isMessagesPage = pathname.includes('/messages');
        
        if (isCommunityPage && !isMessagesPage) {
          toast.show(
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Bell size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">New Private Message</p>
                <p className="text-sm font-bold text-slate-900">{payload.senderName}</p>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{payload.content}</p>
              </div>
            </div>,
            'info'
          );
          
          // Play a subtle notification sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.volume = 0.4;
            audio.play().catch(() => {}); 
          } catch (e) {}
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, pathname, toast]);

  return null; 
}
