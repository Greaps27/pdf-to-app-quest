import { useState } from 'react';
import { Search, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { SearchFormData, SearchStatus } from '@/types/search';

interface SearchFormProps {
  onSearch: (data: SearchFormData) => void;
  status: SearchStatus;
}

export const SearchForm = ({ onSearch, status }: SearchFormProps) => {
  const [formData, setFormData] = useState<SearchFormData>({
    websiteUrl: '',
    searchQuery: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.websiteUrl.trim() && formData.searchQuery.trim()) {
      onSearch(formData);
    }
  };

  const isLoading = status === 'validating' || status === 'processing';

  return (
    <Card className="w-full max-w-4xl mx-auto p-8 shadow-custom-lg animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full gradient-primary shadow-glow">
            <Search className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Website Content Search
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Search through website content with precision. Get the top 10 most relevant HTML chunks based on your query.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="websiteUrl" className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Website URL
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://example.com"
              value={formData.websiteUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
              className="h-12 text-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Enter the complete URL of the website you want to search
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="searchQuery" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Search Query
            </Label>
            <Input
              id="searchQuery"
              type="text"
              placeholder="Enter your search terms..."
              value={formData.searchQuery}
              onChange={(e) => setFormData(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="h-12 text-lg transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              required
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Describe what content you're looking for
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
            className="px-12 py-6 text-lg font-semibold gradient-primary hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            disabled={isLoading || !formData.websiteUrl.trim() || !formData.searchQuery.trim()}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                {status === 'validating' ? 'Validating...' : 'Processing...'}
              </>
            ) : (
              <>
                <Search className="h-6 w-6 mr-3" />
                Search Website
              </>
            )}
          </Button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="text-center">
            <div className="animate-pulse-glow w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
              <Search className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {status === 'validating' ? 'Validating Website...' : 'Processing Content...'}
            </h3>
            <p className="text-muted-foreground">
              {status === 'validating' 
                ? 'Checking website accessibility and content...' 
                : 'Analyzing HTML content and finding relevant matches...'}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};