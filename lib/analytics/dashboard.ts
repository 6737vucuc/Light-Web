// Analytics Dashboard System
export interface AnalyticsData {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
  };
  posts: {
    total: number;
    today: number;
    engagement: number;
  };
  messages: {
    total: number;
    today: number;
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface UserAnalytics {
  profileViews: number;
  postViews: number;
  followers: number;
  following: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  topPosts: Array<{
    id: number;
    content: string;
    views: number;
    likes: number;
  }>;
}

export class AnalyticsService {
  // Get platform analytics (admin only)
  static async getPlatformAnalytics(): Promise<AnalyticsData | null> {
    try {
      const response = await fetch('/api/analytics/platform');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Get platform analytics error:', error);
      return null;
    }
  }

  // Get user analytics
  static async getUserAnalytics(userId?: number): Promise<UserAnalytics | null> {
    try {
      const url = userId 
        ? `/api/analytics/user/${userId}` 
        : '/api/analytics/user';
      
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Get user analytics error:', error);
      return null;
    }
  }

  // Get post analytics
  static async getPostAnalytics(postId: number): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/post/${postId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Get post analytics error:', error);
      return null;
    }
  }

  // Track event
  static async trackEvent(
    eventType: string,
    eventData?: any
  ): Promise<void> {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventData,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  // Get engagement trends
  static async getEngagementTrends(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<any[]> {
    try {
      const response = await fetch(`/api/analytics/trends?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        return data.trends || [];
      }
      return [];
    } catch (error) {
      console.error('Get engagement trends error:', error);
      return [];
    }
  }

  // Get demographics
  static async getDemographics(): Promise<any> {
    try {
      const response = await fetch('/api/analytics/demographics');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Get demographics error:', error);
      return null;
    }
  }
}
