import React, { useState } from 'react';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { MessageSquare } from 'lucide-react';
    import { supabase } from '@/lib/supabaseClient';

    const ContactForm = () => {
      const { toast } = useToast();
      const [formData, setFormData] = useState({
        name: '',
        email: '',
        question: ''
      });
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
      };

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('send-contact-email', {
            body: JSON.stringify(formData),
          });

          if (error) {
            throw new Error(error.message);
          }
          
          // The edge function now returns a JSON response, so we need to check the body.
          if (data.error) {
            throw new Error(data.error);
          }

          toast({
            title: "Message Sent!",
            description: "Thank you for contacting us. We will get back to you soon.",
          });
          setFormData({
            name: '',
            email: '',
            question: ''
          });

        } catch (error) {
          console.error('Error invoking send-contact-email function:', error);
          toast({
            title: "Message Failed to Send",
            description: error.message || "An unknown error occurred. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <>
          <div className="flex items-center mb-6">
            <MessageSquare className="h-6 w-6 text-primary mr-2" />
            <h2 className="text-2xl font-bold">Send Us a Message</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Question *
              </label>
              <textarea
                id="question"
                name="question"
                value={formData.question}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700"
                placeholder="What would you like to ask?"
              ></textarea>
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full text-lg py-3">
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </>
      );
    };

    export default ContactForm;