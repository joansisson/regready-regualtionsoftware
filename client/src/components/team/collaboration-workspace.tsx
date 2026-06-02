import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Activity,
  Plus,
  Send,
  Pin,
  Archive,
  Bell,
  Eye,
  Edit,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface WorkspaceActivity {
  id: string;
  type: 'comment' | 'policy_update' | 'review' | 'approval' | 'assignment';
  title: string;
  description: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  relatedItem?: {
    type: 'policy' | 'document' | 'project';
    id: string;
    title: string;
  };
}

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  replies?: Comment[];
  isResolved?: boolean;
  mentions?: string[];
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  };
  dueDate: string;
  relatedPolicy?: string;
  tags: string[];
}

const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', label: 'Low' },
  medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
};

const statusConfig = {
  todo: { color: 'bg-neutral-100 text-neutral-800', label: 'To Do' },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
  review: { color: 'bg-yellow-100 text-yellow-800', label: 'Review' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' }
};

export default function CollaborationWorkspace() {
  const [newComment, setNewComment] = useState("");
  const [selectedProject, setSelectedProject] = useState("gdpr-project");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSmokePage =
    typeof window !== "undefined" &&
    (window.location.pathname === "/smoke" || (window as any).__SMOKE_TEST__ === true);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token");
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  };

  const fetchJsonOrNull = async <T,>(url: string): Promise<T | null> => {
    const res = await fetch(url, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return (await res.json()) as T;
  };

  const { data: activities, isLoading: loadingActivities } = useQuery<WorkspaceActivity[] | null>({
    queryKey: ["/api/workspace/activities"],
    queryFn: async () => fetchJsonOrNull<WorkspaceActivity[]>(`/api/workspace/activities`),
    enabled: !isSmokePage,
  });

  const { data: comments, isLoading: loadingComments } = useQuery<Comment[] | null>({
    queryKey: ["/api/workspace/comments"],
    queryFn: async () => fetchJsonOrNull<Comment[]>(`/api/workspace/comments`),
    enabled: !isSmokePage,
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery<TaskItem[] | null>({
    queryKey: ["/api/workspace/tasks"],
    queryFn: async () => fetchJsonOrNull<TaskItem[]>(`/api/workspace/tasks`),
    enabled: !isSmokePage,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/workspace/comments`, {
        content,
        projectId: selectedProject
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace/comments"] });
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully.",
      });
      setNewComment("");
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/workspace/tasks/${taskId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });
    },
  });

  const displayActivities = activities ?? [];
  const displayComments = comments ?? [];
  const displayTasks = tasks ?? [];

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Collaboration Workspace
          </h2>
          <p className="text-neutral-600">Collaborate on compliance projects with your team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-project">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Project: GDPR Compliance Initiative</CardTitle>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              4 members
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due: Aug 15, 2025
            </span>
            <Badge className="bg-blue-100 text-blue-800">Active</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity" data-testid="activity-tab">
            <Activity className="h-4 w-4 mr-2" />
            Activity Feed
          </TabsTrigger>
          <TabsTrigger value="discussions" data-testid="discussions-tab">
            <MessageSquare className="h-4 w-4 mr-2" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tasks-tab">
            <CheckCircle className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="documents-tab">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayActivities.map(activity => (
                  <div key={activity.id} className="flex gap-4 p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback>{getInitials(activity.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.user.name}</span>
                        <span className="text-sm text-neutral-500">{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      <p className="text-sm text-neutral-600">{activity.description}</p>
                      {activity.relatedItem && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.relatedItem.type}: {activity.relatedItem.title}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Discussions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Comment */}
              <div className="border-b pb-4">
                <Textarea
                  placeholder="Share your thoughts, ask questions, or provide feedback..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-2"
                  data-testid="new-comment-input"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">
                    Use @username to mention team members
                  </span>
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="add-comment"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-4">
                {displayComments.map(comment => (
                  <div key={comment.id} className="space-y-3" data-testid={`comment-${comment.id}`}>
                    <div className="flex gap-3 p-3 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.avatar} />
                        <AvatarFallback>{getInitials(comment.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{comment.user.name}</span>
                          <span className="text-sm text-neutral-500">{formatTimeAgo(comment.timestamp)}</span>
                          {comment.isResolved && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button variant="ghost" size="sm" className="text-xs">
                            Reply
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs">
                            {comment.isResolved ? "Reopen" : "Resolve"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 space-y-3">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex gap-3 p-3 bg-neutral-50 rounded-lg">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.user.avatar} />
                              <AvatarFallback className="text-xs">{getInitials(reply.user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{reply.user.name}</span>
                                <span className="text-xs text-neutral-500">{formatTimeAgo(reply.timestamp)}</span>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Tasks</CardTitle>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-task">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`task-${task.id}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={priorityConfig[task.priority].color}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                        <Badge className={statusConfig[task.status].color}>
                          {statusConfig[task.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">{task.description}</p>
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <span>Assigned to: {task.assignee.name}</span>
                        {task.relatedPolicy && (
                          <span>Policy: {task.relatedPolicy}</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {task.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatusMutation.mutate({ taskId: task.id, status: e.target.value })}
                        className="px-2 py-1 border rounded text-sm"
                        data-testid={`task-status-${task.id}`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={task.assignee.avatar} />
                        <AvatarFallback className="text-xs">{getInitials(task.assignee.name)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shared Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "GDPR Data Processing Policy", status: "In Review", lastModified: "2 hours ago" },
                  { name: "Privacy Impact Assessment", status: "Draft", lastModified: "1 day ago" },
                  { name: "Cookie Consent Framework", status: "Approved", lastModified: "3 days ago" },
                  { name: "Data Breach Response Plan", status: "In Progress", lastModified: "5 hours ago" }
                ].map((doc, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <Badge variant="outline" className="text-xs">
                          {doc.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-2">{doc.name}</h4>
                      <p className="text-sm text-neutral-500 mb-3">
                        Modified {doc.lastModified}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
