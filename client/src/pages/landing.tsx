import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  LayoutDashboard, 
  Shield, 
  BarChart3, 
  Squirrel,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-emerald-500 flex items-center justify-center">
              <Squirrel className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Solvity</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                Trusted by consultants worldwide
              </div>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight leading-tight">
                Transform workflows into
                <span className="text-primary"> measurable ROI</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Capture, collaborate, and prioritize AI use cases for your organization. 
                Visualize automation levels, assess risks, and demonstrate real value.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/auth">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Free to start
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  HIPAA-aware controls
                </span>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-3xl blur-3xl"></div>
              <div className="relative rounded-2xl border bg-card p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Active Use Cases</h3>
                    <span className="text-2xl font-semibold text-primary">12</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Level 1</div>
                      <div className="text-lg font-semibold">4</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Level 2</div>
                      <div className="text-lg font-semibold">5</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Level 3</div>
                      <div className="text-lg font-semibold">3</div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly ROI</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">$8,450/mo</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Time Saved</span>
                      <span className="font-semibold">42 hrs/week</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4">
              Everything you need to manage use cases
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From ideation to implementation, track every step of your automation journey.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<LayoutDashboard className="h-6 w-6" />}
              title="Intuitive Dashboard"
              description="View all use cases at a glance with smart filters for level, status, risk, and PII flags."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Risk & Trust Controls"
              description="Built-in guardrails for healthcare and sensitive industries. Track PII, data flow, and human oversight."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="ROI Tracking"
              description="Measure time saved and dollars earned. Show clients real value with every automation."
            />
          </div>
        </div>
      </section>

      {/* Healthcare Disclaimer */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Important:</strong> Solvity is a workflow management tool and does not provide medical advice, 
            diagnosis, or treatment. For healthcare verticals, all use cases include appropriate guardrails 
            and human-in-the-loop requirements. This system does not replace clinical care or professional medical judgment.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500 flex items-center justify-center">
              <Squirrel className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium">Solvity</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Solvity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="rounded-xl border bg-card p-6 hover-elevate transition-colors">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
