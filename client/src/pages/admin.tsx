import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Client, type UseCase, insertClientSchema, insertUseCaseSchema } from "@shared/schema";
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
import { Plus, Building2, FileText, Sparkles, Loader2 } from "lucide-react";

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
  storyToday: z.string().optional(),
  storyFuture: z.string().optional(),
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
  const { toast } = useToast();

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: useCases = [], isLoading: useCasesLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/use-cases"],
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk</TableHead>
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
      storyToday: "",
      storyFuture: "",
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
      });
      const data = await res.json();
      form.setValue("storyToday", data.storyToday);
      form.setValue("storyFuture", data.storyFuture);
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
