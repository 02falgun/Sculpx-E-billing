"use client";

import * as React from "react";
import { Bill, PaymentMethod } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay } from "@/components/shared";
import { useRecordPayment } from "@/hooks/useBilling";
import { useUIStore } from "@/store";
import {
  QrCode,
  CreditCard,
  Building2,
  Banknote,
  CheckCircle,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface PaymentModalProps {
  bill: Bill;
  tipAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  bill,
  tipAmount,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const isRoom = bill.qrContext.type === "ROOM";
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>(
    isRoom ? "ROOM_CHARGE" : "UPI"
  );
  const [copiedUpi, setCopiedUpi] = React.useState(false);
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");
  const [roomGuestName, setRoomGuestName] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const totalToPay = Math.max(0, bill.dueAmount + tipAmount);

  const { mutateAsync: recordPayment, isPending } = useRecordPayment();
  const addToast = useUIStore((s) => s.addToast);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("grandroyalpalace@upi");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFillDemoCard = () => {
    setCardNumber("4532 •••• •••• 8891");
    setCardExpiry("12/28");
    setCardCvv("742");
  };

  const handleSubmitPayment = async () => {
    setErrorMessage(null);

    try {
      let cardLastFour: string | undefined;
      if (selectedMethod === "CARD") {
        cardLastFour = cardNumber.slice(-4) || "8891";
      }

      await recordPayment({
        billId: bill.id,
        amount: totalToPay,
        method: selectedMethod,
        cardLastFour,
        upiId: selectedMethod === "UPI" ? "grandroyalpalace@upi" : undefined,
        roomChargeDetails:
          selectedMethod === "ROOM_CHARGE"
            ? {
                roomNumber: bill.qrContext.identifier,
                guestName: roomGuestName.trim() || "Registered Guest",
              }
            : undefined,
        notes: tipAmount > 0 ? `Includes ₹${tipAmount} gratuity` : undefined,
      });

      addToast({
        type: "success",
        title: "Payment Settled",
        message: `Successfully received ₹${totalToPay.toFixed(2)}. Digital receipt generated!`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed to process.";
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Digital E-Bill"
      description={`Invoice #${bill.billNumber} • Total Due: ₹${totalToPay.toFixed(2)}`}
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Method tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {isRoom && (
            <button
              type="button"
              onClick={() => setSelectedMethod("ROOM_CHARGE")}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                selectedMethod === "ROOM_CHARGE"
                  ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold ring-2 ring-amber-400/30"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Building2 className="h-5 w-5 mb-1 text-blue-600" />
              <span className="text-xs">Room Folio</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedMethod("UPI")}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
              selectedMethod === "UPI"
                ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold ring-2 ring-amber-400/30"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <QrCode className="h-5 w-5 mb-1 text-emerald-600" />
            <span className="text-xs">UPI QR</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("CARD")}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
              selectedMethod === "CARD"
                ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold ring-2 ring-amber-400/30"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CreditCard className="h-5 w-5 mb-1 text-indigo-600" />
            <span className="text-xs">Card</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod("CASH")}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
              selectedMethod === "CASH"
                ? "border-amber-500 bg-amber-50/50 text-amber-900 font-bold ring-2 ring-amber-400/30"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Banknote className="h-5 w-5 mb-1 text-amber-600" />
            <span className="text-xs">Cash Desk</span>
          </button>
        </div>

        {/* Selected method view */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          {/* 1. ROOM CHARGE */}
          {selectedMethod === "ROOM_CHARGE" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>Post Charges to Room {bill.qrContext.identifier} Folio</span>
              </div>
              <p className="text-slate-500">
                This amount will be added to your hotel room account and settled during checkout.
              </p>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Registered Guest Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Siddharth Sen"
                  value={roomGuestName}
                  onChange={(e) => setRoomGuestName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          )}

          {/* 2. UPI */}
          {selectedMethod === "UPI" && (
            <div className="space-y-3 text-center">
              <div className="mx-auto w-40 h-40 bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-col items-center justify-center">
                <QrCode className="h-28 w-28 text-slate-800" />
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                  SCAN TO PAY UPI
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-500">UPI ID:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  grandroyalpalace@upi
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-amber-600 hover:text-amber-700 cursor-pointer p-1"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
                <span>Supports GPay • PhonePe • Paytm • Cred • BHIM</span>
              </div>
            </div>
          )}

          {/* 3. CARD */}
          {selectedMethod === "CARD" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Card Details</span>
                <button
                  type="button"
                  onClick={handleFillDemoCard}
                  className="text-[11px] text-amber-700 font-semibold hover:underline cursor-pointer"
                >
                  Fill Demo Card
                </button>
              </div>
              <input
                type="text"
                placeholder="Card Number (XXXX XXXX XXXX XXXX)"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="CVV"
                  maxLength={4}
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* 4. CASH */}
          {selectedMethod === "CASH" && (
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Banknote className="h-4 w-4 text-amber-600" />
                <span>Cash Payment at Table / Counter</span>
              </div>
              <p className="text-slate-500">
                Hand cash directly to your floor captain or pay at the central billing desk. Staff will confirm receipt on the POS terminal.
              </p>
            </div>
          )}
        </div>

        {/* Security watermark */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>PCI-DSS 256-bit encrypted transaction simulation</span>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={isPending}
            onClick={handleSubmitPayment}
            className="w-full font-bold shadow-md shadow-amber-600/25"
          >
            <span>Confirm Payment • </span>
            <CurrencyDisplay amount={totalToPay} className="text-white ml-1 font-black" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
