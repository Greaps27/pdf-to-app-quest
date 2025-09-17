import { SearchResult, SearchChunk } from '@/types/search';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Hash, Tag, TrendingUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SearchResultsProps {
  result: SearchResult;
}

interface ChunkCardProps {
  chunk: SearchChunk;
  searchQuery: string;
}

const ChunkCard = ({ chunk, searchQuery }: ChunkCardProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy content.",
        variant: "destructive",
      });
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const words = query.toLowerCase().split(' ').filter(word => word.length > 2);
    let highlightedText = text;
    
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-primary/20 text-primary font-semibold px-1 rounded">$1</mark>'
      );
    });
    
    return highlightedText;
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-success text-success-foreground';
    if (score >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="p-6 hover:shadow-custom-md transition-all duration-300 animate-slide-up border-l-4 border-l-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            <Hash className="h-3 w-3 mr-1" />
            Chunk #{chunk.chunkIndex}
          </Badge>
          <Badge className={`px-3 py-1 ${getRelevanceColor(chunk.relevanceScore)}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {(chunk.relevanceScore * 100).toFixed(1)}% match
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            <Tag className="h-3 w-3 mr-1" />
            {chunk.tokens} tokens
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {chunk.htmlTagContext && (
        <div className="mb-3">
          <Badge variant="outline" className="text-xs">
            <Tag className="h-3 w-3 mr-1" />
            {chunk.htmlTagContext}
          </Badge>
        </div>
      )}

      <div 
        className="prose prose-sm max-w-none text-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ 
          __html: highlightText(chunk.content, searchQuery) 
        }}
      />
    </Card>
  );
};

export const SearchResults = ({ result }: SearchResultsProps) => {
  if (!result || result.chunks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground">
          <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
          <p>Try adjusting your search query or check the website URL.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Results Header */}
      <Card className="p-6 gradient-secondary">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Search Results</h2>
          <Badge variant="default" className="px-4 py-2 text-lg">
            {result.resultsCount} matches found
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Processing time:</span>
            <span className="font-semibold">{result.processingTimeMs}ms</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total chunks:</span>
            <span className="font-semibold">{result.totalChunks}</span>
          </div>
          <div className="md:col-span-2">
            <p className="text-muted-foreground">
              <span className="font-semibold">Website:</span> 
              <a 
                href={result.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline ml-2"
              >
                {result.websiteUrl}
              </a>
            </p>
          </div>
        </div>
      </Card>

      {/* Results List */}
      <div className="space-y-4">
        {result.chunks
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .map((chunk, index) => (
            <div key={chunk.id} className="relative">
              <div className="absolute -left-4 top-6 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {index + 1}
              </div>
              <ChunkCard chunk={chunk} searchQuery={result.searchQuery} />
            </div>
          ))}
      </div>
    </div>
  );
};