import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';

interface UseStuckDetectionOptions {
  stepId: string | null;
  dwellThreshold?: number; // ms
  clickThreshold?: number;
}

export function useStuckDetection({
  stepId,
  dwellThreshold = 20000, // 20 seconds
  clickThreshold = 5,
}: UseStuckDetectionOptions) {
  const { triggerStuck, userSession, updateUserSession } = useApp();
  const mouseMovementRef = useRef(false);
  const clickCountRef = useRef(0);
  const dwellStartRef = useRef<Date | null>(null);
  const hasTriggeredRef = useRef(false);

  const resetDetection = useCallback(() => {
    mouseMovementRef.current = false;
    clickCountRef.current = 0;
    dwellStartRef.current = null;
    hasTriggeredRef.current = false;
  }, []);

  useEffect(() => {
    if (!stepId) return;

    dwellStartRef.current = new Date();

    const handleMouseMove = () => {
      mouseMovementRef.current = true;
    };

    const handleClick = () => {
      clickCountRef.current += 1;
      
      // Check for rage clicks (many clicks in short time)
      if (clickCountRef.current >= clickThreshold && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        triggerStuck(stepId);
      }
    };

    // Check for dwell time + mouse movement
    const checkStuck = setInterval(() => {
      if (!dwellStartRef.current || hasTriggeredRef.current) return;

      const dwellTime = new Date().getTime() - dwellStartRef.current.getTime();
      
      if (dwellTime >= dwellThreshold && mouseMovementRef.current) {
        hasTriggeredRef.current = true;
        triggerStuck(stepId);
      }
    }, 5000);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      clearInterval(checkStuck);
      resetDetection();
    };
  }, [stepId, dwellThreshold, clickThreshold, triggerStuck, resetDetection]);

  return { resetDetection };
}
