import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DemoPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoPreview({ isOpen, onClose }: DemoPreviewProps) {
  const { demo } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  if (!demo || demo.steps.length === 0) return null;

  const step = demo.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === demo.steps.length - 1;

  const goNext = () => {
    if (!isLast) setCurrentStep((prev) => prev + 1);
  };

  const goPrev = () => {
    if (!isFirst) setCurrentStep((prev) => prev - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Demo Preview</DialogTitle>
        </DialogHeader>

        {/* Image area */}
        <div className="relative aspect-video bg-muted">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              {step.imageUrl ? (
                <img
                  src={step.imageUrl}
                  alt={`Step ${currentStep + 1}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No image for this step</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <Button
            variant="secondary"
            size="icon"
            onClick={goPrev}
            disabled={isFirst}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={goNext}
            disabled={isLast}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Close button */}
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Step counter */}
          <div className="absolute left-4 top-4 rounded-full bg-foreground/80 px-3 py-1 text-sm font-medium text-background">
            {currentStep + 1} / {demo.steps.length}
          </div>
        </div>

        {/* Annotation and navigation */}
        <div className="border-t bg-card p-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 min-h-[3rem] text-center text-lg"
            >
              {step.annotation || (
                <span className="text-muted-foreground">No annotation</span>
              )}
            </motion.p>
          </AnimatePresence>

          {/* Dots navigation */}
          <div className="flex items-center justify-center gap-2">
            {demo.steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className="group p-1"
              >
                <Circle
                  className={`h-2.5 w-2.5 transition-all ${
                    index === currentStep
                      ? 'fill-primary text-primary'
                      : 'fill-muted text-muted group-hover:fill-muted-foreground group-hover:text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
