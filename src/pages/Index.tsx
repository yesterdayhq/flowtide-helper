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
import { MessageCircle, Wrench, Sparkles, AlertTriangle, Search, DollarSign, Star, Activity, Eye } from 'lucide-react';

const Index = () => {
  const triggerFlow = (flowName: string, context?: any) => {
    if ((window as any).HappyLead) {
      (window as any).HappyLead.trigger(flowName, context);
      console.log(`[Flowtide] Triggered: ${flowName}`, context);
    } else {
      alert('HappyLead widget not loaded yet!');
    }
  };

  const trackEvent = (eventName: string, properties?: any) => {
    if ((window as any).HappyLead) {
      (window as any).HappyLead.track(eventName, properties);
      console.log(`[Flowtide] Tracked: ${eventName}`, properties);
    }
  };

  const viewBehaviorData = () => {
    if ((window as any).HappyLead) {
      console.log('[Flowtide] Behavior Data:', (window as any).HappyLead.getBehaviorData());
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
      </Helmet>
      <Layout>
        {/* Test Triggers Dropdown */}
        <div className="mb-4 flex justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Test HappyLead Triggers
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Trigger Flows</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => triggerFlow('stuck', { page: '/checkout', timeOnPage: 45 })}>
                <Wrench className="mr-2 h-4 w-4" />
                Stuck on Pricing
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => triggerFlow('aha', { milestone: 'first_integration', value: 'Salesforce' })}>
                <Sparkles className="mr-2 h-4 w-4" />
                Aha Moment
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => triggerFlow('wrong_deployment', { type: 'serverless', useCase: 'recommendation_system' })}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Wrong Deployment
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => triggerFlow('first_query', { queryCount: 1, vectorCount: 10000 })}>
                <Search className="mr-2 h-4 w-4" />
                First Query
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => triggerFlow('spend_alert', { amount: 500, period: '2_days' })}>
                <DollarSign className="mr-2 h-4 w-4" />
                High Spend Alert
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => triggerFlow('high_value_signup', { company: 'Nike', employeeCount: 75000 })}>
                <Star className="mr-2 h-4 w-4" />
                High-Value Signup
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Testing Tools</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => trackEvent('clicked_pricing', { plan: 'enterprise' })}>
                <Activity className="mr-2 h-4 w-4" />
                Track Custom Event
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={viewBehaviorData}>
                <Eye className="mr-2 h-4 w-4" />
                View Behavior Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <DemoBuilder />
      </Layout>
    </>
  );
};

export default Index;