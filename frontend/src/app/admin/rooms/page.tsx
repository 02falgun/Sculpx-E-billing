"use client";

import * as React from "react";
import { useRooms, useCreateRoom, useUpdateRoom, useRotateRoomQr, useDeactivateRoom } from "@/hooks/useTables";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { BedDouble, Plus, QrCode, RefreshCw, Trash2, Edit2, Users, ExternalLink, Check, AlertCircle } from "lucide-react";
import { Room } from "@/types";

export default function AdminRoomsPage() {
  const { data: rooms = [], isLoading } = useRooms();
  const createRoomMutation = useCreateRoom();
  const updateRoomMutation = useUpdateRoom();
  const rotateQrMutation = useRotateRoomQr();
  const deactivateRoomMutation = useDeactivateRoom();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<Room | null>(null);
  const [qrModalRoom, setQrModalRoom] = React.useState<Room | null>(null);
  const [deactivatingRoom, setDeactivatingRoom] = React.useState<Room | null>(null);

  // Form states
  const [roomNumber, setRoomNumber] = React.useState("");
  const [floor, setFloor] = React.useState("Floor 1");
  const [roomType, setRoomType] = React.useState("Deluxe Suite");
  const [capacity, setCapacity] = React.useState(2);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const resetForm = () => {
    setRoomNumber("");
    setFloor("Floor 1");
    setRoomType("Deluxe Suite");
    setCapacity(2);
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (r: Room) => {
    setEditingRoom(r);
    setRoomNumber(r.roomNumber);
    setFloor(r.floor || "Floor 1");
    setRoomType(r.roomType || "Deluxe Suite");
    setCapacity(r.capacity || 2);
    setErrorMsg(null);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setErrorMsg("Please enter a room number.");
      return;
    }
    setErrorMsg(null);
    try {
      await createRoomMutation.mutateAsync({
        roomNumber: roomNumber.trim(),
        floor: floor.trim() || "Floor 1",
        roomType: roomType.trim() || "Standard Room",
        capacity: Number(capacity) || 2,
      });
      setIsAddModalOpen(false);
      resetForm();
      setSuccessMsg(`Room ${roomNumber} created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create room");
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    setErrorMsg(null);
    try {
      await updateRoomMutation.mutateAsync({
        id: editingRoom.id,
        data: {
          roomNumber: roomNumber.trim(),
          floor: floor.trim(),
          roomType: roomType.trim(),
          capacity: Number(capacity),
        },
      });
      setEditingRoom(null);
      setSuccessMsg(`Room updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update room");
    }
  };

  const handleRotateQr = async (room: Room) => {
    try {
      const res = await rotateQrMutation.mutateAsync(room.id);
      setQrModalRoom({ ...room, qrToken: res.qrToken });
      setSuccessMsg(`QR token for Room ${room.roomNumber} rotated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to rotate QR token");
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingRoom) return;
    try {
      await deactivateRoomMutation.mutateAsync(deactivatingRoom.id);
      setDeactivatingRoom(null);
      setSuccessMsg(`Room ${deactivatingRoom.roomNumber} deactivated.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate room");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Guestrooms &amp; Suites
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure hotel rooms, suites, floors, in-room dining destinations, and QR access.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 font-bold"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenAdd}
        >
          Add Room
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading guestrooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          title="No Hotel Rooms Configured Yet"
          description="Your accommodation inventory is empty. Click below to add your first guestroom, assign its floor, and generate its in-room dining QR."
          actionLabel="Add First Room"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {room.floor} &middot; {room.roomType || "Standard"}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">Room {room.roomNumber}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>{room.guestName ? `Guest: ${room.guestName}` : `Cap: ${room.capacity || 2} Guests`}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      room.status === "OCCUPIED"
                        ? "bg-amber-100 text-amber-800"
                        : room.status === "MAINTENANCE"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <div className="truncate mr-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">QR Token</span>
                    <span className="font-mono text-[11px] text-slate-600 truncate block">
                      {room.qrToken || "None"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrModalRoom(room)}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                    title="View QR Code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(room)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Edit Room"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateQr(room)}
                    disabled={rotateQrMutation.isPending}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Rotate QR Code Token"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeactivatingRoom(room)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Deactivate Room"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <a
                  href={room.qrToken ? `/menu/room/${room.roomNumber}?token=${encodeURIComponent(room.qrToken)}` : `/menu/room/${room.roomNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold text-[11px] hover:underline"
                >
                  <span>In-Room Menu</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Guestroom / Suite"
        description="Enter the room number, floor assignment, and room category."
      >
        <form onSubmit={handleCreateRoom} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Number *</label>
              <Input
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. 101, 204, 501"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacity (Guests)</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Floor / Wing</label>
            <Input
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. 1st Floor, East Wing, Penthouse"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Room Category / Type</label>
            <Input
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              placeholder="e.g. Deluxe Suite, Executive King, Ocean View"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={createRoomMutation.isPending}
            >
              Create Room
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        title="Edit Guestroom"
        description="Update room floor, category, or capacity."
      >
        <form onSubmit={handleUpdateRoom} className="space-y-4 pt-2">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Room Number</label>
              <Input
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Capacity</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Floor / Wing</label>
            <Input
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Room Category</label>
            <Input
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingRoom(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={updateRoomMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Room QR Dialog */}
      <Dialog
        isOpen={!!qrModalRoom}
        onClose={() => setQrModalRoom(null)}
        title={`In-Room Dining QR: Room ${qrModalRoom?.roomNumber}`}
        description="Print or display this QR inside the room for guest ordering."
      >
        <div className="p-4 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
            <QrCode className="h-32 w-32 text-slate-900" />
            <span className="text-xs font-bold text-slate-800 mt-2">
              Room {qrModalRoom?.roomNumber}
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              {qrModalRoom?.floor} &middot; {qrModalRoom?.roomType}
            </span>
          </div>

          <div className="text-xs text-slate-500 w-full space-y-1">
            <span className="block font-bold text-slate-700">Digital Room Menu URL:</span>
            <div className="p-2 bg-slate-100 rounded text-slate-800 font-mono text-[11px] select-all break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/menu/room/${qrModalRoom?.roomNumber}?token=${qrModalRoom?.qrToken}`
                : `/menu/room/${qrModalRoom?.roomNumber}`}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRotateQr(qrModalRoom!)}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              isLoading={rotateQrMutation.isPending}
            >
              Rotate QR Token
            </Button>
            <Button variant="primary" size="sm" onClick={() => setQrModalRoom(null)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deactivate Room Dialog */}
      <Dialog
        isOpen={!!deactivatingRoom}
        onClose={() => setDeactivatingRoom(null)}
        title="Deactivate Room"
        description="Are you sure you want to deactivate this guestroom? It will be archived safely."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Deactivating <strong className="text-slate-900">Room {deactivatingRoom?.roomNumber}</strong> removes it from active service. Historical invoices and stay charges remain preserved.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeactivatingRoom(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleDeactivate}
              isLoading={deactivateRoomMutation.isPending}
            >
              Deactivate Room
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
