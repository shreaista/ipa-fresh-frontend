"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/app";
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
import {
  ArrowLeft,
  Link as LinkIcon,
  Unlink,
  ScrollText,
  Loader2,
  AlertCircle,
  Settings,
} from "lucide-react";
import type { Fund } from "@/lib/mock/fundsStore";
import type { FundMandateTemplate, FundMandateStatus } from "@/lib/mock/fundMandates";

const mandateStatusVariants: Record<FundMandateStatus, "success" | "warning" | "muted"> = {
  active: "success",
  draft: "warning",
  inactive: "muted",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FundMandatesClientProps {
  fund: Fund;
  linkedMandates: (FundMandateTemplate | undefined)[];
  availableMandates: FundMandateTemplate[];
}

export default function FundMandatesClient({
  fund,
  linkedMandates,
  availableMandates,
}: FundMandatesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLink = async (mandateId: string) => {
    setLinkingId(mandateId);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/funds/${fund.id}/mandates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandateId }),
      });
      const data = await res.json();
      if (data.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(data.error || "Failed to link mandate");
      }
    } catch {
      setError("Network error");
    }
    setLinkingId(null);
  };

  const handleUnlink = async (mandateId: string) => {
    setUnlinkingId(mandateId);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/funds/${fund.id}/mandates?mandateId=${mandateId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(data.error || "Failed to unlink mandate");
      }
    } catch {
      setError("Network error");
    }
    setUnlinkingId(null);
  };

  const validLinkedMandates = linkedMandates.filter(Boolean) as FundMandateTemplate[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Manage Mandates: ${fund.name}`}
        subtitle={`Link and unlink mandate templates for ${fund.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/funds/${fund.id}/config`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
            </Link>
            <Link href="/dashboard/funds">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Funds
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-emerald-600" />
              Linked Mandates
            </CardTitle>
            <CardDescription>
              {validLinkedMandates.length} mandate{validLinkedMandates.length !== 1 ? "s" : ""} linked to this fund
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validLinkedMandates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No mandates linked yet.</p>
                <p className="text-xs mt-1">Select a mandate from the available list to link it.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validLinkedMandates.map((mandate) => (
                    <TableRow key={mandate.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{mandate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(mandate.minTicket)} - {formatCurrency(mandate.maxTicket)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mandate.strategy}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mandateStatusVariants[mandate.status] === "success" ? "default" : "secondary"}>
                          {mandate.status.charAt(0).toUpperCase() + mandate.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleUnlink(mandate.id)}
                          disabled={unlinkingId === mandate.id}
                        >
                          {unlinkingId === mandate.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="h-3 w-3 mr-1" />
                              Unlink
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-blue-600" />
              Available Mandates
            </CardTitle>
            <CardDescription>
              {availableMandates.length} mandate{availableMandates.length !== 1 ? "s" : ""} available to link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableMandates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All mandates are linked.</p>
                <p className="text-xs mt-1">Create new mandate templates to link more.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mandate</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableMandates.map((mandate) => (
                    <TableRow key={mandate.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{mandate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(mandate.minTicket)} - {formatCurrency(mandate.maxTicket)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mandate.strategy}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mandateStatusVariants[mandate.status] === "success" ? "default" : "secondary"}>
                          {mandate.status.charAt(0).toUpperCase() + mandate.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleLink(mandate.id)}
                          disabled={linkingId === mandate.id}
                        >
                          {linkingId === mandate.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
