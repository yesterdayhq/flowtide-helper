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

  // Check if already "logged in" from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        (window as any).currentUser = user;
        setIsLoggedIn(true);
        setLoginEmail(user.email);
        setLoginName(user.name || '');
        setLoginCompany(user.company || '');
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
  }, []);

  // Simulate login - save to localStorage to persist across refreshes
  const simulateLogin = () => {
    const userData = {
      email: loginEmail,
      name: loginName,
      company: loginCompany
    };

    // Save to localStorage for persistence
    localStorage.setItem('demo_user', JSON.stringify(userData));

    // Set global user (like a real app would)
    (window as any).currentUser = userData;

    setIsLoggedIn(true);
    setShowLoginSim(false);

    // Reload page so widget can detect the user on fresh load
    window.location.reload();
  };

  // Simulate logout
  const simulateLogout = () => {
    // Remove from localStorage
    localStorage.removeItem('demo_user');

    (window as any).currentUser = null;
    setIsLoggedIn(false);
    setLoginEmail('allen.martin@feve.com');
    setLoginName('');
    setLoginCompany('');

    // Reload to reset widget
    window.location.reload();
  };

  // Refresh behavior data from widget
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

  const viewBehaviorData = () => {
    refreshBehaviorData();
    setShowDebug(!showDebug);
  };

  // Playbook testing functions - simulate user behavior
  const simulatePricingVisit = () => {
    window.history.pushState({}, '', '/pricing');
    setTimeout(() => {
      refreshBehaviorData();
      setTimeout(() => {
        window.history.pushState({}, '', '/');
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
    }, 200);
  };

  const simulateDashboardTime = () => {
    window.history.pushState({}, '', '/dashboard');
    const event = new Event('popstate');
    window.dispatchEvent(event);
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
        <title>Demo SaaS App - HappyLead Integration</title>
        <meta
          name="description"
          content="Realistic demo environment showing HappyLead widget integration"
        />
        {/* HappyLead Widget - Production Snippet */}
        <script data-account-id="8c175179-8972-415e-a07f-1614786e558c">
          {`!function(){if(window.HappyLeadWidget?.initialized)return;var u=window.currentUser||window.user||(window.analytics?.user?.())||(window.Intercom?.user)||null;window.HappyLeadConfig={accountId:"8c175179-8972-415e-a07f-1614786e558c",user:u?.email?{email:u.email,name:u.name||u.full_name||(u.firstName&&u.lastName?u.firstName+" "+u.lastName:"")||"",company:u.company||u.companyName||""}:null};var s=document.createElement("script");s.src="https://app.gethappylead.com/widget.js?v="+Date.now();s.async=1;s.setAttribute("data-account-id","8c175179-8972-415e-a07f-1614786e558c");document.head.appendChild(s)}();`}
        </script>
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
                  <span className="text-green-600">✓ Logged In: {loginName || loginEmail}</span>
                ) : (
                  <span className="text-muted-foreground">Anonymous Visitor</span>
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
                    Login
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Login to Demo App</DialogTitle>
                    <DialogDescription>
                      Simulate logging in as a user. HappyLead will auto-detect the login.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="user@company.com"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try: allen.martin@feve.com (exists in Salesforce)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company">Company (Optional)</Label>
                      <Input
                        id="company"
                        value={loginCompany}
                        onChange={(e) => setLoginCompany(e.target.value)}
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                      <strong>What happens:</strong>
                      <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
                        <li>Sets window.currentUser (simulating your app's login)</li>
                        <li>Saves to localStorage (persists across page refreshes)</li>
                        <li>Page reloads so HappyLead can detect the user</li>
                        <li>Widget automatically enriches with Salesforce data</li>
                        <li>Playbooks evaluate and fire based on rules</li>
                      </ul>
                    </div>
                  </div>

                  <Button onClick={simulateLogin} disabled={!loginEmail}>
                    Login
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Behavior Simulator */}
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
                Simulate User Behavior
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                🎯 VISITOR ACTIONS
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
                  <span>Spend Time on Dashboard</span>
                  <span className="text-xs text-muted-foreground">
                    Current: {dashboardTime}s
                  </span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                🔧 DEBUGGING
              </DropdownMenuLabel>

              <DropdownMenuItem onClick={viewBehaviorData}>
                <Eye className="mr-2 h-4 w-4" />
                View Widget Data
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
              <h3 className="font-semibold">HappyLead Widget Data</h3>
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
                <div className="mb-1 font-medium text-muted-foreground">Salesforce Data:</div>
                <pre className="rounded bg-muted p-2 text-xs overflow-x-auto">
                  {JSON.stringify({
                    company: behaviorData.sf_company || 'Not enriched',
                    industry: behaviorData.sf_industry || 'Not enriched',
                    employees: behaviorData.sf_employees || 'Not enriched'
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <div className="mb-1 font-medium text-muted-foreground">Session Start:</div>
                <span className="text-muted-foreground">
                  {new Date(behaviorData.sessionStart).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs">
              <strong>Console Commands:</strong>
              <div className="mt-2 space-y-1 font-mono">
                <div>• HappyLead.isUserIdentified()</div>
                <div>• HappyLead.getBehaviorData()</div>
                <div>• window.currentUser</div>
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