import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';
    import { BookOpen, GraduationCap, Users } from 'lucide-react';

    const features = [
      {
        icon: <BookOpen className="h-10 w-10 text-primary" />,
        title: 'Comprehensive Curriculum',
        description: 'Our curriculum covers Quran recitation and memorization, Islamic studies, Arabic language, and character development.'
      },
      {
        icon: <GraduationCap className="h-10 w-10 text-primary" />,
        title: 'Qualified Teachers',
        description: 'Our teachers are well-qualified in Islamic sciences and experienced in teaching children of all ages.'
      },
      {
        icon: <Users className="h-10 w-10 text-primary" />,
        title: 'Supportive Environment',
        description: 'We provide a nurturing and inclusive environment where students can learn and grow in their faith.'
      }
    ];

    const AboutSection = () => (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">About Our Madrassah</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our Madrassah provides comprehensive Islamic education for children and youth, focusing on Quranic studies, Islamic knowledge, and character development.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="mb-4 p-3 rounded-full bg-primary/10">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );

    export default AboutSection;