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
import { ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const qrContext = useCartStore((s) => s.qrContext);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSummary = useCartStore((s) => s.getSummary);
  const addToast = useUIStore((s) => s.addToast);

  const { mutateAsync: createOrder, isPending: isSubmitting } = useCreateOrder();
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const summary = getSummary();

  const {
    control,
    handleSubmit,
    register,
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

  const onSubmit = async (data: CheckoutFormData) => {
    if (!qrContext) {
      setValidationError("Active QR dining context not found. Please re-scan your table or room code.");
      return;
    }

    if (items.length === 0) {
      setValidationError("Your order is empty. Please add items before checking out.");
      return;
    }

    setValidationError(null);

    try {
      const orderPayload = {
        qrToken: qrContext.token,
        customerName: data.customerName?.trim() || undefined,
        customerPhone: data.customerPhone?.trim() || undefined,
        specialInstructions: data.specialInstructions?.trim() || undefined,
        paymentPreference: data.paymentPreference,
        items: items.map((cartItem) => ({
          menuItemId: cartItem.menuItemId,
          quantity: cartItem.quantity,
          specialInstructions: cartItem.specialInstructions,
          modifierIds: cartItem.selectedModifiers.map((m) => m.modifierId),
        })),
      };

      // 1. Authoritative Backend Pre-validation
      const validationRes = await orderApi.validateOrder(orderPayload);
      if (!validationRes.success || !validationRes.data.isValid) {
        const unavailable = validationRes.data.unavailableItems.map((u) => u.reason).join(", ");
        setValidationError(`Items unavailable: ${unavailable || "Please adjust your cart."}`);
        return;
      }

      // 2. Submit authoritative order creation
      const createdOrder = await createOrder(orderPayload);

      // 3. Clear client cart and notify
      clearCart();
      addToast({
        type: "success",
        title: "Order Placed Successfully",
        message: `Order #${createdOrder.orderNumber} dispatched to the kitchen!`,
      });

      // 4. Redirect to real-time live status tracking
      router.push(`/order/${createdOrder.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      setValidationError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Validation alert banner */}
      {validationError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Unable to proceed: </span>
            <span>{validationError}</span>
          </div>
        </div>
      )}

      {/* Guest Information */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900">Guest Information</h3>
          <p className="text-xs text-slate-500">Optional for e-bill SMS receipts & kitchen contact</p>
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
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
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

      {/* Submit Order Button */}
      <div className="space-y-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full font-bold shadow-lg shadow-amber-600/25"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          <span>Confirm & Place Order • </span>
          <CurrencyDisplay amount={summary.estimatedTotal} className="text-white ml-1 font-black" />
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Encrypted transmission to hotel POS & kitchen display system</span>
        </div>
      </div>
    </form>
  );
}
