import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';

export function useCalendarOAuthStatus(refetchKey = 0) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.calendar.getOAuthStatus();
      setConnected(res.connected);
    } catch (err) {
      // Silently treat errors as not connected.
      console.error('Failed to check OAuth status:', toError(err));
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus, refetchKey]);

  return { connected, loading, checkStatus };
}