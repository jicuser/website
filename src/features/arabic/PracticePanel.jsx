import React, { useRef, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import ArabicGlyphs from './ArabicGlyphs';
import {
  createPracticeRound,
  PRACTICE_QUESTIONS,
  PRACTICE_STORAGE_KEY,
  readPracticeProgress,
  writePracticeProgress,
} from './learningContent.mjs';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const questionsById = Object.fromEntries(
  PRACTICE_QUESTIONS.map((question) => [question.id, question]),
);

export default function PracticePanel() {
  const [mastered, setMastered] = useState(() => readPracticeProgress(getStorage()));
  const [round, setRound] = useState(0);
  const [queue, setQueue] = useState(() => createPracticeRound(mastered));
  const [roundSize, setRoundSize] = useState(queue.length);
  const [roundLearned, setRoundLearned] = useState([]);
  const [selected, setSelected] = useState(null);
  const [seen, setSeen] = useState([]);
  const [notice, setNotice] = useState('');
  const [repeatCount, setRepeatCount] = useState(0);
  const headingRef = useRef(null);
  const question = questionsById[queue[0]];
  const answered = selected !== null;
  const correct = question && selected === question.answer;
  const isReview = question && seen.includes(question.id);
  const finished = queue.length === 0;

  function saveProgress(next) {
    setMastered(next);
    if (!writePracticeProgress(getStorage(), next)) {
      setNotice('Saving is unavailable on this device. Your practice still works for this visit.');
    }
  }

  function answer(index) {
    if (answered || !question) return;
    setSelected(index);
    if (index === question.answer) {
      if (!roundLearned.includes(question.id))
        setRoundLearned((current) => [...current, question.id]);
      saveProgress([...new Set([...mastered, question.id])]);
    } else {
      saveProgress(mastered.filter((id) => id !== question.id));
      setRepeatCount((count) => count + 1);
    }
  }

  function focusQuestion() {
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  function nextQuestion() {
    if (!question || !answered) return;
    const remaining = queue.slice(1);
    if (!correct) remaining.push(question.id);
    setSeen((current) => [...new Set([...current, question.id])]);
    setQueue(remaining);
    setSelected(null);
    focusQuestion();
  }

  function startRound(progress = mastered, nextRound = round + 1) {
    const next = createPracticeRound(progress, nextRound);
    setRound(nextRound);
    setQueue(next);
    setRoundSize(next.length);
    setRoundLearned([]);
    setSelected(null);
    setSeen([]);
    setRepeatCount(0);
    focusQuestion();
  }

  function clearProgress() {
    let cleared = false;
    try {
      const storage = getStorage();
      if (storage) {
        storage.removeItem(PRACTICE_STORAGE_KEY);
        cleared = true;
      }
    } catch {
      /* Practice remains available without local storage. */
    }
    setMastered([]);
    startRound([], 0);
    setNotice(
      cleared
        ? 'Practice progress cleared on this device.'
        : 'This visit’s progress was cleared. Device storage is unavailable.',
    );
  }

  return (
    <section className="arabic-practice" aria-labelledby="arabic-practice-title">
      <header className="arabic-section-heading">
        <h2 id="arabic-practice-title">A little practice. The same useful patterns.</h2>
        <p className="arabic-muted">
          Six questions at a time. Anything you miss comes back for another try.
        </p>
      </header>
      <div className="arabic-practice-progress">
        <span>
          {mastered.length} of {PRACTICE_QUESTIONS.length} patterns answered correctly
        </span>
        <button type="button" className="arabic-quiet" onClick={clearProgress}>
          Clear progress
        </button>
      </div>
      {notice && (
        <p className="arabic-storage-notice" role="status">
          {notice}
        </p>
      )}
      {finished ? (
        <div className="arabic-panel arabic-practice-complete">
          <Check size={30} aria-hidden="true" />
          <h3 tabIndex={-1} ref={headingRef}>
            You worked through all {roundSize} patterns.
          </h3>
          <p>
            {repeatCount
              ? 'You came back to the tricky ones and got them. Repetition is part of learning.'
              : 'Each answer connected a small Arabic change to its meaning.'}
          </p>
          <p className="arabic-muted">
            The next round brings in more patterns and revisits something familiar.
          </p>
          <button type="button" className="arabic-primary" onClick={() => startRound()}>
            Try six more
          </button>
        </div>
      ) : (
        <div className="arabic-panel arabic-practice-card">
          <div className="arabic-question-topline">
            <span className="arabic-eyebrow">{isReview ? 'Another look' : question.topic}</span>
            <span className="arabic-muted">
              {roundLearned.length} of {roundSize} understood
            </span>
          </div>
          <h3 tabIndex={-1} ref={headingRef}>
            {question.prompt}
          </h3>
          {question.promptArabic && (
            <div className="arabic-question-word">
              <p className="arabic-text" lang="ar" dir="rtl">
                <ArabicGlyphs result={{ arabic: question.promptArabic }} />
              </p>
              <p className="arabic-latin" dir="ltr">
                {question.promptLatin}
              </p>
            </div>
          )}
          <div className="arabic-question-options" role="group" aria-label="Choose an answer">
            {question.options.map((option, index) => (
              <button
                key={index}
                type="button"
                className={`arabic-answer-option${answered && index === question.answer ? ' is-correct' : ''}${answered && index === selected && !correct ? ' is-incorrect' : ''}${selected === index ? ' is-selected' : ''}`}
                disabled={answered}
                aria-pressed={selected === index}
                onClick={() => answer(index)}
              >
                {option.ar ? (
                  <>
                    <span className="arabic-text" lang="ar" dir="rtl">
                      <ArabicGlyphs result={{ arabic: option.ar }} />
                    </span>
                    <span className="arabic-latin" dir="ltr">
                      {option.latin}
                    </span>
                  </>
                ) : (
                  <span>{option.label}</span>
                )}
                {answered && index === question.answer && (
                  <span className="arabic-answer-status">
                    <Check size={16} aria-hidden="true" />
                    Correct answer
                  </span>
                )}
                {answered && index === selected && !correct && (
                  <span className="arabic-answer-status">
                    Your choice — try this pattern again later
                  </span>
                )}
              </button>
            ))}
          </div>
          {answered && (
            <div className={`arabic-feedback${correct ? ' is-correct' : ''}`} role="status">
              <strong>{correct ? 'That fits.' : 'Here is the pattern to keep.'}</strong>
              <p>{question.explanation}</p>
              {!correct && (
                <p className="arabic-muted">
                  This one will return{' '}
                  {queue.length > 1 ? 'after the other questions' : 'for another try'}.
                </p>
              )}
            </div>
          )}
          <div className="arabic-practice-actions">
            {answered && (
              <button type="button" className="arabic-primary" onClick={nextQuestion}>
                {correct && queue.length === 1 ? 'Finish this round' : 'Next question'}
              </button>
            )}
            <button
              type="button"
              className="arabic-quiet"
              onClick={() => startRound(mastered, round)}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Start a fresh round
            </button>
          </div>
        </div>
      )}
      <p className="arabic-muted arabic-practice-footnote">
        Progress is kept only in this browser. Arabic examples use careful Fuṣḥā pronunciation with
        the teaching endings shown.
      </p>
    </section>
  );
}
