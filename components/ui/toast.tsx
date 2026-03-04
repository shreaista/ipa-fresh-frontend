"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const Icon = toast.type === "success" ? CheckCircle : toast.type === "error" ? AlertCircle : Info;
  
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg animate-in slide-in-from-right-full duration-300",
        toast.type === "success" && "border-emerald-200 dark:border-emerald-800",
        toast.type === "error" && "border-red-200 dark:border-red-800",
        toast.type === "info" && "border-blue-200 dark:border-blue-800"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          toast.type === "success" && "text-emerald-600",
          toast.type === "error" && "text-red-600",
          toast.type === "info" && "text-blue-600"
        )}
      />
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="ml-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
