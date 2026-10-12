"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQRContext } from "@/hooks/useMenu";
import { useCartStore } from "@/store";
import { MenuCatalog } from "@/features/menu";
import { ErrorState, Skeleton } from "@/components/ui";
import { QrCode } from "lucide-react";

export default function TableMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = typeof params?.tableId === "string" ? params.tableId : "";
  const queryToken = searchParams?.get("token");
  const token = queryToken || `table-${tableId}`;

  const { data: qrContext, isLoading, error } = useQRContext(token);
  const setQRContext = useCartStore((s) => s.setQRContext);

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
          title="Invalid Table QR"
          message={`Table ${tableId} could not be resolved. Please verify the QR code on your table.`}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <MenuCatalog qrContext={qrContext} />;
}
