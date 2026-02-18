'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChatService, PresenceUser, ChatEvent } from '@/lib/realtime/chat';

interface OnlineMember {
  userId: string | number;
  userName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
}

interface PresenceStats {
  totalMembers: number;
  onlineMembers: number;
  offlineMembers: number;
  onlinePercentage: number;
  members: OnlineMember[];
}

/**
 * Hook for managing real-time presence in a group using Supabase Realtime
 * Tracks online/offline status and broadcasts updates
 */
export function usePresence(
  groupId: string | number,
  userId: string | number,
  userName?: string,
  avatar?: string
) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [presenceStats, setPresenceStats] = useState<PresenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const channelRef = useRef<any>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to update count based on unique members
  const updateUniqueCount = (members: OnlineMember[]) => {
    const uniqueIds = new Set(members.map(m => String(m.userId)));
    setOnlineMembersCount(uniqueIds.size);
  };

  // Initialize presence
  useEffect(() => {
    if (!groupId || !userId) return;
    initializePresence();
    return () => {
      cleanupPresence();
    };
  }, [groupId, userId, userName, avatar]);

  const initializePresence = async () => {
    try {
      setIsLoading(true);

      // Get initial presence stats
      const statsResponse = await fetch(`/api/groups/${groupId}/presence`).catch(() => null);
      if (statsResponse && statsResponse.ok) {
        const stats = await statsResponse.json().catch(() => null);
        if (stats) {
          setPresenceStats(stats);
          const members = stats.members || [];
          setOnlineMembers(members);
          updateUniqueCount(members);
        }
      }

      // Update user's presence
      if (userId) {
        await updatePresence('online').catch(err => console.error('Initial presence update failed:', err));
      }

      // Setup Supabase Realtime listeners
      setupRealtimeListeners();

      // Poll for presence updates every 30 seconds
      presenceIntervalRef.current = setInterval(() => {
        if (userId) {
          updatePresence('online').catch(err => console.error('Interval presence update failed:', err));
        }
      }, 30000);
    } catch (error) {
      console.error('Error initializing presence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePresence = useCallback(
    async (status: 'online' | 'away' | 'offline') => {
      try {
        await fetch(`/api/groups/${groupId}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            status,
            userName,
            avatar,
          }),
        });

        // Broadcast presence update via Supabase Realtime
        const channelName = RealtimeChatService.getGroupChannelName(groupId);
        const channel = supabase.channel(channelName);
        await channel.send({
          type: 'broadcast',
          event: ChatEvent.PRESENCE_UPDATE,
          payload: {
            userId,
            userName,
            avatar,
            status,
            lastSeen: new Date(),
          },
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    },
    [groupId, userId, userName, avatar]
  );

  const setupRealtimeListeners = () => {
    try {
      const channelName = RealtimeChatService.getGroupChannelName(groupId);
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      });

      // Broadcast user joined
      channel.send({
        type: 'broadcast',
        event: ChatEvent.USER_JOINED,
        payload: {
          userId,
          userName,
          avatar,
          status: 'online',
          lastSeen: new Date(),
        },
      });

      // Listen for presence updates
      channel
        .on('broadcast', { event: ChatEvent.PRESENCE_UPDATE }, ({ payload }) => {
          setOnlineMembers(prev => {
            const filtered = prev.filter(u => String(u.userId) !== String(payload.userId));
            const newMembers = payload.status === 'online' ? [...filtered, payload] : filtered;
            updateUniqueCount(newMembers);
            return newMembers;
          });
        })
        .on('broadcast', { event: ChatEvent.USER_JOINED }, ({ payload }) => {
          setOnlineMembers(prev => {
            if (prev.some(u => String(u.userId) === String(payload.userId))) {
              return prev;
            }
            const newMembers = [...prev, payload];
            updateUniqueCount(newMembers);
            return newMembers;
          });
        })
        .on('broadcast', { event: ChatEvent.USER_LEFT }, ({ payload }) => {
          setOnlineMembers(prev => {
            const newMembers = prev.filter(u => String(u.userId) !== String(payload.userId));
            updateUniqueCount(newMembers);
            return newMembers;
          });
        })
        .subscribe();

      channelRef.current = channel;
    } catch (error) {
      console.error('Error setting up Realtime listeners:', error);
    }
  };

  const refreshPresenceStats = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/presence`);
      if (response.ok) {
        const stats = await response.json();
        setPresenceStats(stats);
        const members = stats.members || [];
        setOnlineMembers(members);
        updateUniqueCount(members);
      }
    } catch (error) {
      console.error('Error refreshing presence stats:', error);
    }
  };

  const cleanupPresence = async () => {
    try {
      // Mark user as offline
      await fetch(`/api/groups/${groupId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          status: 'offline',
        }),
      });

      // Broadcast user left
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: ChatEvent.USER_LEFT,
          payload: { userId },
        });
      }

      // Clear interval
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      // Unsubscribe from Realtime
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  };

  const goOffline = useCallback(async () => {
    await updatePresence('offline');
    await cleanupPresence();
  }, []);

  const goOnline = useCallback(async () => {
    await updatePresence('online');
  }, []);

  return {
    onlineMembers,
    onlineMembersCount,
    presenceStats,
    isLoading,
    goOnline,
    goOffline,
    refreshPresenceStats,
  };
}

/**
 * Hook for listening to presence changes in a group
 */
export function usePresenceListener(
  groupId: string | number,
  onPresenceChange?: (members: OnlineMember[]) => void
) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);

  useEffect(() => {
    if (!groupId) return;

    const channelName = RealtimeChatService.getGroupChannelName(groupId);
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    const handlePresenceUpdate = (payload: any) => {
      setOnlineMembers(prev => {
        const filtered = prev.filter(u => String(u.userId) !== String(payload.userId));
        const newMembers = payload.status === 'online' ? [...filtered, payload] : filtered;
        onPresenceChange?.(newMembers);
        return newMembers;
      });
    };

    channel
      .on('broadcast', { event: ChatEvent.PRESENCE_UPDATE }, ({ payload }) => {
        handlePresenceUpdate(payload);
      })
      .on('broadcast', { event: ChatEvent.USER_JOINED }, ({ payload }) => {
        setOnlineMembers(prev => {
          if (prev.some(u => String(u.userId) === String(payload.userId))) {
            return prev;
          }
          const newMembers = [...prev, payload];
          onPresenceChange?.(newMembers);
          return newMembers;
        });
      })
      .on('broadcast', { event: ChatEvent.USER_LEFT }, ({ payload }) => {
        setOnlineMembers(prev => {
          const newMembers = prev.filter(u => String(u.userId) !== String(payload.userId));
          onPresenceChange?.(newMembers);
          return newMembers;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, onPresenceChange]);

  return onlineMembers;
}
