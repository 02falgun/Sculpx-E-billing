"use client";

import * as React from "react";
import { MenuItem, SelectedModifier } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { DietIndicator, CurrencyDisplay } from "@/components/shared";
import { useCartStore, useUIStore } from "@/store";
import { Plus, Minus, Check, AlertCircle } from "lucide-react";

export interface ModifierModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ModifierModal({ item, isOpen, onClose }: ModifierModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);

  const [quantity, setQuantity] = React.useState<number>(1);
  const [selectedModifiers, setSelectedModifiers] = React.useState<SelectedModifier[]>([]);
  const [specialInstructions, setSpecialInstructions] = React.useState<string>("");

  // Initialize default modifiers whenever a new item is opened
  React.useEffect(() => {
    if (item && item.modifierGroups) {
      setQuantity(1);
      setSpecialInstructions("");
      const defaults: SelectedModifier[] = [];

      item.modifierGroups.forEach((mg) => {
        const defaultMod = mg.modifiers.find((m) => m.isDefault) || (mg.isRequired ? mg.modifiers[0] : undefined);
        if (defaultMod) {
          defaults.push({
            modifierGroupId: mg.id,
            modifierGroupName: mg.name,
            modifierId: defaultMod.id,
            name: defaultMod.name,
            price: defaultMod.price,
          });
        }
      });

      setSelectedModifiers(defaults);
    } else {
      setSelectedModifiers([]);
      setQuantity(1);
      setSpecialInstructions("");
    }
  }, [item, isOpen]);

  if (!item) return null;

  const handleSelectModifier = (
    groupId: string,
    groupName: string,
    modId: string,
    modName: string,
    price: number,
    isSingleChoice: boolean,
  ) => {
    if (isSingleChoice) {
      // Replace existing modifier from this group
      const filtered = selectedModifiers.filter((m) => m.modifierGroupId !== groupId);
      setSelectedModifiers([
        ...filtered,
        {
          modifierGroupId: groupId,
          modifierGroupName: groupName,
          modifierId: modId,
          name: modName,
          price,
        },
      ]);
    } else {
      // Checkbox toggle
      const exists = selectedModifiers.some((m) => m.modifierId === modId);
      if (exists) {
        setSelectedModifiers(selectedModifiers.filter((m) => m.modifierId !== modId));
      } else {
        setSelectedModifiers([
          ...selectedModifiers,
          {
            modifierGroupId: groupId,
            modifierGroupName: groupName,
            modifierId: modId,
            name: modName,
            price,
          },
        ]);
      }
    }
  };

  // Validate that all required modifier groups have at least minSelections
  const unmetRequiredGroups: string[] = [];
  if (item.modifierGroups) {
    item.modifierGroups.forEach((mg) => {
      const selectionsCount = selectedModifiers.filter((m) => m.modifierGroupId === mg.id).length;
      if (mg.isRequired && selectionsCount < mg.minSelections) {
        unmetRequiredGroups.push(mg.name);
      }
    });
  }

  const isValid = unmetRequiredGroups.length === 0;

  // Compute live price
  const modifiersTotal = selectedModifiers.reduce((acc, m) => acc + m.price, 0);
  const unitPrice = item.price + modifiersTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!isValid) return;

    addItem(item, selectedModifiers, quantity, specialInstructions.trim() || undefined);

    addToast({
      type: "success",
      title: "Added to Order",
      message: `${quantity}x ${item.name} added to cart.`,
    });

    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="space-y-5">
        {/* Header */}
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <DietIndicator type={item.dietaryType} showLabel />
            {item.isChefSpecial && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                Chef&apos;s Special
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-slate-900">{item.name}</h3>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
          <div className="mt-2 text-sm font-bold text-slate-900">
            <CurrencyDisplay amount={item.price} />
            <span className="text-[11px] font-normal text-slate-400 ml-1">base price</span>
          </div>
        </div>

        {/* Modifier Groups */}
        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
          {item.modifierGroups?.map((group) => {
            const isSingleChoice = group.maxSelections === 1;
            const currentGroupSelections = selectedModifiers.filter(
              (m) => m.modifierGroupId === group.id,
            );
            const isUnmet = group.isRequired && currentGroupSelections.length < group.minSelections;

            return (
              <div
                key={group.id}
                className={`rounded-2xl border p-3.5 transition-colors ${
                  isUnmet ? "border-amber-300 bg-amber-50/20" : "border-slate-200/80 bg-slate-50/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{group.name}</h4>
                    {group.isRequired ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-extrabold text-rose-700">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Optional</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isSingleChoice ? "Choose 1" : `Up to ${group.maxSelections}`}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.some((m) => m.modifierId === mod.id);

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() =>
                          handleSelectModifier(
                            group.id,
                            group.name,
                            mod.id,
                            mod.name,
                            mod.price,
                            isSingleChoice,
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all ${
                          isSelected
                            ? "bg-amber-500/10 border border-amber-500/30 text-amber-950 font-semibold"
                            : "bg-white border border-slate-200/60 text-slate-700 hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-${
                              isSingleChoice ? "full" : "md"
                            } border ${
                              isSelected
                                ? "border-amber-600 bg-amber-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <span>{mod.name}</span>
                        </div>

                        <span className="text-xs font-semibold text-slate-900">
                          {mod.price > 0 ? `+₹${mod.price}` : "Free"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Cooking Instructions */}
          <div className="space-y-1">
            <label
              htmlFor="special-instructions"
              className="text-xs font-semibold text-slate-700 block text-left"
            >
              Special Cooking Instructions (Optional)
            </label>
            <textarea
              id="special-instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 150))}
              placeholder="e.g. Less oil, extra spicy, no onion..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
            />
            <span className="text-[10px] text-slate-400 text-right block">
              {specialInstructions.length}/150
            </span>
          </div>
        </div>

        {/* Validation warning if required options missing */}
        {!isValid && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Please select required option: {unmetRequiredGroups.join(", ")}</span>
          </div>
        )}

        {/* Footer with Quantity Stepper & Add Button */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {/* Quantity Controls */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40 active:scale-95 transition-all"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center text-xs font-bold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <Button
            variant="primary"
            size="md"
            disabled={!isValid}
            onClick={handleAddToCart}
            className="px-6 font-bold text-xs"
          >
            Add to Order • <CurrencyDisplay amount={totalPrice} className="text-white ml-1 font-black" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
