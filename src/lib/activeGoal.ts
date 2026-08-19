import { useEffect, useMemo, useState } from 'react';
import type { GoalRecord } from '../types';

const STORAGE_KEY = 'lpa-active-goal-id';
const EVENT_KEY = 'lpa-active-goal-changed';

export function getStoredActiveGoalId(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setStoredActiveGoalId(goalId: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, String(goalId));
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { goalId } }));
}

export function useActiveGoal(goals: GoalRecord[] | undefined = []) {
  const [selectedId, setSelectedId] = useState<number | null>(getStoredActiveGoalId);

  useEffect(() => {
    const handleStorageChange = () => {
      setSelectedId(getStoredActiveGoalId());
    };

    window.addEventListener(EVENT_KEY, handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_KEY, handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const activeGoal = useMemo(() => {
    if (!goals || goals.length === 0) return null;
    if (selectedId) {
      const match = goals.find((g) => g.id === selectedId);
      if (match) return match;
    }
    return goals[0] ?? null;
  }, [goals, selectedId]);

  const setActiveGoalId = (goalId: number) => {
    setSelectedId(goalId);
    setStoredActiveGoalId(goalId);
  };

  const isGoalActive = (goalId: number) => {
    return activeGoal?.id === goalId;
  };

  return {
    activeGoal,
    activeGoalId: activeGoal?.id ?? null,
    setActiveGoalId,
    isGoalActive,
    allGoals: goals ?? [],
  };
}
