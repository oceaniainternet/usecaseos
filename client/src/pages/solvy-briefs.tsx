import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Lock,
  Globe,
  Calendar,
  User,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { Client } from "@shared/schema";

interface SolvyBrief {
  id: string;
  clientId: string;
  userId: string;
  conversationId: string | null;
  title: string;
  visibility: "private" | "workspace";
  sections: BriefSections;
  createdAt: string;
  updatedAt: string;
}

interface BriefSections {
  context: string;
  problemStatement: string;
  stakeholders: string;
  options: string;
  recommendation: string;
  risks: string;
  assumptions: string;
  nextSteps: string;
}

export default function SolvyBriefsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: briefs = [], isLoading: briefsLoading } = useQuery<SolvyBrief[]>({
    queryKey: [`/api/solvy/briefs?clientId=${selectedClientId}`],
    enabled: !!selectedClientId,
  });

  const deleteBriefMutation = useMutation({
    mutationFn: async (briefId: string) => {
      await apiRequest("DELETE", `/api/solvy/briefs/${briefId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/solvy/briefs?clientId=${selectedClientId}`] });
      if (selectedBriefId) {
        setSelectedBriefId(null);
      }
      toast({ title: "Brief deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete brief", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ briefId, visibility }: { briefId: string; visibility: "private" | "workspace" }) => {
      const res = await apiRequest("PATCH", `/api/solvy/briefs/${briefId}`, { visibility });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/solvy/briefs?clientId=${selectedClientId}`] });
    },
    onError: () => {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    },
  });

  const selectedBrief = briefs.find((b) => b.id === selectedBriefId);

  if (clientsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-briefs-title">
            Solution Briefs
          </h1>
          <p className="text-muted-foreground">
            AI-generated solution briefs from your chat conversations
          </p>
        </div>
        <Button asChild data-testid="button-create-brief">
          <Link href="/solvy">
            <Plus className="h-4 w-4 mr-2" />
            Create from Chat
          </Link>
        </Button>
      </div>

      <Select
        value={selectedClientId}
        onValueChange={(val) => {
          setSelectedClientId(val);
          setSelectedBriefId(null);
        }}
      >
        <SelectTrigger className="w-[220px]" data-testid="select-client-briefs">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedClientId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a workspace</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Choose a workspace above to view and manage solution briefs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Briefs</CardTitle>
              <CardDescription>
                {briefs.length} brief{briefs.length !== 1 ? "s" : ""} in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {briefsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : briefs.length === 0 ? (
                  <div className="text-center py-8">
                    <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No briefs yet. Start a chat in Draft Brief mode to create one.
                    </p>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/solvy">
                        Start Chat
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {briefs.map((brief) => (
                      <div
                        key={brief.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                          selectedBriefId === brief.id
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50"
                        }`}
                        onClick={() => setSelectedBriefId(brief.id)}
                        data-testid={`brief-${brief.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{brief.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {brief.visibility === "workspace" ? (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Globe className="h-3 w-3" />
                                  Shared
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Lock className="h-3 w-3" />
                                  Private
                                </Badge>
                              )}
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`button-delete-brief-${brief.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete brief?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{brief.title}". This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBriefMutation.mutate(brief.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(brief.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="p-0 h-[580px] overflow-hidden">
              {!selectedBrief ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select a brief</h3>
                  <p className="text-muted-foreground max-w-md">
                    Click on a brief from the list to view its contents
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedBrief.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Last updated {new Date(selectedBrief.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          toggleVisibilityMutation.mutate({
                            briefId: selectedBrief.id,
                            visibility: selectedBrief.visibility === "private" ? "workspace" : "private",
                          })
                        }
                        data-testid="button-toggle-brief-visibility"
                      >
                        {selectedBrief.visibility === "workspace" ? (
                          <>
                            <Globe className="h-4 w-4" />
                            Shared
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Private
                          </>
                        )}
                      </Button>
                    </div>

                    <Separator />

                    <BriefSection
                      title="Context"
                      content={selectedBrief.sections.context}
                      icon={<FileText className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Problem Statement"
                      content={selectedBrief.sections.problemStatement}
                      icon={<AlertTriangle className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Stakeholders"
                      content={selectedBrief.sections.stakeholders}
                      icon={<User className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Options"
                      content={selectedBrief.sections.options}
                      icon={<Lightbulb className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Recommendation"
                      content={selectedBrief.sections.recommendation}
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      highlight
                    />

                    <BriefSection
                      title="Risks"
                      content={selectedBrief.sections.risks}
                      icon={<AlertTriangle className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Assumptions"
                      content={selectedBrief.sections.assumptions}
                      icon={<FileText className="h-4 w-4" />}
                    />

                    <BriefSection
                      title="Next Steps"
                      content={selectedBrief.sections.nextSteps}
                      icon={<ArrowRight className="h-4 w-4" />}
                    />
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BriefSection({
  title,
  content,
  icon,
  highlight = false,
}: {
  title: string;
  content: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  if (!content) return null;

  return (
    <div className={`space-y-2 ${highlight ? "bg-primary/5 -mx-2 p-4 rounded-lg" : ""}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}
