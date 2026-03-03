"use client";

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Plus,
  LayoutGrid,
  List,
  TrendingUp,
  DollarSign,
  Target,
} from "lucide-react";

const funds = [
  {
    id: "F-001",
    name: "General Fund 2026",
    strategy: "Diversified Impact",
    aum: "$2,500,000",
    allocated: "$1,850,000",
    available: "$650,000",
    capacity: 74,
    status: "Active",
    proposals: 45,
  },
  {
    id: "F-002",
    name: "Innovation Grant",
    strategy: "Technology Focus",
    aum: "$500,000",
    allocated: "$320,000",
    available: "$180,000",
    capacity: 64,
    status: "Active",
    proposals: 12,
  },
  {
    id: "F-003",
    name: "Community Development",
    strategy: "Local Impact",
    aum: "$750,000",
    allocated: "$680,000",
    available: "$70,000",
    capacity: 91,
    status: "Limited",
    proposals: 28,
  },
  {
    id: "F-004",
    name: "Emergency Reserve",
    strategy: "Rapid Response",
    aum: "$200,000",
    allocated: "$45,000",
    available: "$155,000",
    capacity: 23,
    status: "Active",
    proposals: 5,
  },
  {
    id: "F-005",
    name: "Youth Programs",
    strategy: "Education & Youth",
    aum: "$400,000",
    allocated: "$280,000",
    available: "$120,000",
    capacity: 70,
    status: "Active",
    proposals: 18,
  },
  {
    id: "F-006",
    name: "Healthcare Initiative",
    strategy: "Health & Wellness",
    aum: "$600,000",
    allocated: "$600,000",
    available: "$0",
    capacity: 100,
    status: "Closed",
    proposals: 22,
  },
];

const statusStyles = {
  Active: "success",
  Limited: "warning",
  Closed: "secondary",
} as const;

export default function FundsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");

  const totalAum = funds.reduce((sum, f) => sum + parseInt(f.aum.replace(/[$,]/g, "")), 0);
  const totalAvailable = funds.reduce((sum, f) => sum + parseInt(f.available.replace(/[$,]/g, "")), 0);
  const activeFunds = funds.filter(f => f.status === "Active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funds"
        subtitle="Manage funding sources and allocations"
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Fund
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total AUM"
          value={`$${(totalAum / 1000000).toFixed(1)}M`}
          description="Assets under management"
          icon={Wallet}
        />
        <StatCard
          title="Available Capital"
          value={`$${(totalAvailable / 1000).toFixed(0)}K`}
          description="Ready for allocation"
          trend="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Active Funds"
          value={activeFunds.toString()}
          description={`of ${funds.length} total`}
          trend="neutral"
          icon={Target}
        />
        <StatCard
          title="Avg Utilization"
          value="70%"
          description="Across all funds"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      <div className="flex items-center justify-between">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Funds</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="limited">Limited</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((fund) => (
            <Card key={fund.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{fund.name}</CardTitle>
                    <CardDescription>{fund.strategy}</CardDescription>
                  </div>
                  <Badge variant={statusStyles[fund.status as keyof typeof statusStyles]}>
                    {fund.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">AUM</p>
                    <p className="font-semibold">{fund.aum}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{fund.available}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Capacity Used</span>
                    <span className="font-medium">{fund.capacity}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        fund.capacity > 90 ? "bg-destructive" : fund.capacity > 70 ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${fund.capacity}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">{fund.proposals} proposals</span>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>AUM</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proposals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => (
                  <TableRow key={fund.id}>
                    <TableCell className="font-medium">{fund.name}</TableCell>
                    <TableCell className="text-muted-foreground">{fund.strategy}</TableCell>
                    <TableCell>{fund.aum}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">{fund.available}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fund.capacity > 90 ? "bg-destructive" : fund.capacity > 70 ? "bg-yellow-500" : "bg-primary"
                            }`}
                            style={{ width: `${fund.capacity}%` }}
                          />
                        </div>
                        <span className="text-sm">{fund.capacity}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusStyles[fund.status as keyof typeof statusStyles]}>
                        {fund.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{fund.proposals}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
