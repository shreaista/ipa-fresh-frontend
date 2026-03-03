"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, UserPlus, User, Mail, Shield } from "lucide-react";

const usersByTenant = {
  "Acme Corp": [
    { id: "u-001", name: "Alice Johnson", email: "alice@acme.com", role: "Admin", status: "Active", lastSeen: "Online" },
    { id: "u-002", name: "Bob Smith", email: "bob@acme.com", role: "Assessor", status: "Active", lastSeen: "2 hrs ago" },
    { id: "u-003", name: "Carol Davis", email: "carol@acme.com", role: "Assessor", status: "Active", lastSeen: "1 day ago" },
    { id: "u-004", name: "David Lee", email: "david@acme.com", role: "Viewer", status: "Invited", lastSeen: "-" },
  ],
  "Beta Inc": [
    { id: "u-005", name: "Eve Wilson", email: "eve@beta.com", role: "Admin", status: "Active", lastSeen: "Online" },
    { id: "u-006", name: "Frank Brown", email: "frank@beta.com", role: "Assessor", status: "Active", lastSeen: "5 mins ago" },
  ],
  "Delta Partners": [
    { id: "u-007", name: "Grace Kim", email: "grace@delta.com", role: "Admin", status: "Active", lastSeen: "30 mins ago" },
    { id: "u-008", name: "Henry Chen", email: "henry@delta.com", role: "Assessor", status: "Active", lastSeen: "1 hr ago" },
    { id: "u-009", name: "Ivy Martinez", email: "ivy@delta.com", role: "Assessor", status: "Active", lastSeen: "3 hrs ago" },
    { id: "u-010", name: "Jack Taylor", email: "jack@delta.com", role: "Viewer", status: "Active", lastSeen: "2 days ago" },
  ],
};

const roleColors = {
  Admin: "default",
  Assessor: "secondary",
  Viewer: "outline",
} as const;

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const tenants = Object.keys(usersByTenant);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage users across all tenants"
        actions={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs defaultValue={tenants[0]}>
        <TabsList>
          {tenants.map((tenant) => (
            <TabsTrigger key={tenant} value={tenant}>
              {tenant}
              <Badge variant="secondary" className="ml-2 text-xs">
                {usersByTenant[tenant as keyof typeof usersByTenant].length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {tenants.map((tenant) => {
          const users = usersByTenant[tenant as keyof typeof usersByTenant].filter(
            (u) =>
              u.name.toLowerCase().includes(search.toLowerCase()) ||
              u.email.toLowerCase().includes(search.toLowerCase())
          );

          return (
            <TabsContent key={tenant} value={tenant}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{tenant} Users</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleColors[user.role as keyof typeof roleColors]}>
                              <Shield className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.status === "Active" ? "success" : "secondary"}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.lastSeen === "Online" ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                Online
                              </span>
                            ) : (
                              user.lastSeen
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
