import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Award, GraduationCap } from 'lucide-react';

const courses = [
  {
    icon: <Book className="h-10 w-10 text-primary" />,
    title: 'Tajweed Course',
    description: 'Ask about learning the rules of Qur’an recitation and finding a suitable class.',
    duration: 'Confirm with the Madrassah',
  },
  {
    icon: <Award className="h-10 w-10 text-primary" />,
    title: 'Hifz',
    description: 'Ask about Qur’an memorisation, prior learning and the commitment involved.',
    duration: 'Confirm with the Madrassah',
  },
  {
    icon: <GraduationCap className="h-10 w-10 text-primary" />,
    title: 'Arabic for Beginners',
    description:
      'Ask about introductory Arabic for reading and understanding Islamic texts.',
    duration: 'Confirm with the Madrassah',
  },
];

const SpecialCoursesSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Further learning</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Contact the Madrassah about these areas of study. Course availability, duration and
          entry requirements need confirmation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {courses.map((course, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-all border-t-4 border-t-primary">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10 mr-4">{course.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold">{course.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Availability: {course.duration}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{course.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SpecialCoursesSection;
