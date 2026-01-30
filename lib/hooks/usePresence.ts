import { useEffect, useState, useRef, useCallback } from 'react';
import { getPusherClient } from '@/lib/realtime/pusher-client';

interface OnlineMember {
  userId: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
    email: string;
  };
  lastSeen: Date;
  sessionId: string;
}

interface PresenceStats {
  totalMembers: number;
  onlineMembers: number;
  offlineMembers: number;
  onlinePercentage: number;
  members: OnlineMember[];
}

/**
 * Hook for managing real-time presence in a group
 * Tracks online/offline status and broadcasts updates
 */
export function usePresence(groupId: number, userId: number) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [presenceStats, setPresenceStats] = useState<PresenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pusherRef = useRef<any>(null);
  const sessionIdRef = useRef<string>(`${userId}-${Date.now()}`);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize presence
  useEffect(() => {
    initializePresence();
    return () => {
      cleanupPresence();
    };
  }, [groupId, userId]);

  const initializePresence = async () => {
    try {
      setIsLoading(true);

      // Get initial presence stats
      const statsResponse = await fetch(`/api/groups/${groupId}/presence`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setPresenceStats(stats);
        setOnlineMembers(stats.members || []);
        setOnlineMembersCount(stats.onlineMembers || 0);
      }

      // Update user's presence
      await updatePresence(true);

      // Setup Pusher for real-time updates
      setupPusherListeners();

      // Poll for presence updates every 30 seconds
      presenceIntervalRef.current = setInterval(() => {
        updatePresence(true);
      }, 30000);
    } catch (error) {
      console.error('Error initializing presence:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePresence = useCallback(async (isOnline: boolean) => {
    try {
      await fetch(`/api/groups/${groupId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePresence',
          userId,
          isOnline,
          sessionId: sessionIdRef.current,
        }),
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [groupId, userId]);

  const setupPusherListeners = () => {
    try {
      const pusher = getPusherClient();
      const channelName = `group-${groupId}`;
      const channel = pusher.subscribe(channelName);

      // Listen for presence updates
      channel.bind('presence-update', (data: any) => {
        // Refresh presence stats
        refreshPresenceStats();
      });

      // Listen for members online update
      channel.bind('members-online-update', (data: any) => {
        setOnlineMembers(data.members || []);
        setOnlineMembersCount(data.totalOnline || 0);
      });

      pusherRef.current = channel;
    } catch (error) {
      console.error('Error setting up Pusher listeners:', error);
    }
  };

  const refreshPresenceStats = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/presence`);
      if (response.ok) {
        const stats = await response.json();
        setPresenceStats(stats);
        setOnlineMembers(stats.members || []);
        setOnlineMembersCount(stats.onlineMembers || 0);
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
          action: 'markOffline',
          userId,
          sessionId: sessionIdRef.current,
        }),
      });

      // Clear interval
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }

      // Unsubscribe from Pusher
      if (pusherRef.current) {
        pusherRef.current.unbind_all();
      }
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  };

  const goOffline = useCallback(async () => {
    await updatePresence(false);
    await cleanupPresence();
  }, []);

  const goOnline = useCallback(async () => {
    await updatePresence(true);
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
export function usePresenceListener(groupId: number, onPresenceChange?: (members: OnlineMember[]) => void) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`group-${groupId}`);

    const handlePresenceUpdate = (data: any) => {
      setOnlineMembers(data.members || []);
      onPresenceChange?.(data.members || []);
    };

    channel.bind('members-online-update', handlePresenceUpdate);

    return () => {
      channel.unbind('members-online-update', handlePresenceUpdate);
      pusher.unsubscribe(`group-${groupId}`);
    };
  }, [groupId, onPresenceChange]);

  return onlineMembers;
}
