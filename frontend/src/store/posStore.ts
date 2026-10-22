import { create } from "zustand";
import { Table, Room, CartItem } from "@/types";

interface POSStoreState {
  selectedTable: Table | null;
  selectedRoom: Room | null;
  posType: "TABLE" | "ROOM" | "WALK_IN";
  draftItems: CartItem[];
  customerNote: string;

  setSelectedTable: (table: Table | null) => void;
  setSelectedRoom: (room: Room | null) => void;
  setPOSType: (type: "TABLE" | "ROOM" | "WALK_IN") => void;
  setDraftItems: (items: CartItem[]) => void;
  setCustomerNote: (note: string) => void;
  resetDraft: () => void;
}

export const usePOSStore = create<POSStoreState>((set) => ({
  selectedTable: null,
  selectedRoom: null,
  posType: "TABLE",
  draftItems: [],
  customerNote: "",

  setSelectedTable: (table) => set({ selectedTable: table, selectedRoom: null, posType: "TABLE" }),
  setSelectedRoom: (room) => set({ selectedRoom: room, selectedTable: null, posType: "ROOM" }),
  setPOSType: (type) => set({ posType: type }),
  setDraftItems: (items) => set({ draftItems: items }),
  setCustomerNote: (note) => set({ customerNote: note }),
  resetDraft: () =>
    set({
      selectedTable: null,
      selectedRoom: null,
      draftItems: [],
      customerNote: "",
    }),
}));
