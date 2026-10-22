"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: "pill" | "underline";
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = "pill",
}: TabsProps) {
  if (variant === "underline") {
    return (
      <div className={cn("flex space-x-6 border-b border-neutral-200 overflow-x-auto", className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex items-center space-x-2 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors",
                isActive
                  ? "border-black text-black font-bold"
                  : "border-transparent text-neutral-500 hover:text-black hover:border-neutral-300",
              )}
            >
              <span>{tab.label}</span>
              {tab.badge && <span>{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex p-1 rounded-[6px] bg-neutral-100 space-x-1 overflow-x-auto max-w-full",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all whitespace-nowrap",
              isActive
                ? "bg-white text-black font-semibold shadow-xs"
                : "text-neutral-600 hover:text-black hover:bg-neutral-200/50",
            )}
          >
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
