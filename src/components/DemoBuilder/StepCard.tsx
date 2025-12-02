import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, X, Upload, Image, Edit3, Check } from 'lucide-react';
import { DemoStep } from '@/types/demo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

interface StepCardProps {
  step: DemoStep;
  onUpdate: (updates: Partial<DemoStep>) => void;
  onRemove: () => void;
}

export function StepCard({ step, onUpdate, onRemove }: StepCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [annotation, setAnnotation] = useState(step.annotation);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerError, triggerStuck } = useApp();
  
  // Stuck detection state
  const [dwellStart, setDwellStart] = useState<Date | null>(null);
  const [hasMouseMoved, setHasMouseMoved] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const hasTriggeredStuck = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Stuck detection - reset when step changes or image is added
  useEffect(() => {
    if (!step.imageUrl && !step.annotation) {
      setDwellStart(new Date());
      setHasMouseMoved(false);
      setClickCount(0);
      hasTriggeredStuck.current = false;
    }
  }, [step.id, step.imageUrl, step.annotation]);

  // Track clicks on this card for rage click detection
  const handleCardClick = () => {
    if (hasTriggeredStuck.current) return;
    
    setClickCount(prev => {
      const newCount = prev + 1;
      // Rage clicks - 6+ clicks while card is empty
      if (newCount >= 6 && !step.imageUrl) {
        hasTriggeredStuck.current = true;
        triggerStuck(step.id);
      }
      return newCount;
    });
  };

  // Track mouse movement for dwell detection
  const handleMouseMove = () => {
    if (!hasMouseMoved) {
      setHasMouseMoved(true);
    }
    
    // Check dwell time (20+ seconds with mouse movement on empty card)
    if (dwellStart && !hasTriggeredStuck.current && !step.imageUrl) {
      const dwellTime = new Date().getTime() - dwellStart.getTime();
      if (dwellTime > 20000 && hasMouseMoved) {
        hasTriggeredStuck.current = true;
        triggerStuck(step.id);
      }
    }
  };

  const handleImageUpload = (file: File) => {
    // Simulate occasional upload failure for demo
    if (Math.random() < 0.15) {
      triggerError('upload', file.name);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdate({ imageUrl: e.target?.result as string });
      // Reset stuck detection on successful upload
      hasTriggeredStuck.current = false;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const saveAnnotation = () => {
    onUpdate({ annotation });
    setIsEditing(false);
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200',
        isDragging && 'z-50 scale-105 shadow-elevated rotate-1',
        !isDragging && 'hover:shadow-elevated hover:border-primary/30'
      )}
    >
      {/* Step number badge */}
      <div className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
        {step.order}
      </div>

      {/* Remove button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="h-4 w-4" />
      </motion.button>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1/2 top-3 z-10 -translate-x-1/2 cursor-grab rounded-md bg-background/90 p-1 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Image area */}
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden border-b border-border bg-muted/50 transition-colors',
          isDragOver && 'bg-primary/10 border-primary'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <AnimatePresence mode="wait">
          {step.imageUrl ? (
            <motion.img
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={step.imageUrl}
              alt={`Step ${step.order}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full w-full flex-col items-center justify-center gap-3 p-6"
            >
              <div className="rounded-full bg-muted p-4">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Drag & drop an image or{' '}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  browse
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {step.imageUrl && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
            initial={false}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Replace
            </Button>
          </motion.div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Annotation area */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <Textarea
              value={annotation}
              onChange={(e) => setAnnotation(e.target.value)}
              placeholder="Add annotation for this step..."
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAnnotation(step.annotation);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={saveAnnotation} className="gap-1">
                <Check className="h-3 w-3" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="group/edit flex w-full items-start gap-2 text-left"
          >
            {step.annotation ? (
              <p className="flex-1 text-sm leading-relaxed text-foreground">
                {step.annotation}
              </p>
            ) : (
              <p className="flex-1 text-sm italic text-muted-foreground">
                Click to add annotation...
              </p>
            )}
            <Edit3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
