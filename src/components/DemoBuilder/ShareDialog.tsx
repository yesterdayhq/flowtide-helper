import { useState } from 'react';
import { Check, Copy, Link, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  demoId: string;
  demoTitle: string;
}

export function ShareDialog({ isOpen, onClose, demoId, demoTitle }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `https://demo.flowtide.app/${demoId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Link className="h-5 w-5 text-primary" />
            Share your demo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Anyone with this link can view "{demoTitle}"
          </p>
          
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              onClick={handleCopy}
              variant={copied ? 'success' : 'default'}
              className="shrink-0 gap-2"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
