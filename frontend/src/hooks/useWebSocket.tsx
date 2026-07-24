import { useState, useEffect, useCallback, useRef } from 'react';

interface WSHookOptions {
  onMessage?: (msg: Record<string, any>) => void;
  onStatusChange?: (status: string) => void;
}

export function useWebSocket(url: string, opts?: WSHookOptions) {
  const [status, setStatus] = useState('disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    
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
      socketRef.current = null;
    };
  }, [url]);

  const send = useCallback((data: Record<string, any>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}

