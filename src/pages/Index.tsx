import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { DemoBuilder } from '@/components/DemoBuilder/DemoBuilder';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

const Index = () => {
  // Test function to open HappyLead
  const testHappyLead = () => {
    if ((window as any).HappyLead) {
      (window as any).HappyLead.open();
    } else {
      alert('HappyLead widget not loaded yet!');
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
        {/* Test Button */}
        <div className="mb-4 flex justify-end">
          <Button 
            onClick={testHappyLead}
            variant="outline"
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Test HappyLead Widget
          </Button>
        </div>
        
        <DemoBuilder />
      </Layout>
    </>
  );
};

export default Index;