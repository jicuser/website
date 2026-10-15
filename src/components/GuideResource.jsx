import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { WORSHIP_RESOURCES } from '@/content/worshipResources';

export default function GuideResource({ guide }) {
  const book = WORSHIP_RESOURCES[guide];
  if (!book) return null;
  return (
    <section className="jic-guide-resource" aria-labelledby={`guide-${guide}-resource`}>
      <a
        href={book.source}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="jic-guide-cover"
      >
        <img
          src={book.cover}
          width="160"
          height="238"
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </a>
      <div>
        <p className="jic-guide-source">Dawat-e-Islami · Maktaba-tul-Madina</p>
        <h2 id={`guide-${guide}-resource`}>{book.title}</h2>
        <p>{book.description}</p>
        <div className="worship-external-links">
          <a href={book.pdf} target="_blank" rel="noopener noreferrer">
            <BookOpen size={16} /> Open English PDF <ExternalLink size={14} />
          </a>
          <a href={book.urdu} target="_blank" rel="noopener noreferrer">
            Urdu edition <ExternalLink size={14} />
          </a>
        </div>
        <p className="jic-guide-credit">
          By Ameer-e-Ahl-e-Sunnat; English translation by Dawat-e-Islami.{' '}
          <a href={book.source} target="_blank" rel="noopener noreferrer">
            Publisher’s library
          </a>
          . Opens in a new tab; save the PDF using your browser.
        </p>
      </div>
    </section>
  );
}
