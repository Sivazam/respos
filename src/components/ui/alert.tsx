import React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        className
      )}
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children }) => {
  return (
    <div className="text-sm">
      {children}
    </div>
  );
};