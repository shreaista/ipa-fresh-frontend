"use client";

import { useState } from "react";
import { PageHeader, StatCard } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Cpu,
  Zap,
  Database,
  Settings,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const providers = [
  {
    name: "OpenAI",
    status: "Active",
    models: ["GPT-4 Turbo", "GPT-3.5"],
    usage: 78,
    limit: "1M tokens/day",
    rateLimit: 3500,
  },
  {
    name: "Anthropic",
    status: "Active",
    models: ["Claude 3 Opus", "Claude 3 Sonnet"],
    usage: 45,
    limit: "500K tokens/day",
    rateLimit: 2000,
  },
  {
    name: "Azure OpenAI",
    status: "Pending",
    models: ["GPT-4", "Embeddings"],
    usage: 0,
    limit: "Unlimited",
    rateLimit: 5000,
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Manage provider limits and rate configurations"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Providers"
          value="2"
          description="of 3 configured"
          icon={Cpu}
        />
        <StatCard
          title="Daily Tokens Used"
          value="824K"
          description="32% of total limit"
          trend="neutral"
          icon={Zap}
        />
        <StatCard
          title="Avg Response Time"
          value="1.2s"
          description="-0.3s from last week"
          trend="up"
          icon={Database}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.name} provider={provider} />
        ))}
      </div>
    </div>
  );
}

interface Provider {
  name: string;
  status: string;
  models: string[];
  usage: number;
  limit: string;
  rateLimit: number;
}

function ProviderCard({ provider }: { provider: Provider }) {
  const [rateLimit, setRateLimit] = useState(provider.rateLimit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <CardDescription>
              {provider.models.join(", ")}
            </CardDescription>
          </div>
          <Badge variant={provider.status === "Active" ? "success" : "secondary"}>
            {provider.status === "Active" ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {provider.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Daily Usage</span>
            <span className="font-medium">{provider.usage}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                provider.usage > 80 ? "bg-destructive" : "bg-primary"
              }`}
              style={{ width: `${provider.usage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Limit: {provider.limit}
          </p>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground">Rate Limit</span>
            <span className="font-medium">{rateLimit.toLocaleString()} req/min</span>
          </div>
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>500</span>
            <span>10,000</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}
