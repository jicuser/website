import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { submitWebsiteForm } from '@/lib/submitWebsiteForm';

const EnrollmentForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    query: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitWebsiteForm('madrassah', formData);
      toast({ title: 'Inquiry received', description: 'Thank you for your interest. We will get back to you soon.' });
      setFormData({ name: '', email: '', phone: '', query: '' });
    } catch (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }

  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="madrassah-enrolment-form w-full max-w-2xl mx-auto"
    >
      <h1 className="madrassah-enrolment-title">Pupil enrolment</h1>
      <p className="madrassah-enrolment-intro">Enquire about a place at the Madrassah.</p>
      <form onSubmit={handleSubmit} className="madrassah-enrolment-fields">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Parent / guardian *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            maxLength={120}
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
            placeholder="Parent / guardian full name"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            maxLength={254}
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            maxLength={40}
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
            placeholder="Phone number (optional)"
          />
        </div>
        <div>
          <label
            htmlFor="query"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Pupil details *
          </label>
          <textarea
            id="query"
            name="query"
            maxLength={4000}
            value={formData.query}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800"
            placeholder="Pupil name, age and any details we should know."
          ></textarea>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : 'Send enquiry'}
        </Button>
      </form>
    </motion.div>
  );
};

export default EnrollmentForm;
