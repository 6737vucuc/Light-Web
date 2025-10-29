// Stories System
export interface Story {
  id: number;
  userId: number;
  userName: string;
  userAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: Date;
  expiresAt: Date;
  views: number;
  isViewed: boolean;
}

export class StoriesService {
  // Create new story
  static async createStory(
    userId: number,
    mediaUrl: string,
    mediaType: 'image' | 'video',
    caption?: string
  ): Promise<Story | null> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          caption,
          expiresAt,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Create story error:', error);
      return null;
    }
  }

  // Get all active stories
  static async getStories(): Promise<Story[]> {
    try {
      const response = await fetch('/api/stories');
      if (response.ok) {
        const data = await response.json();
        return data.stories || [];
      }
      return [];
    } catch (error) {
      console.error('Get stories error:', error);
      return [];
    }
  }

  // View story
  static async viewStory(storyId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('View story error:', error);
      return false;
    }
  }

  // Delete story
  static async deleteStory(storyId: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Delete story error:', error);
      return false;
    }
  }

  // Get story viewers
  static async getViewers(storyId: number): Promise<any[]> {
    try {
      const response = await fetch(`/api/stories/${storyId}/viewers`);
      if (response.ok) {
        const data = await response.json();
        return data.viewers || [];
      }
      return [];
    } catch (error) {
      console.error('Get viewers error:', error);
      return [];
    }
  }
}
