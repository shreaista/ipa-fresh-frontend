"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiResult {
  status: number;
  data: unknown;
}

export default function DevtoolsClient() {
  const [authzResult, setAuthzResult] = useState<ApiResult | null>(null);
  const [createResult, setCreateResult] = useState<ApiResult | null>(null);

  const [email, setEmail] = useState("test2@x.com");
  const [name, setName] = useState("Test2");
  const [role, setRole] = useState("assessor");

  async function loadAuthz() {
    const res = await fetch("/api/me/authz");
    const data = await res.json();
    setAuthzResult({ status: res.status, data });
  }

  async function createUser() {
    const res = await fetch("/api/tenant/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role }),
    });
    const data = await res.json();
    setCreateResult({ status: res.status, data });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">RBAC Devtools</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authz Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={loadAuthz}>Load /api/me/authz</Button>
          {authzResult && (
            <pre className="text-xs whitespace-pre-wrap rounded border bg-muted p-3">
              Status: {authzResult.status}
              {"\n\n"}
              {JSON.stringify(authzResult.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">POST /api/tenant/users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="assessor">assessor</option>
                <option value="tenant_admin">tenant_admin</option>
              </select>
            </div>
          </div>
          <Button onClick={createUser}>Create user</Button>
          {createResult && (
            <pre className="text-xs whitespace-pre-wrap rounded border bg-muted p-3">
              Status: {createResult.status}
              {"\n\n"}
              {JSON.stringify(createResult.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
