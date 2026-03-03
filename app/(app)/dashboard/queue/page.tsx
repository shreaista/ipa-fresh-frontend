"use client";

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Search,
  ArrowRight,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const queueItems = [
  { id: "P-095", name: "Senior Wellness Center", tenant: "Elder Care Co", fund: "Healthcare Init", amount: "$120,000", priority: "High", status: "In Progress", due: "Mar 3, 2026", daysLeft: 1, progress: 75 },
  { id: "P-098", name: "Green Energy Project", tenant: "Eco Solutions", fund: "Innovation Grant", amount: "$78,000", priority: "High", status: "Not Started", due: "Mar 5, 2026", daysLeft: 3, progress: 0 },
  { id: "P-096", name: "Food Security Network", tenant: "Hunger Relief", fund: "Emergency Reserve", amount: "$55,000", priority: "Medium", status: "In Progress", due: "Mar 4, 2026", daysLeft: 2, progress: 40 },
  { id: "P-099", name: "Digital Literacy Program", tenant: "Tech For All", fund: "Community Dev", amount: "$25,000", priority: "Medium", status: "Not Started", due: "Mar 6, 2026", daysLeft: 4, progress: 0 },
  { id: "P-100", name: "Arts & Culture Festival", tenant: "Creative Minds", fund: "General Fund", amount: "$35,000", priority: "Low", status: "Not Started", due: "Mar 10, 2026", daysLeft: 8, progress: 0 },
  { id: "P-103", name: "Youth Mentorship", tenant: "Future Leaders", fund: "Youth Programs", amount: "$42,000", priority: "Medium", status: "Not Started", due: "Mar 8, 2026", daysLeft: 6, progress: 0 },
  { id: "P-104", name: "Clean Water Initiative", tenant: "Water For All", fund: "Community Dev", amount: "$68,000", priority: "Low", status: "Not Started", due: "Mar 12, 2026", daysLeft: 10, progress: 0 },
];

const priorityStyles = {
  High: "destructive",
  Medium: "warning",
  Low: "secondary",
} as const;

const statusStyles = {
  "In Progress": "info",
  "Not Started": "outline",
} as const;

export default function QueuePage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredItems = queueItems.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "high" && item.priority === "High") ||
      (filter === "in-progress" && item.status === "In Progress") ||
      (filter === "due-soon" && item.daysLeft <= 3);
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tenant.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const highPriorityCount = queueItems.filter(q => q.priority === "High").length;
  const inProgressCount = queueItems.filter(q => q.status === "In Progress").length;
  const dueSoonCount = queueItems.filter(q => q.daysLeft <= 3).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Queue"
        subtitle="Proposals assigned to you for assessment"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assigned"
          value={queueItems.length.toString()}
          description="In your queue"
          icon={Target}
        />
        <StatCard
          title="High Priority"
          value={highPriorityCount.toString()}
          description="Requires attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="In Progress"
          value={inProgressCount.toString()}
          description="Currently working"
          icon={Clock}
        />
        <StatCard
          title="Due Soon"
          value={dueSoonCount.toString()}
          description="Within 3 days"
          trend={dueSoonCount > 2 ? "down" : "neutral"}
          icon={CheckCircle}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="high">High Priority</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="due-soon">Due Soon</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{item.tenant}</p>
                      <p className="text-xs text-muted-foreground">{item.fund}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.amount}</TableCell>
                  <TableCell>
                    <Badge variant={priorityStyles[item.priority as keyof typeof priorityStyles]}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={statusStyles[item.status as keyof typeof statusStyles]}>
                        {item.status}
                      </Badge>
                      {item.progress > 0 && (
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{item.due}</p>
                      <p className={`text-xs ${item.daysLeft <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button size="sm">
                      Open
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No proposals match your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
