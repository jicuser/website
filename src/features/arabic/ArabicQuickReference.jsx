import React, { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Table2, X } from 'lucide-react';
import ArabicGlyphs from './ArabicGlyphs';
import { GUIDED_REFERENCE_TABLES } from './guidedWordData.mjs';

const labels = {
  sounds: 'Sounds',
  owners: 'Endings',
  pointing: 'This / that',
  verbs: 'Past / present',
};

function ReferenceCell({ value }) {
  if (typeof value === 'string') return value;
  return (
    <>
      {value.result && (
        <span className="arabic-reference-arabic" lang="ar" dir="rtl">
          <ArabicGlyphs
            result={value.result}
            highlightedSourceIndices={value.sourceIndex == null ? undefined : [value.sourceIndex]}
          />
        </span>
      )}
      {value.text && <span>{value.text}</span>}
    </>
  );
}

/** One compact reference at a time, without covering or replacing the lesson. */
export default function ArabicQuickReference({ topic = 'sounds', onClose, onShowGuide }) {
  const [selected, setSelected] = useState(topic);
  const table =
    GUIDED_REFERENCE_TABLES.find((item) => item.id === selected) || GUIDED_REFERENCE_TABLES[0];
  const titleId = useId();
  const panel = useRef(null);
  const opener = useRef(null);
  useEffect(() => {
    opener.current = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, []);
  const close = () => {
    onClose();
    if (opener.current instanceof HTMLElement && opener.current.isConnected)
      opener.current.focus({ preventScroll: true });
  };
  return (
    <section
      id="arabic-quick-reference"
      className="arabic-quick-reference"
      ref={panel}
      tabIndex={-1}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
    >
      <header>
        <h2 id={titleId}>
          <Table2 size={18} aria-hidden="true" /> Quick tables
        </h2>
        <button
          type="button"
          className="arabic-quiet"
          aria-label="Close quick tables"
          onClick={close}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="arabic-reference-tabs" role="group" aria-label="Reference tables">
        {GUIDED_REFERENCE_TABLES.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={item.id === table.id}
            onClick={() => setSelected(item.id)}
          >
            {labels[item.id] || item.shortLabel || item.title}
          </button>
        ))}
      </div>
      <div className="arabic-reference-body">
        <h3>{table.title}</h3>
        <p>{table.intro}</p>
        <div
          className="arabic-reference-scroll"
          tabIndex={0}
          role="region"
          aria-label={table.title}
        >
          <table>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>
                      <ReferenceCell value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.note && <p className="arabic-reference-note">{table.note}</p>}
      </div>
      <button type="button" className="arabic-reference-more" onClick={onShowGuide}>
        <BookOpen size={16} aria-hidden="true" /> Explore the grammar guide
      </button>
    </section>
  );
}
