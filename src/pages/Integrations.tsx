import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { AlertCircle, Puzzle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { IntegrationCard } from '@/components/Integrations/IntegrationCard';
import { useApp } from '@/context/AppContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// -------------------------------
// Session tracking for Lee messages
// -------------------------------
const integrationsMessagedThisSession = new Set();

// Integration statuses
const integrationStatus: Record<string, 'retryable' | 'neverWorks'> = {
  hubspot: 'retryable',
  googleAnalytics: 'retryable',
  salesforce: 'neverWorks',
};

// Helper to send delayed Lee messages
function sendLeeMessage(message: string, delay = 1000) {
  setTimeout(() => {
    Lee.sendMessage(message); // Lovable API
  }, delay);
}

// Lee flow for integration errors
function triggerIntegrationFlow(integrationName: string) {
  const nameLower = integrationName.toLowerCase();
  const alreadyMessaged = integrationsMessagedThisSession.has(nameLower);

  // Salesforce never works
  if (nameLower === 'salesforce') {
    if (alreadyMessaged) return 'neverWorks'; // Don't repeat messages

    const otherIntegrationDone = [...integrationsMessagedThisSession].some(
      name => name !== 'salesforce'
    );

    if (otherIntegrationDone) {
      // Short intro if another integration already messaged
      sendLeeMessage(
        "Hi, Alex, Lee again, we noticed you also ran into an issue with your Salesforce connection."
      );
      sendLeeMessage(
        "Our team is on it and working on a fix. You don’t need to do anything right now.\nWe’ll update you once it’s resolved. Sorry for the hassle!",
        2000
      );
    } else {
      // Full intro if no other integrations messaged yet
      sendLeeMessage(
        "Hi, Alex, I'm Lee, with Flowtide - we noticed an issue with your Salesforce connection."
      );
      sendLeeMessage(
        "Our team is on it and working on a fix. You don’t need to do anything right now.\nWe’ll update you once it’s resolved. Sorry for the hassle!",
        2000
      );
    }

    integrationsMessagedThisSession.add('salesforce');

    // Prevent connection logic from running — Salesforce never connects
    return 'neverWorks';
  }

  // Retryable integrations (Hubspot, GA)
  if (!alreadyMessaged) {
    sendLeeMessage(
      `Connection failed. OAuth connection failed for ${integrationName}. Please try again.`
    );
    integrationsMessagedThisSession.add(nameLower);
  } else {
    console.log(`${integrationName} connected successfully on retry.`);
  }
}

// -------------------------------
// Integrations Component
// -------------------------------
const Integrations = () => {
  const {
    integrations,
    connectIntegration,
    integrationError,
    clearIntegrationError,
    triggerError,
  } = useApp();

  // Trigger Lee flow after a small delay for human-like timing
  useEffect(() => {
    if (integrationError) {
      const integration = integrations.find(i => i.id === integrationError.id);
      if (integration) {
        triggerError('integration', integration.name);

        // Small delay before Lee starts messaging
        setTimeout(() => {
          triggerIntegrationFlow(integration.name);
        }, 1000); // 1 second delay before first message
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

                    // Trigger Lee flow and prevent Salesforce connection
                    const result = triggerIntegrationFlow(integration.name);
                    if (result !== 'neverWorks') {
                      connectIntegration(integration.id);
                    }
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
