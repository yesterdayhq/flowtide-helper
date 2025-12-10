import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function StuckDetection() {
  const { demo, triggerStuck } = useApp();

  // Scenario 1: Inactivity tracking
  const scenario1TimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstUploadTimeRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);

  // Scenario 2: Behavior tracking
  const annotationEditsRef = useRef<Record<string, { count: number; timestamps: number[] }>>({});
  const previewCountRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  const imageDeletesRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  const scenario2TriggeredRef = useRef(false);
  const scenario2TimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track previous step count to detect deletions
  const previousStepCountRef = useRef(demo?.steps.length || 0);
  const previousAnnotationsRef = useRef<Record<string, string>>({});

  // Helper: Check if activity meets Scenario 1 exemption criteria
  const meetsExemptionCriteria = () => {
    if (!demo) return false;
    const imageCount = demo.steps.length;
    const annotationCount = demo.steps.filter(step => step.annotation && step.annotation.trim().length > 0).length;
    return imageCount >= 3 || annotationCount >= 2;
  };

  // Helper: Clean up old timestamps (outside 1-minute window)
  const cleanupOldTimestamps = (timestamps: number[], windowMs: number = 60000) => {
    const now = Date.now();
    return timestamps.filter(ts => now - ts < windowMs);
  };

  // Helper: Trigger stuck message
  const triggerStuckMessage = () => {
    if (hasTriggeredRef.current || scenario2TriggeredRef.current) return;
    hasTriggeredRef.current = true;
    scenario2TriggeredRef.current = true;
    
    const stepId = demo?.steps[0]?.id || 'general-stuck';
    triggerStuck(stepId);
  };

  // Reset Scenario 1 timer (30 seconds of inactivity)
  const resetScenario1Timer = () => {
    if (hasTriggeredRef.current || meetsExemptionCriteria()) {
      if (scenario1TimerRef.current) {
        clearTimeout(scenario1TimerRef.current);
        scenario1TimerRef.current = null;
      }
      return;
    }

    if (scenario1TimerRef.current) {
      clearTimeout(scenario1TimerRef.current);
    }

    scenario1TimerRef.current = setTimeout(() => {
      if (!hasTriggeredRef.current && !meetsExemptionCriteria()) {
        triggerStuckMessage();
      }
    }, 30000);
  };

  // Track first upload for Scenario 1 initial timer
  useEffect(() => {
    if (!demo || hasTriggeredRef.current) return;

    const imageCount = demo.steps.length;

    if (imageCount === 1 && firstUploadTimeRef.current === null) {
      firstUploadTimeRef.current = Date.now();
      
      scenario1TimerRef.current = setTimeout(() => {
        if (!hasTriggeredRef.current && !meetsExemptionCriteria()) {
          triggerStuckMessage();
        }
      }, 60000);
    }

    if (imageCount > 0 && firstUploadTimeRef.current !== null) {
      resetScenario1Timer();
    }

    return () => {
      if (scenario1TimerRef.current) {
        clearTimeout(scenario1TimerRef.current);
      }
    };
  }, [demo?.steps.length, demo?.steps]);

  // Scenario 2: Track preview opens
  const trackPreviewOpen = () => {
    if (scenario2TriggeredRef.current) return;

    const now = Date.now();
    previewCountRef.current.timestamps.push(now);
    previewCountRef.current.timestamps = cleanupOldTimestamps(previewCountRef.current.timestamps);
    previewCountRef.current.count = previewCountRef.current.timestamps.length;

    if (previewCountRef.current.count >= 3) {
      if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
      scenario2TimeoutRef.current = setTimeout(() => {
        triggerStuckMessage();
      }, 10000);
    }
  };

  // Scenario 2: Track image deletions/replacements
  useEffect(() => {
    if (!demo || scenario2TriggeredRef.current) return;

    const currentStepCount = demo.steps.length;
    
    if (currentStepCount < previousStepCountRef.current) {
      const now = Date.now();
      imageDeletesRef.current.timestamps.push(now);
      imageDeletesRef.current.timestamps = cleanupOldTimestamps(imageDeletesRef.current.timestamps);
      imageDeletesRef.current.count = imageDeletesRef.current.timestamps.length;

      if (imageDeletesRef.current.count >= 3) {
        if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
        scenario2TimeoutRef.current = setTimeout(() => {
          triggerStuckMessage();
        }, 10000);
      }
    }

    previousStepCountRef.current = currentStepCount;
  }, [demo?.steps.length]);

  // Expose preview tracking function globally
  useEffect(() => {
    (window as any).__trackPreviewOpen = trackPreviewOpen;
    return () => {
      delete (window as any).__trackPreviewOpen;
    };
  }, []);

  // Track annotation edits
  useEffect(() => {
    if (!demo || scenario2TriggeredRef.current) return;

    demo.steps.forEach(step => {
      const stepId = step.id;
      const currentAnnotation = step.annotation || '';
      const previousAnnotation = previousAnnotationsRef.current[stepId] || '';

      if (currentAnnotation !== previousAnnotation && previousAnnotation.length > 0 && currentAnnotation.length > 0) {
        const now = Date.now();
        
        if (!annotationEditsRef.current[stepId]) {
          annotationEditsRef.current[stepId] = { count: 0, timestamps: [] };
        }

        annotationEditsRef.current[stepId].timestamps.push(now);
        annotationEditsRef.current[stepId].timestamps = cleanupOldTimestamps(
          annotationEditsRef.current[stepId].timestamps
        );
        annotationEditsRef.current[stepId].count = annotationEditsRef.current[stepId].timestamps.length;

        if (annotationEditsRef.current[stepId].count >= 3) {
          if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
          scenario2TimeoutRef.current = setTimeout(() => {
            triggerStuckMessage();
          }, 10000);
        }
      }

      previousAnnotationsRef.current[stepId] = currentAnnotation;
    });
  }, [demo?.steps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scenario1TimerRef.current) clearTimeout(scenario1TimerRef.current);
      if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
    };
  }, []);

  return null;
}
