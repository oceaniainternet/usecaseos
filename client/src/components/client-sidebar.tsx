import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutGrid, Store, User, LogOut, Users, Columns } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import solvityLogo from "@assets/solvityai_logo_1769821491441.png";

interface UserClientInfo {
  clientId: string;
  clientTeamRole: string | null;
  role: string | null;
}

const baseMenuItems = [
  {
    title: "Dashboard",
    url: "/client-portal",
    icon: LayoutGrid,
    adminOnly: false,
  },
  {
    title: "Kanban",
    url: "/client-kanban",
    icon: Columns,
    adminOnly: false,
  },
  {
    title: "Team",
    url: "/client-team",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Marketplace",
    url: "/client-marketplace",
    icon: Store,
    adminOnly: false,
  },
  {
    title: "Account",
    url: "/client-account",
    icon: User,
    adminOnly: false,
  },
];

export function ClientSidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: userClientsData } = useQuery<UserClientInfo[]>({
    queryKey: ["/api/client-portal/user-clients"],
  });

  const canManageTeam = userClientsData?.some(
    uc => uc.clientTeamRole === "Admin" || uc.role === "CLIENT"
  ) ?? false;

  const menuItems = baseMenuItems.filter(item => !item.adminOnly || canManageTeam);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/client-portal" className="flex items-center gap-2">
          <img src={solvityLogo} alt="Solvity.ai" className="h-8 w-8" />
          <span className="font-semibold text-lg">Solvity</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url === "/client-portal" && location.startsWith("/client-portal/use-case"));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          data-testid="button-sidebar-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
