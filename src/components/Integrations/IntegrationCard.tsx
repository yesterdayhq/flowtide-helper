import { motion } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { Integration } from '@/types/demo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IntegrationCardProps {
  integration: Integration;
  onConnect: () => void;
  onUserSolved?: () => void; // NEW: callback for user-solved integration
}

const iconMap: Record<string, React.ReactNode> = {
  hubspot: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .873.52 1.626 1.265 1.984V7.93a5.89 5.89 0 00-3.216 1.62L6.105 4.16a2.46 2.46 0 00.13-.77 2.39 2.39 0 10-2.39 2.39c.423 0 .818-.114 1.16-.31l6.848 5.328a5.89 5.89 0 00-.47 2.316 5.917 5.917 0 005.917 5.917 5.89 5.89 0 002.316-.47l2.387 2.387a1.886 1.886 0 102.648-2.648l-2.387-2.387a5.89 5.89 0 00.47-2.316 5.917 5.917 0 00-4.57-5.767zm-.864 8.687a2.928 2.928 0 110-5.855 2.928 2.928 0 010 5.855z" />
    </svg>
  ),
  salesforce: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M10.006 5.415a4.195 4.195 0 013.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.16 5.22c-.45 0-.87-.06-1.29-.165a3.9 3.9 0 01-3.42 2.025c-.51 0-.99-.105-1.44-.27a4.17 4.17 0 01-3.63 2.13c-1.68 0-3.12-.99-3.78-2.415-.3.06-.6.09-.93.09-2.73 0-4.95-2.25-4.95-5.025 0-2.25 1.44-4.155 3.45-4.785a4.5 4.5 0 01-.15-1.155c0-2.505 2.01-4.545 4.485-4.545a4.46 4.46 0 012.82.996z" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M22.84 10.22c.06.27.09.54.09.83 0 2.34-1.79 4.24-4 4.24s-4-1.9-4-4.24c0-.11 0-.22.01-.33l-2.53-1.47c-.72.65-1.65 1.05-2.67 1.05s-1.95-.4-2.67-1.05l-2.53 1.47c.01.11.01.22.01.33 0 2.34-1.79 4.24-4 4.24S0 13.39 0 11.05c0-2.34 1.79-4.24 4-4.24.67 0 1.31.16 1.87.46l2.84-1.65A4.38 4.38 0 018.5 4.3C8.5 1.93 10.34 0 12.58 0s4.08 1.93 4.08 4.3c0 .47-.08.92-.22 1.34l2.84 1.65c.56-.3 1.2-.46 1.87-.46 2.21 0 4 1.9 4 4.24 0 .29-.03.56-.09.83l-.22-1.68z" />
    </svg>
  ),
};

export function IntegrationCard({ integration, onConnect, onUserSolved }: IntegrationCardProps) {
  const isConnecting = integration.status === 'connecting';
  const isError = integration.status === 'error';
  const isConnected = integration.status === 'connected';

  const handleClick = () => {
    if (isConnecting || isConnected) return;

    onConnect();

    // If the integration becomes connected after this click, mark it as solved
    if (integration.status === 'connected' && onUserSolved) {
      onUserSolved();
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
      {/* Status indicator */}
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
      <p className="mb-6 text-sm text-muted-foreground">
        {integration.description}
      </p>

      <Button
        variant={isError ? 'destructive' : isConnected ? 'success' : 'default'}
        onClick={handleClick}
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
