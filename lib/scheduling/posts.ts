// Post Scheduling System
export interface ScheduledPost {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string;
  scheduledFor: Date;
  status: 'pending' | 'published' | 'failed';
  createdAt: Date;
}

export class PostSchedulingService {
  // Schedule a post
  static async schedulePost(
    content: string,
    scheduledFor: Date,
    imageUrl?: string
  ): Promise<ScheduledPost | null> {
    try {
      const response = await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          imageUrl,
          scheduledFor: scheduledFor.toISOString(),
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Schedule post error:', error);
      return null;
    }
  }

  // Get scheduled posts
  static async getScheduledPosts(): Promise<ScheduledPost[]> {
    try {
      const response = await fetch('/api/posts/scheduled');
      if (response.ok) {
        const data = await response.json();
        return data.posts || [];
      }
      return [];
    } catch (error) {
      console.error('Get scheduled posts error:', error);
      return [];
    }
  }

  // Update scheduled post
  static async updateScheduledPost(
    postId: number,
    updates: Partial<ScheduledPost>
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/posts/scheduled/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return response.ok;
    } catch (error) {
      console.error('Update scheduled post error:', error);
      return false;
    }
  }

  // Cancel scheduled post
  static async cancelScheduledPost(postId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/posts/scheduled/${postId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Cancel scheduled post error:', error);
      return false;
    }
  }

  // Publish scheduled posts (called by cron job)
  static async publishDuePosts(): Promise<void> {
    try {
      await fetch('/api/cron/publish-scheduled-posts', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Publish due posts error:', error);
    }
  }
}
