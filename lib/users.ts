import type { Role } from "./types";

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  tenantId?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: "user-001",
    email: "admin@ipa.com",
    password: "Admin#123",
    name: "SaaS Admin",
    role: "saas_admin",
  },
  {
    id: "user-002",
    email: "tenant@ipa.com",
    password: "Tenant#123",
    name: "Tenant Admin",
    role: "tenant_admin",
    tenantId: "tenant-001",
  },
  {
    id: "user-004",
    email: "fundmanager@ipa.com",
    password: "Fund#123",
    name: "Fund Manager",
    role: "fund_manager",
    tenantId: "tenant-001",
  },
  {
    id: "user-003",
    email: "assessor@ipa.com",
    password: "Assess#123",
    name: "Analyst",
    role: "assessor",
    tenantId: "tenant-001",
  },
  {
    id: "user-005",
    email: "viewer@ipa.com",
    password: "View#123",
    name: "Viewer",
    role: "viewer",
    tenantId: "tenant-001",
  },
];

export function findUserByEmail(email: string): MockUser | undefined {
  return mockUsers.find((u) => u.email === email);
}

export function validateCredentials(email: string, password: string): MockUser | null {
  const user = findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
}
