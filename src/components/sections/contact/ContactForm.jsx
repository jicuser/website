import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import { submitWebsiteForm } from '@/lib/submitWebsiteForm';
import { SITE } from '@/content/site';
import useCommunityLink from '@/hooks/useCommunityLink';

const ContactForm = ({ subject = '', title = 'Contact the centre' }) => {
  const whatsapp = useCommunityLink();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', question: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const sending = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setIsSubmitting(true);
    setSendFailed(false);
    try {
      await submitWebsiteForm('contact', {
        ...formData,
        question: subject ? `${subject}\n\n${formData.question}` : formData.question,
      });
      toast({
        title: 'Message received',
        description: 'Thank you. Your message has been sent to the centre’s team.',
      });
      setFormData({ name: '', email: '', question: '' });
      setSent(true);
    } catch (error) {
      setSendFailed(true);
      toast({
        title: 'Message was not sent',
        description:
          'Your text is still here. Please email or call the centre using the links below.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      sending.current = false;
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {sent ? (
        <div role="status" className="service-message-sent">
          <h3>Enquiry received</h3>
          <p>
            The office can reply using the email address you provided. Any date or arrangement
            still needs confirmation.
          </p>
          <Button type="button" onClick={() => setSent(false)}>
            Send another message
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              maxLength={120}
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
              placeholder="Your name"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              maxLength={254}
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
              placeholder="your.email@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="question"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your message *
            </label>
            <textarea
              id="question"
              name="question"
              maxLength={subject ? 3800 : 4000}
              value={formData.question}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
              placeholder="How can we help?"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg">
            {isSubmitting ? 'Sending…' : 'Send message'}
          </Button>
          {sendFailed && (
            <p role="alert" className="text-sm">
              Your message has not been sent.{' '}
              <a
                className="underline"
                href={`mailto:${SITE.email}?subject=${encodeURIComponent('Website enquiry from ' + formData.name)}&body=${encodeURIComponent(formData.question + '\n\nFrom: ' + formData.name + '\nReply email: ' + formData.email)}`}
              >
                Open your email app with this message
              </a>
              , or call the centre below.
            </p>
          )}
        </form>
      )}
      <div className="mt-5 grid gap-2 border-t pt-5 text-sm">
        <a
          href={`mailto:${SITE.email}`}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <Mail size={16} />
          {SITE.email}
        </a>
        <a
          href={`tel:${SITE.phone.replace(/\s+/g, '')}`}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <Phone size={16} />
          {SITE.phone}
        </a>
        <a
          href={whatsapp}
          className="inline-flex items-center gap-2 font-medium hover:text-primary"
        >
          <WhatsAppIcon size={20} />
          Join WhatsApp Community
        </a>
      </div>
    </>
  );
};

export default ContactForm;
