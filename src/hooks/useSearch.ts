import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SearchQuery, SearchResult, SearchStatus } from '@/types/search';
import { useToast } from '@/hooks/use-toast';

export const useSearch = () => {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const performSearch = async (query: SearchQuery) => {
    if (!validateUrl(query.websiteUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL.",
        variant: "destructive",
      });
      return;
    }

    setStatus('validating');
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to perform searches');
      }

      // Create search record in database
      const { data: search, error: insertError } = await supabase
        .from('searches')
        .insert({
          website_url: query.websiteUrl,
          search_query: query.searchQuery,
          status: 'pending',
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCurrentResult({
        id: search.id,
        websiteUrl: search.website_url,
        searchQuery: search.search_query,
        status: search.status as any,
        totalChunks: search.total_chunks || 0,
        resultsCount: search.results_count || 0,
        processingTimeMs: search.processing_time_ms,
        errorMessage: search.error_message,
        createdAt: search.created_at,
        updatedAt: search.updated_at,
        chunks: []
      });

      setStatus('processing');

      // Call edge function to process the search
      const { data, error } = await supabase.functions.invoke('process-website-search', {
        body: {
          searchId: search.id,
          websiteUrl: query.websiteUrl,
          searchQuery: query.searchQuery,
          maxResults: query.maxResults || 10,
          maxTokensPerChunk: query.maxTokensPerChunk || 500
        }
      });

      if (error) throw error;

      // Poll for results
      await pollForResults(search.id);

    } catch (error: any) {
      console.error('Search error:', error);
      setStatus('error');
      toast({
        title: "Search Failed",
        description: error.message || "An error occurred while processing your search.",
        variant: "destructive",
      });
    }
  };

  const pollForResults = async (searchId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const { data: search, error } = await supabase
          .from('searches')
          .select(`
            *,
            search_results (*)
          `)
          .eq('id', searchId)
          .single();

        if (error) throw error;

        const result: SearchResult = {
          id: search.id,
          websiteUrl: search.website_url,
          searchQuery: search.search_query,
          status: search.status as any,
          totalChunks: search.total_chunks || 0,
          resultsCount: search.results_count || 0,
          processingTimeMs: search.processing_time_ms,
          errorMessage: search.error_message,
          createdAt: search.created_at,
          updatedAt: search.updated_at,
          chunks: (search.search_results || []).map((chunk: any) => ({
            id: chunk.id,
            content: chunk.chunk_content,
            tokens: chunk.chunk_tokens,
            relevanceScore: chunk.relevance_score,
            chunkIndex: chunk.chunk_index,
            htmlTagContext: chunk.html_tag_context,
            createdAt: chunk.created_at
          }))
        };

        setCurrentResult(result);

        if (search.status === 'completed') {
          setStatus('completed');
          setSearchHistory(prev => [result, ...prev]);
          toast({
            title: "Search Complete!",
            description: `Found ${search.results_count} relevant chunks in ${search.processing_time_ms}ms.`,
          });
          return;
        }

        if (search.status === 'failed') {
          setStatus('error');
          toast({
            title: "Search Failed",
            description: search.error_message || "Search processing failed.",
            variant: "destructive",
          });
          return;
        }

        // Continue polling if still processing
        if (attempts < maxAttempts && search.status === 'processing') {
          setTimeout(poll, 1000);
        } else if (attempts >= maxAttempts) {
          setStatus('error');
          toast({
            title: "Search Timeout",
            description: "Search is taking longer than expected. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        setStatus('error');
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    };

    poll();
  };

  const clearResults = () => {
    setCurrentResult(null);
    setStatus('idle');
  };

  const loadSearchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('searches')
        .select(`
          *,
          search_results (*)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const results: SearchResult[] = data.map(search => ({
        id: search.id,
        websiteUrl: search.website_url,
        searchQuery: search.search_query,
        status: search.status as any,
        totalChunks: search.total_chunks || 0,
        resultsCount: search.results_count || 0,
        processingTimeMs: search.processing_time_ms,
        errorMessage: search.error_message,
        createdAt: search.created_at,
        updatedAt: search.updated_at,
        chunks: (search.search_results || []).map((chunk: any) => ({
          id: chunk.id,
          content: chunk.chunk_content,
          tokens: chunk.chunk_tokens,
          relevanceScore: chunk.relevance_score,
          chunkIndex: chunk.chunk_index,
          htmlTagContext: chunk.html_tag_context,
          createdAt: chunk.created_at
        }))
      }));

      setSearchHistory(results);
    } catch (error: any) {
      console.error('Error loading history:', error);
    }
  };

  return {
    status,
    currentResult,
    searchHistory,
    performSearch,
    clearResults,
    loadSearchHistory,
  };
};