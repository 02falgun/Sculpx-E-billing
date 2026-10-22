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
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <DietIndicator type={item.dietaryType} showLabel />
            {item.isChefSpecial && (
              <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                Chef&apos;s Special
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.description}</p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <CurrencyDisplay amount={item.price} className="text-sm font-bold text-slate-900" />
            <span className="text-[11px] text-slate-400">base price</span>
          </div>
        </div>

        {/* Modifier Groups */}
        <div className="space-y-3.5 max-h-[48vh] overflow-y-auto pr-1">
          {item.modifierGroups?.map((group) => {
            const isSingleChoice = group.maxSelections === 1;
            const currentGroupSelections = selectedModifiers.filter(
              (m) => m.modifierGroupId === group.id,
            );
            const isUnmet = group.isRequired && currentGroupSelections.length < group.minSelections;

            return (
              <div
                key={group.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  isUnmet ? "border-neutral-400 bg-neutral-50/60" : "border-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-neutral-900">{group.name}</h4>
                    {group.isRequired ? (
                      <span className="rounded bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-900">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400">Optional</span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400">
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
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-neutral-100 border border-black text-black font-semibold"
                            : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-${
                              isSingleChoice ? "full" : "sm"
                            } border transition-colors ${
                              isSelected
                                ? "border-black bg-black text-white"
                                : "border-neutral-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <span>{mod.name}</span>
                        </div>

                        <span className="text-xs font-semibold text-neutral-900 tabular-nums">
                          {mod.price > 0 ? `+₹${mod.price}` : "Included"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Cooking Instructions */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="special-instructions"
              className="text-xs font-semibold text-neutral-700 block text-left"
            >
              Special Cooking Instructions (Optional)
            </label>
            <textarea
              id="special-instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 150))}
              placeholder="e.g. Less spicy, dressing on the side..."
              rows={2}
              className="w-full rounded-md border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none resize-none transition-colors"
            />
            <span className="text-[10px] text-neutral-400 text-right block">
              {specialInstructions.length}/150
            </span>
          </div>
        </div>

        {/* Validation warning if required options missing */}
        {!isValid && (
          <div className="flex items-center gap-2 rounded-md bg-neutral-100 border border-neutral-300 p-2.5 text-xs text-neutral-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-neutral-700" />
            <span>Please select required option: {unmetRequiredGroups.join(", ")}</span>
          </div>
        )}

        {/* Footer with Quantity Stepper & Add Button */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          {/* Quantity Controls */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-900 tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="flex h-7 w-7 items-center justify-center rounded bg-white text-slate-700 shadow-2xs hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
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
            className="px-5 font-semibold text-xs shadow-xs"
          >
            Add to Order • <CurrencyDisplay amount={totalPrice} className="text-white ml-1 font-bold" />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
