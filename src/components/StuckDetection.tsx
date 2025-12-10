import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function StuckDetection() {
  const { demo, triggerStuck } = useApp();

  // Scenario 1: Inactivity tracking
  const scenario1TimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstUploadTimeRef = useRef<number | null>(null);
  const hasTriggeredScenario1Ref = useRef(false);

  // Scenario 2: Behavior tracking
  const annotationEditsRef = useRef<Record<string, { count: number; timestamps: number[] }>>({});
  const previewCountRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  const imageDeletesRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  
  // NEW: Track which behavior types have been triggered in this session
  const triggeredBehaviorsRef = useRef<Set<'annotation' | 'preview' | 'delete'>>(new Set());
  const scenario2TimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track previous step count to detect deletions
  const previousStepCountRef = useRef(demo?.steps.length || 0);
  const previousAnnotationsRef = useRef<Record<string, string>>({});

  console.log('🔍 StuckDetection mounted - triggered behaviors:', Array.from(triggeredBehaviorsRef.current));

  // Helper: Check if activity meets Scenario 1 exemption criteria
  const meetsExemptionCriteria = () => {
    if (!demo) return false;
    const imageCount = demo.steps.length;
    const annotationCount = demo.steps.filter(step => step.annotation && step.annotation.trim().length > 0).length;
    // Must have 3+ images AND each image must have an annotation
    return imageCount >= 3 && imageCount === annotationCount;
  };

  // Helper: Clean up old timestamps (outside 1-minute window)
  const cleanupOldTimestamps = (timestamps: number[], windowMs: number = 60000) => {
    const now = Date.now();
    return timestamps.filter(ts => now - ts < windowMs);
  };

  // Helper: Check if any behavior has already been triggered
  const hasAnyBehaviorTriggered = () => {
    return triggeredBehaviorsRef.current.size > 0;
  };

  // Helper: Trigger stuck message for Scenario 2
  const triggerScenario2Message = (behaviorType: 'annotation' | 'preview' | 'delete') => {
    console.log('🚨 triggerScenario2Message called for:', behaviorType);
    
    // Check if this specific behavior OR any behavior has already triggered
    if (triggeredBehaviorsRef.current.has(behaviorType) || hasAnyBehaviorTriggered()) {
      console.log('❌ Already triggered (this or another behavior), skipping');
      return;
    }
    
    triggeredBehaviorsRef.current.add(behaviorType);
    console.log('✅ Setting triggered for:', behaviorType, '- all triggered:', Array.from(triggeredBehaviorsRef.current));
    
    const stepId = demo?.steps[0]?.id || 'general-stuck-scenario2';
    console.log('📞 Calling triggerStuck with stepId:', stepId);
    triggerStuck(stepId);
  };

  // Reset Scenario 1 timer (resets to 60 seconds on activity)
  const resetScenario1Timer = () => {
    // Don't reset if already triggered or if exemption criteria met
    if (hasTriggeredScenario1Ref.current || meetsExemptionCriteria()) {
      if (scenario1TimerRef.current) {
        clearTimeout(scenario1TimerRef.current);
        scenario1TimerRef.current = null;
      }
      return;
    }

    // Clear existing timer
    if (scenario1TimerRef.current) {
      clearTimeout(scenario1TimerRef.current);
    }

    // Set new 60-second timer
    scenario1TimerRef.current = setTimeout(() => {
      if (!hasTriggeredScenario1Ref.current && !meetsExemptionCriteria()) {
        hasTriggeredScenario1Ref.current = true;
        const stepId = demo?.steps[0]?.id || 'general-stuck-scenario1';
        triggerStuck(stepId);
      }
    }, 60000);
  };

  // Track first upload and activity for Scenario 1
  useEffect(() => {
    if (!demo || hasTriggeredScenario1Ref.current) return;

    const imageCount = demo.steps.length;

    // When first image is uploaded, start the initial timer
    if (imageCount === 1 && firstUploadTimeRef.current === null) {
      firstUploadTimeRef.current = Date.now();
      resetScenario1Timer();
    }

    // On any subsequent activity (more images or annotations), reset the timer
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
    console.log('👁️ trackPreviewOpen called - any behavior triggered:', hasAnyBehaviorTriggered());
    
    // Stop tracking if any behavior has already triggered
    if (hasAnyBehaviorTriggered()) {
      console.log('❌ A behavior already triggered, ignoring preview tracking');
      return;
    }

    const now = Date.now();
    previewCountRef.current.timestamps.push(now);
    previewCountRef.current.timestamps = cleanupOldTimestamps(previewCountRef.current.timestamps);
    previewCountRef.current.count = previewCountRef.current.timestamps.length;

    console.log('👁️ Preview tracked:', previewCountRef.current.count, 'times in last 60s');

    if (previewCountRef.current.count >= 3) {
      console.log('🎯 Preview threshold reached (3+), scheduling trigger in 10s');
      
      if (scenario2TimeoutRef.current) {
        console.log('🧹 Clearing existing timeout');
        clearTimeout(scenario2TimeoutRef.current);
      }
      
      scenario2TimeoutRef.current = setTimeout(() => {
        console.log('⏰ 10 seconds elapsed - executing trigger callback');
        triggerScenario2Message('preview');
      }, 10000);
      
      console.log('✅ Timeout scheduled');
    }
  };

  // Scenario 2: Track image deletions/replacements
  useEffect(() => {
    console.log('🗑️ Delete tracking effect - any behavior triggered:', hasAnyBehaviorTriggered());
    
    if (!demo || hasAnyBehaviorTriggered()) return;

    const currentStepCount = demo.steps.length;
    console.log('🗑️ Step count - previous:', previousStepCountRef.current, 'current:', currentStepCount);
    
    if (currentStepCount < previousStepCountRef.current) {
      const now = Date.now();
      imageDeletesRef.current.timestamps.push(now);
      imageDeletesRef.current.timestamps = cleanupOldTimestamps(imageDeletesRef.current.timestamps);
      imageDeletesRef.current.count = imageDeletesRef.current.timestamps.length;

      console.log('🗑️ Image delete tracked:', imageDeletesRef.current.count, 'times in last 60s');

      if (imageDeletesRef.current.count >= 3) {
        console.log('🎯 Delete threshold reached, scheduling trigger in 10s');
        if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
        scenario2TimeoutRef.current = setTimeout(() => {
          console.log('⏰ 10 seconds elapsed from deletes - triggering');
          triggerScenario2Message('delete');
        }, 10000);
      }
    }

    previousStepCountRef.current = currentStepCount;
  }, [demo?.steps.length]);

  // Track annotation interactions (opening, canceling, saving - ANY interaction)
  const trackAnnotationInteraction = (stepId: string) => {
    console.log('✏️ trackAnnotationInteraction called for step:', stepId, 'any triggered:', hasAnyBehaviorTriggered());
    
    // Stop tracking if any behavior has already triggered
    if (hasAnyBehaviorTriggered()) {
      console.log('❌ A behavior already triggered, ignoring annotation tracking');
      return;
    }

    const now = Date.now();
    
    if (!annotationEditsRef.current[stepId]) {
      annotationEditsRef.current[stepId] = { count: 0, timestamps: [] };
    }

    annotationEditsRef.current[stepId].timestamps.push(now);
    annotationEditsRef.current[stepId].timestamps = cleanupOldTimestamps(
      annotationEditsRef.current[stepId].timestamps
    );
    annotationEditsRef.current[stepId].count = annotationEditsRef.current[stepId].timestamps.length;

    console.log(`✏️ Annotation interaction tracked for step ${stepId}:`, annotationEditsRef.current[stepId].count, 'times in last 60s');

    if (annotationEditsRef.current[stepId].count >= 3) {
      console.log('🎯 Annotation interaction threshold reached (3+), scheduling trigger in 10s');
      if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
      scenario2TimeoutRef.current = setTimeout(() => {
        console.log('⏰ 10 seconds elapsed from annotation interactions - triggering');
        triggerScenario2Message('annotation');
      }, 10000);
    }
  };

  // Expose tracking functions globally
  useEffect(() => {
    console.log('🌐 Setting up window.__trackPreviewOpen and window.__trackAnnotationInteraction');
    (window as any).__trackPreviewOpen = trackPreviewOpen;
    (window as any).__trackAnnotationInteraction = trackAnnotationInteraction;
    return () => {
      console.log('🌐 Cleaning up tracking functions');
      delete (window as any).__trackPreviewOpen;
      delete (window as any).__trackAnnotationInteraction;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scenario1TimerRef.current) clearTimeout(scenario1TimerRef.current);
      if (scenario2TimeoutRef.current) clearTimeout(scenario2TimeoutRef.current);
    };
  }, []);

  return null;
}
