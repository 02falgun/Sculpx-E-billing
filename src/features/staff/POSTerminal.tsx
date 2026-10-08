"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTables, useRooms, useUpdateTableStatus } from "@/hooks/useTables";
import { useCategories, useMenuItems } from "@/hooks/useMenu";
import { useCreateOrder } from "@/hooks/useOrder";
import { usePOSStore, useUIStore } from "@/store";
import { MenuItem, Table, Room } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { CurrencyDisplay, DietIndicator } from "@/components/shared";
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Flame,
  Building2,
  Users,
  AlertCircle,
  Receipt,
} from "lucide-react";

interface DraftItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export function POSTerminal() {
  const router = useRouter();
  const selectedTable = usePOSStore((s) => s.selectedTable);
  const selectedRoom = usePOSStore((s) => s.selectedRoom);
  const setSelectedTable = usePOSStore((s) => s.setSelectedTable);
  const setSelectedRoom = usePOSStore((s) => s.setSelectedRoom);

  const { data: tables = [] } = useTables();
  const { data: rooms = [] } = useRooms();
  const { data: categories = [] } = useCategories();
  const { data: menuItems = [] } = useMenuItems();

  const { mutateAsync: createOrder, isPending: isSubmitting } = useCreateOrder();
  const { mutateAsync: updateTableStatus } = useUpdateTableStatus();
  const addToast = useUIStore((s) => s.addToast);

  // Active category & search
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Mode: TABLE vs ROOM
  const [contextMode, setContextMode] = React.useState<"TABLE" | "ROOM">(
    selectedRoom ? "ROOM" : "TABLE"
  );

  // Active Draft Ticket State
  const [ticketItems, setTicketItems] = React.useState<DraftItem[]>([]);
  const [guestName, setGuestName] = React.useState<string>("");
  const [guestPhone, setGuestPhone] = React.useState<string>("");
  const [orderNotes, setOrderNotes] = React.useState<string>("");
  const [paymentPreference, setPaymentPreference] = React.useState<"PAY_LATER" | "PAY_NOW">("PAY_LATER");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Filtered menu items
  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategoryId === "all" || item.categoryId === activeCategoryId;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategoryId, searchQuery]);

  // Add item to draft ticket
  const handleAddItem = (item: MenuItem) => {
    setTicketItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalPrice: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: 1,
          totalPrice: item.price,
        },
      ];
    });
  };

  const handleUpdateQuantity = (menuItemId: string, delta: number) => {
    setTicketItems((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return {
              ...i,
              quantity: newQty,
              totalPrice: newQty * i.unitPrice,
            };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (menuItemId: string) => {
    setTicketItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  // Calculations
  const subtotal = ticketItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + tax;

  // Submit Order
  const handleFireOrder = async () => {
    setErrorMessage(null);

    let activeQrToken = "";
    if (contextMode === "TABLE") {
      if (!selectedTable) {
        setErrorMessage("Please select an active table for this order.");
        return;
      }
      activeQrToken = selectedTable.qrToken;
    } else {
      if (!selectedRoom) {
        setErrorMessage("Please select a target guest room for this order.");
        return;
      }
      activeQrToken = selectedRoom.qrToken;
    }

    if (ticketItems.length === 0) {
      setErrorMessage("Please add at least one item to the ticket.");
      return;
    }

    try {
      const orderRes = await createOrder({
        qrToken: activeQrToken,
        customerName: guestName.trim() || undefined,
        customerPhone: guestPhone.trim() || undefined,
        specialInstructions: orderNotes.trim() || undefined,
        paymentPreference,
        items: ticketItems.map((ti) => ({
          menuItemId: ti.menuItemId,
          quantity: ti.quantity,
          modifierIds: [],
        })),
      });

      // Update table status to occupied if table order
      if (contextMode === "TABLE" && selectedTable) {
        await updateTableStatus({ id: selectedTable.id, status: "OCCUPIED" });
      }

      addToast({
        type: "success",
        title: "Order Fired to Kitchen",
        message: `KOT dispatched for ${orderRes.orderNumber}!`,
      });

      // Reset ticket
      setTicketItems([]);
      setOrderNotes("");
      setGuestName("");
      setGuestPhone("");

      // Redirect to the created order
      router.push(`/order/${orderRes.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fire order to kitchen.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Menu Catalog (Cols 7) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Context switch banner */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setContextMode("TABLE")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                contextMode === "TABLE"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Restaurant Table
            </button>
            <button
              type="button"
              onClick={() => setContextMode("ROOM")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                contextMode === "ROOM"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Room Service
            </button>
          </div>

          {/* Table / Room Selector Dropdown */}
          <div className="flex items-center gap-2">
            {contextMode === "TABLE" ? (
              <select
                value={selectedTable?.id || ""}
                onChange={(e) => {
                  const tbl = tables.find((t) => t.id === e.target.value) || null;
                  setSelectedTable(tbl);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Choose Table --</option>
                {tables.map((tbl) => (
                  <option key={tbl.id} value={tbl.id}>
                    Table {tbl.tableNumber} ({tbl.section} - {tbl.status})
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedRoom?.id || ""}
                onChange={(e) => {
                  const rm = rooms.find((r) => r.id === e.target.value) || null;
                  setSelectedRoom(rm);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none"
              >
                <option value="">-- Choose Room --</option>
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    Room {rm.roomNumber} (Floor {rm.floor})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Category Tabs & Fast Search */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveCategoryId("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeCategoryId === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeCategoryId === cat.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="w-48 sm:w-56 shrink-0">
              <SearchInput
                placeholder="Search dish..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
              />
            </div>
          </div>
        </div>

        {/* Menu Items Fast-Add Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <DietIndicator type={item.dietaryType} />
                  <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                    {item.name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <CurrencyDisplay
                    amount={item.price}
                    className="text-xs font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">~{item.preparationTimeMinutes}m</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-2.5 text-xs font-semibold"
                onClick={() => handleAddItem(item)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: POS Active Order Ticket (Cols 5) */}
      <div className="lg:col-span-5 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4 sticky top-20">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Current POS Ticket</h2>
          </div>
          {contextMode === "TABLE" && selectedTable ? (
            <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              Table {selectedTable.tableNumber}
            </span>
          ) : contextMode === "ROOM" && selectedRoom ? (
            <span className="rounded-lg bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              Room {selectedRoom.roomNumber}
            </span>
          ) : (
            <span className="text-xs text-rose-600 font-bold">No Location Picked</span>
          )}
        </div>

        {/* Error notice banner */}
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Ticket Line Items */}
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2">
          {ticketItems.length > 0 ? (
            ticketItems.map((item) => (
              <div key={item.menuItemId} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex-1 pr-2">
                  <span className="font-bold text-slate-900 block line-clamp-1">{item.name}</span>
                  <CurrencyDisplay amount={item.totalPrice} className="text-[11px] text-slate-500 font-semibold" />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.menuItemId, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  >
                    <Minus className="h-3 w-3 text-slate-600" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQuantity(item.menuItemId, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="h-3 w-3 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.menuItemId)}
                    className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              Ticket is empty. Tap items on the left to add dishes.
            </div>
          )}
        </div>

        {/* Guest & Instructions Form */}
        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Guest Name (Optional)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs focus:border-amber-500 focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Guest Mobile"
              maxLength={10}
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="rounded-xl border border-slate-200 p-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <textarea
            placeholder="Special Kitchen Instructions (e.g. less salt, serve together)..."
            rows={2}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-amber-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 font-medium">Payment Mode</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentPreference("PAY_LATER")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                  paymentPreference === "PAY_LATER"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Pay Later
              </button>
              <button
                type="button"
                onClick={() => setPaymentPreference("PAY_NOW")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer ${
                  paymentPreference === "PAY_NOW"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Prepay
              </button>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <CurrencyDisplay amount={subtotal} />
          </div>
          <div className="flex justify-between text-slate-500">
            <span>GST (5%)</span>
            <CurrencyDisplay amount={tax} />
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>Total Bill</span>
            <CurrencyDisplay amount={grandTotal} className="text-amber-600 font-black text-base" />
          </div>
        </div>

        {/* Fire to Kitchen Action */}
        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={ticketItems.length === 0}
          onClick={handleFireOrder}
          className="w-full font-semibold shadow-xs"
          leftIcon={<Flame className="h-4 w-4 text-white" />}
        >
          <span>Fire KOT to Kitchen • </span>
          <CurrencyDisplay amount={grandTotal} className="text-white ml-1 font-bold" />
        </Button>
      </div>
    </div>
  );
}
