"use client";

import * as React from "react";
import { useUIStore } from "@/store";

export function PWARegister() {
  const addToast = useUIStore((s) => s.addToast);

  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration failed:", err);
        });
    }

    const handleOffline = () => {
      addToast({
        title: "Connection Lost",
        message: "You are currently offline. Orders require an active network.",
        type: "warning",
      });
    };

    const handleOnline = () => {
      addToast({
        title: "Back Online",
        message: "Reconnected to hotel restaurant network.",
        type: "success",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [addToast]);

  return null;
}
