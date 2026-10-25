import React from 'react';
import useReadingDisplay from '@/hooks/useReadingDisplay';
import { List, Moon, Sunrise } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ADHKAR_COLLECTIONS } from '@/content/worshipAdhkar';
import ReadingControls from './ReadingControls';
import RecitationText from './RecitationText';
import '@/styles/worship-readers.css';

const collectionIcons = { morning: Sunrise, evening: Moon, 'after-salah': List };

export default function AdhkarReader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('collection');
  const collection = ADHKAR_COLLECTIONS.find((item) => item.id === requested) || ADHKAR_COLLECTIONS[0];
  const { fontSize, setFontSize, showMeaning, setShowMeaning, showTransliteration, setShowTransliteration } = useReadingDisplay();
  return (
    <section className="worship-reading" style={{ '--worship-arabic-size': `${fontSize}px` }}>
      <header className="jic-guide-heading">
        <Link to="/worship" className="worship-back-link">All reading resources</Link>
        <h1>Daily adhkar</h1>
        <p>A short selection for morning, evening and after Salah. Read at your own pace; each remembrance includes its reference.</p>
      </header>
      <div className="worship-collection-picker" role="group" aria-label="Adhkar collection">
        {ADHKAR_COLLECTIONS.map((item) => {
          const Icon = collectionIcons[item.id];
          return (
            <button key={item.id} type="button" aria-pressed={collection.id === item.id} onClick={() => setSearchParams({ collection: item.id }, { replace: true })}>
              <Icon size={19} aria-hidden="true" />{item.label}
            </button>
          );
        })}
      </div>
      <div className="worship-collection-heading">
        <h2 className="worship-collection-title">{collection.title}</h2>
        <p className="worship-reading-intro">{collection.description}</p>
      </div>
      <details className="worship-reading-contents" key={collection.id}>
        <summary>In this collection <span>{collection.readings.length} remembrances</span></summary>
        <ol>{collection.readings.map((reading) => <li key={reading.id}><a href={`#adhkar-${collection.id}-${reading.id}`}>{reading.title}</a></li>)}</ol>
      </details>
      <ReadingControls fontSize={fontSize} onFontSizeChange={setFontSize} showMeaning={showMeaning} onMeaningChange={setShowMeaning} showTransliteration={showTransliteration} onTransliterationChange={setShowTransliteration} />
      <div className="worship-recitation-list">
        {collection.readings.map((reading) => (
          <article className="worship-recitation-card" key={reading.id} id={`adhkar-${collection.id}-${reading.id}`} tabIndex={-1}>
            <header><h3>{reading.title}</h3><span className="worship-repeat">{reading.repeat}</span></header>
            <RecitationText reading={reading} showMeaning={showMeaning} showTransliteration={showTransliteration} />
            <a className="worship-source" href={reading.source.url} target="_blank" rel="noopener noreferrer">Reference: {reading.source.label}</a>
          </article>
        ))}
      </div>
      <p className="worship-reading-footnote">Transliteration is a reading aid. Learn pronunciation with a qualified teacher. English meanings are brief renderings of the Arabic; this selection is not a complete collection of adhkar.</p>
    </section>
  );
}
