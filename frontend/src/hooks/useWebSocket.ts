"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { webSocketManager } from "@/services/websocket";
import { WebSocketConnectionState, WebSocketEventType, WebSocketMessage } from "@/types";

export function useWebSocketConnection(): WebSocketConnectionState {
  const [state, setState] = useState<WebSocketConnectionState>(
    webSocketManager.getConnectionState(),
  );

  useEffect(() => {
    webSocketManager.connect();
    const unsubscribe = webSocketManager.onStateChange((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}

export function useOrderUpdates(orderId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const topic = orderId ? `order:${orderId}` : "orders:all";
    webSocketManager.subscribeToTopic(topic);

    const orderEvents: WebSocketEventType[] = [
      "ORDER_CREATED",
      "ORDER_CONFIRMED",
      "ORDER_UPDATED",
      "ORDER_PREPARING",
      "ORDER_READY",
      "ORDER_SERVED",
      "ORDER_CANCELLED",
      "KOT_READY",
      "KOT_UPDATED",
      "KOT_STATUS_UPDATED",
      "RECONNECTED",
    ];

    const unsubs = orderEvents.map((eventType) =>
      webSocketManager.subscribe(
        eventType,
        (_msg: WebSocketMessage) => {
          // If listening to a specific order
          if (orderId) {
            queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
          }
          // Always invalidate orders list
          queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
          queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
        },
        topic,
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
      webSocketManager.unsubscribeFromTopic(topic);
    };
  }, [orderId, queryClient]);
}

export function useKitchenUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const topic = "kitchen:kots";
    webSocketManager.subscribeToTopic(topic);

    const unsubCreated = webSocketManager.subscribe(
      "KOT_CREATED",
      () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
      },
      topic
    );

    const unsubUpdated = webSocketManager.subscribe(
      "KOT_UPDATED",
      () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      },
      topic
    );

    const unsubStatusUpdated = webSocketManager.subscribe(
      "KOT_STATUS_UPDATED",
      () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      },
      topic
    );

    // When connection is restored, immediately refetch authoritative database state
    const unsubReconnected = webSocketManager.subscribe(
      "RECONNECTED",
      () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    );

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubStatusUpdated();
      unsubReconnected();
      webSocketManager.unsubscribeFromTopic(topic);
    };
  }, [queryClient]);
}

export function useBillingUpdates(billId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const topic = billId ? `order:${billId}` : "billing:all";
    webSocketManager.subscribeToTopic(topic);

    const unsubBill = webSocketManager.subscribe(
      "BILL_UPDATED",
      () => {
        if (billId) {
          queryClient.invalidateQueries({ queryKey: ["bills", billId] });
        }
        queryClient.invalidateQueries({ queryKey: ["bills"] });
      },
      topic
    );

    const unsubPayment = webSocketManager.subscribe(
      "PAYMENT_UPDATED",
      () => {
        if (billId) {
          queryClient.invalidateQueries({ queryKey: ["bills", billId] });
          queryClient.invalidateQueries({ queryKey: ["orders", billId] });
        }
        queryClient.invalidateQueries({ queryKey: ["bills"] });
      },
      topic
    );

    const unsubReconnected = webSocketManager.subscribe(
      "RECONNECTED",
      () => {
        queryClient.invalidateQueries({ queryKey: ["bills"] });
      }
    );

    return () => {
      unsubBill();
      unsubPayment();
      unsubReconnected();
      webSocketManager.unsubscribeFromTopic(topic);
    };
  }, [billId, queryClient]);
}
