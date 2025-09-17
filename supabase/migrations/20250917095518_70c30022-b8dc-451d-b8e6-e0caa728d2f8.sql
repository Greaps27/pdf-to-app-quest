-- Create the database schema for Website Content Search Application

-- Create enum for search status
CREATE TYPE public.search_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create searches table to store search queries and results
CREATE TABLE public.searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    website_url TEXT NOT NULL,
    search_query TEXT NOT NULL,
    status search_status DEFAULT 'pending',
    total_chunks INTEGER DEFAULT 0,
    results_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create search_results table to store individual HTML chunks and their relevance scores
CREATE TABLE public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE NOT NULL,
    chunk_content TEXT NOT NULL,
    chunk_tokens INTEGER NOT NULL,
    relevance_score FLOAT DEFAULT 0.0,
    chunk_index INTEGER NOT NULL,
    html_tag_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_preferences table for storing user settings
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    max_results INTEGER DEFAULT 10,
    max_tokens_per_chunk INTEGER DEFAULT 500,
    preferred_search_mode TEXT DEFAULT 'semantic',
    dark_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for searches
CREATE POLICY "Users can view their own searches" 
ON public.searches 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own searches" 
ON public.searches 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches" 
ON public.searches 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches" 
ON public.searches 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Create RLS policies for search_results
CREATE POLICY "Users can view results from their searches" 
ON public.search_results 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.searches 
        WHERE id = search_results.search_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "System can insert search results" 
ON public.search_results 
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.searches 
        WHERE id = search_results.search_id 
        AND user_id = auth.uid()
    )
);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_searches_user_id ON public.searches(user_id);
CREATE INDEX idx_searches_created_at ON public.searches(created_at DESC);
CREATE INDEX idx_searches_status ON public.searches(status);
CREATE INDEX idx_search_results_search_id ON public.search_results(search_id);
CREATE INDEX idx_search_results_relevance_score ON public.search_results(relevance_score DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_searches_updated_at
    BEFORE UPDATE ON public.searches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get search statistics
CREATE OR REPLACE FUNCTION public.get_user_search_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_searches', COUNT(*),
        'completed_searches', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed_searches', COUNT(*) FILTER (WHERE status = 'failed'),
        'avg_processing_time', AVG(processing_time_ms) FILTER (WHERE status = 'completed'),
        'total_results_found', SUM(results_count) FILTER (WHERE status = 'completed')
    )
    INTO stats
    FROM public.searches
    WHERE user_id = user_uuid;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;