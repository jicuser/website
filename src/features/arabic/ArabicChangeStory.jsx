import React, { useId, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import ArabicGlyphs from './ArabicGlyphs';
import { glyphColourFor } from './arabicGlyphModel.mjs';
import { compareArabicResults } from './arabicConnectionModel.mjs';
import './arabic-connections.css';

export function ArabicChangeStory({ previous, result }) {
  const titleId = useId();
  const [replay, setReplay] = useState(0);
  const difference = useMemo(() => compareArabicResults(previous, result), [previous, result]);
  if (!difference.changed) return null;
  const examples = [
    {
      label: 'Before',
      value: previous,
      changed: difference.before,
      sources: difference.beforeSources,
      meaning: difference.beforeMeaning,
    },
    {
      label: 'Now',
      value: result,
      changed: difference.after,
      sources: difference.afterSources,
      meaning: difference.afterMeaning,
    },
  ];
  return (
    <section className="arabic-change-story" aria-labelledby={titleId}>
      <header>
        <h3 id={titleId}>See what changed</h3>
        <button
          className="arabic-change-replay"
          type="button"
          onClick={() => setReplay((value) => value + 1)}
          aria-label="Replay this change"
        >
          <RotateCcw size={15} aria-hidden="true" /> Replay
        </button>
      </header>
      <div
        className="arabic-change-examples"
        key={`${previous.arabic}|${result.arabic}|${previous.translation}|${result.translation}|${replay}`}
      >
        {examples.map(({ label, value, changed, sources, meaning }) => (
          <figure key={label} className="arabic-change-example">
            <figcaption>{label}</figcaption>
            <div className="arabic-change-script" lang="ar" dir="rtl">
              <ArabicGlyphs
                result={value}
                highlightedParts={changed}
                highlightedSourceIndices={sources}
              />
            </div>
            <p className="arabic-change-latin" dir="ltr">
              {value.latin}
            </p>
            <p className="arabic-change-meaning">
              {value.englishParts?.length
                ? value.englishParts.map((part, index) => (
                    <span
                      key={index}
                      className={`arabic-colour-${glyphColourFor(part.id)} ${meaning.includes(part.id) && part.text.trim() ? 'is-changed' : ''}`}
                    >
                      {part.text}
                    </span>
                  ))
                : value.translation}
            </p>
          </figure>
        ))}
      </div>
      <p className="arabic-change-caption">
        {previous.arabic === result.arabic
          ? 'The Arabic stays the same. Compare the meaning.'
          : 'The ringed parts changed. Read each complete example.'}
      </p>
    </section>
  );
}

export default ArabicChangeStory;
