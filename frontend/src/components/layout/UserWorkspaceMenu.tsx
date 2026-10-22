"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { getRoleDisplayName } from "@/utils/auth";
import { LogOut, User } from "lucide-react";

interface UserWorkspaceMenuProps {
  className?: string;
  theme?: "light" | "dark";
}

export function UserWorkspaceMenu({ className = "", theme = "dark" }: UserWorkspaceMenuProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = React.useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[6px] border transition-colors cursor-pointer ${
            theme === "dark"
              ? "border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white"
              : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 hover:text-black"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
      </div>
    );
  }

  const roleName = getRoleDisplayName(user.role);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col text-right leading-tight">
        <span
          className={`text-xs font-bold truncate max-w-[140px] sm:max-w-[180px] ${
            theme === "dark" ? "text-white" : "text-neutral-900"
          }`}
        >
          {user.name}
        </span>
        <span
          className={`text-[10px] font-medium tracking-wide ${
            theme === "dark" ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          {roleName}
        </span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        title="Sign out of station"
        aria-label="Logout"
        className={`flex h-8 w-8 items-center justify-center rounded-[6px] border transition-all cursor-pointer ${
          theme === "dark"
            ? "border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-black hover:text-white hover:border-neutral-700"
            : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-black hover:border-neutral-400"
        }`}
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
