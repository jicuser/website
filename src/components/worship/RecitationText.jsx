import React from 'react';

export default function RecitationText({
  reading,
  showMeaning = true,
  showTransliteration = true,
}) {
  return (
    <div className="worship-recitation-text">
      <p className="worship-recitation-arabic" lang="ar" dir="rtl">
        {reading.arabic}
      </p>
      {showTransliteration && (
        <p className="worship-transliteration">
          <span className="worship-text-label">Transliteration</span>
          {reading.transliteration}
        </p>
      )}
      {showMeaning && (
        <p className="worship-meaning">
          <span className="worship-text-label">Meaning</span>
          {reading.meaning}
        </p>
      )}
    </div>
  );
}
