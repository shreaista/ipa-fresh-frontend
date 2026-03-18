"use client";

import { createContext, useContext } from "react";

interface RoleContextValue {
  role: string;
  isReadOnly: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({
  role,
  isReadOnly,
  children,
}: {
  role: string;
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  return (
    <RoleContext.Provider value={{ role, isReadOnly }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return { role: "viewer", isReadOnly: true };
  }
  return ctx;
}
