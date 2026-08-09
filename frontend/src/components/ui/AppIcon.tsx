import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: any;
}

export default function Icon({
  name,
  size = 24,
  className = '',
  onClick,
  disabled = false,
  ...props
}: IconProps) {
  // Normalize icon names (e.g. SparklesIcon -> Sparkles, ArrowRightIcon -> ArrowRight)
  const cleanName = name.replace(/(Icon|Solid|Outline)$/g, '');
  const IconComponent = (LucideIcons as any)[cleanName] || (LucideIcons as any)[name] || LucideIcons.HelpCircle;

  return (
    <IconComponent
      size={size}
      className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      {...props}
    />
  );
}
