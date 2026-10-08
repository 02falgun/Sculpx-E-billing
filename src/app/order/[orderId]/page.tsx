"use client";

import * as React from "react";
import Link from "next/link";
import { useOrder } from "@/hooks/useOrder";
import { useOrderUpdates } from "@/hooks/useWebSocket";
import { useUIStore } from "@/store";
import {
  LiveTrackingHeader,
  OrderStatusTimeline,
  OrderItemsReview,
  OrderCancelModal,
} from "@/features/order";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import {
  PlusCircle,
  Receipt,
  BellRing,
  XCircle,
  Home,
} from "lucide-react";

interface OrderTrackingPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const unwrappedParams = React.use(params);
  const orderId = unwrappedParams.orderId;

  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const addToast = useUIStore((s) => s.addToast);

  // Subscribe to live WebSocket events for this order
  useOrderUpdates(orderId);

  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isCallingStaff, setIsCallingStaff] = React.useState(false);

  const handleCallStaff = () => {
    setIsCallingStaff(true);
    setTimeout(() => {
      setIsCallingStaff(false);
      addToast({
        type: "success",
        title: "Staff Notified",
        message: `A floor captain is on their way to ${order?.qrContext.displayName || "your location"}.`,
      });
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500">Loading live order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12 space-y-4 max-w-md mx-auto">
        <ErrorState
          title="Order Not Found"
          message={
            error instanceof Error
              ? error.message
              : "Unable to retrieve order details. Please check the order link or contact hotel staff."
          }
          onRetry={() => refetch()}
        />
        <div className="text-center">
          <Link href="/">
            <Button variant="outline" size="sm" leftIcon={<Home className="h-4 w-4" />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isCancellable = order.status === "PLACED" || order.status === "CONFIRMED";
  const hasBill = !!order.billId || order.status === "SERVED" || order.status === "COMPLETED";
  const billTargetId = order.billId || order.id;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Header with order number, table/room, live sync */}
      <LiveTrackingHeader order={order} />

      {/* Live Timeline status */}
      <OrderStatusTimeline order={order} />

      {/* Itemized Order Review */}
      <OrderItemsReview order={order} />

      {/* Customer Action Bar */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
          Order Actions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Add more dishes */}
          <Link href={`/menu/${order.qrContext.token}`} className="w-full">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full font-semibold border-amber-300/80 text-amber-800 hover:bg-amber-50"
              leftIcon={<PlusCircle className="h-4 w-4 text-amber-600" />}
            >
              Order More Items
            </Button>
          </Link>

          {/* Call waiter / staff */}
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full font-semibold"
            isLoading={isCallingStaff}
            onClick={handleCallStaff}
            leftIcon={<BellRing className="h-4 w-4 text-slate-600" />}
          >
            Call Floor Captain
          </Button>
        </div>

        {/* View Digital Bill if ready */}
        {hasBill && (
          <Link href={`/bill/${billTargetId}`} className="block w-full pt-1">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full font-semibold shadow-xs"
              leftIcon={<Receipt className="h-4 w-4" />}
            >
              View Digital E-Bill & Settle
            </Button>
          </Link>
        )}

        {/* Cancel order if still in early stage */}
        {isCancellable && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel this order</span>
            </button>
          </div>
        )}
      </div>

      {/* Cancel Order Dialog */}
      <OrderCancelModal
        orderId={order.id}
        orderNumber={order.orderNumber}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />
    </div>
  );
}
