import { useState, useEffect } from 'react';
import { SearchForm } from '@/components/SearchForm';
import { SearchResults } from '@/components/SearchResults';
import { AuthModal } from '@/components/AuthModal';
import { UserProfile } from '@/components/UserProfile';
import { useAuth } from '@/hooks/useAuth';
import { useSearch } from '@/hooks/useSearch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchFormData } from '@/types/search';
import { Sparkles, Globe, Clock, User, LogIn, History, RefreshCw } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { status, currentResult, searchHistory, performSearch, clearResults, loadSearchHistory } = useSearch();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user) {
      loadSearchHistory();
    }
  }, [user]);

  const handleSearch = async (data: SearchFormData) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    await performSearch({
      websiteUrl: data.websiteUrl,
      searchQuery: data.searchQuery,
    });
  };

  const handleNewSearch = () => {
    clearResults();
    setShowHistory(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your search experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full gradient-primary">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">WebSearch Pro</span>
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {user && searchHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                History ({searchHistory.length})
              </Button>
            )}
            
            {currentResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewSearch}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                New Search
              </Button>
            )}

            {user ? (
              <UserProfile />
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="gradient-primary"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Banner for Non-Authenticated Users */}
        {!user && (
          <Card className="p-6 text-center border-primary/20 bg-primary/5">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full gradient-primary shadow-glow">
                <LogIn className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to WebSearch Pro!</h2>
            <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
              Sign in to unlock the full power of AI-driven website content search. Get personalized results, 
              save your search history, and access advanced analytics.
            </p>
            <Button
              onClick={() => setShowAuthModal(true)}
              size="lg"
              className="gradient-primary"
            >
              <User className="h-5 w-5 mr-2" />
              Get Started Free
            </Button>
          </Card>
        )}

        {/* Search History */}
        {showHistory && searchHistory.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Searches
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
              >
                Hide
              </Button>
            </div>
            <div className="grid gap-3">
              {searchHistory.slice(0, 5).map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{search.searchQuery}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {search.websiteUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={search.status === 'completed' ? 'default' : 'secondary'}>
                      {search.resultsCount} results
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(search.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Search Form */}
        {!currentResult && (
          <SearchForm onSearch={handleSearch} status={status} />
        )}

        {/* Search Results */}
        {currentResult && status === 'completed' && (
          <SearchResults result={currentResult} />
        )}

        {/* Processing Status */}
        {status === 'processing' && currentResult && (
          <Card className="p-8 text-center">
            <div className="animate-pulse-glow w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Processing Your Search</h3>
            <p className="text-muted-foreground mb-4">
              Analyzing website content and finding the most relevant matches...
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm mb-2">
                <span>Progress</span>
                <span>Fetching content...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </Card>
        )}

        {/* Error State */}
        {status === 'error' && (
          <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
            <div className="text-destructive mb-4">
              <Globe className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Search Failed</h3>
            <p className="text-muted-foreground mb-4">
              We encountered an issue while processing your search. Please try again.
            </p>
            <Button onClick={handleNewSearch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </Card>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  );
};

export default Index;
