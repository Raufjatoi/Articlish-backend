
// API service for data fetching

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar: string;
  postCount: number;
  commentCount: number;
  joinDate: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  commentCount: number;
  createdAt: string;
  tags: string[];
}

export interface Comment {
  id: string;
  content: string;
  authorName: string;
  postId: string;
  postTitle: string;
  createdAt: string;
}

export interface MonthlyStats {
  month: string;
  posts: number;
  comments: number;
  authors: number;
}

// Update the API_URL to point to your Vercel-deployed backend
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api' 
  : 'https://articlish-backend.vercel.app/api';  // Replace with your actual Vercel URL

// Set this to false to use the real API
const useMockData = false;

// Helper function for API requests
async function fetchAPI(endpoint: string, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Add a function to create a new author
export async function createAuthor(author: { name: string; email: string; avatar?: string }): Promise<Author> {
  return fetchAPI('/authors', {
    method: 'POST',
    body: JSON.stringify(author)
  });
}

// Add a function to create a new post
export async function createPost(post: { title: string; content: string; authorId: string; tags?: string[] }): Promise<Post> {
  return fetchAPI('/posts', {
    method: 'POST',
    body: JSON.stringify(post)
  });
}

// Add a function to create a new comment
export async function createComment(comment: { content: string; authorId: string; postId: string }): Promise<Comment> {
  return fetchAPI('/comments', {
    method: 'POST',
    body: JSON.stringify(comment)
  });
}

export const api = {
  async getAuthors(): Promise<Author[]> {
    return fetchAPI('/authors');
  },

  async getPosts(sortBy: 'newest' | 'mostCommented' = 'newest'): Promise<Post[]> {
    return fetchAPI(`/posts?sortBy=${sortBy}`);
  },

  async getComments(page: number = 1, limit: number = 10): Promise<{ comments: Comment[], total: number }> {
    return fetchAPI(`/comments?page=${page}&limit=${limit}`);
  },

  async getTopAuthors(): Promise<Author[]> {
    return fetchAPI('/authors/top');
  },

  async getTopCommentedPosts(): Promise<Post[]> {
    return fetchAPI('/posts/top-commented');
  },

  async getMonthlyStats(): Promise<MonthlyStats[]> {
    return fetchAPI('/stats/monthly');
  },

  async createAuthor(author: { name: string; email: string; avatar?: string }): Promise<Author> {
    return createAuthor(author);
  }
};

// Export individual functions for backward compatibility
export const fetchAuthors = api.getAuthors;
export const fetchPosts = () => api.getPosts();
export const fetchComments = async () => {
  const result = await api.getComments();
  return result.comments;
};











