"use client";

import * as React from "react";
import { Bill } from "@/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useUIStore } from "@/store";
import {
  Printer,
  Share2,
  Star,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";

interface DigitalReceiptActionsProps {
  bill: Bill;
}

const FEEDBACK_TAGS = [
  "Delicious Flavors",
  "Quick Service",
  "Courteous Staff",
  "Spotless Hygiene",
  "Great Ambience",
];

export function DigitalReceiptActions({ bill }: DigitalReceiptActionsProps) {
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [phoneNumber, setPhoneNumber] = React.useState(bill.customerGstNumber || "");
  const [rating, setRating] = React.useState<number>(5);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(["Delicious Flavors"]);
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);

  const addToast = useUIStore((s) => s.addToast);

  const handlePrint = () => {
    window.print();
  };

  const handleSendShare = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      addToast({
        type: "error",
        title: "Invalid Mobile Number",
        message: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    addToast({
      type: "success",
      title: "Receipt Dispatched",
      message: `Digital tax invoice link sent to +91 ${phoneNumber} via WhatsApp & SMS.`,
    });
    setIsShareModalOpen(false);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitRating = () => {
    setFeedbackSubmitted(true);
    addToast({
      type: "success",
      title: "Feedback Recorded",
      message: "Thank you for rating your dining experience with us!",
    });
  };

  return (
    <div className="space-y-6">
      {/* Paid Certification Card */}
      <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/40 p-6 text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-100">
          <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 block mb-1">
            Payment Verified & Settled
          </span>
          <h2 className="text-lg font-black text-slate-900">
            Thank you for dining at The Grand Royal Palace!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Your e-bill #{bill.billNumber} has been settled in full. A digital copy has been archived.
          </p>
        </div>

        {/* Buttons for print/download and SMS */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4 text-slate-600" />}
          >
            Download / Print PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setIsShareModalOpen(true)}
            leftIcon={<Share2 className="h-4 w-4 text-amber-600" />}
          >
            Share on WhatsApp / SMS
          </Button>
        </div>
      </div>

      {/* Guest Rating & Feedback Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Rate Your Experience</h3>
          </div>
          {feedbackSubmitted && (
            <span className="text-xs font-bold text-emerald-600">Feedback Submitted ✓</span>
          )}
        </div>

        {!feedbackSubmitted ? (
          <div className="space-y-4">
            {/* Star selector */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= rating
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-black text-white border-black font-semibold"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <div className="text-center pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitRating}
                leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-slate-500 py-2">
            We truly appreciate your compliments. We look forward to welcoming you back!
          </p>
        )}
      </div>

      {/* Share Modal Dialog */}
      <Dialog
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Digital E-Bill"
        description={`Send digital invoice link for Bill #${bill.billNumber}`}
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Guest Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">
                +91
              </span>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-slate-200 py-2 pl-11 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            A secure link containing this GST invoice will be transmitted instantly with zero paper waste.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsShareModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSendShare}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send E-Bill
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
