"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, StatCard, DataCard, EmptyState, StatusBadge } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Users,
  List,
  Loader2,
  AlertCircle,
  X,
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";

interface Queue {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
}

interface QueueMember {
  userId: string;
  name: string;
  email: string;
  addedAt: string;
}

interface Assessor {
  id: string;
  name: string;
  email: string;
}

async function fetchQueues(includeInactive = true): Promise<{ ok: boolean; data?: Queue[]; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues?includeInactive=${includeInactive}`, { credentials: "include" });
    const data = await res.json();
    if (data.ok && data.data?.queues) {
      return { ok: true, data: data.data.queues };
    }
    return { ok: false, error: data.error || "Failed to load queues" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function createQueueApi(name: string, description: string): Promise<{ ok: boolean; data?: Queue; error?: string }> {
  try {
    const res = await fetch("/api/tenant/queues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (data.ok && data.data?.queue) {
      return { ok: true, data: data.data.queue };
    }
    return { ok: false, error: data.error || "Failed to create queue" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function updateQueueApi(queueId: string, updates: { name?: string; description?: string; isActive?: boolean }): Promise<{ ok: boolean; data?: Queue; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues/${queueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.ok && data.data?.queue) {
      return { ok: true, data: data.data.queue };
    }
    return { ok: false, error: data.error || "Failed to update queue" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function deleteQueueApi(queueId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues/${queueId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    return { ok: data.ok, error: data.error };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function fetchQueueMembers(queueId: string): Promise<{ ok: boolean; data?: { members: QueueMember[]; queueName: string }; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues/${queueId}/members`, { credentials: "include" });
    const data = await res.json();
    if (data.ok && data.data) {
      return { ok: true, data: { members: data.data.members, queueName: data.data.queueName } };
    }
    return { ok: false, error: data.error || "Failed to load members" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function addQueueMember(queueId: string, userId: string): Promise<{ ok: boolean; data?: QueueMember; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues/${queueId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.ok && data.data?.member) {
      return { ok: true, data: data.data.member };
    }
    return { ok: false, error: data.error || "Failed to add member" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function removeQueueMember(queueId: string, userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/tenant/queues/${queueId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return { ok: data.ok, error: data.error };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

async function fetchAssessors(): Promise<{ ok: boolean; data?: Assessor[]; error?: string }> {
  try {
    const res = await fetch("/api/tenant/assessors", { credentials: "include" });
    const data = await res.json();
    if (data.ok && data.data?.assessors) {
      return { ok: true, data: data.data.assessors };
    }
    return { ok: false, error: data.error || "Failed to load assessors" };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export default function QueuesClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [newQueueDescription, setNewQueueDescription] = useState("");
  const [creatingQueue, setCreatingQueue] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [editQueueName, setEditQueueName] = useState("");
  const [editQueueDescription, setEditQueueDescription] = useState("");
  const [updatingQueue, setUpdatingQueue] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Manage members modal state
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [queueMembers, setQueueMembers] = useState<QueueMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [selectedAssessorId, setSelectedAssessorId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingQueue, setDeletingQueue] = useState<Queue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadQueues = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchQueues(true);
    if (result.ok && result.data) {
      setQueues(result.data);
    } else {
      setError(result.error || "Failed to load queues");
    }
    setLoading(false);
    setInitialized(true);
  }, []);

  if (!initialized) {
    setTimeout(() => loadQueues(), 0);
  }

  const handleCreateQueue = async () => {
    if (!newQueueName.trim()) return;

    setCreatingQueue(true);
    setCreateError(null);

    const result = await createQueueApi(newQueueName.trim(), newQueueDescription.trim());

    if (result.ok && result.data) {
      setQueues((prev) => [...prev, result.data!]);
      setCreateModalOpen(false);
      setNewQueueName("");
      setNewQueueDescription("");
      toast(`Queue "${result.data.name}" created`);
      startTransition(() => {
        router.refresh();
      });
    } else {
      setCreateError(result.error || "Failed to create queue");
    }

    setCreatingQueue(false);
  };

  const openEditModal = (queue: Queue) => {
    setEditingQueue(queue);
    setEditQueueName(queue.name);
    setEditQueueDescription(queue.description);
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleUpdateQueue = async () => {
    if (!editingQueue || !editQueueName.trim()) return;

    setUpdatingQueue(true);
    setEditError(null);

    const result = await updateQueueApi(editingQueue.id, {
      name: editQueueName.trim(),
      description: editQueueDescription.trim(),
    });

    if (result.ok && result.data) {
      setQueues((prev) =>
        prev.map((q) => (q.id === editingQueue.id ? { ...q, ...result.data! } : q))
      );
      setEditModalOpen(false);
      setEditingQueue(null);
      toast(`Queue "${result.data.name}" updated`);
    } else {
      setEditError(result.error || "Failed to update queue");
    }

    setUpdatingQueue(false);
  };

  const handleToggleActive = async (queue: Queue) => {
    const result = await updateQueueApi(queue.id, { isActive: !queue.isActive });

    if (result.ok && result.data) {
      setQueues((prev) =>
        prev.map((q) => (q.id === queue.id ? { ...q, isActive: result.data!.isActive } : q))
      );
      toast(`Queue "${queue.name}" ${result.data.isActive ? "activated" : "deactivated"}`);
    } else {
      toast(result.error || "Failed to update queue");
    }
  };

  const openDeleteConfirm = (queue: Queue) => {
    setDeletingQueue(queue);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteQueue = async () => {
    if (!deletingQueue) return;

    setIsDeleting(true);

    const result = await deleteQueueApi(deletingQueue.id);

    if (result.ok) {
      setQueues((prev) =>
        prev.map((q) => (q.id === deletingQueue.id ? { ...q, isActive: false } : q))
      );
      setDeleteConfirmOpen(false);
      setDeletingQueue(null);
      toast(`Queue "${deletingQueue.name}" deactivated`);
    } else {
      toast(result.error || "Failed to delete queue");
    }

    setIsDeleting(false);
  };

  const openManageModal = async (queue: Queue) => {
    setSelectedQueue(queue);
    setManageModalOpen(true);
    setMemberError(null);
    setSelectedAssessorId("");
    setLoadingMembers(true);

    const [membersResult, assessorsResult] = await Promise.all([
      fetchQueueMembers(queue.id),
      fetchAssessors(),
    ]);

    if (membersResult.ok && membersResult.data) {
      setQueueMembers(membersResult.data.members);
    } else {
      setMemberError(membersResult.error || "Failed to load members");
    }

    if (assessorsResult.ok && assessorsResult.data) {
      setAssessors(assessorsResult.data);
    }

    setLoadingMembers(false);
  };

  const handleAddMember = async () => {
    if (!selectedQueue || !selectedAssessorId) return;

    setAddingMember(true);
    setMemberError(null);

    const result = await addQueueMember(selectedQueue.id, selectedAssessorId);

    if (result.ok && result.data) {
      setQueueMembers((prev) => [...prev, result.data!]);
      setQueues((prev) =>
        prev.map((q) =>
          q.id === selectedQueue.id ? { ...q, memberCount: q.memberCount + 1 } : q
        )
      );
      setSelectedAssessorId("");
      const assessor = assessors.find((a) => a.id === selectedAssessorId);
      toast(`Added ${assessor?.name || "member"} to queue`);
    } else {
      setMemberError(result.error || "Failed to add member");
    }

    setAddingMember(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedQueue) return;

    setRemovingMemberId(userId);
    setMemberError(null);

    const result = await removeQueueMember(selectedQueue.id, userId);

    if (result.ok) {
      const removedMember = queueMembers.find((m) => m.userId === userId);
      setQueueMembers((prev) => prev.filter((m) => m.userId !== userId));
      setQueues((prev) =>
        prev.map((q) =>
          q.id === selectedQueue.id ? { ...q, memberCount: Math.max(0, q.memberCount - 1) } : q
        )
      );
      toast(`Removed ${removedMember?.name || "member"} from queue`);
    } else {
      setMemberError(result.error || "Failed to remove member");
    }

    setRemovingMemberId(null);
  };

  const availableAssessors = assessors.filter(
    (a) => !queueMembers.some((m) => m.userId === a.id)
  );

  const activeQueues = queues.filter((q) => q.isActive);
  const totalMembers = queues.reduce((sum, q) => sum + q.memberCount, 0);

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Tenant Admin only
        </span>
      </div>

      <PageHeader
        title="Queue Management"
        subtitle="Create and manage assessor queues for proposal assignment"
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Queue
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Queues"
          value={activeQueues.length}
          description={`${queues.length - activeQueues.length} inactive`}
          icon={List}
        />
        <StatCard
          title="Total Members"
          value={totalMembers}
          description="Across all queues"
          icon={Users}
        />
        <StatCard
          title="Avg. Members"
          value={activeQueues.length > 0 ? (totalMembers / activeQueues.length).toFixed(1) : "0"}
          description="Per active queue"
          icon={Users}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataCard title="All Queues" noPadding>
        {queues.length === 0 ? (
          <EmptyState
            icon={List}
            title="No queues yet"
            description="Create your first queue to start organizing assessor assignments"
            action={{ label: "Create Queue", onClick: () => setCreateModalOpen(true) }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue Name</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((queue) => (
                <TableRow key={queue.id} className={`group ${!queue.isActive ? "opacity-60" : ""}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${queue.isActive ? "bg-primary/10" : "bg-muted"}`}>
                        <List className={`h-4 w-4 ${queue.isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className="font-medium">{queue.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {queue.description || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={queue.isActive ? "success" : "muted"} dot>
                      {queue.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{queue.memberCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {new Date(queue.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openManageModal(queue)}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Members
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(queue)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(queue)}>
                          <Power className="h-4 w-4 mr-2" />
                          {queue.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        {queue.isActive && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => openDeleteConfirm(queue)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Queue</DialogTitle>
            <DialogDescription>
              Create a new queue to organize assessor assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="queue-name" className="text-sm font-medium">
                Queue Name
              </label>
              <Input
                id="queue-name"
                placeholder="e.g., Healthcare Specialists"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="queue-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="queue-description"
                placeholder="Describe the purpose of this queue..."
                value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                rows={3}
              />
            </div>

            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={creatingQueue}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateQueue}
              disabled={!newQueueName.trim() || creatingQueue}
            >
              {creatingQueue ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Queue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Queue</DialogTitle>
            <DialogDescription>
              Update the queue name and description.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-queue-name" className="text-sm font-medium">
                Queue Name
              </label>
              <Input
                id="edit-queue-name"
                value={editQueueName}
                onChange={(e) => setEditQueueName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-queue-description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="edit-queue-description"
                value={editQueueDescription}
                onChange={(e) => setEditQueueDescription(e.target.value)}
                rows={3}
              />
            </div>

            {editError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updatingQueue}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateQueue}
              disabled={!editQueueName.trim() || updatingQueue}
            >
              {updatingQueue ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Queue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingQueue?.name}&quot;? This will deactivate the queue. Existing assignments will remain.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQueue}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={manageModalOpen} onOpenChange={setManageModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Queue Members</DialogTitle>
            <DialogDescription>
              {selectedQueue && (
                <>
                  Add or remove assessors from <span className="font-medium">{selectedQueue.name}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading members...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select
                    value={selectedAssessorId}
                    onValueChange={setSelectedAssessorId}
                    disabled={availableAssessors.length === 0}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue
                        placeholder={
                          availableAssessors.length === 0
                            ? "No assessors available"
                            : "Select an assessor..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssessors.map((assessor) => (
                        <SelectItem key={assessor.id} value={assessor.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {assessor.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span>{assessor.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddMember}
                    disabled={!selectedAssessorId || addingMember}
                  >
                    {addingMember ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {memberError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{memberError}</AlertDescription>
                  </Alert>
                )}

                <div className="border rounded-md">
                  {queueMembers.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No members in this queue</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {queueMembers.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {member.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removingMemberId === member.userId}
                          >
                            {removingMemberId === member.userId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
