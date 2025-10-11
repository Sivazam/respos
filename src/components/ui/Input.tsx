import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-md shadow-sm text-sm sm:text-base
              ${icon ? 'pl-9 sm:pl-10' : 'pl-3 sm:pl-4'} 
              py-2 pr-3 sm:pr-4
              border ${error ? 'border-red-500' : 'border-gray-300'} 
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
              transition-all duration-200
              disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;