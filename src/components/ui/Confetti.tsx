'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

const Confetti: React.FC<ConfettiProps> = ({ isActive, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const confettiPiecesRef = useRef<ConfettiPiece[]>([]);
  const startTimeRef = useRef<number>(0);

  // Colorful confetti colors matching app theme
  const colors = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ];

  const createConfettiPiece = (id: number): ConfettiPiece => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 15 + 10; // 10-25 velocity
    
    return {
      id,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 100, // Start from center bottom
      y: window.innerHeight - 50,
      vx: Math.cos(angle) * velocity,
      vy: -Math.abs(Math.sin(angle) * velocity) - 10, // Always upward
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4, // 4-12px
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    };
  };

  const initializeConfetti = useCallback(() => {
    const pieces: ConfettiPiece[] = [];
    const pieceCount = 150; // Number of confetti pieces
    
    for (let i = 0; i < pieceCount; i++) {
      pieces.push(createConfettiPiece(i));
    }
    
    confettiPiecesRef.current = pieces;
    startTimeRef.current = Date.now();
  }, [createConfettiPiece]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTime = Date.now();
    const elapsed = currentTime - startTimeRef.current;
    const maxDuration = 4000; // 4 seconds max

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw confetti pieces
    confettiPiecesRef.current = confettiPiecesRef.current.map(piece => {
      // Update physics
      const newX = piece.x + piece.vx;
      const newY = piece.y + piece.vy;
      const newVy = piece.vy + 0.3; // Gravity
      const newRotation = piece.rotation + piece.rotationSpeed;
      
      // Fade out based on elapsed time
      const fadeStart = maxDuration * 0.6;
      const newOpacity = elapsed > fadeStart 
        ? Math.max(0, 1 - (elapsed - fadeStart) / (maxDuration - fadeStart))
        : 1;

      return {
        ...piece,
        x: newX,
        y: newY,
        vy: newVy,
        rotation: newRotation,
        opacity: newOpacity,
      };
    });

    // Filter out pieces that are off-screen or fully transparent
    confettiPiecesRef.current = confettiPiecesRef.current.filter(
      piece => piece.y < window.innerHeight + 50 && piece.opacity > 0
    );

    // Draw confetti pieces
    confettiPiecesRef.current.forEach(piece => {
      ctx.save();
      ctx.globalAlpha = piece.opacity;
      ctx.translate(piece.x, piece.y);
      ctx.rotate((piece.rotation * Math.PI) / 180);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
      ctx.restore();
    });

    // Continue animation or complete
    if (elapsed < maxDuration && confettiPiecesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      onComplete?.();
    }
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize and start animation
    initializeConfetti();
    
    // Start animation after a short delay to ensure everything is set up
    const timeoutId = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 100);

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onComplete, animate, initializeConfetti]);

  if (!isActive) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'transparent' }}
      />
    </div>,
    document.body
  );
};

export default Confetti;