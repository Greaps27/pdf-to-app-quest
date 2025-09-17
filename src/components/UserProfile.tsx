import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, LogOut, BarChart3, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { UserStats } from '@/types/search';

export const UserProfile = () => {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_search_stats', { user_uuid: user.id });

      if (error) throw error;
      
      // Parse the JSON response to match UserStats interface
      const statsData = data as any; // Cast to handle Json type
      const parsedStats: UserStats = {
        totalSearches: Number(statsData?.total_searches || 0),
        completedSearches: Number(statsData?.completed_searches || 0),
        failedSearches: Number(statsData?.failed_searches || 0),
        avgProcessingTime: Number(statsData?.avg_processing_time || 0),
        totalResultsFound: Number(statsData?.total_results_found || 0),
      };
      
      setStats(parsedStats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const getUserInitials = () => {
    const email = user.email || 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarFallback className="gradient-primary text-white font-semibold">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0" align="end">
        <DropdownMenuLabel className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="gradient-primary text-white font-semibold text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.email}</p>
              <p className="text-sm text-muted-foreground">Search Pro</p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        ) : stats && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Search Statistics</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalSearches}</p>
                    <p className="text-xs text-muted-foreground">Total Searches</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{stats.completedSearches}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Avg Speed
                </span>
                <Badge variant="secondary">
                  {Math.round(stats.avgProcessingTime || 0)}ms
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Success Rate
                </span>
                <Badge variant="default">
                  {stats.totalSearches > 0 
                    ? Math.round((stats.completedSearches / stats.totalSearches) * 100) 
                    : 0}%
                </Badge>
              </div>

              {stats.failedSearches > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <XCircle className="h-3 w-3" />
                    Failed
                  </span>
                  <Badge variant="destructive">
                    {stats.failedSearches}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={signOut}
          className="m-2 focus:bg-destructive focus:text-destructive-foreground cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};