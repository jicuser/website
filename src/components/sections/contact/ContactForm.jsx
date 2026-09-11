import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, MessageSquare, Phone, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SITE } from '@/content/site';
import useCommunityLink from '@/hooks/useCommunityLink';

const ContactForm = () => {
  const whatsapp = useCommunityLink();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', question: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSendFailed(false);
    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', { body: JSON.stringify(formData) });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Message Sent!', description: 'Thank you for contacting us. We will get back to you soon.' });
      setFormData({ name: '', email: '', question: '' });
    } catch (error) {
      setSendFailed(true);
      toast({ title: 'Message was not sent', description: 'Your text is still here. Please email or call the centre using the links below.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return <>
    <div className="mb-5 flex items-center gap-2">
      <MessageSquare className="h-6 w-6 text-primary" />
      <h2 className="text-2xl font-bold">Contact Us</h2>
    </div>
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
      <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg">{isSubmitting ? 'Sending...' : 'Send Message'}</Button>
      {sendFailed && <p role="alert" className="text-sm">Your message has not been sent. <a className="underline" href={`mailto:${SITE.email}?subject=${encodeURIComponent('Website enquiry from ' + formData.name)}&body=${encodeURIComponent(formData.question + '\n\nFrom: ' + formData.name + '\nReply email: ' + formData.email)}`}>Open your email app with this message</a>, or call the centre below.</p>}
    </form>
    <div className="mt-5 grid gap-2 border-t pt-5 text-sm">
      <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 font-medium hover:text-primary"><Mail size={16}/>{SITE.email}</a>
      <a href={`tel:${SITE.phone.replace(/\s+/g,'')}`} className="inline-flex items-center gap-2 font-medium hover:text-primary"><Phone size={16}/>{SITE.phone}</a>
      <a href={whatsapp} className="inline-flex items-center gap-2 font-medium hover:text-primary"><MessageCircle size={16}/>Join WhatsApp Community</a>
    </div>
  </>;
};

export default ContactForm;
