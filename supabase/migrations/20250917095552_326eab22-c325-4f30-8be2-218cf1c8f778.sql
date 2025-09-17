-- Fix security warnings for function search path mutability

-- Update the update_updated_at_column function with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Update the get_user_search_stats function with secure search path  
CREATE OR REPLACE FUNCTION public.get_user_search_stats(user_uuid UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;