import { useEffect, useState, useRef, useCallback } from 'react';

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
 * Tracks online/offline status with polling 
 */
export function usePresence(groupId: number, userId: number) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [presenceStats, setPresenceStats] = useState<PresenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      // Poll for presence updates every 30 seconds
      presenceIntervalRef.current = setInterval(() => {
        updatePresence(true);
        refreshPresenceStats();
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
 * Hook for listening to presence changes in a group (polling-based)
 */
export function usePresenceListener(groupId: number, onPresenceChange?: (members: OnlineMember[]) => void) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/presence`);
        if (response.ok) {
          const data = await response.json();
          const members = data.members || [];
          setOnlineMembers(members);
          onPresenceChange?.(members);
        }
      } catch (error) {
        console.error('Error fetching presence:', error);
      }
    };

    // Initial fetch
    fetchPresence();

    // Poll every 15 seconds
    intervalRef.current = setInterval(fetchPresence, 15000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [groupId, onPresenceChange]);

  return onlineMembers;
}
