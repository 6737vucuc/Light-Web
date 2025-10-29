// Advanced Search System
export interface SearchFilters {
  query: string;
  type?: 'all' | 'users' | 'posts' | 'groups';
  dateFrom?: Date;
  dateTo?: Date;
  location?: string;
  tags?: string[];
  sortBy?: 'relevance' | 'date' | 'popularity';
}

export interface SearchResult {
  type: 'user' | 'post' | 'group';
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  relevance: number;
  createdAt: Date;
}

export class AdvancedSearchService {
  // Perform advanced search
  static async search(filters: SearchFilters): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', filters.query);
      if (filters.type) params.append('type', filters.type);
      if (filters.dateFrom) params.append('from', filters.dateFrom.toISOString());
      if (filters.dateTo) params.append('to', filters.dateTo.toISOString());
      if (filters.location) params.append('location', filters.location);
      if (filters.tags) params.append('tags', filters.tags.join(','));
      if (filters.sortBy) params.append('sort', filters.sortBy);

      const response = await fetch(`/api/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        return data.results || [];
      }
      return [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // Search users
  static async searchUsers(query: string): Promise<any[]> {
    return this.search({ query, type: 'users' });
  }

  // Search posts
  static async searchPosts(query: string): Promise<any[]> {
    return this.search({ query, type: 'posts' });
  }

  // Search with hashtags
  static async searchByHashtag(hashtag: string): Promise<any[]> {
    return this.search({ query: `#${hashtag}`, type: 'posts' });
  }

  // Get trending searches
  static async getTrending(): Promise<string[]> {
    try {
      const response = await fetch('/api/search/trending');
      if (response.ok) {
        const data = await response.json();
        return data.trending || [];
      }
      return [];
    } catch (error) {
      console.error('Get trending error:', error);
      return [];
    }
  }
}
