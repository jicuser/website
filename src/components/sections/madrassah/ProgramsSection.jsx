import React from 'react';
    import { motion } from 'framer-motion';
    import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
    import { Calendar, Clock } from 'lucide-react';

    const ProgramTab = ({ title, description, curriculum, schedule, imageSrc, imageAlt }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-4">{title}</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
            <h4 className="font-bold text-lg mb-2">Curriculum Includes:</h4>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300 mb-4">
              {curriculum.map((item, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{schedule.time}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{schedule.days}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
            <img  className="w-full h-full object-cover" alt={imageAlt} src={imageSrc} />
          </div>
        </div>
      </motion.div>
    );

    const ProgramsSection = () => (
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Programs</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We offer various programs tailored to different age groups and learning needs.
            </p>
          </div>

          <Tabs defaultValue="children" className="w-full max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-md">
                <TabsTrigger value="children">Children (5-10)</TabsTrigger>
                <TabsTrigger value="youth">Youth (11-16)</TabsTrigger>
                <TabsTrigger value="adults">Adults (17+)</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="children" className="space-y-8">
              <ProgramTab
                title="Children's Program"
                description="Our children's program introduces young learners to the basics of Islam in a fun and engaging way."
                curriculum={[
                  'Basic Quran recitation (Qaida)',
                  'Memorization of short surahs',
                  'Islamic manners and etiquette',
                  'Basic Islamic beliefs',
                  'Stories of the Prophets',
                  'Introduction to Arabic alphabet'
                ]}
                schedule={{ time: '4:00 PM - 6:00 PM', days: 'Mon-Fri' }}
                imageSrc="https://images.unsplash.com/photo-1624863037771-b6e5dde7f4aa"
                imageAlt="Children learning in Madrassah"
              />
            </TabsContent>

            <TabsContent value="youth" className="space-y-8">
              <ProgramTab
                title="Youth Program"
                description="Our youth program builds on the fundamentals and addresses the challenges faced by Muslim teenagers in today's world."
                curriculum={[
                  'Advanced Quran recitation with tajweed',
                  'Memorization of selected surahs',
                  'Fundamentals of Islamic jurisprudence',
                  'Islamic history and civilization',
                  'Contemporary Islamic issues',
                  'Basic Arabic language'
                ]}
                schedule={{ time: '5:00 PM - 7:00 PM', days: 'Mon-Fri' }}
                imageSrc="https://images.unsplash.com/photo-1604245155712-52ae0ae6fe2e"
                imageAlt="Youth in Madrassah"
              />
            </TabsContent>

            <TabsContent value="adults" className="space-y-8">
              <ProgramTab
                title="Adult Program"
                description="Our adult program offers in-depth Islamic education for those seeking to deepen their understanding of the faith."
                curriculum={[
                  'Advanced Quran study with tafsir (interpretation)',
                  'Hadith studies',
                  'Islamic jurisprudence (Fiqh)',
                  'Islamic theology (Aqeedah)',
                  'Comparative religion',
                  'Intermediate Arabic language'
                ]}
                schedule={{ time: '7:00 PM - 9:00 PM', days: 'Tue & Thu' }}
                imageSrc="https://images.unsplash.com/photo-1654860687488-119a90eafa86"
                imageAlt="Adults in Madrassah"
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    );

    export default ProgramsSection;