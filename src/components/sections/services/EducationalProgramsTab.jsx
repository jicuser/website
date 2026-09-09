import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';
    import { BookOpen, GraduationCap, Book, Users, UserPlus, Globe } from 'lucide-react';

    const educationalPrograms = [
      { 
        icon: <BookOpen className="h-10 w-10 text-primary" />, 
        title: 'Quran Classes', 
        description: 'Learn to read and understand the Holy Quran with proper tajweed for all age groups.' 
      },
      { 
        icon: <GraduationCap className="h-10 w-10 text-primary" />, 
        title: 'Islamic Studies', 
        description: 'Comprehensive courses on Islamic beliefs, practices, history, and contemporary issues.' 
      },
      { 
        icon: <Book className="h-10 w-10 text-primary" />, 
        title: 'Arabic Language', 
        description: 'Arabic language courses for beginners to advanced learners to understand Quran and Islamic texts.' 
      },
      { 
        icon: <Users className="h-10 w-10 text-primary" />, 
        title: 'Weekend School', 
        description: 'Weekend Islamic school for children to learn Quran, Islamic studies, and moral values.' 
      },
      { 
        icon: <UserPlus className="h-10 w-10 text-primary" />, 
        title: 'New Muslims Program', 
        description: 'Special courses for new Muslims to learn the basics of Islam and integrate into the community.' 
      },
      { 
        icon: <Globe className="h-10 w-10 text-primary" />, 
        title: 'Interfaith Education', 
        description: 'Programs to promote understanding and dialogue between different faith communities.' 
      }
    ];

    const EducationalProgramsTab = () => {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {educationalPrograms.map((program, index) => (
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
                      {program.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{program.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{program.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 flex flex-col justify-center">
                <h3 className="text-2xl font-bold mb-4">Our Madrassah</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Our Madrassah provides comprehensive Islamic education for children and youth. We focus on:
                </p>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Quran recitation and memorization
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Islamic beliefs and practices
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Islamic history and civilization
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Character development and moral values
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    Arabic language skills
                  </li>
                </ul>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  Visit our <a href="/madrassah" className="text-primary hover:underline">Madrassah page</a> for more information about enrollment, schedule, and curriculum.
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-600 flex items-center justify-center order-first md:order-last">
                <img  className="w-full h-full object-cover min-h-[300px] md:min-h-full" alt="Students learning in a Madrassah classroom" src="https://images.unsplash.com/photo-1701229404076-5629809b331d" />
              </div>
            </div>
          </motion.div>
        </>
      );
    };

    export default EducationalProgramsTab;