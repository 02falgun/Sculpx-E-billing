"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useQRContext } from "@/hooks/useMenu";
import { useCartStore } from "@/store";
import { MenuCatalog } from "@/features/menu";
import { ErrorState, Skeleton } from "@/components/ui";
import { QrCode } from "lucide-react";

export default function MenuPage() {
  const params = useParams();
  const qrToken = typeof params?.qrToken === "string" ? params.qrToken : "";

  const { data: qrContext, isLoading, error } = useQRContext(qrToken);
  const setQRContext = useCartStore((s) => s.setQRContext);

  // Sync resolved QR context with the global cart store
  React.useEffect(() => {
    if (qrContext) {
      setQRContext(qrContext);
    }
  }, [qrContext, setQRContext]);

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !qrContext) {
    return (
      <div className="py-12 max-w-md mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 mx-auto mb-4">
          <QrCode className="h-8 w-8" />
        </div>
        <ErrorState
          title="Invalid or Inactive QR Code"
          message="This table or room QR code could not be verified. Please scan the QR code located on your table or room tent card again, or notify floor staff."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <MenuCatalog qrContext={qrContext} />;
}
