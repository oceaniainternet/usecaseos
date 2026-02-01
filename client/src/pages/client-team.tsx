import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield,
  Trash2,
  Clock,
  Check
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Client, User, UserClient, ClientInvitation } from "@shared/schema";

interface TeamMember {
  user: User;
  userClient: UserClient;
}

interface TeamData {
  teamMembers: TeamMember[];
  pendingInvitations: ClientInvitation[];
}

const roleDescriptions: Record<string, string> = {
  "Admin": "Full access to manage team and all use cases",
  "Adoption Lead": "Manage use case adoption and track progress",
  "Use Case Owner": "Own and manage assigned use cases",
  "Pilot User": "Participate in pilot testing",
  "Observer": "View-only access to use cases",
};

const roleColors: Record<string, string> = {
  "Admin": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Adoption Lead": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Use Case Owner": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Pilot User": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Observer": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function ClientTeamPage() {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Observer");

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/client-portal/clients"],
  });

  const clientId = clients?.[0]?.id;

  const { data: teamData, isLoading: teamLoading } = useQuery<TeamData>({
    queryKey: ["/api/clients", clientId, "team"],
    enabled: !!clientId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; clientTeamRole: string }) => {
      return await apiRequest("POST", `/api/clients/${clientId}/team/invite`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("Observer");
      toast({
        title: "Invitation sent",
        description: "Team member has been invited via email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/clients/${clientId}/team/${memberId}/role`, { 
        clientTeamRole: role 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      toast({
        title: "Role updated",
        description: "Team member's role has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update role",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/clients/${clientId}/team/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      toast({
        title: "Member removed",
        description: "Team member has been removed from the organization.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove member",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await apiRequest("DELETE", `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "team"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to cancel invitation",
        description: "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  if (clientsLoading || teamLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Team Management</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No organization found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamMembers = teamData?.teamMembers || [];
  const pendingInvitations = teamData?.pendingInvitations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-team-title">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's team members and their roles
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-member">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization with a specific role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  data-testid="input-invite-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="select-invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(roleDescriptions).map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex flex-col">
                          <span>{role}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {roleDescriptions[inviteRole]}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => inviteMutation.mutate({ email: inviteEmail, clientTeamRole: inviteRole })}
                disabled={!inviteEmail || inviteMutation.isPending}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet. Invite someone to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map(({ user, userClient }) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                  data-testid={`team-member-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.email}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select 
                      value={userClient.clientTeamRole || "Observer"}
                      onValueChange={(role) => updateRoleMutation.mutate({ 
                        memberId: user.id, 
                        role 
                      })}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(roleDescriptions).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {user.email} from your organization? 
                            They will lose access to all use cases and data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMemberMutation.mutate(user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg border-dashed"
                  data-testid={`pending-invite-${invitation.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={roleColors[invitation.clientTeamRole || "Observer"] + " border-0"}>
                          {invitation.clientTeamRole || "Observer"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Invited {new Date(invitation.createdAt!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => cancelInviteMutation.mutate(invitation.id)}
                    disabled={cancelInviteMutation.isPending}
                    data-testid={`button-cancel-invite-${invitation.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Role Descriptions</CardTitle>
          <CardDescription>
            Understanding team member permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(roleDescriptions).map(([role, description]) => (
              <div key={role} className="p-3 border rounded-lg">
                <Badge className={roleColors[role] + " border-0 mb-2"}>
                  {role}
                </Badge>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
