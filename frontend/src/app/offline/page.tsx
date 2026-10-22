"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-amber-400 border border-slate-700 shadow-xl">
        <WifiOff className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight mb-2">
        You are currently offline
      </h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        We could not connect to the restaurant local network. Please ensure your
        Wi-Fi or cellular data is active to continue placing orders or viewing live
        kitchen status.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button
          variant="primary"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </Button>
        <Link href="/" className="w-full">
          <Button variant="secondary" className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
