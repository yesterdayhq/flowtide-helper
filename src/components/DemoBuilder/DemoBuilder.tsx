import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Rocket, Sparkles, Share2, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { StepCard } from './StepCard';
import { DemoPreview } from './DemoPreview';
import { ShareDialog } from './ShareDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DemoBuilder() {
  const {
    demo,
    setDemo,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    publishDemo,
  } = useApp();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && demo) {
      const oldIndex = demo.steps.findIndex((step) => step.id === active.id);
      const newIndex = demo.steps.findIndex((step) => step.id === over.id);
      const newSteps = arrayMove(demo.steps, oldIndex, newIndex);
      reorderSteps(newSteps);
    }
  };

  const handleAddStep = () => {
    addStep(null, '');
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    // Simulate publishing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    publishDemo();
    setIsPublishing(false)
  };

  const handlePreviewClick = () => {
    // Track preview open for stuck detection
    if ((window as any).__trackPreviewOpen) {
      (window as any).__trackPreviewOpen();
    }
    setIsPreviewOpen(true);
  };

  if (!demo) return null;

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Input
              value={demo.title}
              onChange={(e) =>
                setDemo((prev) =>
                  prev ? { ...prev, title: e.target.value } : prev
                )
              }
              className="h-auto border-0 bg-transparent p-0 font-display text-3xl font-bold focus-visible:ring-0"
              placeholder="Demo title..."
            />
            <p className="text-sm text-muted-foreground">
              {demo.steps.length} step{demo.steps.length !== 1 && 's'} •{' '}
              {demo.isPublished ? (
                <span className="text-success">Published</span>
              ) : (
                'Draft'
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreviewClick}
              disabled={demo.steps.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Preview
            </Button>
            {demo.isPublished && (
              <Button
                variant="outline"
                onClick={() => setIsShareOpen(true)}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            <Button
              variant="premium"
              onClick={handlePublish}
              disabled={demo.steps.length === 0 || isPublishing || demo.isPublished}
              className="gap-2"
            >
              {isPublishing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : demo.isPublished ? (
                <>
                  <Check className="h-4 w-4" />
                  Published
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Publish Demo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Steps grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={demo.steps.map((s) => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {demo.steps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    onUpdate={(updates) => updateStep(step.id, updates)}
                    onRemove={() => removeStep(step.id)}
                  />
                ))}
              </AnimatePresence>

              {/* Add step card */}
              <motion.button
                layout
                onClick={handleAddStep}
                className="group flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 transition-all hover:border-primary hover:bg-primary/5"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="rounded-full bg-muted p-3 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                  Add Step
                </span>
              </motion.button>
            </div>
          </SortableContext>
        </DndContext>

        {/* Empty state */}
        {demo.steps.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md text-center"
          >
            <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-display text-xl font-semibold">
              Create your first demo
            </h3>
            <p className="mb-6 text-muted-foreground">
              Add steps to build an interactive product walkthrough. Upload
              screenshots, add annotations, and more, to guide your viewers.
            </p>
            <Button onClick={handleAddStep} className="gap-2">
              <Plus className="h-4 w-4" />
              Add your first step
            </Button>
          </motion.div>
        )}
      </div>

      {/* Preview modal */}
      <DemoPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Share dialog */}
      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        demoId={demo.id}
        demoTitle={demo.title}
      />
    </>
  );
}
