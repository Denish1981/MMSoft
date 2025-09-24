import React from 'react';

interface TrophyIconProps extends React.SVGProps<SVGSVGElement> {
  rank: number;
}

const TrophyIcon: React.FC<TrophyIconProps> = ({ rank, ...props }) => {
  const color =
    rank === 1
      ? 'text-yellow-400'
      : rank === 2
      ? 'text-gray-400'
      : rank === 3
      ? 'text-yellow-600'
      : 'text-gray-600';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-6 h-6 ${color}`}
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M16.5 3.75a1.5 1.5 0 011.5 1.5v12.016a1.5 1.5 0 01-1.085 1.436l-4.5 1.125a1.5 1.5 0 01-1.83 0l-4.5-1.125a1.5 1.5 0 01-1.085-1.436V5.25a1.5 1.5 0 011.5-1.5h9zM12 6a.75.75 0 01.75.75v3.546l2.123-.902a.75.75 0 01.956.44l.802 1.871a.75.75 0 01-.44.956l-2.123.902v3.065a.75.75 0 01-1.5 0v-3.065l-2.123-.902a.75.75 0 01-.44-.956l.802-1.871a.75.75 0 01.956-.44l2.123.902V6.75A.75.75 0 0112 6z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default TrophyIcon;
