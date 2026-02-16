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

    // The channel name must match exactly what the backend sends
    const notificationChannelName = `user-notifications:${currentUserId}`;
    
    console.log(`[NotificationListener] Subscribing to: ${notificationChannelName}`);

    const channel = supabase.channel(notificationChannelName, {
      config: {
        broadcast: { self: false },
      },
    });
    
    channelRef.current = channel;

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        console.log('[NotificationListener] Received payload:', payload);
        
        // Check if we are in the community page (as requested)
        const isCommunityPage = pathname.includes('/community');
        const isMessagesPage = pathname.includes('/messages');
        
        console.log(`[NotificationListener] Path check - Community: ${isCommunityPage}, Messages: ${isMessagesPage}`);

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
            audio.play().catch(err => console.error('[NotificationListener] Audio play error:', err)); 
          } catch (e) {
            console.error('[NotificationListener] Audio error:', e);
          }
        }
      })
      .subscribe((status) => {
        console.log(`[NotificationListener] Subscription status for ${notificationChannelName}:`, status);
      });

    return () => {
      if (channelRef.current) {
        console.log(`[NotificationListener] Unsubscribing from: ${notificationChannelName}`);
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, pathname, toast]);

  return null; 
}
