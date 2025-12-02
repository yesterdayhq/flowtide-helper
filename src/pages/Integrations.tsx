import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { IntegrationCard } from '@/components/Integrations/IntegrationCard';
import { useApp } from '@/context/AppContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Integrations = () => {
  const {
    integrations,
    connectIntegration,
    integrationError,
    clearIntegrationError,
    triggerError,
  } = useApp();

  // Trigger HappyLead on integration error
  useEffect(() => {
    if (integrationError) {
      const integration = integrations.find((i) => i.id === integrationError.id);
      if (integration) {
        triggerError('integration', integration.name);
      }
    }
  }, [integrationError, integrations, triggerError]);

  return (
    <>
      <Helmet>
        <title>Integrations - Flowtide</title>
        <meta
          name="description"
          content="Connect Flowtide with your favorite tools like HubSpot, Salesforce, and Google Analytics."
        />
      </Helmet>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Puzzle className="h-6 w-6" />
              </div>
              <h1 className="font-display text-3xl font-bold">Integrations</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Connect Flowtide with your favorite tools to sync demo engagement
              data, track views, and measure performance.
            </motion.p>
          </div>

          {/* Error alert */}
          {integrationError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Failed</AlertTitle>
                <AlertDescription>
                  {integrationError.message}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Integration cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <IntegrationCard
                  integration={integration}
                  onConnect={() => {
                    clearIntegrationError();
                    connectIntegration(integration.id);
                  }}
                />
              </motion.div>
            ))}
          </div>

          {/* Coming soon section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-dashed bg-muted/30 p-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              More integrations coming soon — including Slack, Zapier, and custom webhooks.
            </p>
          </motion.div>
        </div>
      </Layout>
    </>
  );
};

export default Integrations;
