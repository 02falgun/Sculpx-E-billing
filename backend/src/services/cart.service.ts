import { Prisma } from "@prisma/client";
import type { DbClient } from "../database/prisma.js";
import { menuItemModel } from "../models/menu.model.js";
import { qrService } from "./qr.service.js";
import type { ValidateCartRequest } from "../validations/cart.validation.js";
import type {
  CartValidationResponse,
  ValidatedLineItem,
  ValidatedModifierSelection,
} from "../types/order.types.js";

export class CartService {
  /**
   * Validate a customer cart against live PostgreSQL catalog and QR context.
   * Calculates authoritative Decimal prices and tax components.
   * Does NOT write to the database or create orders.
   */
  async validateCart(
    payload: ValidateCartRequest,
    client?: DbClient
  ): Promise<CartValidationResponse> {
    // 1. Resolve and verify QR context and tenant scope
    const validatedQr = await qrService.resolveValidatedQrEntity(payload.qrToken, client);
    const tenantId = validatedQr.tenantId;

    // 2. Query all requested menu items belonging to the verified tenant in a single snapshot
    const requestedMenuItemIds = Array.from(new Set(payload.items.map((i) => i.menuItemId)));
    const menuItems = await menuItemModel.findManyForPricing(tenantId, requestedMenuItemIds, client);

    const menuItemsMap = new Map(menuItems.map((m) => [m.id, m]));

    let isValid = true;
    const unavailableItems: Array<{ menuItemId: string; reason: string }> = [];
    const priceDiscrepancies: Array<{ menuItemId: string; clientPrice: number; serverPrice: number }> = [];
    const warnings: string[] = [];
    const lineItems: ValidatedLineItem[] = [];

    // Decimal accumulators for authoritative monetary math
    let totalItemsSubtotal = new Prisma.Decimal(0);
    let totalModifiersSubtotal = new Prisma.Decimal(0);
    let totalTaxableSubtotal = new Prisma.Decimal(0);
    let totalCgst = new Prisma.Decimal(0);
    let totalSgst = new Prisma.Decimal(0);

    // 3. Validate each requested item and its modifier selections
    for (const itemInput of payload.items) {
      const menuItem = menuItemsMap.get(itemInput.menuItemId);

      if (!menuItem) {
        isValid = false;
        unavailableItems.push({
          menuItemId: itemInput.menuItemId,
          reason: "Menu item does not exist or does not belong to this venue",
        });
        continue;
      }

      if (!menuItem.isAvailable) {
        isValid = false;
        unavailableItems.push({
          menuItemId: menuItem.id,
          reason: `Item '${menuItem.name}' is currently unavailable (86'd)`,
        });
        continue;
      }

      // Consolidate modifier options (accept both modifierOptionIds and modifierIds)
      const rawModifierIds = [
        ...(itemInput.modifierOptionIds || []),
        ...(itemInput.modifierIds || []),
      ];
      const selectedOptionIds = Array.from(new Set(rawModifierIds));

      // Build modifier option lookup for this item
      const optionMap = new Map<
        string,
        {
          option: (typeof menuItem.modifierGroups)[number]["options"][number];
          group: (typeof menuItem.modifierGroups)[number];
        }
      >();

      for (const group of menuItem.modifierGroups) {
        for (const opt of group.options) {
          optionMap.set(opt.id, { option: opt, group });
        }
      }

      // Check selected options validity and availability
      const validSelectedOptions: ValidatedModifierSelection[] = [];

      for (const optId of selectedOptionIds) {
        const found = optionMap.get(optId);
        if (!found) {
          isValid = false;
          unavailableItems.push({
            menuItemId: menuItem.id,
            reason: `Modifier option '${optId}' is not valid for item '${menuItem.name}'`,
          });
          continue;
        }

        // Modifier options have no availability column today; honour one if it is added.
        if ("isAvailable" in found.option && found.option.isAvailable === false) {
          isValid = false;
          unavailableItems.push({
            menuItemId: menuItem.id,
            reason: `Modifier option '${found.option.name}' for item '${menuItem.name}' is sold out`,
          });
          continue;
        }

        validSelectedOptions.push({
          id: found.option.id,
          name: found.option.name,
          price: Number(found.option.price.toFixed(2)),
          groupName: found.group.name,
        });
      }

      // Check modifier group min/max selection cardinality rules
      for (const group of menuItem.modifierGroups) {
        const countInGroup = selectedOptionIds.filter((optId) => {
          const found = optionMap.get(optId);
          return found && found.group.id === group.id;
        }).length;

        if (countInGroup < group.minSelections || (group.isRequired && countInGroup === 0)) {
          isValid = false;
          const msg = `Modifier group '${group.name}' requires at least ${group.minSelections} selection(s), but ${countInGroup} were selected.`;
          warnings.push(msg);
          unavailableItems.push({
            menuItemId: menuItem.id,
            reason: msg,
          });
        }

        if (countInGroup > group.maxSelections) {
          isValid = false;
          const msg = `Modifier group '${group.name}' allows at most ${group.maxSelections} selection(s), but ${countInGroup} were selected.`;
          warnings.push(msg);
          unavailableItems.push({
            menuItemId: menuItem.id,
            reason: msg,
          });
        }
      }

      // 4. Calculate authoritative monetary line totals using Prisma.Decimal
      const unitBasePrice = menuItem.price;
      const modifiersSubtotal = validSelectedOptions.reduce(
        (sum, opt) => sum.plus(new Prisma.Decimal(opt.price)),
        new Prisma.Decimal(0)
      );
      const unitPrice = unitBasePrice.plus(modifiersSubtotal);
      const quantityDecimal = new Prisma.Decimal(itemInput.quantity);
      const lineSubtotal = unitPrice.times(quantityDecimal);

      // Tax rate (defaults to 5.00% Indian GST)
      const taxRate = menuItem.taxRatePercentage ?? new Prisma.Decimal(5.0);
      // Split 50/50 into CGST (2.5%) and SGST (2.5%)
      const lineCgst = lineSubtotal.times(taxRate).dividedBy(200);
      const lineSgst = lineSubtotal.times(taxRate).dividedBy(200);
      const lineTax = lineCgst.plus(lineSgst);
      const lineTotal = lineSubtotal.plus(lineTax);

      // Accumulate totals
      totalItemsSubtotal = totalItemsSubtotal.plus(unitBasePrice.times(quantityDecimal));
      totalModifiersSubtotal = totalModifiersSubtotal.plus(modifiersSubtotal.times(quantityDecimal));
      totalTaxableSubtotal = totalTaxableSubtotal.plus(lineSubtotal);
      totalCgst = totalCgst.plus(lineCgst);
      totalSgst = totalSgst.plus(lineSgst);

      // Client price discrepancy check if client passed clientPrice
      if (itemInput.clientPrice !== undefined) {
        const serverUnitPriceNum = Number(unitPrice.toFixed(2));
        if (Math.abs(itemInput.clientPrice - serverUnitPriceNum) > 0.01) {
          priceDiscrepancies.push({
            menuItemId: menuItem.id,
            clientPrice: itemInput.clientPrice,
            serverPrice: serverUnitPriceNum,
          });
        }
      }

      lineItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: itemInput.quantity,
        unitBasePrice: Number(unitBasePrice.toFixed(2)),
        modifiersSubtotal: Number(modifiersSubtotal.toFixed(2)),
        unitPrice: Number(unitPrice.toFixed(2)),
        lineSubtotal: Number(lineSubtotal.toFixed(2)),
        taxRate: Number(taxRate.toFixed(2)),
        taxAmount: Number(lineTax.toFixed(2)),
        lineTotal: Number(lineTotal.toFixed(2)),
        modifiers: validSelectedOptions,
        specialInstructions: itemInput.specialInstructions,
      });
    }

    // 5. Final totals computation
    const totalTax = totalCgst.plus(totalSgst);
    const grandTotal = totalTaxableSubtotal.plus(totalTax);

    const calculatedSubtotal = Number(totalTaxableSubtotal.toFixed(2));
    const calculatedTax = Number(totalTax.toFixed(2));
    const calculatedGrandTotal = Number(grandTotal.toFixed(2));

    const diningContext =
      validatedQr.type === "TABLE" && validatedQr.table
        ? {
            type: "TABLE" as const,
            identifier: validatedQr.table.tableNumber,
            displayName: validatedQr.table.displayName || `Table ${validatedQr.table.tableNumber}`,
            roomOrTableId: validatedQr.table.id,
            status: validatedQr.table.status,
          }
        : {
            type: "ROOM" as const,
            identifier: validatedQr.room!.roomNumber,
            displayName: `Room ${validatedQr.room!.roomNumber}`,
            roomOrTableId: validatedQr.room!.id,
            status: validatedQr.room!.status,
          };

    return {
      isValid,
      context: diningContext,
      lineItems,
      pricing: {
        itemsSubtotal: Number(totalItemsSubtotal.toFixed(2)),
        modifiersSubtotal: Number(totalModifiersSubtotal.toFixed(2)),
        taxableSubtotal: calculatedSubtotal,
        taxBreakdown: {
          cgstRate: 2.5,
          cgstAmount: Number(totalCgst.toFixed(2)),
          sgstRate: 2.5,
          sgstAmount: Number(totalSgst.toFixed(2)),
          totalTax: calculatedTax,
        },
        grandTotal: calculatedGrandTotal,
      },
      calculatedSubtotal,
      calculatedTax,
      calculatedGrandTotal,
      unavailableItems,
      priceDiscrepancies,
      warnings,
    };
  }
}

export const cartService = new CartService();
