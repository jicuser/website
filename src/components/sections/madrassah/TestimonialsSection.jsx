import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';

    const testimonials = [
      {
        name: 'Ahmed Khan',
        role: 'Parent of two students',
        quote: 'The Madrassah has been a blessing for my children. They have not only learned to read the Quran but also developed a deep love for Islam and its teachings.'
      },
      {
        name: 'Fatima Ali',
        role: 'Student, Age 15',
        quote: 'I love coming to the Madrassah. The teachers make learning fun and interesting. I\'ve made great friends here and learned so much about my religion.'
      },
      {
        name: 'Mohammed Rahman',
        role: 'Adult Student',
        quote: 'As someone who embraced Islam later in life, the adult program has been invaluable. The teachers are knowledgeable and patient, and the curriculum is comprehensive.'
      }
    ];

    const TestimonialsSection = () => (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">What Parents & Students Say</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Hear from our community about their experiences at Jamatia Islamic Centre Madrassah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center mb-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold text-primary">{testimonial.name.charAt(0)}</span>
                      </div>
                      <h3 className="font-bold">{testimonial.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 italic">"{testimonial.quote}"</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );

    export default TestimonialsSection;