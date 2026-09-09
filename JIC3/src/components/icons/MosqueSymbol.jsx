import React from 'react';

const MosqueSymbol = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 22h20" />
    <path d="M4 15.5v-3.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3.5" />
    <path d="M16 15.5v-3.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3.5" />
    <path d="M12 4v11.5" />
    <path d="M8 10h8" />
    <path d="M6 22V10" />
    <path d="M18 22V10" />
    <path d="M12 4a4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5 4.5V4Z" />
    <path d="M12 4a4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5V4Z" />
  </svg>
);

export default MosqueSymbol;