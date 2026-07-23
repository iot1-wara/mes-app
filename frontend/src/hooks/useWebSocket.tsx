import { useState, useEffect, useCallback } from 'react';

interface WSHookOptions {
  onMessage?: (msg: Record<string, any>) => void;
  onStatusChange?: (status: string) => void;
}

export function useWebSocket(url: string, opts?: WSHookOptions) {
  const [status, setStatus] = useState('disconnected');
  
  useEffect(() => {
    const socket = new WebSocket(url);
    
    socket.onopen = () => {
      setStatus('connected');
      opts?.onStatusChange?.('connected');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        opts?.onMessage?.(msg);
      } catch {}
    };

    socket.onclose = () => setStatus('disconnected');
    socket.onerror = () => setStatus('error');

    return () => {
      if (socket.readyState !== WebSocket.CLOSED) socket.close();
    };
  }, [url]);

  const send = useCallback((data: Record<string, any>) => {
    if (status === 'connected') {
      opts?.onMessage?.(data);
    }
  }, [status]);

  return { status, send };
}

