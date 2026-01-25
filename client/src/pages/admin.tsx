import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Client, type UseCase, type ClientInvitation, insertClientSchema, insertUseCaseSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Building2, FileText, Sparkles, Loader2, Pencil, ChevronDown, Mail, Trash2, Copy, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Goal options for use cases
const goalOptions = [
  "Leads",
  "Fewer Phone Calls", 
  "Education",
  "Cost Savings",
  "Customer Retention",
  "Efficiency",
  "Compliance",
  "Revenue Growth",
  "Other"
] as const;

// Extended form schema for use case creation
const useCaseFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  goals: z.array(z.string()).default([]),
  industryVertical: z.string().min(1, "Industry is required"),
  department: z.string().min(1, "Department is required"),
  level: z.coerce.number().min(1).max(3),
  status: z.enum(["Proposed", "Approved", "Building", "Live", "Optimising", "Paused"]),
  riskRating: z.enum(["None", "Low", "Medium", "High"]),
  piiFlag: z.boolean(),
  dataFlow: z.enum(["LocalOnly", "VendorTools", "CloudLLM"]),
  humanInLoop: z.enum(["Required", "Optional", "None"]),
  customerFrustrations: z.string().optional(),
  storyTodayIsManual: z.boolean().default(false),
  storyToday: z.string().optional(),
  storyFuture: z.string().optional(),
  personaStory: z.string().optional(),
  controls: z.string().optional(),
  tools: z.string().optional(),
  baselineMinutesPerRun: z.coerce.number().min(0),
  frequencyPerWeek: z.coerce.number().min(0),
  roiTimeSavedMinutesPerWeek: z.coerce.number().min(0),
  roiDollarsPerMonth: z.coerce.number().min(0),
});

type UseCaseFormValues = z.infer<typeof useCaseFormSchema>;

// Client form schema
const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industryVertical: z.string().min(1, "Industry is required"),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function AdminPage() {
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [useCaseDialogOpen, setUseCaseDialogOpen] = useState(false);
  const [editUseCaseDialogOpen, setEditUseCaseDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const { toast } = useToast();

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: useCases = [], isLoading: useCasesLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/use-cases"],
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<ClientInvitation[]>({
    queryKey: ["/api/invitations"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-admin-title">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage clients and use cases
        </p>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients" data-testid="tab-clients">
            <Building2 className="h-4 w-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="usecases" data-testid="tab-usecases">
            <FileText className="h-4 w-4 mr-2" />
            Use Cases
          </TabsTrigger>
          <TabsTrigger value="invitations" data-testid="tab-invitations">
            <Mail className="h-4 w-4 mr-2" />
            Invitations
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Clients</h2>
            <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                </DialogHeader>
                <ClientForm onSuccess={() => setClientDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {clientsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : clients.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No clients yet. Add your first client to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.industryVertical}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(client.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Use Cases Tab */}
        <TabsContent value="usecases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Use Cases</h2>
            <Dialog open={useCaseDialogOpen} onOpenChange={setUseCaseDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-usecase">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Use Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Use Case</DialogTitle>
                </DialogHeader>
                <UseCaseForm clients={clients} onSuccess={() => setUseCaseDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {useCasesLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : useCases.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No use cases yet. Add your first use case to get started.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {useCases.map((uc) => {
                        const client = clients.find((c) => c.id === uc.clientId);
                        return (
                          <TableRow key={uc.id} data-testid={`row-usecase-${uc.id}`}>
                            <TableCell className="font-medium">{uc.title}</TableCell>
                            <TableCell>{client?.name || "Unknown"}</TableCell>
                            <TableCell>Level {uc.level}</TableCell>
                            <TableCell>{uc.status}</TableCell>
                            <TableCell>{uc.riskRating}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUseCase(uc);
                                  setEditUseCaseDialogOpen(true);
                                }}
                                data-testid={`button-edit-usecase-${uc.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Edit Use Case Dialog */}
                  <Dialog open={editUseCaseDialogOpen} onOpenChange={setEditUseCaseDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Use Case</DialogTitle>
                      </DialogHeader>
                      {selectedUseCase && (
                        <EditUseCaseForm 
                          useCase={selectedUseCase} 
                          clients={clients} 
                          onSuccess={() => {
                            setEditUseCaseDialogOpen(false);
                            setSelectedUseCase(null);
                          }} 
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-lg font-medium">Client Invitations</h2>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-invite-client">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Client</DialogTitle>
                </DialogHeader>
                <InviteClientForm clients={clients} onSuccess={() => setInviteDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {invitationsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No invitations yet. Invite your first client to give them access to their use cases.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const client = clients.find((c) => c.id === invitation.clientId);
                      const isExpired = new Date(invitation.expiresAt) < new Date();
                      return (
                        <TableRow key={invitation.id} data-testid={`row-invitation-${invitation.id}`}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>{client?.name || "Unknown"}</TableCell>
                          <TableCell>
                            {invitation.status === "accepted" ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Accepted
                              </Badge>
                            ) : isExpired ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                                <XCircle className="h-3 w-3 mr-1" />
                                Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invitation.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <InvitationActions invitation={invitation} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InviteClientForm({ clients, onSuccess }: { clients: Client[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  
  const form = useForm({
    defaultValues: {
      email: "",
      clientId: "",
    },
  });

  const createInvitation = useMutation({
    mutationFn: async (data: { email: string; clientId: string }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      setLastInviteLink(window.location.origin + data.inviteLink);
      toast({ 
        title: "Invitation sent", 
        description: "Copy the invite link to share with your client." 
      });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    },
  });

  const copyLink = () => {
    if (lastInviteLink) {
      navigator.clipboard.writeText(lastInviteLink);
      toast({ title: "Link copied to clipboard" });
    }
  };

  if (lastInviteLink) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Invitation Created</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Share this link with your client to let them create their account:
          </p>
          <div className="flex gap-2">
            <Input value={lastInviteLink} readOnly className="text-xs" data-testid="input-invite-link" />
            <Button size="icon" variant="outline" onClick={copyLink} data-testid="button-copy-link">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setLastInviteLink(null)} data-testid="button-send-another">
            Send Another
          </Button>
          <Button className="flex-1" onClick={onSuccess} data-testid="button-done">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((data) => createInvitation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Client Email</Label>
        <Input 
          id="email"
          type="email"
          placeholder="client@company.com"
          {...form.register("email", { required: true })}
          data-testid="input-invite-email"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Client Company</Label>
        <Select onValueChange={(v) => form.setValue("clientId", v)}>
          <SelectTrigger data-testid="select-invite-client">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createInvitation.isPending}
        data-testid="button-submit-invite"
      >
        {createInvitation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Send Invitation
      </Button>
    </form>
  );
}

function InvitationActions({ invitation }: { invitation: ClientInvitation }) {
  const { toast } = useToast();

  const deleteInvitation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/invitations/${invitation.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      toast({ title: "Invitation deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete invitation", variant: "destructive" });
    },
  });

  const copyLink = () => {
    const link = window.location.origin + `/accept-invite?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied to clipboard" });
  };

  return (
    <div className="flex gap-1">
      {invitation.status === "pending" && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={copyLink}
          title="Copy invite link"
          data-testid={`button-copy-invite-${invitation.id}`}
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => deleteInvitation.mutate()}
        disabled={deleteInvitation.isPending}
        title="Delete invitation"
        data-testid={`button-delete-invite-${invitation.id}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ClientForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      industryVertical: "",
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create client", variant: "destructive" });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createClient.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Podiatry Clinic" {...field} data-testid="input-client-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="industryVertical"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry Vertical</FormLabel>
              <FormControl>
                <Input placeholder="Podiatry" {...field} data-testid="input-client-industry" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={createClient.isPending} data-testid="button-submit-client">
          {createClient.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Client
        </Button>
      </form>
    </Form>
  );
}

function UseCaseForm({ clients, onSuccess }: { clients: Client[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<UseCaseFormValues>({
    resolver: zodResolver(useCaseFormSchema),
    defaultValues: {
      clientId: "",
      title: "",
      goals: [],
      industryVertical: "",
      department: "",
      level: 1,
      status: "Proposed",
      riskRating: "None",
      piiFlag: false,
      dataFlow: "LocalOnly",
      humanInLoop: "Required",
      customerFrustrations: "",
      storyTodayIsManual: false,
      storyToday: "",
      storyFuture: "",
      personaStory: "",
      controls: "",
      tools: "",
      baselineMinutesPerRun: 0,
      frequencyPerWeek: 0,
      roiTimeSavedMinutesPerWeek: 0,
      roiDollarsPerMonth: 0,
    },
  });

  const createUseCase = useMutation({
    mutationFn: async (data: UseCaseFormValues) => {
      const payload = {
        ...data,
        controls: data.controls ? data.controls.split("\n").filter(Boolean) : [],
        tools: data.tools ? data.tools.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await apiRequest("POST", "/api/use-cases", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      toast({ title: "Use case created successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create use case", variant: "destructive" });
    },
  });

  const generateStory = async () => {
    const values = form.getValues();
    if (!values.title || !values.industryVertical || !values.department) {
      toast({ title: "Please fill in title, industry, and department first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/story-generate", {
        industryVertical: values.industryVertical,
        department: values.department,
        taskSummary: values.title,
        tools: values.tools ? values.tools.split(",").map((t) => t.trim()).filter(Boolean) : [],
        piiFlag: values.piiFlag,
        riskRating: values.riskRating,
        level: values.level,
        customerFrustrations: values.customerFrustrations || "",
        storyTodayIsManual: values.storyTodayIsManual || false,
        existingStoryToday: values.storyToday || "",
      });
      const data = await res.json();
      if (data.storyToday) {
        form.setValue("storyToday", data.storyToday);
      }
      form.setValue("storyFuture", data.storyFuture);
      form.setValue("personaStory", data.personaStory);
      form.setValue("controls", data.controls.join("\n"));
      toast({ title: "Story generated successfully" });
    } catch (error) {
      toast({ title: "Failed to generate story", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-fill industry when client is selected
  const selectedClient = clients.find((c) => c.id === form.watch("clientId"));
  if (selectedClient && !form.getValues("industryVertical")) {
    form.setValue("industryVertical", selectedClient.industryVertical);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createUseCase.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-usecase-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industryVertical"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="Podiatry" {...field} data-testid="input-usecase-industry" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Upload email list into Mailchimp" {...field} data-testid="input-usecase-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goals (select multiple)</FormLabel>
              <div className="grid grid-cols-3 gap-2 pt-2" data-testid="checkbox-group-goals">
                {goalOptions.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={`goal-${goal}`}
                      checked={field.value?.includes(goal)}
                      onCheckedChange={(checked) => {
                        const currentGoals = field.value || [];
                        if (checked) {
                          field.onChange([...currentGoals, goal]);
                        } else {
                          field.onChange(currentGoals.filter((g: string) => g !== goal));
                        }
                      }}
                      data-testid={`checkbox-goal-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                    />
                    <label
                      htmlFor={`goal-${goal}`}
                      className="text-sm font-normal leading-none cursor-pointer"
                    >
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing" {...field} data-testid="input-usecase-department" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tools"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tools (comma-separated)</FormLabel>
                <FormControl>
                  <Input placeholder="Mailchimp, Zapier, ChatGPT" {...field} data-testid="input-usecase-tools" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger data-testid="select-usecase-level">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Level 1</SelectItem>
                    <SelectItem value="2">Level 2</SelectItem>
                    <SelectItem value="3">Level 3</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-usecase-status">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Proposed">Proposed</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Building">Building</SelectItem>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Optimising">Optimising</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riskRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-usecase-risk">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="dataFlow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Flow</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LocalOnly">Local Only</SelectItem>
                    <SelectItem value="VendorTools">Vendor Tools</SelectItem>
                    <SelectItem value="CloudLLM">Cloud LLM</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="humanInLoop"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Human in Loop</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="piiFlag"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="cursor-pointer">Contains PII</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-pii" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-medium">Story Content</h3>
          <Button type="button" variant="outline" size="sm" onClick={generateStory} disabled={isGenerating} data-testid="button-generate-story">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Story
          </Button>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground" data-testid="button-expand-frustrations">
              <span className="text-xs">Add customer frustrations for richer stories</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <FormField
              control={form.control}
              name="customerFrustrations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Frustrations</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='e.g., "This is a huge distraction when we get an Instagram message" or "We lose hours every week just on data entry"'
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-customer-frustrations"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Real quotes or pain points from customers - these feed into the AI story generator for authentic narratives.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <FormField
            control={form.control}
            name="storyTodayIsManual"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Switch 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-story-today-manual"
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  Manual input (AI will enhance grammar only)
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="storyToday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Workflow (Today)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe the current manual workflow..."
                    className="min-h-24"
                    {...field}
                    data-testid="textarea-story-today"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="storyFuture"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Future Workflow (numbered steps)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                  className="min-h-24"
                  {...field}
                  data-testid="textarea-story-future"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personaStory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona Story (auto-generated narrative)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Click 'Generate Story' to create a persona-based narrative..."
                  className="min-h-32 bg-muted/50"
                  readOnly
                  {...field}
                  data-testid="textarea-persona-story"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">This story uses real-world personas and industry-specific language for client presentations.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="controls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Controls (one per line)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="No diagnosis&#10;Redact PII&#10;Escalate to human"
                  className="min-h-20"
                  {...field}
                  data-testid="textarea-controls"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="baselineMinutesPerRun"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baseline Minutes/Run</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-baseline-minutes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequencyPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency/Week</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-frequency" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="roiTimeSavedMinutesPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Saved (min/week)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-time-saved" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roiDollarsPerMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ROI ($/month)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-roi-dollars" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={createUseCase.isPending} data-testid="button-submit-usecase">
          {createUseCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Use Case
        </Button>
      </form>
    </Form>
  );
}

// Edit Use Case Form Component
function EditUseCaseForm({ 
  useCase, 
  clients, 
  onSuccess 
}: { 
  useCase: UseCase; 
  clients: Client[]; 
  onSuccess: () => void 
}) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<UseCaseFormValues>({
    resolver: zodResolver(useCaseFormSchema),
    defaultValues: {
      clientId: String(useCase.clientId),
      title: useCase.title,
      goals: (useCase.goals as string[]) || [],
      industryVertical: useCase.industryVertical,
      department: useCase.department || "",
      level: useCase.level,
      status: useCase.status as "Proposed" | "Approved" | "Building" | "Live" | "Optimising" | "Paused",
      riskRating: useCase.riskRating as "None" | "Low" | "Medium" | "High",
      piiFlag: useCase.piiFlag || false,
      dataFlow: useCase.dataFlow as "LocalOnly" | "VendorTools" | "CloudLLM",
      humanInLoop: useCase.humanInLoop as "Required" | "Optional" | "None",
      customerFrustrations: useCase.customerFrustrations || "",
      storyTodayIsManual: useCase.storyTodayIsManual || false,
      storyToday: useCase.storyToday || "",
      storyFuture: useCase.storyFuture || "",
      personaStory: useCase.personaStory || "",
      controls: (useCase.controls as string[])?.join("\n") || "",
      tools: (useCase.tools as string[])?.join(", ") || "",
      baselineMinutesPerRun: useCase.baselineMinutesPerRun || 0,
      frequencyPerWeek: useCase.frequencyPerWeek || 0,
      roiTimeSavedMinutesPerWeek: useCase.roiTimeSavedMinutesPerWeek || 0,
      roiDollarsPerMonth: useCase.roiDollarsPerMonth || 0,
    },
  });

  const updateUseCase = useMutation({
    mutationFn: async (data: UseCaseFormValues) => {
      const payload = {
        ...data,
        clientId: data.clientId,
        controls: data.controls ? data.controls.split("\n").filter(Boolean) : [],
        tools: data.tools ? data.tools.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await apiRequest("PATCH", `/api/use-cases/${useCase.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/use-cases"] });
      toast({ title: "Use case updated successfully" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to update use case", variant: "destructive" });
    },
  });

  const generateStory = async () => {
    const values = form.getValues();
    if (!values.title || !values.industryVertical || !values.department) {
      toast({ title: "Please fill in title, industry, and department first", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/story-generate", {
        industryVertical: values.industryVertical,
        department: values.department,
        taskSummary: values.title,
        tools: values.tools ? values.tools.split(",").map((t) => t.trim()).filter(Boolean) : [],
        piiFlag: values.piiFlag,
        riskRating: values.riskRating,
        level: values.level,
        customerFrustrations: values.customerFrustrations || "",
        storyTodayIsManual: values.storyTodayIsManual || false,
        existingStoryToday: values.storyToday || "",
      });
      const data = await res.json();
      if (data.storyToday) {
        form.setValue("storyToday", data.storyToday);
      }
      form.setValue("storyFuture", data.storyFuture);
      form.setValue("personaStory", data.personaStory);
      form.setValue("controls", data.controls.join("\n"));
      toast({ title: "Story generated successfully" });
    } catch (e) {
      toast({ title: "Failed to generate story", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => updateUseCase.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industryVertical"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="Healthcare" {...field} data-testid="input-edit-industry" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Use case title" {...field} data-testid="input-edit-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="goals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goals (select multiple)</FormLabel>
              <div className="grid grid-cols-3 gap-2 pt-2" data-testid="checkbox-group-edit-goals">
                {goalOptions.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-goal-${goal}`}
                      checked={field.value?.includes(goal)}
                      onCheckedChange={(checked) => {
                        const currentGoals = field.value || [];
                        if (checked) {
                          field.onChange([...currentGoals, goal]);
                        } else {
                          field.onChange(currentGoals.filter((g: string) => g !== goal));
                        }
                      }}
                      data-testid={`checkbox-edit-goal-${goal.toLowerCase().replace(/\s+/g, '-')}`}
                    />
                    <label
                      htmlFor={`edit-goal-${goal}`}
                      className="text-sm font-normal leading-none cursor-pointer"
                    >
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing" {...field} data-testid="input-edit-department" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Level</FormLabel>
                <Select onValueChange={field.onChange} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">Level 1 - Tool-assisted</SelectItem>
                    <SelectItem value="2">Level 2 - No-code automation</SelectItem>
                    <SelectItem value="3">Level 3 - AI embedded</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Proposed">Proposed</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Building">Building</SelectItem>
                    <SelectItem value="Live">Live</SelectItem>
                    <SelectItem value="Optimising">Optimising</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riskRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Rating</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-risk">
                      <SelectValue placeholder="Select risk" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dataFlow"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Flow</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-dataflow">
                      <SelectValue placeholder="Select data flow" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LocalOnly">Local Only</SelectItem>
                    <SelectItem value="VendorTools">Vendor Tools</SelectItem>
                    <SelectItem value="CloudLLM">Cloud LLM</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="humanInLoop"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Human in Loop</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-edit-humaninloop">
                      <SelectValue placeholder="Select requirement" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Required">Required</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="piiFlag"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-edit-pii"
                />
              </FormControl>
              <FormLabel className="font-normal">Contains Personal Data (PII)</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tools"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tools (comma-separated)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Mailchimp, Zapier, ChatGPT" 
                  {...field}
                  data-testid="input-edit-tools"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Story Mode</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateStory}
            disabled={isGenerating}
            data-testid="button-edit-generate-story"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Story
          </Button>
        </div>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground" data-testid="button-edit-expand-frustrations">
              <span className="text-xs">Add customer frustrations for richer stories</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <FormField
              control={form.control}
              name="customerFrustrations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Frustrations</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='e.g., "This is a huge distraction when we get an Instagram message" or "We lose hours every week just on data entry"'
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-edit-customer-frustrations"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Real quotes or pain points from customers - these feed into the AI story generator.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <FormField
            control={form.control}
            name="storyTodayIsManual"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Switch 
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-edit-story-today-manual"
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal cursor-pointer">
                  Manual input (AI will enhance grammar only)
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="storyToday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Workflow</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe the current manual process..."
                    className="min-h-24"
                    {...field}
                    data-testid="textarea-edit-story-today"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="storyFuture"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Future Workflow (numbered steps)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                  className="min-h-24"
                  {...field}
                  data-testid="textarea-edit-story-future"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personaStory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona Story (auto-generated narrative)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Click 'Generate Story' to create a persona-based narrative..."
                  className="min-h-32 bg-muted/50"
                  readOnly
                  {...field}
                  data-testid="textarea-edit-persona-story"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">This story uses real-world personas and industry-specific language for client presentations.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="controls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Controls (one per line)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="No diagnosis&#10;Redact PII&#10;Escalate to human"
                  className="min-h-20"
                  {...field}
                  data-testid="textarea-edit-controls"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="baselineMinutesPerRun"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baseline Minutes/Run</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-edit-baseline-minutes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequencyPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency/Week</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-edit-frequency" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="roiTimeSavedMinutesPerWeek"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Saved (min/week)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-edit-time-saved" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roiDollarsPerMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ROI ($/month)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} data-testid="input-edit-roi-dollars" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={updateUseCase.isPending} data-testid="button-update-usecase">
          {updateUseCase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Update Use Case
        </Button>
      </form>
    </Form>
  );
}
