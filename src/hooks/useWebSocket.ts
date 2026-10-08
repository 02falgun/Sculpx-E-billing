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

    const orderEvents: WebSocketEventType[] = [
      "ORDER_CREATED",
      "ORDER_CONFIRMED",
      "ORDER_UPDATED",
      "ORDER_PREPARING",
      "ORDER_READY",
      "ORDER_SERVED",
      "ORDER_CANCELLED",
    ];

    const unsubs = orderEvents.map((eventType) =>
      webSocketManager.subscribe(
        eventType,
        (msg: WebSocketMessage) => {
          // If listening to a specific order
          if (orderId) {
            queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
          }
          // Always invalidate orders list
          queryClient.invalidateQueries({ queryKey: ["orders", "list"] });
          queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
        },
        orderId ? `order:${orderId}` : undefined,
      ),
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [orderId, queryClient]);
}

export function useKitchenUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const unsubCreated = webSocketManager.subscribe("KOT_CREATED", () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
    });

    const unsubUpdated = webSocketManager.subscribe("KOT_UPDATED", () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [queryClient]);
}

export function useBillingUpdates(billId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const unsubBill = webSocketManager.subscribe("BILL_UPDATED", () => {
      if (billId) {
        queryClient.invalidateQueries({ queryKey: ["bills", billId] });
      }
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    });

    const unsubPayment = webSocketManager.subscribe("PAYMENT_UPDATED", () => {
      if (billId) {
        queryClient.invalidateQueries({ queryKey: ["bills", billId] });
      }
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    });

    return () => {
      unsubBill();
      unsubPayment();
    };
  }, [billId, queryClient]);
}

export function usePrintJobUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    webSocketManager.connect();

    const unsub = webSocketManager.subscribe("PRINT_JOB_UPDATED", () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    });

    return () => {
      unsub();
    };
  }, [queryClient]);
}
