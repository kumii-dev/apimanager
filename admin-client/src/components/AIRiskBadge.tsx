import React from 'react';

export type AIRiskLevel = 'low' | 'medium' | 'high' | 'critical' | null;

interface AIRiskBadgeProps {
  riskLevel: AIRiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getRiskColor = (level: AIRiskLevel): string => {
  switch (level) {
    case 'low':
      return 'success';
    case 'medium':
      return 'warning';
    case 'high':
      return 'danger';
    case 'critical':
      return 'danger';
    default:
      return 'secondary';
  }
};

const getRiskIcon = (level: AIRiskLevel): string => {
  switch (level) {
    case 'low':
      return 'bi-shield-check';
    case 'medium':
      return 'bi-exclamation-triangle';
    case 'high':
      return 'bi-exclamation-octagon';
    case 'critical':
      return 'bi-x-octagon-fill';
    default:
      return 'bi-question-circle';
  }
};

const getRiskLabel = (level: AIRiskLevel): string => {
  if (!level) return 'No AI Risk';
  return level.charAt(0).toUpperCase() + level.slice(1) + ' Risk';
};

export const AIRiskBadge: React.FC<AIRiskBadgeProps> = ({ 
  riskLevel, 
  size = 'md',
  showLabel = true 
}) => {
  if (!riskLevel) {
    return null;
  }

  const color = getRiskColor(riskLevel);
  const icon = getRiskIcon(riskLevel);
  const label = getRiskLabel(riskLevel);
  
  const sizeClasses = {
    sm: 'badge-sm fs-7',
    md: '',
    lg: 'fs-5 p-2'
  };

  return (
    <span 
      className={`badge bg-${color} ${sizeClasses[size]} d-inline-flex align-items-center gap-1`}
      title={`NIST AI RMF Risk Level: ${label}`}
    >
      <i className={`bi ${icon}`}></i>
      {showLabel && <span>{label}</span>}
    </span>
  );
};

interface AISystemBadgeProps {
  isAISystem: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AISystemBadge: React.FC<AISystemBadgeProps> = ({ 
  isAISystem,
  size = 'md'
}) => {
  if (!isAISystem) {
    return null;
  }

  const sizeClasses = {
    sm: 'badge-sm fs-7',
    md: '',
    lg: 'fs-5 p-2'
  };

  return (
    <span 
      className={`badge bg-info ${sizeClasses[size]} d-inline-flex align-items-center gap-1`}
      title="This connector serves an AI/ML system"
    >
      <i className="bi bi-cpu"></i>
      <span>AI System</span>
    </span>
  );
};
