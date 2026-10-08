# ADR 0004: Centralized WebSocket Connection Manager & Event Dispatcher

## Status
Accepted

## Context
Restaurant and hotel applications rely heavily on real-time feedback (new orders firing into KDS, cooking state progression, bill updates, and printing errors). Naive implementations create separate WebSocket instances inside multiple components, resulting in socket exhaustion, dropped connections, high battery usage on mobile phones, and unhandled reconnection storms.

## Decision
We enforce a singleton `WebSocketManager` that maintains exactly one duplex connection per browser tab.
- **Connection Manager**: Handles heartbeats, connection loss detection, and exponential backoff reconnection with randomized jitter.
- **Deduplication Buffer**: Drops duplicate frames using UUID message IDs.
- **Event Dispatcher**: Decouples incoming messages and routes them to registered topic/event listeners.
- **Query Integration**: Feature hooks (`useOrderUpdates`, `useKitchenUpdates`, etc.) listen for domain events and automatically call `queryClient.invalidateQueries(...)`, driving reactive UI updates without manual component state manipulation.

## Consequences
- Guaranteed single connection per client.
- Resilient recovery on unstable hotel Wi-Fi networks.
- Clean hook API for feature components (`useOrderUpdates(orderId)`).
