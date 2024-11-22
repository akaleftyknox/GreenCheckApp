import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Scan {
  id: string;
  image_url: string;
  scan_title: string | null;
  created_at: string;
  overall_grade_description: string | null;
  overall_grade: number;
}

interface UseScansOptions {
  refreshLimit?: number;
  refreshCooldown?: number;
  autoRefresh?: boolean;
}

export function useScans(options: UseScansOptions = {}) {
  const {
    refreshLimit = 6,
    refreshCooldown = 60000,
    autoRefresh = true
  } = options;

  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const refreshTimer = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const fetchScans = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;
    
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (mountedRef.current) {
        setScans(data || []);
        setLastRefreshTime(Date.now());
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleDatabaseChange = useCallback(
    async (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
      console.log('Received database change:', payload);

      // Fetch without showing loading indicator for real-time updates
      await fetchScans(false);
    },
    [fetchScans]
  );

  const handleRefresh = useCallback(async () => {
    if (refreshCount >= refreshLimit) {
      console.log('Manual refresh limit reached');
      setIsLoading(false);
      return;
    }

    setRefreshCount(count => count + 1);
    await fetchScans(true);

    if (!refreshTimer.current) {
      refreshTimer.current = setTimeout(() => {
        setRefreshCount(0);
        refreshTimer.current = undefined;
      }, refreshCooldown);
    }
  }, [fetchScans, refreshCount, refreshLimit, refreshCooldown]);

  useEffect(() => {
    fetchScans(true);

    if (autoRefresh) {
      const subscription = supabase
        .channel('scans_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'scans' 
          },
          handleDatabaseChange
        )
        .subscribe();

      return () => {
        mountedRef.current = false;
        subscription.unsubscribe();
        if (refreshTimer.current) {
          clearTimeout(refreshTimer.current);
        }
      };
    }
  }, [fetchScans, handleDatabaseChange, autoRefresh]);

  return {
    scans,
    isLoading,
    refreshCount,
    canRefresh: refreshCount < refreshLimit,
    onRefresh: handleRefresh,
    fetchScans  // Added this line to export fetchScans
  };
}