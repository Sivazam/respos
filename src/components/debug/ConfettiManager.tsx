'use client';

import { useOrderMilestoneCelebration } from '../../hooks/useOrderMilestoneCelebration';
import ProperConfetti from './ProperConfetti';

const ConfettiManager: React.FC = () => {
  const { shouldShowConfetti, handleConfettiComplete } = useOrderMilestoneCelebration();

  return (
    <ProperConfetti 
      isActive={shouldShowConfetti} 
      onComplete={handleConfettiComplete}
    />
  );
};

export default ConfettiManager;