"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  Users,
  Settings,
  Trash2,
} from "lucide-react";

const tenants = [
  { id: "t-001", name: "Acme Corp", plan: "Enterprise", seats: 45, used: 42, status: "Active", lastActivity: "2 hours ago" },
  { id: "t-002", name: "Beta Inc", plan: "Pro", seats: 20, used: 12, status: "Active", lastActivity: "5 mins ago" },
  { id: "t-003", name: "Gamma LLC", plan: "Starter", seats: 10, used: 5, status: "Trial", lastActivity: "1 day ago" },
  { id: "t-004", name: "Delta Partners", plan: "Enterprise", seats: 100, used: 78, status: "Active", lastActivity: "30 mins ago" },
  { id: "t-005", name: "Epsilon Fund", plan: "Pro", seats: 30, used: 23, status: "Active", lastActivity: "3 hours ago" },
  { id: "t-006", name: "Zeta Ventures", plan: "Enterprise", seats: 50, used: 48, status: "Active", lastActivity: "1 hour ago" },
  { id: "t-007", name: "Eta Holdings", plan: "Starter", seats: 5, used: 2, status: "Suspended", lastActivity: "7 days ago" },
];

const statusStyles = {
  Active: "success",
  Trial: "warning",
  Suspended: "destructive",
} as const;

export default function TenantsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredTenants = tenants.filter((t) => {
    const matchesFilter = filter === "all" || t.status.toLowerCase() === filter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Manage all tenant organizations"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="trial">Trial</TabsTrigger>
                <TabsTrigger value="suspended">Suspended</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tenant.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tenant.used}</span>
                      <span className="text-muted-foreground">/ {tenant.seats}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusStyles[tenant.status as keyof typeof statusStyles]}>
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tenant.lastActivity}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" />
                          View Users
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
