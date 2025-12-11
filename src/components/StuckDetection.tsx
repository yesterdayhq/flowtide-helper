import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function StuckDetection() {
  const { demo, triggerStuck } = useApp();

  // GLOBAL: Track if ANY stuck flow has been triggered
  const hasTriggeredAnyStuckFlowRef = useRef(false);
  
  // Track if demo was published this session - if so, never trigger stuck detection
  const hasPublishedThisSessionRef = useRef(false);

  // Scenario 1: Inactivity tracking
  const scenario1TimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstUploadTimeRef = useRef<number | null>(null);

  // Scenario 2: Behavior tracking
  const annotationEditsRef = useRef<Record<string, { count: number; timestamps: number[] }>>({});
  const previewCountRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  const imageDeletesRef = useRef<{ count: number; timestamps: number[] }>({ count: 0, timestamps: [] });
  const scenario2TimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track previous step count to detect deletions
  const previousStepCountRef = useRef(demo?.steps.length || 0);

  console.log('🔍 StuckDetection mounted - hasTriggeredAnyStuckFlow:', hasTriggeredAnyStuckFlowRef.current, 'hasPublished:', hasPublishedThisSessionRef.current);

  // Helper: Check if activity meets Scenario 1 exemption criteria
  // This ONLY exempts Scenario 1 (inactivity), NOT Scenario 2 (spam behaviors)
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

  // Helper: Cancel ALL stuck detection timers
  const cancelAllStuckTimers = () => {
    console.log('🛑 Canceling all stuck detection timers');
    
    if (scenario1TimerRef.current) {
      clearTimeout(scenario1TimerRef.current);
      scenario1TimerRef.current = null;
    }
    
    if (scenario2TimeoutRef.current) {
      clearTimeout(scenario2TimeoutRef.current);
      scenario2TimeoutRef.current = null;
    }
  };

  // Track if demo gets published this session - CRITICAL FOR DISABLING STUCK DETECTION
  useEffect(() => {
    if (demo?.isPublished && !hasPublishedThisSessionRef.current) {
      console.log('📢 Demo published this session - DISABLING stuck detection permanently');
      hasPublishedThisSessionRef.current = true;
      
      // Cancel all timers immediately
      cancelAllStuckTimers();
    }
  }, [demo?.isPublished]);

  // Helper: Trigger stuck message (used by both scenarios)
  const triggerStuckMessage = (scenario: 'scenario1' | 'scenario2', behaviorType?: 'annotation' | 'preview' | 'delete') => {
    console.log('🚨 triggerStuckMessage called for:', scenario, behaviorType || '');
    
    // Don't trigger if demo was published this session
    if (hasPublishedThisSessionRef.current) {
      console.log('❌ Demo published this session, skipping stuck detection');
      return;
    }
    
    // Check if any stuck flow has already triggered
    if (hasTriggeredAnyStuckFlowRef.current) {
      console.log('❌ A stuck flow already triggered, skipping');
      return;
    }
    
    // Mark that a stuck flow has been triggered
    hasTriggeredAnyStuckFlowRef.current = true;
    console.log('✅ Setting hasTriggeredAnyStuckFlow to true');
    
    // Cancel all other pending timers
    cancelAllStuckTimers();
    
    const stepId = demo?.steps[0]?.id || `general-stuck-${scenario}`;
    console.log('📞 Calling triggerStuck with stepId:', stepId);
    triggerStuck(stepId);
  };

  // Reset Scenario 1 timer (resets to 60 seconds on activity)
  const resetScenario1Timer = () => {
    console.log('⏲️ resetScenario1Timer called - hasTriggered:', hasTriggeredAnyStuckFlowRef.current, 'hasPublished:', hasPublishedThisSessionRef.current, 'meetsExemption:', meetsExemptionCriteria());
    
    // Don't reset if demo was published, any stuck flow triggered, or if exemption criteria met
    if (hasPublishedThisSessionRef.current || hasTriggeredAnyStuckFlowRef.current || meetsExemptionCriteria()) {
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
      console.log('⏰ Scenario 1 timer elapsed');
      if (!hasPublishedThisSessionRef.current && !hasTriggeredAnyStuckFlowRef.current && !meetsExemptionCriteria()) {
        triggerStuckMessage('scenario1');
      }
    }, 60000);
  };

  // Track first upload and activity for Scenario 1
  useEffect(() => {
    if (!demo || hasTriggeredAnyStuckFlowRef.current || hasPublishedThisSessionRef.current) return;

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
    console.log('👁️ trackPreviewOpen called - hasTriggered:', hasTriggeredAnyStuckFlowRef.current, 'hasPublished:', hasPublishedThisSessionRef.current);
    
    // Stop if a stuck flow has already been triggered OR if demo was published
    if (hasTriggeredAnyStuckFlowRef.current || hasPublishedThisSessionRef.current) {
      console.log('❌ Stuck flow triggered or demo published, ignoring preview tracking');
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
        console.log('🧹 Clearing existing scenario 2 timeout');
        clearTimeout(scenario2TimeoutRef.current);
      }
      
      scenario2TimeoutRef.current = setTimeout(() => {
        console.log('⏰ 10 seconds elapsed - executing preview trigger callback');
        triggerStuckMessage('scenario2', 'preview');
      }, 10000);
      
      console.log('✅ Scenario 2 timeout scheduled for preview');
    }
  };

  // Scenario 2: Track image deletions/replacements
  useEffect(() => {
    console.log('🗑️ Delete tracking effect - hasTriggered:', hasTriggeredAnyStuckFlowRef.current, 'hasPublished:', hasPublishedThisSessionRef.current);
    
    // Stop if a stuck flow has already been triggered OR if demo was published
    if (!demo || hasTriggeredAnyStuckFlowRef.current || hasPublishedThisSessionRef.current) return;

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
        
        if (scenario2TimeoutRef.current) {
          clearTimeout(scenario2TimeoutRef.current);
        }
        
        scenario2TimeoutRef.current = setTimeout(() => {
          console.log('⏰ 10 seconds elapsed from deletes - triggering');
          triggerStuckMessage('scenario2', 'delete');
        }, 10000);
      }
    }

    previousStepCountRef.current = currentStepCount;
  }, [demo?.steps.length]);

  // Track annotation interactions (opening, canceling, saving - ANY interaction)
  const trackAnnotationInteraction = (stepId: string) => {
    console.log('✏️ trackAnnotationInteraction called for step:', stepId, 'hasTriggered:', hasTriggeredAnyStuckFlowRef.current, 'hasPublished:', hasPublishedThisSessionRef.current);
    
    // Stop if a stuck flow has already been triggered OR if demo was published
    if (hasTriggeredAnyStuckFlowRef.current || hasPublishedThisSessionRef.current) {
      console.log('❌ Stuck flow triggered or demo published, ignoring annotation tracking');
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
      
      if (scenario2TimeoutRef.current) {
        clearTimeout(scenario2TimeoutRef.current);
      }
      
      scenario2TimeoutRef.current = setTimeout(() => {
        console.log('⏰ 10 seconds elapsed from annotation interactions - triggering');
        triggerStuckMessage('scenario2', 'annotation');
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
