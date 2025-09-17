export interface SearchQuery {
  websiteUrl: string;
  searchQuery: string;
  maxResults?: number;
  maxTokensPerChunk?: number;
}

export interface SearchChunk {
  id: string;
  content: string;
  tokens: number;
  relevanceScore: number;
  chunkIndex: number;
  htmlTagContext?: string;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  websiteUrl: string;
  searchQuery: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  resultsCount: number;
  processingTimeMs?: number;
  errorMessage?: string;
  chunks: SearchChunk[];
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalSearches: number;
  completedSearches: number;
  failedSearches: number;
  avgProcessingTime: number;
  totalResultsFound: number;
}

export interface SearchFormData {
  websiteUrl: string;
  searchQuery: string;
}

export type SearchStatus = 'idle' | 'validating' | 'processing' | 'completed' | 'error';