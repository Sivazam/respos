import React from 'react';
import { Utensils } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 'md', variant = 'dark' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const colorClasses = {
    light: 'text-white',
    dark: 'text-green-800',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <div className={`flex items-center font-bold ${sizeClasses[size]} ${colorClasses[variant]}`}>
      <Utensils size={iconSizes[size]} className="mr-2" />
      <span>ForkFlow</span>
    </div>
  );
};

export default AppLogo;