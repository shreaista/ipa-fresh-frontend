import { PageHeader, StatCard } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Server,
  Cpu,
  Database,
  Cloud,
} from "lucide-react";

const monthlyData = [
  { month: "Jan", cost: 7200, tokens: "980K" },
  { month: "Feb", cost: 7850, tokens: "1.1M" },
  { month: "Mar", cost: 9420, tokens: "1.2M" },
];

const breakdown = [
  { category: "LLM Inference", amount: 6340, change: 12, icon: Cpu },
  { category: "Embeddings", amount: 1410, change: -3, icon: Database },
  { category: "Storage", amount: 890, change: 5, icon: Server },
  { category: "Compute", amount: 780, change: 0, icon: Cloud },
];

const tenantCosts = [
  { tenant: "Delta Partners", cost: 2840, percentage: 30 },
  { tenant: "Acme Corp", cost: 2120, percentage: 23 },
  { tenant: "Zeta Ventures", cost: 1680, percentage: 18 },
  { tenant: "Beta Inc", cost: 1240, percentage: 13 },
  { tenant: "Others", cost: 1540, percentage: 16 },
];

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Costs"
        subtitle="Platform cost analytics and billing breakdown"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Month"
          value="$9,420"
          description="+$1,570 from last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="Projected Monthly"
          value="$10,200"
          description="Based on current usage"
          trend="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Cost / Tenant"
          value="$392"
          description="24 active tenants"
          trend="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Cost / 1K Tokens"
          value="$0.0078"
          description="-5% optimization"
          trend="up"
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-around gap-4 px-4">
              {monthlyData.map((data, i) => {
                const height = (data.cost / 10000) * 100;
                return (
                  <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative w-full max-w-[60px]">
                      <div
                        className="w-full bg-primary rounded-t-md transition-all"
                        style={{ height: `${height * 1.8}px` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{data.month}</p>
                      <p className="text-xs text-muted-foreground">${data.cost.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Monthly cost trend (last 3 months)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdown.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${item.amount.toLocaleString()}</span>
                    <Badge
                      variant={item.change > 0 ? "destructive" : item.change < 0 ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {item.change > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : item.change < 0 ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <Minus className="h-3 w-3 mr-1" />
                      )}
                      {item.change > 0 ? "+" : ""}{item.change}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost by Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Share</TableHead>
                <TableHead className="w-[40%]">Distribution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantCosts.map((row) => (
                <TableRow key={row.tenant}>
                  <TableCell className="font-medium">{row.tenant}</TableCell>
                  <TableCell>${row.cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.percentage}%</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
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
