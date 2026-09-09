/**
 * FaqSection — questions from src/content/pages/contact.js
 */
import React from 'react';
import FaqCard from '@/components/sections/contact/FaqCard';
import { FAQ_ITEMS } from '@/content/pages/contact';

const FaqSection = () => (
  <section className="py-16 bg-gray-50 dark:bg-gray-800">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Find answers to commonly asked questions about Jamatia Islamic Centre.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {FAQ_ITEMS.map((faq, index) => (
          <FaqCard key={index} {...faq} index={index} />
        ))}
      </div>
    </div>
  </section>
);

export default FaqSection;
