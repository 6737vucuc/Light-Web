// Hashtags and Mentions System
export class HashtagService {
  // Extract hashtags from text
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Extract mentions from text
  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  // Format text with clickable hashtags and mentions
  static formatText(text: string): string {
    let formatted = text;
    
    // Format hashtags
    formatted = formatted.replace(
      /#(\w+)/g,
      '<a href="/search?q=%23$1" class="text-blue-600 hover:underline">#$1</a>'
    );
    
    // Format mentions
    formatted = formatted.replace(
      /@(\w+)/g,
      '<a href="/profile/$1" class="text-blue-600 hover:underline">@$1</a>'
    );
    
    return formatted;
  }

  // Get trending hashtags
  static async getTrending(limit: number = 10): Promise<Array<{ tag: string; count: number }>> {
    try {
      const response = await fetch(`/api/hashtags/trending?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        return data.hashtags || [];
      }
      return [];
    } catch (error) {
      console.error('Get trending hashtags error:', error);
      return [];
    }
  }

  // Search posts by hashtag
  static async searchByHashtag(hashtag: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/hashtags/${encodeURIComponent(hashtag)}/posts`);
      if (response.ok) {
        const data = await response.json();
        return data.posts || [];
      }
      return [];
    } catch (error) {
      console.error('Search by hashtag error:', error);
      return [];
    }
  }

  // Follow hashtag
  static async followHashtag(hashtag: string): Promise<boolean> {
    try {
      const response = await fetch('/api/hashtags/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashtag }),
      });
      return response.ok;
    } catch (error) {
      console.error('Follow hashtag error:', error);
      return false;
    }
  }

  // Get followed hashtags
  static async getFollowedHashtags(): Promise<string[]> {
    try {
      const response = await fetch('/api/hashtags/following');
      if (response.ok) {
        const data = await response.json();
        return data.hashtags || [];
      }
      return [];
    } catch (error) {
      console.error('Get followed hashtags error:', error);
      return [];
    }
  }
}

export class MentionService {
  // Notify mentioned users
  static async notifyMentions(postId: number, mentions: string[]): Promise<void> {
    try {
      await fetch('/api/mentions/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, mentions }),
      });
    } catch (error) {
      console.error('Notify mentions error:', error);
    }
  }

  // Get mentions for current user
  static async getMentions(): Promise<any[]> {
    try {
      const response = await fetch('/api/mentions');
      if (response.ok) {
        const data = await response.json();
        return data.mentions || [];
      }
      return [];
    } catch (error) {
      console.error('Get mentions error:', error);
      return [];
    }
  }

  // Search users for mention suggestions
  static async searchUsers(query: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
      return [];
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }
}
