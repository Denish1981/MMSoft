
import React from 'react';

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 3L9.5 8.5 4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5z"></path>
        <path d="M4 3h.01"></path><path d="M3 21h.01"></path>
        <path d="M20.01 3h.01"></path><path d="M21 21h.01"></path>
        <path d="M12 21v.01"></path><path d="M12 3v.01"></path>
        <path d="M21 12h-.01"></path><path d="M3 12h-.01"></path>
    </svg>
);
