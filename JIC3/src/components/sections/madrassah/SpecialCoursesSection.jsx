import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';
    import { Book, Award, GraduationCap } from 'lucide-react';

    const courses = [
      {
        icon: <Book className="h-10 w-10 text-primary" />,
        title: 'Tajweed Course',
        description: 'Learn the proper rules of Quranic recitation with our certified Qari.',
        duration: '10 weeks'
      },
      {
        icon: <Award className="h-10 w-10 text-primary" />,
        title: 'Hifz Program',
        description: 'Memorization of the Holy Quran under the guidance of experienced Huffaz.',
        duration: 'Ongoing'
      },
      {
        icon: <GraduationCap className="h-10 w-10 text-primary" />,
        title: 'Arabic for Beginners',
        description: 'Learn the basics of Arabic language to better understand the Quran and Islamic texts.',
        duration: '12 weeks'
      }
    ];

    const SpecialCoursesSection = () => (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Special Courses</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              In addition to our regular programs, we offer specialized courses throughout the year.
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
                      <div className="p-3 rounded-full bg-primary/10 mr-4">
                        {course.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{course.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Duration: {course.duration}</p>
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