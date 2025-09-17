import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  searchId: string;
  websiteUrl: string;
  searchQuery: string;
  maxResults?: number;
  maxTokensPerChunk?: number;
}

interface HTMLChunk {
  content: string;
  tokens: number;
  chunkIndex: number;
  htmlTagContext?: string;
  relevanceScore: number;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const { searchId, websiteUrl, searchQuery, maxResults = 10, maxTokensPerChunk = 500 } = await req.json() as SearchRequest;
    
    console.log(`Starting search for: ${websiteUrl} with query: "${searchQuery}"`);

    // Update search status to processing
    await updateSearchStatus(searchId, 'processing');

    // Step 1: Fetch HTML content
    const htmlContent = await fetchWebsiteContent(websiteUrl);
    console.log(`Fetched ${htmlContent.length} characters from website`);

    // Step 2: Parse and clean HTML
    const cleanedContent = parseAndCleanHTML(htmlContent);
    console.log(`Cleaned content: ${cleanedContent.length} characters`);

    // Step 3: Tokenize and chunk content
    const chunks = tokenizeAndChunk(cleanedContent, maxTokensPerChunk);
    console.log(`Created ${chunks.length} chunks`);

    // Step 4: Perform semantic search
    const relevantChunks = await performSemanticSearch(chunks, searchQuery, maxResults);
    console.log(`Found ${relevantChunks.length} relevant chunks`);

    // Step 5: Save results to database
    await saveSearchResults(searchId, relevantChunks, chunks.length);

    // Step 6: Update search status to completed
    const processingTime = Math.round(performance.now() - startTime);
    await updateSearchStatus(searchId, 'completed', processingTime, relevantChunks.length);

    return new Response(JSON.stringify({ 
      success: true, 
      resultsCount: relevantChunks.length,
      processingTime 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-website-search:', error);
    
    const processingTime = Math.round(performance.now() - startTime);
    
    // Try to get searchId from request to update status
    try {
      const requestData = await req.clone().json();
      if (requestData.searchId) {
        await updateSearchStatus(requestData.searchId, 'failed', processingTime, 0, error.message);
      }
    } catch (parseError) {
      console.error('Failed to parse request for error handling:', parseError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchWebsiteContent(url: string): Promise<string> {
  console.log(`Fetching content from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WebSearch-Bot/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Invalid content type: ${contentType}. Expected HTML content.`);
  }

  return await response.text();
}

function parseAndCleanHTML(html: string): string {
  console.log('Parsing and cleaning HTML content');
  
  // Remove script and style tags and their content
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove common non-content elements
  cleaned = cleaned.replace(/<(nav|header|footer|aside|menu)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // Extract text content while preserving some structure
  // Replace common block elements with newlines
  cleaned = cleaned.replace(/<\/(div|p|h[1-6]|li|section|article|blockquote|pre)>/gi, '\n');
  
  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, ' ');
  
  // Decode HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\n\s+/g, '\n');
  cleaned = cleaned.replace(/\n+/g, '\n\n');
  
  return cleaned.trim();
}

function tokenizeAndChunk(content: string, maxTokensPerChunk: number): HTMLChunk[] {
  console.log(`Tokenizing content into chunks of max ${maxTokensPerChunk} tokens`);
  
  const chunks: HTMLChunk[] = [];
  const words = content.split(/\s+/).filter(word => word.length > 0);
  
  // Rough token estimation: ~0.75 words per token for English text
  const wordsPerChunk = Math.floor(maxTokensPerChunk * 0.75);
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkContent = chunkWords.join(' ');
    
    // Estimate token count (more accurate than word count)
    const estimatedTokens = Math.ceil(chunkContent.length / 4); // ~4 chars per token average
    
    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent.trim(),
        tokens: Math.min(estimatedTokens, maxTokensPerChunk),
        chunkIndex: chunks.length + 1,
        htmlTagContext: detectContentContext(chunkContent),
        relevanceScore: 0 // Will be calculated in semantic search
      });
    }
  }
  
  return chunks;
}

function detectContentContext(content: string): string {
  // Simple heuristics to detect content type
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('©') || lowerContent.includes('copyright')) {
    return 'footer';
  }
  if (lowerContent.includes('navigation') || lowerContent.includes('menu')) {
    return 'navigation';
  }
  if (lowerContent.length < 100) {
    return 'heading';
  }
  if (lowerContent.includes('contact') || lowerContent.includes('email') || lowerContent.includes('phone')) {
    return 'contact';
  }
  
  return 'content';
}

async function performSemanticSearch(chunks: HTMLChunk[], query: string, maxResults: number): Promise<HTMLChunk[]> {
  console.log(`Performing semantic search with query: "${query}"`);
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  
  // Calculate relevance scores for each chunk
  for (const chunk of chunks) {
    chunk.relevanceScore = calculateRelevanceScore(chunk.content, queryWords);
  }
  
  // Sort by relevance score and return top results
  const sortedChunks = chunks
    .filter(chunk => chunk.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
  
  console.log(`Top relevance scores: ${sortedChunks.slice(0, 3).map(c => c.relevanceScore.toFixed(3)).join(', ')}`);
  
  return sortedChunks;
}

function calculateRelevanceScore(content: string, queryWords: string[]): number {
  const contentLower = content.toLowerCase();
  let score = 0;
  
  for (const word of queryWords) {
    // Exact word matches
    const exactMatches = (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    score += exactMatches * 2;
    
    // Partial matches
    const partialMatches = (contentLower.match(new RegExp(word, 'g')) || []).length - exactMatches;
    score += partialMatches * 0.5;
    
    // Boost score for words appearing in the first part of the chunk
    if (contentLower.substring(0, 200).includes(word)) {
      score += 1;
    }
  }
  
  // Normalize score by content length and query length
  const normalizedScore = score / (Math.log(content.length + 1) * queryWords.length);
  
  // Ensure score is between 0 and 1
  return Math.min(normalizedScore, 1);
}

async function updateSearchStatus(
  searchId: string, 
  status: string, 
  processingTime?: number, 
  resultsCount?: number, 
  errorMessage?: string
) {
  const updateData: any = { status };
  
  if (processingTime !== undefined) {
    updateData.processing_time_ms = processingTime;
  }
  if (resultsCount !== undefined) {
    updateData.results_count = resultsCount;
  }
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  
  const { error } = await supabase
    .from('searches')
    .update(updateData)
    .eq('id', searchId);
  
  if (error) {
    console.error('Error updating search status:', error);
    throw error;
  }
}

async function saveSearchResults(searchId: string, chunks: HTMLChunk[], totalChunks: number) {
  console.log(`Saving ${chunks.length} search results`);
  
  // Update total chunks count
  await supabase
    .from('searches')
    .update({ total_chunks: totalChunks })
    .eq('id', searchId);
  
  // Insert search results
  const searchResults = chunks.map((chunk, index) => ({
    search_id: searchId,
    chunk_content: chunk.content,
    chunk_tokens: chunk.tokens,
    relevance_score: chunk.relevanceScore,
    chunk_index: chunk.chunkIndex,
    html_tag_context: chunk.htmlTagContext
  }));
  
  const { error } = await supabase
    .from('search_results')
    .insert(searchResults);
  
  if (error) {
    console.error('Error saving search results:', error);
    throw error;
  }
}