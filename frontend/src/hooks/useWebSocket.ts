import { useEffect, useRef, useState, useCallback } from 'react';
import { createWebSocket } from '../utils/api';
import { WebSocketMessage } from '../types';
import { queryClient } from '../utils/api';

// Global WebSocket manager for dashboard
class DashboardWebSocketManager {
  private static instance: DashboardWebSocketManager;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  private constructor() {
    this.connect();
  }

  static getInstance(): DashboardWebSocketManager {
    if (!DashboardWebSocketManager.instance) {
      DashboardWebSocketManager.instance = new DashboardWebSocketManager();
    }
    return DashboardWebSocketManager.instance;
  }

  private connect() {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const url = `${protocol}//${host}/api/scans/ws/dashboard`;
      
      console.log('Connecting to dashboard WebSocket:', url);
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Dashboard WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifyListeners('connected', null);
        
        // Start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Dashboard WebSocket message:', message);
          
          this.notifyListeners('message', message);
          
          // Handle specific events
          if (message.type === 'dashboard_update') {
            console.log('Dashboard update received, refreshing data...');
            
            // Invalidate all dashboard-related queries
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
            queryClient.invalidateQueries({ queryKey: ['quickStats'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['scans'] });
            
            // Force refetch after a short delay
            setTimeout(() => {
              queryClient.refetchQueries({ queryKey: ['dashboardMetrics'] });
              queryClient.refetchQueries({ queryKey: ['quickStats'] });
            }, 100);
            
            this.notifyListeners('dashboardUpdate', message);
          }
          
          if (message.type === 'scan_completed') {
            console.log('Scan completed, updating dashboard...');
            this.notifyListeners('scanCompleted', message);
          }
        } catch (error) {
          console.error('Failed to parse dashboard WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        this.isConnecting = false;
        this.notifyListeners('disconnected', null);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Dashboard WebSocket error:', error);
        this.isConnecting = false;
        this.notifyListeners('error', error);
      };
    } catch (error) {
      console.error('Failed to create dashboard WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private startHeartbeat() {
    // Send ping every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect dashboard WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnecting) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached for dashboard WebSocket');
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      // Use setTimeout to avoid React state updates during render
      setTimeout(() => {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in dashboard WebSocket listener:', error);
          }
        });
      }, 0);
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  getConnectionState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
}

// Export the dashboard WebSocket manager
export const dashboardWebSocket = DashboardWebSocketManager.getInstance();

// Original useWebSocket hook for individual scans
export const useWebSocket = (scanId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = createWebSocket(scanId);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        console.log(`WebSocket connected for scan ${scanId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);
          console.log(`Scan ${scanId} WebSocket message:`, data);
          
          // If scan completes, trigger dashboard update
          if (data.type === 'scan_completed') {
            console.log(`Scan ${scanId} completed, notifying dashboard...`);
            // Trigger dashboard refresh via the global manager
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
            queryClient.invalidateQueries({ queryKey: ['quickStats'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            
            setTimeout(() => {
              queryClient.refetchQueries({ queryKey: ['dashboardMetrics'] });
              queryClient.refetchQueries({ queryKey: ['quickStats'] });
            }, 100);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        console.log(`WebSocket disconnected for scan ${scanId}:`, event.code, event.reason);

        // Attempt reconnection
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          reconnectAttemptRef.current += 1;
          const delay = Math.min(1000 * reconnectAttemptRef.current, 5000);
          
          console.log(`Reconnecting scan ${scanId} in ${delay}ms...`);
          setTimeout(() => {
            if (scanId) {
              connect();
            }
          }, delay);
        }
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', err);
    }
  }, [scanId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (scanId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [scanId, connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    disconnect,
    connect,
  };
};

// Hook for dashboard WebSocket
export const useDashboardWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleMessage = (message: any) => {
      setLastMessage(message);
    };

    // Subscribe to dashboard WebSocket events
    dashboardWebSocket.on('connected', handleConnected);
    dashboardWebSocket.on('disconnected', handleDisconnected);
    dashboardWebSocket.on('message', handleMessage);

    // Check initial connection state
    setIsConnected(dashboardWebSocket.isConnected() || false);

    return () => {
      dashboardWebSocket.off('connected', handleConnected);
      dashboardWebSocket.off('disconnected', handleDisconnected);
      dashboardWebSocket.off('message', handleMessage);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    dashboardWebSocket,
  };
};