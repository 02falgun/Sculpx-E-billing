"use client";

import * as React from "react";
import { MenuItem, Category } from "@/types";
import {
  useCategories,
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/hooks/useMenu";
import { CurrencyDisplay, DietIndicator } from "@/components/shared";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useUIStore } from "@/store";
import {
  Sparkles,
  Utensils,
  Check,
  X,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";

export function MenuCatalogManager() {
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: menuItems = [], isLoading: isLoadingItems } = useMenuItems();

  const createItemMutation = useCreateMenuItem();
  const updateItemMutation = useUpdateMenuItem();
  const deleteItemMutation = useDeleteMenuItem();

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const addToast = useUIStore((s) => s.addToast);

  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Dish Modals state
  const [isAddItemOpen, setIsAddItemOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<MenuItem | null>(null);

  // Category Modals state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);

  // Dish Form states
  const [itemName, setItemName] = React.useState("");
  const [itemDescription, setItemDescription] = React.useState("");
  const [itemCategoryId, setItemCategoryId] = React.useState("");
  const [itemPrice, setItemPrice] = React.useState<number | "">(150);
  const [itemPrepTime, setItemPrepTime] = React.useState<number | "">(15);
  const [itemDietary, setItemDietary] = React.useState<import("@/types").DietaryType>("VEG");
  const [itemSpiceLevel, setItemSpiceLevel] = React.useState<string>("MILD");
  const [itemIsSpecial, setItemIsSpecial] = React.useState(false);
  const [itemIsAvailable, setItemIsAvailable] = React.useState(true);
  const [itemError, setItemError] = React.useState<string | null>(null);

  // Category Form states
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryDescription, setCategoryDescription] = React.useState("");
  const [categoryDisplayOrder, setCategoryDisplayOrder] = React.useState<number | "">(1);
  const [categoryError, setCategoryError] = React.useState<string | null>(null);

  // Reset Item Form
  const resetItemForm = () => {
    setItemName("");
    setItemDescription("");
    setItemCategoryId(categories[0]?.id || "");
    setItemPrice(150);
    setItemPrepTime(15);
    setItemDietary("VEG");
    setItemSpiceLevel("MILD");
    setItemIsSpecial(false);
    setItemIsAvailable(true);
    setItemError(null);
  };

  const handleOpenAddItem = () => {
    resetItemForm();
    if (selectedCategoryId !== "all") {
      setItemCategoryId(selectedCategoryId);
    } else if (categories.length > 0) {
      setItemCategoryId(categories[0].id);
    }
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemCategoryId(item.categoryId);
    setItemPrice(item.price);
    setItemPrepTime(item.preparationTimeMinutes || 15);
    setItemDietary(item.dietaryType || "VEG");
    setItemSpiceLevel(String(item.spiceLevel ?? "MILD"));
    setItemIsSpecial(item.isChefSpecial || false);
    setItemIsAvailable(item.isAvailable);
    setItemError(null);
  };

  // Reset Category Form
  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryDisplayOrder(categories.length + 1);
    setCategoryError(null);
  };

  const handleOpenAddCategory = () => {
    resetCategoryForm();
    setIsAddCategoryOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || "");
    setCategoryDisplayOrder(cat.displayOrder || 1);
    setCategoryError(null);
  };

  // Dish Mutation Handlers
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setItemError("Dish name is required.");
      return;
    }
    if (!itemCategoryId) {
      setItemError("Please select a category.");
      return;
    }
    if (itemPrice === "" || Number(itemPrice) < 0) {
      setItemError("Please enter a valid price.");
      return;
    }

    setItemError(null);
    try {
      const payload: Partial<MenuItem> = {
        name: itemName.trim(),
        description: itemDescription.trim(),
        categoryId: itemCategoryId,
        price: Number(itemPrice),
        preparationTimeMinutes: Number(itemPrepTime) || 15,
        dietaryType: itemDietary,
        spiceLevel: itemSpiceLevel as any,
        isChefSpecial: itemIsSpecial,
        isAvailable: itemIsAvailable,
      };

      if (editingItem) {
        await updateItemMutation.mutateAsync({
          id: editingItem.id,
          item: payload,
        });
        setEditingItem(null);
        addToast({
          type: "success",
          title: "Dish Updated",
          message: `${itemName.trim()} updated successfully.`,
        });
      } else {
        await createItemMutation.mutateAsync(payload);
        setIsAddItemOpen(false);
        resetItemForm();
        addToast({
          type: "success",
          title: "Dish Created",
          message: `${itemName.trim()} added to the menu catalogue.`,
        });
      }
    } catch (err: any) {
      setItemError(err?.message || "Failed to save dish");
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      await deleteItemMutation.mutateAsync(deletingItem.id);
      addToast({
        type: "success",
        title: "Dish Removed",
        message: `${deletingItem.name} has been removed or archived safely.`,
      });
      setDeletingItem(null);
    } catch (err: any) {
      alert(err?.message || "Failed to delete menu item");
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const nextVal = !item.isAvailable;
    try {
      await updateItemMutation.mutateAsync({
        id: item.id,
        item: { isAvailable: nextVal },
      });
      addToast({
        type: nextVal ? "success" : "info",
        title: "Availability Updated",
        message: `${item.name} marked as ${nextVal ? "In Stock" : "86'd / Sold Out"}.`,
      });
    } catch (err: any) {
      alert(err?.message || "Failed to toggle availability");
    }
  };

  // Category Mutation Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError("Category name is required.");
      return;
    }

    setCategoryError(null);
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: {
            name: categoryName.trim(),
            description: categoryDescription.trim() || undefined,
            displayOrder: Number(categoryDisplayOrder) || 1,
          },
        });
        setEditingCategory(null);
        addToast({
          type: "success",
          title: "Category Updated",
          message: `Category ${categoryName.trim()} updated.`,
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
          displayOrder: Number(categoryDisplayOrder) || 1,
        });
        setIsAddCategoryOpen(false);
        resetCategoryForm();
        addToast({
          type: "success",
          title: "Category Created",
          message: `Category ${categoryName.trim()} added.`,
        });
      }
    } catch (err: any) {
      setCategoryError(err?.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategoryMutation.mutateAsync(deletingCategory.id);
      if (selectedCategoryId === deletingCategory.id) {
        setSelectedCategoryId("all");
      }
      addToast({
        type: "success",
        title: "Category Removed",
        message: `Category ${deletingCategory.name} removed safely.`,
      });
      setDeletingCategory(null);
    } catch (err: any) {
      alert(err?.message || "Failed to delete category");
    }
  };

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat =
        selectedCategoryId === "all" || item.categoryId === selectedCategoryId;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query));
      return matchesCat && matchesQuery;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const activeCategoryObj = React.useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const itemsInActiveCategory = React.useMemo(() => {
    if (!activeCategoryObj) return 0;
    return menuItems.filter((i) => i.categoryId === activeCategoryObj.id).length;
  }, [menuItems, activeCategoryObj]);

  if (isLoadingItems && menuItems.length === 0 && isLoadingCategories) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search dish or ingredient..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenAddCategory}
            leftIcon={<FolderPlus className="h-4 w-4" />}
            className="text-xs font-bold border-slate-300 hover:bg-slate-50"
          >
            Add Category
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenAddItem}
            leftIcon={<Plus className="h-4 w-4" />}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
          >
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Categories Tabs & Management */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategoryId === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((c) => {
            const count = menuItems.filter((i) => i.categoryId === c.id).length;
            const isSelected = selectedCategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(c.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeCategoryObj && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenEditCategory(activeCategoryObj)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={`Edit Category: ${activeCategoryObj.name}`}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeletingCategory(activeCategoryObj)}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title={`Delete Category: ${activeCategoryObj.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Menu Catalog Table / Empty State */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 pl-4 pr-3">Dish Details</th>
              <th className="py-3.5 px-3">Category</th>
              <th className="py-3.5 px-3">Dietary</th>
              <th className="py-3.5 px-3">Base Price</th>
              <th className="py-3.5 px-3">Prep Time</th>
              <th className="py-3.5 px-3">Special Flags</th>
              <th className="py-3.5 px-3 text-center">Availability (86)</th>
              <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center text-slate-500">
                  <Utensils className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-800 text-sm">
                    {menuItems.length === 0
                      ? "Your menu catalogue is empty."
                      : "No dishes found matching your criteria."}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {menuItems.length === 0
                      ? "Add categories and menu items to publish them to dining room tables and guestroom QR codes."
                      : "Try clearing your search query or selecting a different category."}
                  </p>

                  <div className="pt-4 flex items-center justify-center gap-2">
                    {categories.length === 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenAddCategory}
                        leftIcon={<FolderPlus className="h-4 w-4" />}
                      >
                        Add First Category
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenAddItem}
                      leftIcon={<Plus className="h-4 w-4" />}
                      className="bg-slate-900 font-bold"
                    >
                      {menuItems.length === 0 ? "Add First Menu Item" : "Add Menu Item"}
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-4 pr-3">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      {item.categoryName || categories.find((c) => c.id === item.categoryId)?.name || "Dish"}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <DietIndicator type={item.dietaryType} />
                  </td>

                  <td className="py-3.5 px-3">
                    <CurrencyDisplay amount={item.price} className="font-bold text-slate-900" />
                  </td>

                  <td className="py-3.5 px-3 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      ~{item.preparationTimeMinutes || 15}m
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    {item.isChefSpecial && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        <Sparkles className="h-3 w-3" /> Chef&apos;s Special
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item)}
                      disabled={updateItemMutation.isPending}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                        item.isAvailable
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>86&apos;d</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 pr-4 pl-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Dish"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Dish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Menu Item Dialog */}
      <Dialog
        isOpen={isAddItemOpen || !!editingItem}
        onClose={() => {
          setIsAddItemOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? `Edit Dish: ${editingItem.name}` : "Add Menu Item"}
        description="Configure item details, authoritative price, category, and dietary profile."
      >
        <form onSubmit={handleSaveItem} className="space-y-4 pt-2">
          {itemError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{itemError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name *</label>
            <Input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Paneer Butter Masala, Club Sandwich"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Description, key ingredients, preparation details..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {categories.length === 0 && (
                  <option value="">No categories - add one first</option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹) *</label>
              <Input
                type="number"
                min={0}
                step="any"
                required
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="150"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dietary Type</label>
              <select
                value={itemDietary}
                onChange={(e) => setItemDietary(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="EGG">Contains Egg</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Spice Level</label>
              <select
                value={itemSpiceLevel}
                onChange={(e) => setItemSpiceLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="NONE">None</option>
                <option value="MILD">Mild</option>
                <option value="MEDIUM">Medium</option>
                <option value="HOT">Hot</option>
                <option value="EXTRA_HOT">Extra Hot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prep Time (mins)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={itemPrepTime}
                onChange={(e) => setItemPrepTime(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="15"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={itemIsSpecial}
                onChange={(e) => setItemIsSpecial(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Chef&apos;s Special Flag</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={itemIsAvailable}
                onChange={(e) => setItemIsAvailable(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Available in Stock</span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddItemOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold text-white"
              isLoading={createItemMutation.isPending || updateItemMutation.isPending}
            >
              {editingItem ? "Save Changes" : "Create Dish"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title={`Delete Menu Item: ${deletingItem?.name || ""}`}
        description="Remove this dish from the menu catalogue."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete <strong className="text-slate-900">{deletingItem?.name}</strong>? If this item has historical orders or bill receipts, it will be safely deactivated to preserve past financial records.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeletingItem(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleDeleteItem}
              isLoading={deleteItemMutation.isPending}
            >
              Delete Dish
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add / Edit Category Dialog */}
      <Dialog
        isOpen={isAddCategoryOpen || !!editingCategory}
        onClose={() => {
          setIsAddCategoryOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : "Add Menu Category"}
        description="Organize your menu into structured guest dining sections."
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
          {categoryError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{categoryError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
            <Input
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Appetizers, Main Course, Beverages, Desserts"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <Input
              value={categoryDescription}
              onChange={(e) => setCategoryDescription(e.target.value)}
              placeholder="e.g. Sizzling starters, traditional tandoor specialties"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Display Sort Order</label>
            <Input
              type="number"
              min={1}
              value={categoryDisplayOrder}
              onChange={(e) => setCategoryDisplayOrder(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddCategoryOpen(false);
                setEditingCategory(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold text-white"
              isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
            >
              {editingCategory ? "Save Category" : "Create Category"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title={`Delete Category: ${deletingCategory?.name || ""}`}
        description="Safely remove this category from the catalogue."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete category <strong className="text-slate-900">{deletingCategory?.name}</strong>?
            {itemsInActiveCategory > 0 && (
              <span className="block mt-2 font-semibold text-rose-600">
                Notice: This category currently contains {itemsInActiveCategory} menu items. It will be archived to avoid breaking existing items.
              </span>
            )}
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={handleDeleteCategory}
              isLoading={deleteCategoryMutation.isPending}
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
