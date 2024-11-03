// hooks/useScans.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

export interface Scan {
  id: string;
  image_url: string;
  scan_title: string | null;
  created_at: string;
  overall_grade_description: string | null;
  overall_grade: number;
}

interface UseScansOptions {
  refreshLimit?: number; // Number of refreshes allowed per minute
  refreshCooldown?: number; // Cooldown period in milliseconds
}

export function useScans(options: UseScansOptions = {}) {
  const {
    refreshLimit = 6, // Default to 6 refreshes per minute
    refreshCooldown = 60000, // Default to 1 minute cooldown
  } = options;

  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const lastRefreshTime = useRef<number>(0);
  const refreshTimer = useRef<NodeJS.Timeout>();

  const fetchScans = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    
    // Always show loading animation
    setIsLoading(true);
    
    // Check if we're within the refresh limit
    if (refreshCount < refreshLimit) {
      setRefreshCount(count => count + 1);
      lastRefreshTime.current = now;
      
      // Actually fetch the data
      await fetchScans();
      
      // Set up reset timer if not already set
      if (!refreshTimer.current) {
        refreshTimer.current = setTimeout(() => {
          setRefreshCount(0);
          refreshTimer.current = undefined;
        }, refreshCooldown);
      }
    } else {
      // If we've hit the limit, wait a short time to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
    }
  }, [refreshCount, refreshLimit, refreshCooldown, fetchScans]);

  // Set up real-time subscription
  useEffect(() => {
    fetchScans();

    const subscription = supabase
      .channel('scans')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'scans' },
        fetchScans
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [fetchScans]);

  return {
    scans,
    isLoading,
    refreshCount,
    canRefresh: refreshCount < refreshLimit,
    onRefresh: handleRefresh,
  };
}