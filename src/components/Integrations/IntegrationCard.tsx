import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { Integration } from '@/types/demo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

interface IntegrationCardProps {
  integration: Integration;
  onConnect: () => void | Promise<void>;
}

const iconMap: Record<string, React.ReactNode> = {
  hubspot: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      {/* SVG path omitted */}
    </svg>
  ),
  salesforce: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      {/* SVG path omitted */}
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      {/* SVG path omitted */}
    </svg>
  ),
};

export function IntegrationCard({ integration, onConnect }: IntegrationCardProps) {
  const { userSession, updateUserSession } = useApp();

  const isConnecting = integration.status === 'connecting';
  const isError = integration.status === 'error';
  const isConnected = integration.status === 'connected';

  // -------------------------------------------------------------------
  // When the integration successfully connects after an error,
  // mark the error thread as resolved and tell ChatWidget not to reply.
  // -------------------------------------------------------------------
  useEffect(() => {
    const active = userSession.activeThread;

    if (isConnected && active?.type === 'error') {
      updateUserSession({
        activeThread: {
          ...active,
          resolved: true,
          skipNextReply: true,
          awaitingResponse: false
        }
      });
    }
  }, [isConnected, userSession.activeThread, updateUserSession]);

  // -------------------------------------------------------------------
  // Main connect handler (handles both success + error)
  // -------------------------------------------------------------------
  const handleConnect = async () => {
    await onConnect();

    const active = userSession.activeThread;

    // If integration is in error state after connect, create error thread
    if (integration.status === 'error') {
      updateUserSession({
        activeThread: {
          id: `error-${Date.now()}`,
          type: 'error',
          integration: integration.icon,
          resolved: false,
          awaitingResponse: true,
          skipNextReply: false,
          followUpSent: false
        }
      });
      return;
    }

    // -----------------------------
    // CASE 2 — CONNECT SUCCESS
    // -----------------------------
    if (active?.type === 'error' && active.integration === integration.icon) {
      updateUserSession({
        activeThread: {
          ...active,
          resolved: true,
          awaitingResponse: false,
          skipNextReply: true
        }
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-6 shadow-card transition-all duration-200',
        isError && 'border-destructive/50 bg-destructive/5',
        isConnected && 'border-success/50 bg-success/5',
        !isError && !isConnected && 'hover:shadow-elevated hover:border-primary/30'
      )}
    >
      {isError && (
        <div className="absolute right-4 top-4">
          <div className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            <AlertCircle className="h-3 w-3" />
            Error
          </div>
        </div>
      )}

      {isConnected && (
        <div className="absolute right-4 top-4">
          <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <Check className="h-3 w-3" />
            Connected
          </div>
        </div>
      )}

      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {iconMap[integration.icon]}
      </div>

      <h3 className="mb-2 font-display text-lg font-semibold">{integration.name}</h3>
      <p className="mb-6 text-sm text-muted-foreground">{integration.description}</p>

      <Button
        variant={
          isError
            ? 'destructive'
            : isConnected
            ? 'success'
            : 'default'
        }
        onClick={handleConnect}
        disabled={isConnecting || isConnected}
        className="w-full gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : isError ? (
          'Try Again'
        ) : isConnected ? (
          <>
            <Check className="h-4 w-4" />
            Connected
          </>
        ) : (
          'Connect'
        )}
      </Button>
    </motion.div>
  );
}
