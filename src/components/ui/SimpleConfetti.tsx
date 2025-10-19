'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SimpleConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
}

const SimpleConfetti: React.FC<SimpleConfettiProps> = ({ isActive, onComplete }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    velocity: { x: number; y: number };
  }>>([]);

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);



  const createParticles = useCallback(() => {
    const colors = [
      '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    
    const newParticles = [];
    for (let i = 0; i < 100; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: Math.random() * 3 + 2
        }
      });
    }

    return newParticles;
  }, []);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }


    startTimeRef.current = Date.now();
    setParticles(createParticles());

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const maxDuration = 3000;

      if (elapsed > maxDuration) {

        setParticles([]);
        onComplete?.();
        return;
      }

      setParticles(prevParticles => 
        prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.velocity.x,
            y: particle.y + particle.velocity.y,
            velocity: {
              x: particle.velocity.x * 0.99,
              y: particle.velocity.y + 0.1 // gravity
            }
          }))
          .filter(particle => particle.y < window.innerHeight + 50)
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onComplete, createParticles]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Very obvious background overlay when active */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse" />
      

      
      {/* Confetti particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-sm shadow-lg"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${Date.now() * 0.1}deg)`,
            transition: 'none',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)'
          }}
        />
      ))}
    </div>
  );
};

export default SimpleConfetti;