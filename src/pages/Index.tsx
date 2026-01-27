import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { DemoBuilder } from '@/components/DemoBuilder/DemoBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, Activity, Eye, Clock, MousePointer, LogOut, RotateCcw, DollarSign, LogIn, User } from 'lucide-react';
import { useState, useEffect } from 'react';

const Index = () => {
  const [behaviorData, setBehaviorData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [pricingVisits, setPricingVisits] = useState(0);
  const [dashboardTime, setDashboardTime] = useState(0);

  // Login simulator state
  const [showLoginSim, setShowLoginSim] = useState(false);
  const [loginEmail, setLoginEmail] = useState('allen.martin@feve.com');
  const [loginName, setLoginName] = useState('');
  const [loginCompany, setLoginCompany] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load HappyLead widget
  useEffect(() => {
    const loadWidget = () => {
      const u = (window as any).currentUser || (window as any).user || ((window as any).analytics?.user?.()) || ((window as any).Intercom?.user) || null;
      (window as any).HappyLeadConfig = {
        accountId: "8c175179-8972-415e-a07f-1614786e558c",
        user: u?.email ? {
          email: u.email,
          name: u.name || u.full_name || (u.firstName && u.lastName ? u.firstName + " " + u.lastName : "") || "",
          company: u.company || u.companyName || ""
        } : null
      };

      const script = document.createElement("script");
      script.src = "https://happylead-mvp.vercel.app/widget.js";
      script.async = true;
      script.setAttribute('data-account-id', '8c175179-8972-415e-a07f-1614786e558c');
      document.head.appendChild(script);
    };

    loadWidget();
  }, []);


  // Check if already "logged in"
  useEffect(() => {
    const currentUser = (window as any).currentUser;
    if (currentUser?.email) {
      setIsLoggedIn(true);
      setLoginEmail(currentUser.email);
      setLoginName(currentUser.name || '');
      setLoginCompany(currentUser.company || '');
    }
  }, []);

  // Simulate login
  const simulateLogin = () => {
    // Set global user (like a real app would)
    (window as any).currentUser = {
      email: loginEmail,
      name: loginName,
      company: loginCompany
    };

    // Call HappyLead.identify manually (in case auto-detection didn't work)
if ((window as any).HappyLead) {
  (window as any).HappyLead.identify(loginEmail, {
    email: loginEmail,
    name: loginName,
    company: loginCompany
  });
  // Removed console logs - use HappyLead.isUserIdentified() to verify instead
} else {
  console.warn('[Flowtide] ⚠️ HappyLead not loaded yet');
}

    setIsLoggedIn(true);
    setShowLoginSim(false);

    alert(`✓ Logged in as ${loginName}\n\n${loginEmail}\n\nHappyLead should now detect you!\n\nCheck the browser console for confirmation.`);
  };

  // Simulate logout
  const simulateLogout = () => {
  (window as any).currentUser = null;
  setIsLoggedIn(false);
  setLoginEmail('');
  setLoginName('');
  setLoginCompany('');
  alert('✓ Logged out! You are now anonymous to HappyLead.');

    // Reload to reset widget
    if (confirm('Reload page to fully reset HappyLead?')) {
      window.location.reload();
    }
  };

  // Refresh behavior data
  const refreshBehaviorData = () => {
    if ((window as any).HappyLead) {
      const data = (window as any).HappyLead.getBehaviorData();
      setBehaviorData(data);
      setPricingVisits(data?.pageViews?.['/pricing'] || 0);
      setDashboardTime(data?.timeOnPage?.['/dashboard'] || 0);
    }
  };

  useEffect(() => {
    // Refresh every 2 seconds
    const interval = setInterval(refreshBehaviorData, 2000);
    return () => clearInterval(interval);
  }, []);

  const trackEvent = (eventName: string, properties?: any) => {
    if ((window as any).HappyLead) {
      (window as any).HappyLead.track(eventName, properties);
      console.log(`[Flowtide] Tracked: ${eventName}`, properties);
    }
  };

  const viewBehaviorData = () => {
    refreshBehaviorData();
    setShowDebug(!showDebug);
  };

  // Playbook testing functions
  const simulatePricingVisit = () => {
    window.history.pushState({}, '', '/pricing');
    setTimeout(() => {
      refreshBehaviorData();
      const data = (window as any).HappyLead?.getBehaviorData();
      const count = data?.pageViews?.['/pricing'] || 0;
      console.log(`[Flowtide] Pricing page visited. Total visits: ${count}`);
      setTimeout(() => {
        window.history.pushState({}, '', '/');
        console.log('[Flowtide] Returned to home page');
      }, 500);
    }, 100);
  };

  const simulateCheckoutExit = () => {
    window.history.pushState({}, '', '/checkout');
    setTimeout(() => {
      const event = new MouseEvent('mouseleave', {
        clientY: -10,
        bubbles: true
      });
      document.dispatchEvent(event);
      console.log('[Flowtide] Exit intent triggered on /checkout');
    }, 200);
  };

  const simulateDashboardTime = () => {
    window.history.pushState({}, '', '/dashboard');
    const event = new Event('popstate');
    window.dispatchEvent(event);
    console.log('[Flowtide] Navigated to dashboard - time tracking started');
    refreshBehaviorData();
  };

  const resetBehavior = () => {
    if (confirm('Reset all behavior data? This will clear page visits, time tracking, and exit intent data.')) {
      if ((window as any).HappyLead) {
        const data = (window as any).HappyLead.getBehaviorData();
        if (data) {
          data.pageViews = {};
          data.timeOnPage = {};
          data.exitIntentDetected = false;
          data.sessionStart = Date.now();
        }
      }
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('happylead_') || key.startsWith('hl_')) {
          localStorage.removeItem(key);
        }
      });
      setPricingVisits(0);
      setDashboardTime(0);
      refreshBehaviorData();
      window.history.pushState({}, '', '/');
      console.log('[Flowtide] Behavior data reset');
      alert('✓ Behavior data has been reset!');
    }
  };

  const resetAll = () => {
    if (confirm('Reset EVERYTHING and reload? This will clear all data and refresh the page.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return (
    <>
      <Helmet>
        <title>Flowtide - HappyLead Testing Environment</title>
        <meta
          name="description"
          content="Test environment for HappyLead widget integration"
        />
        <style>{`
          [data-lovable-edit-button],
          .lovable-edit-button,
          a[href*="lovable.dev"] {
            display: none !important;
          }
        `}</style>
      </Helmet>
      <Layout>
        {/* User Status Bar */}
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {isLoggedIn ? (
                  <span className="text-green-600">✓ Logged In: {loginName}</span>
                ) : (
                  <span className="text-muted-foreground">Anonymous User</span>
                )}
              </div>
              {isLoggedIn && (
                <div className="text-xs text-muted-foreground">{loginEmail}</div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isLoggedIn ? (
              <Button variant="outline" size="sm" onClick={simulateLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Dialog open={showLoginSim} onOpenChange={setShowLoginSim}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Simulate Login
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Simulate User Login</DialogTitle>
                    <DialogDescription>
                      This simulates a user logging into your app. HappyLead will detect these credentials.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="email">Email * (Required)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="user@company.com"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        This is what HappyLead uses to look you up in Salesforce
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="John Smith"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        For personalization only (e.g., "Hi John!")
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        value={loginCompany}
                        onChange={(e) => setLoginCompany(e.target.value)}
                        placeholder="Acme Corp"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        For display only - Salesforce has the real data
                      </p>
                    </div>

                    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                      <strong>What happens:</strong>
                      <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
                        <li>Sets window.currentUser (simulating your app)</li>
                        <li>Calls HappyLead.identify() with email</li>
                        <li>Widget looks up email in Salesforce</li>
                        <li>Gets company size, industry, trial status, etc.</li>
                        <li>Matches against playbook rules</li>
                      </ul>
                    </div>
                  </div>

                  <Button onClick={simulateLogin} disabled={!loginEmail}>
                    Login as This User
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Test Triggers Dropdown */}
        <div className="mb-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetBehavior}
            className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Behavior
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Simulate Behavior
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                🎯 SIMULATE VISITOR ACTIONS
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={simulatePricingVisit}>
                <DollarSign className="mr-2 h-4 w-4" />
                <div className="flex flex-col flex-1">
                  <span>Visit Pricing Page</span>
                  <span className="text-xs text-muted-foreground">
                    Current: {pricingVisits} visit{pricingVisits !== 1 ? 's' : ''}
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={simulateCheckoutExit}>
                <MousePointer className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Exit Intent on Checkout</span>
                  <span className="text-xs text-muted-foreground">Mouse leaves page</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={simulateDashboardTime}>
                <Clock className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Spend 60s on Dashboard</span>
                  <span className="text-xs text-muted-foreground">
                    Current: {dashboardTime}s
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                🔧 TESTING TOOLS
              </DropdownMenuLabel>

              <DropdownMenuItem onClick={() => trackEvent('clicked_pricing', { plan: 'enterprise' })}>
                <Activity className="mr-2 h-4 w-4" />
                Track Custom Event
              </DropdownMenuItem>

              <DropdownMenuItem onClick={viewBehaviorData}>
                <Eye className="mr-2 h-4 w-4" />
                View Behavior Data
              </DropdownMenuItem>

              <DropdownMenuItem onClick={resetBehavior} className="text-orange-600">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Behavior Data
              </DropdownMenuItem>

              <DropdownMenuItem onClick={resetAll} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Reset All & Reload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Debug Panel */}
        {showDebug && behaviorData && (
          <div className="mb-6 rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Behavior Data</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowDebug(false)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 font-medium text-muted-foreground">Page Views:</div>
                <pre className="rounded bg-muted p-2 text-xs">
                  {JSON.stringify(behaviorData.pageViews, null, 2)}
                </pre>
              </div>

              <div>
                <div className="mb-1 font-medium text-muted-foreground">Time on Page:</div>
                <pre className="rounded bg-muted p-2 text-xs">
                  {JSON.stringify(behaviorData.timeOnPage, null, 2)}
                </pre>
              </div>

              <div>
                <div className="mb-1 font-medium text-muted-foreground">Exit Intent:</div>
                <span className={behaviorData.exitIntentDetected ? 'text-green-600' : 'text-muted-foreground'}>
                  {behaviorData.exitIntentDetected ? '✓ Detected' : '✗ Not detected'}
                </span>
              </div>

              <div>
                <div className="mb-1 font-medium text-muted-foreground">Session Start:</div>
                <span className="text-muted-foreground">
                  {new Date(behaviorData.sessionStart).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <DemoBuilder />
      </Layout>
    </>
  );
};

export default Index;