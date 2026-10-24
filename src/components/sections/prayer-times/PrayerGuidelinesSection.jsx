import React from 'react';
import { Link } from 'react-router-dom';

const PrayerGuidelinesSection = () => (
  <section className="jic-prayer-visit" aria-labelledby="prayer-visit-heading">
    <header>
      <h2 id="prayer-visit-heading">Before your visit</h2>
      <nav aria-label="Prayer guides">
        <Link className="jic-button" to="/worship/prayer-guide">
          Salah guide
        </Link>
        <Link className="jic-button" to="/worship/janazah-guide">
          Janazah prayer guide
        </Link>
      </nav>
    </header>
    <details>
      <summary>Prayer guidance &amp; access</summary>
      <div className="jic-prayer-visit-guidance">
        <article>
          <h3 className="text-xl font-bold mb-4">General Guidelines</h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Please arrive a few minutes before prayer
              time
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Perform wudu (ablution) before entering
              the prayer hall
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Turn off or silence mobile phones during
              prayers
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Maintain proper attire and modesty
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Follow the Imam's lead during
              congregational prayers
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Keep the prayer area clean and tidy
            </li>
          </ul>
        </article>
        <article>
          <h3 className="text-xl font-bold mb-4">At the centre</h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Ask the centre about prayer areas and
              arrangements for your visit
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Allow time for wudu (ablution) before
              joining the prayer
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Ask the team if you need help finding your
              way around
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Check the published timetable for prayer
              start and congregation times
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Contact the centre before visiting to
              discuss step-free access or other access needs
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>Park considerately and keep neighbouring
              driveways and entrances clear
            </li>
          </ul>
        </article>
      </div>
    </details>
  </section>
);

export default PrayerGuidelinesSection;
