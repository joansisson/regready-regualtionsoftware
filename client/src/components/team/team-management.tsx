import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  Eye, 
  Edit,
  Trash2,
  Mail,
  Calendar,
  Settings,
  Activity,
  MoreHorizontal,
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'manager' | 'contributor' | 'viewer';
  status: 'active' | 'pending' | 'suspended';
  avatar?: string;
  joinedAt: string;
  lastActive: string;
  permissions: string[];
  assignedProjects: string[];
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

const roleConfig = {
  owner: { 
    color: 'bg-purple-100 text-purple-800', 
    icon: Crown, 
    description: 'Full access to all features and billing' 
  },
  admin: { 
    color: 'bg-red-100 text-red-800', 
    icon: Shield, 
    description: 'Manage team members and all compliance features' 
  },
  manager: { 
    color: 'bg-blue-100 text-blue-800', 
    icon: Settings, 
    description: 'Manage compliance projects and review policies' 
  },
  contributor: { 
    color: 'bg-green-100 text-green-800', 
    icon: Edit, 
    description: 'Create and edit policies, contribute to projects' 
  },
  viewer: { 
    color: 'bg-neutral-100 text-neutral-800', 
    icon: Eye, 
    description: 'View compliance data and reports only' 
  }
};

const statusConfig = {
  active: { color: 'bg-green-100 text-green-800', label: 'Active' },
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  suspended: { color: 'bg-red-100 text-red-800', label: 'Suspended' },
  accepted: { color: 'bg-green-100 text-green-800', label: 'Accepted' },
  expired: { color: 'bg-red-100 text-red-800', label: 'Expired' }
};

export default function TeamManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("contributor");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamMembers, isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  const { data: pendingInvites, isLoading: loadingInvites } = useQuery<TeamInvite[]>({
    queryKey: ["/api/team/invites"],
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await apiRequest("POST", "/api/team/invite", { email, role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] });
      toast({
        title: "Invitation Sent",
        description: "Team member invitation has been sent successfully.",
      });
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("contributor");
    },
    onError: () => {
      toast({
        title: "Invitation Failed",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/team/members/${memberId}`, { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({
        title: "Role Updated",
        description: "Team member role has been updated successfully.",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/team/members/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({
        title: "Member Removed",
        description: "Team member has been removed successfully.",
      });
    },
  });

  // Mock data for demonstration
  const mockMembers: TeamMember[] = [
    {
      id: "1",
      email: "admin@regready.com",
      firstName: "Admin",
      lastName: "User",
      role: "owner",
      status: "active",
      joinedAt: "2025-01-01T00:00:00Z",
      lastActive: "2025-08-04T23:30:00Z",
      permissions: ["*"],
      assignedProjects: ["GDPR Project", "SOC2 Audit"]
    },
    {
      id: "2",
      email: "compliance.manager@company.com",
      firstName: "Sarah",
      lastName: "Johnson",
      role: "admin",
      status: "active",
      joinedAt: "2025-02-15T00:00:00Z",
      lastActive: "2025-08-04T22:15:00Z",
      permissions: ["manage_policies", "review_documents", "manage_team"],
      assignedProjects: ["GDPR Project", "AI Act Compliance"]
    },
    {
      id: "3",
      email: "policy.writer@company.com",
      firstName: "Michael",
      lastName: "Chen",
      role: "contributor",
      status: "active",
      joinedAt: "2025-03-01T00:00:00Z",
      lastActive: "2025-08-04T20:45:00Z",
      permissions: ["create_policies", "edit_policies"],
      assignedProjects: ["SOC2 Audit"]
    },
    {
      id: "4",
      email: "auditor@external.com",
      firstName: "Emma",
      lastName: "Davis",
      role: "viewer",
      status: "active",
      joinedAt: "2025-07-01T00:00:00Z",
      lastActive: "2025-08-04T18:30:00Z",
      permissions: ["view_reports", "view_policies"],
      assignedProjects: ["SOC2 Audit"]
    }
  ];

  const mockInvites: TeamInvite[] = [
    {
      id: "inv_1",
      email: "new.member@company.com",
      role: "contributor",
      invitedBy: "Admin User",
      invitedAt: "2025-08-03T00:00:00Z",
      expiresAt: "2025-08-10T00:00:00Z",
      status: "pending"
    }
  ];

  const displayMembers = teamMembers || mockMembers;
  const displayInvites = pendingInvites || mockInvites;

  const filteredMembers = displayMembers.filter(member => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleInviteMember = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Active now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Team Management
          </h2>
          <p className="text-neutral-600">Manage your compliance team members and permissions</p>
        </div>
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="invite-member">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Enter an email and role to invite a teammate to collaborate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  data-testid="invite-email-input"
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="invite-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-600 mt-1">
                  {roleConfig[inviteRole as keyof typeof roleConfig]?.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInviteMember}
                  disabled={inviteMemberMutation.isPending}
                  className="flex-1"
                  data-testid="send-invite"
                >
                  {inviteMemberMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
                <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{displayMembers.length}</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {displayMembers.filter(m => m.status === 'active').length}
              </span>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{displayInvites.length}</span>
              <Mail className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {displayMembers.filter(m => m.role === 'admin' || m.role === 'owner').length}
              </span>
              <Shield className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-members"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px]" data-testid="role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {displayInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-neutral-600">
                        Invited as {invite.role} by {invite.invitedBy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusConfig[invite.status].color}>
                      {statusConfig[invite.status].label}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Resend
                    </Button>
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map(member => {
              const RoleIcon = roleConfig[member.role].icon;
              
              return (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors"
                  data-testid={`member-${member.id}`}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(member.firstName, member.lastName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{member.firstName} {member.lastName}</h3>
                        <Badge className={statusConfig[member.status].color}>
                          {statusConfig[member.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600">{member.email}</p>
                      <p className="text-xs text-neutral-500">
                        Last active: {formatLastActive(member.lastActive)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className={roleConfig[member.role].color}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {member.role}
                      </Badge>
                      <p className="text-xs text-neutral-500 mt-1">
                        {member.assignedProjects.length} projects
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {member.role !== 'owner' && (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(newRole) => updateMemberRoleMutation.mutate({ memberId: member.id, role: newRole })}
                          >
                            <SelectTrigger className="w-32" data-testid={`role-select-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="contributor">Contributor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`remove-member-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
