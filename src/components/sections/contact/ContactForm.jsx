import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import { SITE } from '@/content/site';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', question: '' });
  const [emailDraft, setEmailDraft] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmailDraft('');
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${formData.name}`);
    const body = encodeURIComponent(`Name: ${formData.name}\nReply to: ${formData.email}\n\n${formData.question}`);
    setEmailDraft(`mailto:${SITE.email}?subject=${subject}&body=${body}`);
  };

  return <>
    <div className="mb-5 flex items-center gap-2">
      <MessageSquare className="h-6 w-6 text-primary" />
      <h2 className="text-2xl font-bold">Contact Us</h2>
    </div>
    <p className="mb-4 text-sm">Prepare your message here, then send it from your email app.</p>
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700" placeholder="Your Name" />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</label>
        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700" placeholder="your.email@example.com" />
      </div>
      <div>
        <label htmlFor="question" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Your Message *</label>
        <textarea id="question" name="question" value={formData.question} onChange={handleChange} required rows={5} className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700" placeholder="How can we help?" />
      </div>
      <Button type="submit" className="w-full py-3 text-lg">Prepare email</Button>
      {emailDraft && <div role="status" className="rounded-xl border p-4"><a href={emailDraft} className="inline-flex min-h-11 items-center gap-2 font-semibold underline"><Mail size={18}/>Open email app to send</a><p className="mt-2 text-sm">Your message has not been sent yet. Send the draft in your email app, or copy your message and email us directly.</p></div>}
    </form>
    <div className="mt-5 grid gap-2 border-t pt-5 text-sm">
      <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 font-medium hover:text-primary"><Mail size={16}/>{SITE.email}</a>
      <a href={`tel:${SITE.phone.replace(/\s+/g,'')}`} className="inline-flex items-center gap-2 font-medium hover:text-primary"><Phone size={16}/>{SITE.phone}</a>
    </div>
  </>;
};

export default ContactForm;
