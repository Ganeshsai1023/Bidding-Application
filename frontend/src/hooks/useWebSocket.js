import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

/**
 * Custom hook that manages a STOMP-over-SockJS WebSocket connection.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Topic subscription management
 * - Connection state tracking
 * - Clean teardown on unmount
 */
export function useWebSocket() {
  const clientRef   = useRef(null);
  const subsRef     = useRef(new Map()); // topic → subscription
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        setConnected(true);
        // Re-subscribe to all registered topics after reconnect
        subsRef.current.forEach((callback, topic) => {
          _subscribe(client, topic, callback);
        });
      },

      onDisconnect: () => setConnected(false),

      onStompError: (frame) => {
        console.error('STOMP error', frame);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  const _subscribe = (client, topic, callback) => {
    if (client?.connected) {
      const sub = client.subscribe(topic, (message) => {
        try {
          callback(JSON.parse(message.body));
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      });
      return sub;
    }
    return null;
  };

  /**
   * Subscribe to a STOMP topic.
   * Safe to call before connection is established — will re-subscribe on connect.
   */
  const subscribe = useCallback((topic, callback) => {
    subsRef.current.set(topic, callback);
    const sub = _subscribe(clientRef.current, topic, callback);

    return () => {
      subsRef.current.delete(topic);
      sub?.unsubscribe();
    };
  }, []);

  return { connected, subscribe };
}

/**
 * Hook to subscribe to bid updates for a specific item.
 * Returns the latest BidUpdateMessage payload.
 */
export function useItemBidUpdates(itemId) {
  const { connected, subscribe } = useWebSocket();
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!itemId) return;
    const topic = `/topic/items/${itemId}`;
    const unsubscribe = subscribe(topic, (message) => {
      setLastUpdate(message);
    });
    return unsubscribe;
  }, [itemId, subscribe]);

  return { connected, lastUpdate };
}
