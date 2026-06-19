'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent } from '@/lib/realtime/chat';

interface GlobalNotificationListenerProps {
  currentUser: any;
}

export default function GlobalNotificationListener({ currentUser }: GlobalNotificationListenerProps) {
  const pathname = usePathname();
  const currentUserId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!currentUserId) return;

    // The channel name must match exactly what the backend sends
    const notificationChannelName = `user-notifications:${currentUserId}`;
    
    const channel = supabase.channel(notificationChannelName, {
      config: {
        broadcast: { self: false },
      },
    });
    
    channelRef.current = channel;

    channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUserId, pathname]);

  return null; 
}
