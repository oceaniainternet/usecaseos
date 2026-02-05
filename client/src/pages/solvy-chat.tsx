import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MessageSquare,
  Send,
  Plus,
  Trash2,
  FileText,
  Lightbulb,
  Database,
  Bot,
  User,
  Loader2,
  ChevronRight,
  Quote,
  Lock,
  Globe,
} from "lucide-react";
import type { Client } from "@shared/schema";

type SolvyMode = "draft_brief" | "explore_ideas" | "query_data";

interface SolvyConversation {
  id: string;
  clientId: string;
  userId: string;
  mode: SolvyMode;
  title: string;
  visibility: "private" | "workspace";
  createdAt: string;
  updatedAt: string;
}

interface SolvyMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: string;
}

interface Citation {
  sourceId: string;
  sourceName: string;
  chunkContent: string;
  relevanceScore: number;
}

interface ConversationWithMessages extends SolvyConversation {
  messages: SolvyMessage[];
}

const modeConfig = {
  draft_brief: {
    label: "Draft Solution Brief",
    icon: FileText,
    description: "Create structured solution briefs with AI assistance",
    color: "text-blue-500",
  },
  explore_ideas: {
    label: "Explore Ideas",
    icon: Lightbulb,
    description: "Brainstorm and explore automation opportunities",
    color: "text-amber-500",
  },
  query_data: {
    label: "Query Company Data",
    icon: Database,
    description: "Ask questions about your uploaded documents",
    color: "text-green-500",
  },
};

export default function SolvyChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<SolvyMode>("explore_ideas");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<SolvyConversation[]>({
    queryKey: ["/api/solvy/conversations", selectedClientId],
    enabled: !!selectedClientId,
  });

  const { data: currentConversation, isLoading: conversationLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/solvy/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { clientId: string; mode: SolvyMode; title?: string }) => {
      const res = await apiRequest("POST", "/api/solvy/conversations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/solvy/conversations", selectedClientId] });
      setSelectedConversationId(data.id);
    },
    onError: () => {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest("DELETE", `/api/solvy/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solvy/conversations", selectedClientId] });
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
      toast({ title: "Conversation deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ conversationId, visibility }: { conversationId: string; visibility: "private" | "workspace" }) => {
      const res = await apiRequest("PATCH", `/api/solvy/conversations/${conversationId}`, { visibility });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solvy/conversations", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/solvy/conversations", selectedClientId] });
    },
    onError: () => {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentConversation?.messages, streamingContent]);

  const handleNewConversation = () => {
    if (!selectedClientId) return;
    createConversationMutation.mutate({
      clientId: selectedClientId,
      mode: selectedMode,
      title: "New Chat",
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversationId || isStreaming) return;

    const messageContent = inputMessage;
    setInputMessage("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingCitations([]);

    queryClient.setQueryData<ConversationWithMessages>(
      ["/api/solvy/conversations", selectedConversationId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages,
            {
              id: `temp-${Date.now()}`,
              conversationId: old.id,
              role: "user" as const,
              content: messageContent,
              citations: [],
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
    );

    try {
      const response = await fetch(`/api/solvy/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                setStreamingContent((prev) => prev + data.content);
              } else if (data.type === "done") {
                setStreamingCitations(data.citations || []);
                queryClient.invalidateQueries({
                  queryKey: ["/api/solvy/conversations", selectedConversationId],
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) => c.mode === selectedMode);

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
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-solvy-title">
          Solvy AI Assistant
        </h1>
        <p className="text-muted-foreground">
          Your AI-powered workspace assistant for exploring ideas, drafting briefs, and querying data
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-[220px]" data-testid="select-client">
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

        <div className="flex gap-2">
          {(Object.entries(modeConfig) as [SolvyMode, typeof modeConfig.draft_brief][]).map(
            ([mode, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={mode}
                  variant={selectedMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMode(mode)}
                  className="gap-2"
                  data-testid={`button-mode-${mode}`}
                >
                  <Icon className={`h-4 w-4 ${selectedMode === mode ? "" : config.color}`} />
                  {config.label}
                </Button>
              );
            }
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-280px)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardContent className="p-4 flex flex-col h-full">
            <Button
              className="w-full gap-2 mb-4"
              onClick={handleNewConversation}
              disabled={!selectedClientId || createConversationMutation.isPending}
              data-testid="button-new-chat"
            >
              {createConversationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              New Chat
            </Button>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {conversationsLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : filteredConversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No conversations yet
                  </p>
                ) : (
                  filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                        selectedConversationId === conv.id
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                      onClick={() => setSelectedConversationId(conv.id)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate flex-1">
                          {conv.title}
                        </span>
                        <div className="flex items-center gap-1">
                          {conv.visibility === "workspace" ? (
                            <Globe className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversationMutation.mutate(conv.id);
                            }}
                            data-testid={`button-delete-${conv.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            {!selectedConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Welcome to Solvy</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  {modeConfig[selectedMode].description}
                </p>
                <Button onClick={handleNewConversation} disabled={!selectedClientId}>
                  Start a new conversation
                </Button>
              </div>
            ) : (
              <>
                {currentConversation && (
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{currentConversation.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {modeConfig[currentConversation.mode].label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        toggleVisibilityMutation.mutate({
                          conversationId: currentConversation.id,
                          visibility:
                            currentConversation.visibility === "private" ? "workspace" : "private",
                        })
                      }
                      data-testid="button-toggle-visibility"
                    >
                      {currentConversation.visibility === "workspace" ? (
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
                )}

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {conversationLoading ? (
                      <>
                        <Skeleton className="h-20 w-3/4" />
                        <Skeleton className="h-20 w-3/4 ml-auto" />
                      </>
                    ) : (
                      <>
                        {currentConversation?.messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            showCitations={currentConversation.mode === "query_data"}
                          />
                        ))}
                        {isStreaming && streamingContent && (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 max-w-[80%]">
                              <div className="bg-muted rounded-lg p-3">
                                <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedMode === "draft_brief"
                          ? "Describe the problem you want to solve..."
                          : selectedMode === "explore_ideas"
                          ? "What automation ideas would you like to explore?"
                          : "Ask a question about your company data..."
                      }
                      className="flex-1 min-h-[60px] max-h-[120px] resize-none"
                      disabled={isStreaming}
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isStreaming}
                      className="self-end"
                      data-testid="button-send"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  showCitations,
}: {
  message: SolvyMessage;
  showCitations: boolean;
}) {
  const isUser = message.role === "user";
  const [showCitationsPanel, setShowCitationsPanel] = useState(false);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-primary" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div
          className={`rounded-lg p-3 inline-block text-left ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {showCitations && message.citations && message.citations.length > 0 && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setShowCitationsPanel(!showCitationsPanel)}
              data-testid={`button-citations-${message.id}`}
            >
              <Quote className="h-3 w-3" />
              {message.citations.length} source{message.citations.length > 1 ? "s" : ""}
              <ChevronRight
                className={`h-3 w-3 transition-transform ${showCitationsPanel ? "rotate-90" : ""}`}
              />
            </Button>
            {showCitationsPanel && (
              <div className="mt-2 space-y-2">
                {message.citations.map((citation, idx) => (
                  <div
                    key={idx}
                    className="text-xs bg-muted/50 rounded p-2 border-l-2 border-primary"
                  >
                    <p className="font-medium text-muted-foreground mb-1">{citation.sourceName}</p>
                    <p className="line-clamp-3">{citation.chunkContent}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
