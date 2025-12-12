import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function ShareFlowDetection() {
  const { demo, triggerShareFlow, userSession } = useApp();
  
  const shareTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPublishedRef = useRef(false);
  const hasCopiedRef = useRef(false);
  const hasTriggeredShareFlowRef = useRef(false);
  
  // Track when demo gets published
  useEffect(() => {
    if (!demo || userSession.firstDemoCompleted) return;
    
    // If demo just got published and we haven't started tracking yet
    if (demo.isPublished && !hasPublishedRef.current && !hasTriggeredShareFlowRef.current) {
      console.log('📢 Demo published, starting 30-second timer');
      hasPublishedRef.current = true;
      
      // Start 30-second timer
      shareTimerRef.current = setTimeout(() => {
        console.log('⏰ 30 seconds elapsed');
        
        // Only trigger if they haven't copied the link and haven't already triggered
        if (!hasCopiedRef.current && !hasTriggeredShareFlowRef.current) {
          console.log('📤 User has not copied, triggering share flow');
          hasTriggeredShareFlowRef.current = true;
          triggerShareFlow();
        } else {
          console.log('✅ User already copied or flow already triggered, not triggering');
        }
      }, 30000);
    }
    
    return () => {
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
      }
    };
  }, [demo?.isPublished, userSession.firstDemoCompleted, triggerShareFlow]);
  
  // Expose function to cancel timer when user copies
  useEffect(() => {
    (window as any).__onShareCopy = () => {
      console.log('📋 User copied link, canceling share flow timer');
      hasCopiedRef.current = true;
      
      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
        shareTimerRef.current = null;
      }
    };
    
    return () => {
      delete (window as any).__onShareCopy;
    };
  }, []);
  
  return null;
}
