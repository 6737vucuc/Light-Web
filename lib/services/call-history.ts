/**
 * Call History Service
 * Handles logging and retrieval of call records from Supabase
 */

import { supabase } from '@/lib/supabase/client';

export interface CallRecord {
  id?: string;
  callerId: number;
  callerName: string;
  callerAvatar?: string | null;
  receiverId: number;
  receiverName: string;
  receiverAvatar?: string | null;
  callType: 'voice' | 'video';
  status: 'completed' | 'rejected' | 'missed';
  duration: number; // in seconds
  startedAt: string;
  endedAt?: string;
  quality?: 'high' | 'medium' | 'low';
  notes?: string;
}

export class CallHistoryService {
  /**
   * Log a new call to the database
   */
  static async logCall(callData: CallRecord): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .insert([
          {
            caller_id: callData.callerId,
            caller_name: callData.callerName,
            caller_avatar: callData.callerAvatar,
            receiver_id: callData.receiverId,
            receiver_name: callData.receiverName,
            receiver_avatar: callData.receiverAvatar,
            call_type: callData.callType,
            status: callData.status,
            duration: callData.duration,
            started_at: callData.startedAt,
            ended_at: callData.endedAt,
            quality: callData.quality,
            notes: callData.notes,
          },
        ])
        .select();

      if (error) {
        console.error('Error logging call:', error);
        return { success: false, error: error.message };
      }

      console.log('Call logged successfully:', data);
      return { success: true };
    } catch (err) {
      console.error('Unexpected error logging call:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Get call history for a user
   */
  static async getUserCallHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<CallRecord[]> {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching call history:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id,
        callerId: record.caller_id,
        callerName: record.caller_name,
        callerAvatar: record.caller_avatar,
        receiverId: record.receiver_id,
        receiverName: record.receiver_name,
        receiverAvatar: record.receiver_avatar,
        callType: record.call_type,
        status: record.status,
        duration: record.duration,
        startedAt: record.started_at,
        endedAt: record.ended_at,
        quality: record.quality,
        notes: record.notes,
      }));
    } catch (err) {
      console.error('Unexpected error fetching call history:', err);
      return [];
    }
  }

  /**
   * Get call history between two users
   */
  static async getCallHistoryBetween(
    userId1: number,
    userId2: number,
    limit: number = 20
  ): Promise<CallRecord[]> {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .or(
          `and(caller_id.eq.${userId1},receiver_id.eq.${userId2}),and(caller_id.eq.${userId2},receiver_id.eq.${userId1})`
        )
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching call history between users:', error);
        return [];
      }

      return (data || []).map((record: any) => ({
        id: record.id,
        callerId: record.caller_id,
        callerName: record.caller_name,
        callerAvatar: record.caller_avatar,
        receiverId: record.receiver_id,
        receiverName: record.receiver_name,
        receiverAvatar: record.receiver_avatar,
        callType: record.call_type,
        status: record.status,
        duration: record.duration,
        startedAt: record.started_at,
        endedAt: record.ended_at,
        quality: record.quality,
        notes: record.notes,
      }));
    } catch (err) {
      console.error('Unexpected error fetching call history between users:', err);
      return [];
    }
  }

  /**
   * Get call statistics for a user
   */
  static async getCallStats(userId: number): Promise<{
    totalCalls: number;
    totalDuration: number;
    missedCalls: number;
    averageDuration: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('call_history')
        .select('duration, status')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`);

      if (error) {
        console.error('Error fetching call stats:', error);
        return { totalCalls: 0, totalDuration: 0, missedCalls: 0, averageDuration: 0 };
      }

      const calls = data || [];
      const totalCalls = calls.length;
      const totalDuration = calls.reduce((sum: number, call: any) => sum + (call.duration || 0), 0);
      const missedCalls = calls.filter((call: any) => call.status === 'missed').length;
      const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      return { totalCalls, totalDuration, missedCalls, averageDuration };
    } catch (err) {
      console.error('Unexpected error fetching call stats:', err);
      return { totalCalls: 0, totalDuration: 0, missedCalls: 0, averageDuration: 0 };
    }
  }

  /**
   * Delete a call record
   */
  static async deleteCallRecord(callId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('call_history')
        .delete()
        .eq('id', callId);

      if (error) {
        console.error('Error deleting call record:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Unexpected error deleting call record:', err);
      return { success: false, error: String(err) };
    }
  }
}
