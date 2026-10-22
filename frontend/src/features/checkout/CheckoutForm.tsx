"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkoutFormSchema, CheckoutFormData } from "@/schemas/checkout.schema";
import { useCartStore, useUIStore } from "@/store";
import { useCreateOrder } from "@/hooks/useOrder";
import { orderApi } from "@/services/api";
import { PaymentPreferenceSelector } from "./PaymentPreferenceSelector";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/shared";
import { ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const qrContext = useCartStore((s) => s.qrContext);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSummary = useCartStore((s) => s.getSummary);
  const addToast = useUIStore((s) => s.addToast);

  const { mutateAsync: createOrder, isPending: isMutationPending } = useCreateOrder();

  // Submission state & double-click protection
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isRetryableNetworkError, setIsRetryableNetworkError] = React.useState(false);

  // Durable logical idempotency key: 1 UUID per logical submission, reused on retry
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const summary = getSummary();

  const {
    control,
    handleSubmit,
    register,
    watch,
    getValues,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      specialInstructions: "",
      paymentPreference: "PAY_NOW",
    },
  });

  const selectedPaymentPref = watch("paymentPreference");
  const isRoom = qrContext?.type === "ROOM";

  // Invalidate idempotency key if user alters cart items
  React.useEffect(() => {
    idempotencyKeyRef.current = null;
    setIsRetryableNetworkError(false);
  }, [items]);

  const executeOrderSubmission = async (data: CheckoutFormData) => {
    // 1. Guard against concurrent double-clicks
    if (isSubmitting || isMutationPending) {
      return;
    }

    if (!qrContext) {
      setValidationError("Active QR dining context not found. Please re-scan your table or room code.");
      return;
    }

    if (items.length === 0) {
      setValidationError("Your order is empty. Please add items before checking out.");
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);
    setIsRetryableNetworkError(false);

    // 2. Generate or reuse durable UUID idempotency key for this logical submission
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    const currentIdempotencyKey = idempotencyKeyRef.current;

    const orderPayload = {
      qrToken: qrContext.token,
      customerName: data.customerName?.trim() || undefined,
      customerPhone: data.customerPhone?.trim() || undefined,
      specialInstructions: data.specialInstructions?.trim() || undefined,
      paymentPreference: data.paymentPreference,
      source: "CUSTOMER_QR" as const,
      items: items.map((cartItem) => {
        const optionIds = cartItem.selectedModifiers.map((m) => m.modifierId);
        return {
          menuItemId: cartItem.menuItemId,
          quantity: cartItem.quantity,
          specialInstructions: cartItem.specialInstructions,
          modifierOptionIds: optionIds,
          modifierIds: optionIds,
        };
      }),
    };

    try {
      // 3. Pre-checkout cart verification against authoritative backend snapshot
      const validationRes = await orderApi.validateOrder(orderPayload);

      if (!validationRes.success) {
        const errCode = validationRes.error?.code;
        if (errCode === "QR_NOT_FOUND" || errCode === "QR_INACTIVE" || errCode === "QR_INVALID_ASSIGNMENT") {
          setValidationError("This dining QR code is no longer active or has expired. Please re-scan your table or room QR code.");
        } else {
          setValidationError(validationRes.error?.message || "Cart validation failed. Please review your order.");
        }
        setIsSubmitting(false);
        return;
      }

      if (validationRes.data && !validationRes.data.isValid) {
        const unavailable = validationRes.data.unavailableItems;
        if (unavailable && unavailable.length > 0) {
          const reasons = unavailable.map((u) => u.reason).join("; ");
          setValidationError(`Unavailable items detected: ${reasons}. Please adjust your cart.`);
        } else {
          setValidationError("The cart contains invalid items or modifier configurations. Please review your order.");
        }
        setIsSubmitting(false);
        return;
      }

      // 4. Transactionally submit order with reused idempotency key
      const createdOrder = await createOrder({
        payload: orderPayload,
        idempotencyKey: currentIdempotencyKey,
      });

      // 5. Authoritative backend values confirmed
      const orderNumber = createdOrder.orderNumber;
      const authoritativeGrandTotal = createdOrder.grandTotal;

      // 6. Reset idempotency key & cart session upon verified success
      idempotencyKeyRef.current = null;
      clearCart();

      addToast({
        type: "success",
        title: `Order #${orderNumber} Confirmed`,
        message: `Total ₹${Number(authoritativeGrandTotal).toFixed(2)} dispatched to the kitchen!`,
      });

      // 7. Transition to authoritative real-time tracking
      router.push(`/order/${createdOrder.id}`);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const errCode = errorObj?.code;
      const errMsg = errorObj?.message || "Failed to place order";

      if (errCode === "ITEM_UNAVAILABLE") {
        setValidationError("One or more items in your cart became unavailable or sold out. Please adjust your cart.");
        idempotencyKeyRef.current = null; // Reset so user re-evaluates
      } else if (errCode === "IDEMPOTENCY_IN_PROGRESS") {
        setValidationError("Your order submission is currently being processed. Please wait a moment before checking status.");
      } else if (errCode === "IDEMPOTENCY_CONFLICT") {
        setValidationError("An idempotency conflict occurred. A new submission has been generated. Please try again.");
        idempotencyKeyRef.current = null;
      } else if (errCode === "NETWORK_ERROR" || errCode === "REQUEST_TIMEOUT") {
        setIsRetryableNetworkError(true);
        setValidationError(
          "Network connection failed during submission. Your order has NOT been duplicated. You can safely retry with the same submission key."
        );
      } else {
        setValidationError(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    const currentData = getValues();
    executeOrderSubmission(currentData);
  };

  const isButtonBusy = isSubmitting || isMutationPending;

  return (
    <form onSubmit={handleSubmit(executeOrderSubmission)} className="space-y-6">
      {/* Validation / Network alert banner */}
      {validationError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"
        >
          <div className="flex items-start gap-2.5 flex-1">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-bold">Order Submission Notice: </span>
              <span>{validationError}</span>
            </div>
          </div>

          {isRetryableNetworkError && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              isLoading={isButtonBusy}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="shrink-0 border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              Retry Submission
            </Button>
          )}
        </div>
      )}

      {/* Dining Context Reassurance Banner */}
      {qrContext && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 font-bold text-xs">
              {isRoom ? "ROOM" : "TABLE"}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {isRoom ? "In-Room Dining" : "Restaurant Dine-In"}
              </span>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {isRoom ? `Deliver to Room ${qrContext.identifier}` : `Dining at Table ${qrContext.identifier}`}
              </h4>
              <p className="text-[11px] text-slate-500">{qrContext.hotelName || "The Grand Royal Palace & Resort"}</p>
            </div>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {qrContext.displayName}
          </span>
        </div>
      )}

      {/* Guest Information */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-semibold text-slate-900">Guest Information</h3>
          <p className="text-xs text-slate-500">Optional for e-bill SMS receipts &amp; kitchen contact</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Your Name (Optional)"
            placeholder="e.g. Rahul Sharma"
            error={errors.customerName?.message}
            {...register("customerName")}
          />

          <Input
            label="Mobile Number (Optional)"
            placeholder="10-digit mobile number"
            type="tel"
            maxLength={10}
            hint="For digital bill SMS link"
            error={errors.customerPhone?.message}
            {...register("customerPhone")}
          />
        </div>

        <div>
          <label
            htmlFor="order-instructions"
            className="text-xs font-semibold text-slate-700 block mb-1.5"
          >
            Overall Order Notes (Optional)
          </label>
          <textarea
            id="order-instructions"
            placeholder="e.g. Serve desserts together, infant at table..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none transition-colors"
            {...register("specialInstructions")}
          />
          {errors.specialInstructions && (
            <p className="text-xs text-rose-600 font-medium mt-1">
              {errors.specialInstructions.message}
            </p>
          )}
        </div>
      </div>

      {/* Payment Preference Selector */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <Controller
          control={control}
          name="paymentPreference"
          render={({ field }) => (
            <PaymentPreferenceSelector
              value={field.value}
              onChange={field.onChange}
              context={qrContext}
            />
          )}
        />
        {errors.paymentPreference && (
          <p className="text-xs text-rose-600 font-medium mt-2">
            {errors.paymentPreference.message}
          </p>
        )}
      </div>

      {/* Submit Order Button with double-click guard */}
      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isButtonBusy}
          disabled={isButtonBusy}
          className="w-full font-semibold shadow-xs"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          {selectedPaymentPref === "PAY_NOW" ? (
            <span>Pay &amp; Place Order • </span>
          ) : isRoom ? (
            <span>Post to Room Folio &amp; Place Order • </span>
          ) : (
            <span>Place Order (Pay at Table) • </span>
          )}
          <CurrencyDisplay amount={summary.estimatedTotal} className="text-white ml-1 font-bold" />
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Encrypted transmission with durable idempotency protection</span>
        </div>
      </div>
    </form>
  );
}
