"use client";

import { useState } from "react";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Search,
  UserPlus,
  User,
  Users,
  Mail,
  Shield,
  MoreHorizontal,
  Settings,
  Trash2,
  CheckCircle,
} from "lucide-react";

const members = [
  { id: "u-001", name: "Alice Johnson", email: "alice@tenant.com", role: "Admin", status: "Active", lastSeen: "Online", assessments: 0, avatar: "AJ" },
  { id: "u-002", name: "Bob Smith", email: "bob@tenant.com", role: "Assessor", status: "Active", lastSeen: "2 hrs ago", assessments: 45, avatar: "BS" },
  { id: "u-003", name: "Carol Davis", email: "carol@tenant.com", role: "Assessor", status: "Active", lastSeen: "1 day ago", assessments: 38, avatar: "CD" },
  { id: "u-004", name: "David Lee", email: "david@tenant.com", role: "Assessor", status: "Active", lastSeen: "30 mins ago", assessments: 52, avatar: "DL" },
  { id: "u-005", name: "Eve Wilson", email: "eve@tenant.com", role: "Viewer", status: "Active", lastSeen: "3 days ago", assessments: 0, avatar: "EW" },
  { id: "u-006", name: "Frank Brown", email: "frank@tenant.com", role: "Assessor", status: "Invited", lastSeen: "-", assessments: 0, avatar: "FB" },
  { id: "u-007", name: "Grace Chen", email: "grace@tenant.com", role: "Admin", status: "Invited", lastSeen: "-", assessments: 0, avatar: "GC" },
];

type RoleKey = "Admin" | "Assessor" | "Viewer";
type FilterKey = "all" | "active" | "invited";

const roleVariants: Record<RoleKey, "default" | "info" | "muted"> = {
  Admin: "default",
  Assessor: "info",
  Viewer: "muted",
};

export default function UsersClient() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredMembers = members.filter((m) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && m.status === "Active") ||
      (filter === "invited" && m.status === "Invited");
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeCount = members.filter(m => m.status === "Active").length;
  const invitedCount = members.filter(m => m.status === "Invited").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        subtitle="Manage your platform users"
        actions={
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Members"
          value={members.length}
          description="All users in platform"
          icon={Users}
        />
        <StatCard
          title="Active"
          value={activeCount}
          description="Currently active"
          icon={Shield}
          trend="up"
        />
        <StatCard
          title="Pending Invites"
          value={invitedCount}
          description="Awaiting acceptance"
          icon={Mail}
        />
      </div>

      <DataCard title="All Members" noPadding>
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({members.length})</span>
                </TabsTrigger>
                <TabsTrigger value="active">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Active
                  <span className="ml-1.5 text-xs text-muted-foreground">({activeCount})</span>
                </TabsTrigger>
                <TabsTrigger value="invited">
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  Invited
                  <span className="ml-1.5 text-xs text-muted-foreground">({invitedCount})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="Try adjusting your search or filter"
            action={{ label: "Clear search", onClick: () => setSearch("") }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last Seen</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Assessments</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={roleVariants[member.role as RoleKey]}>
                      {member.role}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={member.status === "Active" ? "success" : "warning"}
                      dot
                    >
                      {member.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {member.lastSeen === "Online" ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      member.lastSeen
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">
                    {member.role === "Assessor" ? (
                      <span className="font-medium">{member.assessments}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
