import React, { useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { JANAZAH_CHILD_DUAS, JANAZAH_STEPS } from '@/content/worshipJanazah';
import { WORSHIP_RESOURCES } from '@/content/worshipResources';
import ReadingControls from './ReadingControls';
import RecitationText from './RecitationText';
import '@/styles/worship-readers.css';

export default function JanazahGuide() {
  const book = WORSHIP_RESOURCES.janazah;
  const [fontSize, setFontSize] = useState(32);
  const [showMeaning, setShowMeaning] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(true);
  return (
    <section className="worship-reading" style={{ '--worship-arabic-size': `${fontSize}px` }}>
      <header className="jic-guide-heading">
        <Link to="/worship" className="worship-back-link">
          All reading resources
        </Link>
        <h1>Janazah prayer guide</h1>
        <p>
          This refresher follows the Hanafi method in the linked Dawat-e-Islami guide. Follow the
          Imam when praying with the congregation; ask the Imam about your circumstances.
        </p>
      </header>
      <div className="worship-reading-card worship-janazah-resources">
        <h2>Full guide and funeral support</h2>
        <p>
          Read {book.title} from Maktaba-tul-Madina, with the full method, supplications and
          rulings.
        </p>
        <div className="worship-external-links">
          <a href={book.pdf} target="_blank" rel="noopener noreferrer">
            <BookOpen size={16} aria-hidden="true" />
            Open English PDF <ExternalLink size={14} aria-hidden="true" />
          </a>
          <a href={book.urduPdf} target="_blank" rel="noopener noreferrer">
            <BookOpen size={16} aria-hidden="true" />
            Open Urdu PDF <ExternalLink size={14} aria-hidden="true" />
          </a>
          <Link to="/forms/funeral-enquiry">Ask about funeral support</Link>
          <Link to="/contact">Contact the centre</Link>
        </div>
        <p className="worship-reading-footnote">
          By Ameer-e-Ahl-e-Sunnat; English translation by Dawat-e-Islami.{' '}
          <a href={book.source} target="_blank" rel="noopener noreferrer">
            Publisher’s library
          </a>
          . PDFs open in a new tab.
        </p>
      </div>
      <ReadingControls
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        showMeaning={showMeaning}
        onMeaningChange={setShowMeaning}
        showTransliteration={showTransliteration}
        onTransliterationChange={setShowTransliteration}
      />
      <p className="worship-reading-intro">
        The prayer is offered standing, with four takbirs. At each takbir say “Allahu akbar” (Allah
        is the greatest). Recite quietly behind the Imam.
      </p>
      <ol className="worship-recitation-list worship-janazah-steps">
        {JANAZAH_STEPS.map((step) => (
          <li className="worship-recitation-card" key={step.id}>
            <h2>{step.title}</h2>
            <p className="worship-step-instruction">{step.instruction}</p>
            <RecitationText
              reading={step.reading}
              showMeaning={showMeaning}
              showTransliteration={showTransliteration}
            />
            {step.source && (
              <a
                className="worship-source"
                href={step.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {step.source.label}
              </a>
            )}
            {step.id === 'third' && (
              <details className="worship-child-duas">
                <summary>Supplications for a child</summary>
                {JANAZAH_CHILD_DUAS.map((reading) => (
                  <section key={reading.id}>
                    <h3>{reading.title}</h3>
                    <RecitationText
                      reading={reading}
                      showMeaning={showMeaning}
                      showTransliteration={showTransliteration}
                    />
                  </section>
                ))}
                <p>Source: the full guide, printed page 10.</p>
              </details>
            )}
          </li>
        ))}
      </ol>
      <p className="worship-reading-footnote">
        Method and supplications:{' '}
        <a href={`${book.pdf}#page=12`} target="_blank" rel="noopener noreferrer">
          Method of Funeral Salah, printed pages 8–10
        </a>
        . Transliteration helps with reading; learn pronunciation with a qualified teacher. English
        meanings are concise renderings of the Arabic.
      </p>
    </section>
  );
}
