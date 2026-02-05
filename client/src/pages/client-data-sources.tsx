import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Trash2,
  Database,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Loader2,
} from "lucide-react";

interface DataSource {
  id: string;
  clientId: string;
  name: string;
  fileType: string;
  fileSize: number;
  status: "processing" | "ready" | "error";
  chunkCount: number;
  uploadedBy: string;
  createdAt: string;
}

interface DataSourceChunk {
  id: string;
  content: string;
  chunkIndex: number;
}

interface UserClientInfo {
  clientId: string;
  clientTeamRole: string | null;
  role: string | null;
}

export default function ClientDataSourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: userClients = [] } = useQuery<UserClientInfo[]>({
    queryKey: ["/api/client-portal/user-clients"],
  });

  const clientId = userClients[0]?.clientId || "";
  const isAdmin = userClients[0]?.clientTeamRole === "Admin" || 
                  userClients[0]?.clientTeamRole === "Adoption Lead";

  const { data: sources = [], isLoading: sourcesLoading } = useQuery<DataSource[]>({
    queryKey: [`/api/solvy/sources?clientId=${clientId}`],
    enabled: !!clientId,
  });

  const { data: chunks = [], isLoading: chunksLoading } = useQuery<DataSourceChunk[]>({
    queryKey: [`/api/solvy/sources/${selectedSourceId}/chunks`],
    enabled: !!selectedSourceId,
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await apiRequest("DELETE", `/api/solvy/sources/${sourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/solvy/sources?clientId=${clientId}`] });
      setSelectedSourceId(null);
      toast({ title: "Data source deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete data source", variant: "destructive" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !clientId) return;

    const allowedTypes = [".pdf", ".txt", ".md"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, TXT, or MD files", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId);

    try {
      const response = await fetch("/api/solvy/sources/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: [`/api/solvy/sources?clientId=${clientId}`] });
      toast({ title: "File uploaded successfully" });
    } catch (error) {
      toast({ title: "Failed to upload file", variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />Ready</Badge>;
      case "processing":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Processing</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-[600px] w-full max-w-4xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Admin Access Required</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Only workspace admins can manage data sources. Contact your admin to upload documents.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-client-data-sources-title">
            Data Sources
          </h1>
          <p className="text-muted-foreground">
            Upload documents to enable AI-powered data queries
          </p>
        </div>
        <div>
          <Input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Label htmlFor="file-upload">
            <Button asChild disabled={isUploading} data-testid="button-upload-source">
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Document
              </span>
            </Button>
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
            <CardDescription>
              {sources.length} document{sources.length !== 1 ? "s" : ""} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {sourcesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded yet. Upload PDF, TXT, or MD files to enable data queries.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                        selectedSourceId === source.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                      onClick={() => setSelectedSourceId(source.id)}
                      data-testid={`source-${source.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 flex-shrink-0" />
                            <h4 className="text-sm font-medium truncate">{source.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(source.status)}
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(source.fileSize)}
                            </span>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`button-delete-source-${source.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete data source?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{source.name}" and all associated data chunks.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSourceMutation.mutate(source.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {source.chunkCount} chunks · {new Date(source.createdAt).toLocaleDateString()}
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
            {!selectedSourceId ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a document</h3>
                <p className="text-muted-foreground max-w-md">
                  Click on a document from the list to view its content chunks
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  <h3 className="font-medium">Content Chunks</h3>
                  {chunksLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : chunks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No chunks available for this document.</p>
                  ) : (
                    <div className="space-y-3">
                      {chunks.map((chunk) => (
                        <div key={chunk.id} className="p-3 bg-muted/50 rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Chunk {chunk.chunkIndex + 1}</Badge>
                          </div>
                          <p className="text-sm whitespace-pre-wrap line-clamp-4">{chunk.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
