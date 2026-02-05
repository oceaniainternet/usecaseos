import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Upload,
  FileText,
  File,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  FolderOpen,
  Search,
} from "lucide-react";
import type { Client } from "@shared/schema";

interface DataSource {
  id: string;
  clientId: string;
  name: string;
  type: "file" | "text" | "url";
  status: "processing" | "ready" | "error";
  chunkCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DataSourceChunk {
  id: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
}

const statusConfig = {
  processing: { icon: Clock, color: "text-amber-500", label: "Processing" },
  ready: { icon: CheckCircle, color: "text-green-500", label: "Ready" },
  error: { icon: AlertCircle, color: "text-red-500", label: "Error" },
};

export default function SolvyDataSourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: dataSources = [], isLoading: sourcesLoading } = useQuery<DataSource[]>({
    queryKey: ["/api/solvy/sources", selectedClientId],
    enabled: !!selectedClientId,
  });

  const { data: chunks = [], isLoading: chunksLoading } = useQuery<DataSourceChunk[]>({
    queryKey: ["/api/solvy/sources", selectedSourceId, "chunks"],
    enabled: !!selectedSourceId,
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await apiRequest("DELETE", `/api/solvy/sources/${sourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solvy/sources", selectedClientId] });
      if (selectedSourceId) {
        setSelectedSourceId(null);
      }
      toast({ title: "Data source deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete data source", variant: "destructive" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClientId) return;

    const allowedTypes = [".txt", ".md", ".pdf"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!allowedTypes.includes(ext)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt, .md, or .pdf file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", selectedClientId);

      const response = await fetch("/api/solvy/sources", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/solvy/sources", selectedClientId] });
      toast({ title: "File uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const selectedSource = dataSources.find((s) => s.id === selectedSourceId);

  const filteredChunks = chunks.filter((chunk) =>
    searchQuery ? chunk.content.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-data-sources-title">
          Data Sources
        </h1>
        <p className="text-muted-foreground">
          Upload and manage documents for Solvy to query
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select
          value={selectedClientId}
          onValueChange={(val) => {
            setSelectedClientId(val);
            setSelectedSourceId(null);
          }}
        >
          <SelectTrigger className="w-[220px]" data-testid="select-client-data">
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

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".txt,.md,.pdf"
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedClientId || isUploading}
          data-testid="button-upload"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload File
        </Button>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a workspace</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Choose a workspace above to view and manage data sources
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Uploaded Sources</CardTitle>
              <CardDescription>
                {dataSources.length} source{dataSources.length !== 1 ? "s" : ""} in this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px]">
                {sourcesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : dataSources.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      No data sources yet. Upload a file to get started.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataSources.map((source) => {
                        const StatusIcon = statusConfig[source.status].icon;
                        return (
                          <TableRow
                            key={source.id}
                            className={`cursor-pointer ${
                              selectedSourceId === source.id ? "bg-muted/50" : ""
                            }`}
                            onClick={() => setSelectedSourceId(source.id)}
                            data-testid={`source-${source.id}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate max-w-[150px]">{source.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <StatusIcon
                                  className={`h-4 w-4 ${statusConfig[source.status].color}`}
                                />
                                <span className="text-sm">{statusConfig[source.status].label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {source.chunkCount !== null ? source.chunkCount : "-"}
                            </TableCell>
                            <TableCell>
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
                                      This will permanently delete "{source.name}" and all its chunks.
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteSourceMutation.mutate(source.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chunk Preview</CardTitle>
              <CardDescription>
                {selectedSource
                  ? `Viewing chunks from "${selectedSource.name}"`
                  : "Select a source to view its chunks"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedSource ? (
                <div className="flex flex-col items-center justify-center h-[420px] text-center">
                  <File className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click on a data source to view its chunks
                  </p>
                </div>
              ) : selectedSource.status === "processing" ? (
                <div className="flex flex-col items-center justify-center h-[420px] text-center">
                  <Loader2 className="h-10 w-10 text-muted-foreground mb-3 animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing document...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This may take a few moments
                  </p>
                </div>
              ) : selectedSource.status === "error" ? (
                <div className="flex flex-col items-center justify-center h-[420px] text-center">
                  <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
                  <p className="text-sm font-medium text-red-500">Processing failed</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    {selectedSource.errorMessage || "Unknown error occurred"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search chunks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-chunks"
                    />
                  </div>
                  <ScrollArea className="h-[380px]">
                    {chunksLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                      </div>
                    ) : filteredChunks.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          {searchQuery ? "No matching chunks found" : "No chunks available"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredChunks.map((chunk) => (
                          <div
                            key={chunk.id}
                            className="p-3 bg-muted/50 rounded-md border text-sm"
                            data-testid={`chunk-${chunk.id}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs">
                                Chunk {chunk.chunkIndex + 1}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                              {chunk.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
