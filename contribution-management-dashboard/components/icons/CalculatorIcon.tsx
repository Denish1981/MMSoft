import React from 'react';

export const CalculatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="16" height="20" x="4" y="2" rx="2"></rect>
    <line x1="8" x2="16" y1="6" y2="6"></line>
    <line x1="16" x2="16" y1="14" y2="18"></line>
    <path d="M16 10h-4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h4"></path>
    <path d="M8 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path>
  </svg>
);
