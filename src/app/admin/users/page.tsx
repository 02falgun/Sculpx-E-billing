"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi } from "@/services/api";
import { User, Role } from "@/types";
import { Users, Plus, ShieldCheck, Mail, Phone, Lock, LogOut, UserX, Edit2, Check, AlertCircle, KeyRound, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await userApi.getUsers();
      if (!res.success) throw new Error(res.error?.message || "Failed to load staff");
      return res.data;
    },
  });

  const { data: roleCatalogData } = useQuery({
    queryKey: ["roleCatalog"],
    queryFn: async () => {
      const res = await roleApi.getPermissionCatalog();
      if (!res.success) return null;
      return res.data;
    },
  });

  // State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [resettingUser, setResettingUser] = React.useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = React.useState<User | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("WAITER");
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [newPassword, setNewPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Custom Roles state
  const [activeTab, setActiveTab] = React.useState<"staff" | "roles">("staff");
  const [isRoleModalOpen, setIsRoleModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<{
    id: string;
    name: string;
    description?: string;
    baseRole: Role;
    permissions: string[];
  } | null>(null);
  const [roleName, setRoleName] = React.useState("");
  const [roleDesc, setRoleDesc] = React.useState("");
  const [roleBase, setRoleBase] = React.useState<Role>("WAITER");
  const [rolePermissions, setRolePermissions] = React.useState<string[]>([]);
  const [deletingRole, setDeletingRole] = React.useState<{ id: string; name: string } | null>(null);

  const { data: customRoles = [], isLoading: isLoadingCustomRoles } = useQuery({
    queryKey: ["customRoles"],
    queryFn: async () => {
      const res = await roleApi.getCustomRoles();
      if (!res.success) return [];
      return res.data;
    },
  });

  const catalog = roleCatalogData?.catalog || [];
  const roleDefaults = roleCatalogData?.roleDefaults || {};

  // Group permissions by category
  const groupedCatalog = React.useMemo(() => {
    const map: Record<string, typeof catalog> = {};
    for (const item of catalog) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [catalog]);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    const defaults = roleDefaults[newRole] || [];
    setSelectedPermissions(defaults);
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleOpenAdd = () => {
    setName("");
    setEmail("");
    setPhoneNumber("");
    setPassword("");
    setRole("WAITER");
    setSelectedPermissions(roleDefaults["WAITER"] || []);
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setPhoneNumber(u.phoneNumber || "");
    setRole(u.role);
    setSelectedPermissions(u.permissions || roleDefaults[u.role] || []);
    setErrorMsg(null);
  };

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await userApi.createUser({
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password: password.trim(),
        role,
        isActive: true,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to create user");
      // If granular permissions were selected, apply them
      if (res.data?.id && selectedPermissions.length > 0 && userApi.updateUserPermissions) {
        await userApi.updateUserPermissions(res.data.id, selectedPermissions);
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsAddModalOpen(false);
      setSuccessMsg(`Staff member ${name} created successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to create staff member");
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      if (userApi.updateUser) {
        const res = await userApi.updateUser(editingUser.id, {
          name: name.trim(),
          phoneNumber: phoneNumber.trim() || null,
          role,
        });
        if (!res.success) throw new Error(res.error?.message || "Failed to update user");
      }
      if (userApi.updateUserPermissions) {
        const permRes = await userApi.updateUserPermissions(editingUser.id, selectedPermissions);
        if (!permRes.success) throw new Error(permRes.error?.message || "Failed to update permissions");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      setSuccessMsg(`Staff details & permissions updated.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to update staff member");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resettingUser || !userApi.resetPassword) return;
      const res = await userApi.resetPassword(resettingUser.id, newPassword);
      if (!res.success) throw new Error(res.error?.message || "Failed to reset password");
    },
    onSuccess: () => {
      setResettingUser(null);
      setNewPassword("");
      setSuccessMsg(`Password reset successfully. Active sessions revoked.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to reset password");
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!userApi.revokeSessions) return;
      const res = await userApi.revokeSessions(userId);
      if (!res.success) throw new Error(res.error?.message || "Failed to revoke sessions");
    },
    onSuccess: () => {
      setSuccessMsg(`All active sessions revoked immediately.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to revoke sessions");
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async () => {
      if (!deactivatingUser || !userApi.deactivateUser) return;
      const res = await userApi.deactivateUser(deactivatingUser.id);
      if (!res.success) throw new Error(res.error?.message || "Failed to deactivate user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeactivatingUser(null);
      setSuccessMsg(`Staff account deactivated.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to deactivate user");
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (editingRole) {
        const res = await roleApi.updateCustomRole(editingRole.id, {
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          baseRole: roleBase,
          permissions: rolePermissions,
        });
        if (!res.success) throw new Error(res.error?.message || "Failed to update custom role");
      } else {
        const res = await roleApi.createCustomRole({
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          baseRole: roleBase,
          permissions: rolePermissions,
        });
        if (!res.success) throw new Error(res.error?.message || "Failed to create custom role");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      setIsRoleModalOpen(false);
      setEditingRole(null);
      setSuccessMsg(editingRole ? "Custom role updated successfully." : "Custom role created successfully.");
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to save custom role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      if (!deletingRole) return;
      const res = await roleApi.deleteCustomRole(deletingRole.id);
      if (!res.success) throw new Error(res.error?.message || "Failed to delete custom role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customRoles"] });
      setDeletingRole(null);
      setSuccessMsg("Custom role removed successfully.");
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to delete custom role");
    },
  });

  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDesc("");
    setRoleBase("WAITER");
    setRolePermissions(roleDefaults["WAITER"] || []);
    setErrorMsg(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (r: {
    id: string;
    name: string;
    description?: string;
    baseRole: Role;
    permissions: string[];
  }) => {
    setEditingRole(r);
    setRoleName(r.name);
    setRoleDesc(r.description || "");
    setRoleBase(r.baseRole);
    setRolePermissions(r.permissions || []);
    setErrorMsg(null);
    setIsRoleModalOpen(true);
  };

  const toggleRolePermission = (key: string) => {
    setRolePermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hospitality Staff &amp; Access Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage employee accounts, assign operational roles, configure granular permissions, and control session security.
          </p>
        </div>

        {activeTab === "staff" ? (
          <Button
            variant="primary"
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 font-bold"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenAdd}
          >
            Add Employee
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 font-bold"
            leftIcon={<Shield className="h-4 w-4" />}
            onClick={handleOpenAddRole}
          >
            Create Custom Role
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "staff"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Accounts</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "roles"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Custom Roles</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-mono">
            {customRoles.length}
          </span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      {activeTab === "staff" ? (
        isLoadingUsers ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <Spinner size="lg" className="text-slate-900" />
          <p className="text-xs font-semibold text-slate-500">Loading staff roster...</p>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No Staff Accounts Found"
          description="Your hotel team has not been configured yet. Add your first employee to assign station privileges and roles."
          actionLabel="Add First Employee"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => {
            const isSelfAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{u.name}</h3>
                      <span className="text-xs font-semibold text-slate-500">{u.role}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        u.role === "ADMIN" || u.role === "SUPER_ADMIN"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : u.role === "MANAGER"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : u.role === "CASHIER"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-800 border-slate-200"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100 mt-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.phoneNumber && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{u.phoneNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Effective Permissions ({u.permissions?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(u.permissions || []).slice(0, 4).map((perm) => (
                        <span
                          key={perm}
                          className="text-[10px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-100 font-mono"
                        >
                          {perm}
                        </span>
                      ))}
                      {(u.permissions?.length || 0) > 4 && (
                        <span className="text-[10px] text-slate-400 px-1 py-0.5">
                          +{(u.permissions?.length || 0) - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Role & Permissions"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setResettingUser(u);
                        setNewPassword("");
                      }}
                      className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      title="Reset Password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeSessionsMutation.mutate(u.id)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Revoke All Sessions"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                    {!isSelfAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeactivatingUser(u)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Deactivate Account"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-slate-400">
                    {u.isActive ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )) : (
        isLoadingCustomRoles ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Spinner size="lg" className="text-slate-900" />
            <p className="text-xs font-semibold text-slate-500">Loading custom role definitions...</p>
          </div>
        ) : customRoles.length === 0 ? (
          <EmptyState
            title="No Custom Roles Defined"
            description="Create specialized hospitality roles tailored to your hotel or restaurant (e.g. Senior Captain, Night Duty Manager, Bar Captain)."
            actionLabel="Create First Custom Role"
            onAction={handleOpenAddRole}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                      <span className="text-xs font-semibold text-slate-500">Base Role: {role.baseRole}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                      Custom
                    </span>
                  </div>

                  {role.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  <div className="pt-3 border-t border-slate-100 mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Assigned Privileges ({role.permissions?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {(role.permissions || []).map((perm) => (
                        <span
                          key={perm}
                          className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditRole(role)}
                      className="text-xs h-7 px-2"
                      leftIcon={<Edit2 className="h-3 w-3" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingRole({ id: role.id, name: role.name })}
                      className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      leftIcon={<Trash2 className="h-3 w-3" />}
                    >
                      Delete
                    </Button>
                  </div>

                  <span className="text-[11px] font-medium text-slate-400">
                    Tenant Scoped
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Employee Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Staff Member"
        description="Create account credentials, assign hospitality role, and grant initial permissions."
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@hotel.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Operational Role *</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ADMIN">ADMIN — Full Hotel Administration</option>
              <option value="MANAGER">MANAGER — Shift Oversight & Inventory</option>
              <option value="CASHIER">CASHIER — Billing & Settlement</option>
              <option value="CAPTAIN">CAPTAIN — Floor Service & Orders</option>
              <option value="WAITER">WAITER — Table Taking & Orders</option>
              <option value="KITCHEN_STAFF">KITCHEN_STAFF — KDS Preparation</option>
            </select>
          </div>

          {/* Granular Permissions Toggle Accordion */}
          <div>
            <span className="block text-xs font-bold text-slate-700 mb-2">
              Granular Permission Overrides ({selectedPermissions.length} selected)
            </span>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
              {Object.entries(groupedCatalog).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {items.map((item) => {
                      const isChecked = selectedPermissions.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-xs text-slate-700 p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(item.key)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="truncate">{item.name}</span>
                          {item.isSensitive && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                              Sensitive
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={createUserMutation.isPending}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Staff & Permissions Dialog */}
      <Dialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Edit Staff: ${editingUser?.name}`}
        description="Update profile, adjust role, and customize granular permissions."
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUserMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ADMIN">ADMIN — Full Hotel Administration</option>
              <option value="MANAGER">MANAGER — Shift Oversight & Inventory</option>
              <option value="CASHIER">CASHIER — Billing & Settlement</option>
              <option value="CAPTAIN">CAPTAIN — Floor Service & Orders</option>
              <option value="WAITER">WAITER — Table Taking & Orders</option>
              <option value="KITCHEN_STAFF">KITCHEN_STAFF — KDS Preparation</option>
            </select>
          </div>

          {/* Granular Permissions Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                Granular Permissions ({selectedPermissions.length} granted)
              </span>
              <button
                type="button"
                onClick={() => setSelectedPermissions(roleDefaults[role] || [])}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset to Role Defaults
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
              {Object.entries(groupedCatalog).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {items.map((item) => {
                      const isChecked = selectedPermissions.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-xs text-slate-700 p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(item.key)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="truncate">{item.name}</span>
                          {item.isSensitive && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                              Sensitive
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={updateUserMutation.isPending}
            >
              Save Permissions &amp; Profile
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        title={`Reset Password: ${resettingUser?.name}`}
        description="Provide a new password for this staff member. All active sessions will be terminated immediately."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetPasswordMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
            <Input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setResettingUser(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              isLoading={resetPasswordMutation.isPending}
            >
              Reset &amp; Revoke Sessions
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Deactivate User Confirmation */}
      <Dialog
        isOpen={!!deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
        title="Deactivate Staff Account"
        description="Are you sure you want to suspend access for this employee?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Deactivating <strong className="text-slate-900">{deactivatingUser?.name}</strong> immediately revokes all current sessions and prevents future logins. Historical audit and order records remain preserved.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeactivatingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() => deactivateUserMutation.mutate()}
              isLoading={deactivateUserMutation.isPending}
            >
              Deactivate Account
            </Button>
          </div>
        </div>
      </Dialog>
      {/* Custom Role Create / Edit Dialog */}
      <Dialog
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Edit Custom Role: ${editingRole.name}` : "Create Custom Role"}
        description="Bundle operational privileges into reusable hospitality role definitions."
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveRoleMutation.mutate();
          }}
          className="space-y-4 pt-2"
        >
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
              <Input
                required
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Senior Floor Captain"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base Operational Role *</label>
              <select
                value={roleBase}
                onChange={(e) => {
                  const b = e.target.value as Role;
                  setRoleBase(b);
                  if (!editingRole) {
                    setRolePermissions(roleDefaults[b] || []);
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="WAITER">WAITER</option>
                <option value="CAPTAIN">CAPTAIN</option>
                <option value="CASHIER">CASHIER</option>
                <option value="KITCHEN_STAFF">KITCHEN_STAFF</option>
                <option value="MANAGER">MANAGER</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
            <Input
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
              placeholder="e.g. Authorized to apply courtesy discounts and expedite high-priority tables"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700">
                Assigned Privileges ({rolePermissions.length} selected)
              </span>
              <button
                type="button"
                onClick={() => setRolePermissions(roleDefaults[roleBase] || [])}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset to Base Defaults
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-3">
              {Object.entries(groupedCatalog).map(([category, items]) => (
                <div key={category} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {items.map((item) => {
                      const isChecked = rolePermissions.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 text-xs text-slate-700 p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRolePermission(item.key)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <div className="min-w-0">
                            <span className="truncate block font-semibold">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                          </div>
                          {item.isSensitive && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold shrink-0">
                              Sensitive
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-slate-900 font-bold"
              isLoading={saveRoleMutation.isPending}
            >
              {editingRole ? "Save Role Changes" : "Create Custom Role"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Custom Role Dialog */}
      <Dialog
        isOpen={!!deletingRole}
        onClose={() => setDeletingRole(null)}
        title="Delete Custom Role"
        description="Are you sure you want to remove this custom role definition?"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Removing <strong className="text-slate-900">{deletingRole?.name}</strong> does not delete employees currently assigned to it, but removes the role definition from your hotel catalog.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeletingRole(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() => deleteRoleMutation.mutate()}
              isLoading={deleteRoleMutation.isPending}
            >
              Delete Role
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
