import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { DemoBuilder } from '@/components/DemoBuilder/DemoBuilder';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, Activity, Eye, Clock, MousePointer, LogOut, RotateCcw, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';

const Index = () => {
  const [behaviorData, setBehaviorData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [pricingVisits, setPricingVisits] = useState(0);
  const [dashboardTime, setDashboardTime] = useState(0);

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
    // Navigate to pricing page
    window.history.pushState({}, '', '/pricing');

    // Give widget time to track the page view
    setTimeout(() => {
      refreshBehaviorData();
      const data = (window as any).HappyLead?.getBehaviorData();
      const count = data?.pageViews?.['/pricing'] || 0;
      console.log(`[Flowtide] Pricing page visited. Total visits: ${count}`);

      // Navigate back to home after a brief moment
      setTimeout(() => {
        window.history.pushState({}, '', '/');
        console.log('[Flowtide] Returned to home page');
      }, 500);
    }, 100);
  };

  const simulateCheckoutExit = () => {
    // Navigate to checkout page first
    window.history.pushState({}, '', '/checkout');

    // Wait a moment, then trigger exit intent
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
    // Navigate to dashboard and stay there
    window.history.pushState({}, '', '/dashboard');

    // Trigger page view tracking
    const event = new Event('popstate');
    window.dispatchEvent(event);

    console.log('[Flowtide] Navigated to dashboard - time tracking started');
    refreshBehaviorData();
  };

  const resetBehavior = () => {
    if (confirm('Reset all behavior data? This will clear page visits, time tracking, and exit intent data.')) {
      // Clear HappyLead data
      if ((window as any).HappyLead) {
        const data = (window as any).HappyLead.getBehaviorData();
        if (data) {
          data.pageViews = {};
          data.timeOnPage = {};
          data.exitIntentDetected = false;
          data.sessionStart = Date.now();
        }
      }

      // Clear any localStorage related to HappyLead
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('happylead_') || key.startsWith('hl_')) {
          localStorage.removeItem(key);
        }
      });

      // Reset UI state
      setPricingVisits(0);
      setDashboardTime(0);
      refreshBehaviorData();

      // Navigate back to home
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
        <title>Flowtide - Create Interactive Product Demos</title>
        <meta
          name="description"
          content="Build beautiful, interactive product demos in minutes. Record screens, add annotations, and share with your team."
        />
        <style>{`
          /* Hide Lovable edit button */
          [data-lovable-edit-button],
          .lovable-edit-button,
          a[href*="lovable.dev"] {
            display: none !important;
          }
        `}</style>
      </Helmet>
      <Layout>
        {/* Test Triggers Dropdown */}
        <div className="mb-4 flex justify-end gap-2">
          {/* Quick Reset Button */}
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