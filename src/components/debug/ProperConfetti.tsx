'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: { width: number; height: number };
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: 'star' | 'rectangle';
}

const ProperConfetti: React.FC<{ isActive: boolean; onComplete?: () => void }> = ({ isActive, onComplete }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const createConfettiBurst = useCallback(() => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#FFD93D', '#6BCF7F', '#C06BF0', '#FF8CC8', '#64B5F6',
      '#FFB74D', '#81C784', '#E57373', '#9575CD', '#F06292',
      '#FFEB3B', '#00BCD4', '#8BC34A', '#FFC107', '#E91E63'
    ];
    
    const newPieces: ConfettiPiece[] = [];
    const pieceCount = 400; // Increased quantity
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight - 100;

    for (let i = 0; i < pieceCount; i++) {
      const angle = (Math.PI * 2 * i) / pieceCount + Math.random() * 0.5;
      const velocity = Math.random() * 20 + 15; // Increased velocity
      const isRectangle = Math.random() > 0.5; // 50% stars, 50% rectangles
      
      newPieces.push({
        id: i,
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isRectangle 
          ? { 
              width: Math.random() * 15 + 8,  // Rectangle: 8-23px width
              height: Math.random() * 6 + 4   // Rectangle: 4-10px height
            }
          : { 
              width: Math.random() * 16 + 8,  // Star: 8-24px size
              height: Math.random() * 16 + 8 
            },
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 25,
        opacity: 1,
        type: isRectangle ? 'rectangle' : 'star',
      });
    }
    return newPieces;
  }, []);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }

    startTimeRef.current = Date.now();
    setPieces(createConfettiBurst());

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const maxDuration = 6000; // Extended duration

      if (elapsed > maxDuration) {
        setPieces([]);
        onComplete?.();
        return;
      }

      setPieces(prevPieces => 
        prevPieces
          .map(piece => {
            const newVy = piece.vy + 0.4; // gravity
            const newVx = piece.vx * 0.99; // air resistance
            const newRotation = piece.rotation + piece.rotationSpeed;
            
            // Fade out based on elapsed time
            const fadeStart = maxDuration * 0.7;
            const newOpacity = elapsed > fadeStart 
              ? Math.max(0, 1 - (elapsed - fadeStart) / (maxDuration - fadeStart))
              : 1;

            return {
              ...piece,
              x: piece.x + newVx,
              y: piece.y + newVy,
              vx: newVx,
              vy: newVy,
              rotation: newRotation,
              opacity: newOpacity,
            };
          })
          .filter(piece => piece.y < window.innerHeight + 100 && piece.opacity > 0)
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onComplete, createConfettiBurst]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Confetti pieces */}
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}px`,
            top: `${piece.y}px`,
            width: `${piece.size.width}px`,
            height: `${piece.size.height}px`,
            backgroundColor: piece.color,
            opacity: piece.opacity,
            transform: `translate(-50%, -50%) rotate(${piece.rotation}deg)`,
            clipPath: piece.type === 'star' 
              ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              : 'none',
            borderRadius: piece.type === 'rectangle' ? '2px' : 'none',
            boxShadow: '0 0 8px rgba(255,255,255,0.9)',
          }}
        />
      ))}
    </div>
  );
};

export default ProperConfetti;