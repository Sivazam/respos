'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrderCount } from '../contexts/OrderCountContext';

interface MilestoneStats {
  todayCompletedOrders: number;
  totalCompletedOrders: number;
  lastMilestone: number;
  nextMilestone: number;
}

const MILESTONE_INTERVAL = 10; // Celebrate every 10 orders

export const useOrderMilestoneCelebration = () => {
  const { currentUser } = useAuth();
  const { totalOrders } = useOrderCount();
  const [shouldShowConfetti, setShouldShowConfetti] = useState(false);
  const [stats, setStats] = useState<MilestoneStats>({
    todayCompletedOrders: 0,
    totalCompletedOrders: 0,
    lastMilestone: 0,
    nextMilestone: 10,
  });
  
  const processingRef = useRef(false);
  const lastProcessedCountRef = useRef<number | null>(null);

  // Update stats whenever the shared order count changes
  useEffect(() => {
    if (!currentUser) return;

    const totalCompletedOrders = totalOrders;
    const lastMilestone = Math.floor(totalCompletedOrders / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
    const nextMilestone = lastMilestone + MILESTONE_INTERVAL;

    // Initialize lastProcessedCountRef on first load
    if (lastProcessedCountRef.current === null) {
      lastProcessedCountRef.current = totalCompletedOrders;
    }

    // Check if we exactly reached a milestone (10, 20, 30, etc.)
    const exactlyAtMilestone = totalCompletedOrders % MILESTONE_INTERVAL === 0 && totalCompletedOrders > 0;
    const justReachedMilestone = exactlyAtMilestone && totalCompletedOrders !== lastProcessedCountRef.current;

    if (justReachedMilestone && !processingRef.current) {
      processingRef.current = true;
      setShouldShowConfetti(true);
      
      // Reset processing flag after confetti duration
      setTimeout(() => {
        processingRef.current = false;
      }, 5000);
    }

    lastProcessedCountRef.current = totalCompletedOrders;

    setStats({
      todayCompletedOrders: 0, // We don't track this separately anymore
      totalCompletedOrders,
      lastMilestone,
      nextMilestone,
    });
  }, [currentUser, totalOrders]);

  // Handle confetti completion
  const handleConfettiComplete = useCallback(() => {
    setShouldShowConfetti(false);
  }, []);

  // Manual trigger for testing
  const triggerMilestone = useCallback(() => {
    if (!currentUser) return;
    
    setShouldShowConfetti(true);
  }, [currentUser]);

  // Reset stats (for testing or location changes)
  const resetStats = useCallback(() => {
    lastProcessedCountRef.current = null;
    processingRef.current = false;
    setShouldShowConfetti(false);
    setStats({
      todayCompletedOrders: 0,
      totalCompletedOrders: 0,
      lastMilestone: 0,
      nextMilestone: 10,
    });
  }, []);

  return {
    shouldShowConfetti,
    stats,
    handleConfettiComplete,
    triggerMilestone,
    resetStats,
    isManager: currentUser?.role === 'manager',
    isMilestoneReached: stats.totalCompletedOrders > 0 && stats.totalCompletedOrders % MILESTONE_INTERVAL === 0,
  };
};