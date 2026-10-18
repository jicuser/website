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
        <h4 className="font-bold text-lg mb-2">Learning topics to ask about</h4>
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
        <img className="w-full h-full object-cover" alt={imageAlt} src={imageSrc} />
      </div>
    </div>
  </motion.div>
);

const ProgramsSection = () => (
  <section className="py-16 bg-gray-50 dark:bg-gray-800">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Classes & learning</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Use these topics to discuss a suitable class. The team can confirm the current
          curriculum, age groups and timetable.
        </p>
      </div>

      <Tabs defaultValue="children" className="w-full max-w-4xl mx-auto">
        <div className="flex justify-center mb-8">
          <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-md">
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="youth">Young people</TabsTrigger>
            <TabsTrigger value="adults">Adults</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="children" className="space-y-8">
          <ProgramTab
            title="Children’s learning"
            description="Ask about introductory Islamic learning and Qur’an reading for your child."
            curriculum={[
              'Basic Quran recitation (Qaida)',
              'Memorisation of short surahs',
              'Islamic manners and etiquette',
              'Basic Islamic beliefs',
              'Stories of the Prophets',
              'Introduction to Arabic alphabet',
            ]}
            schedule={{ time: 'Confirm class times', days: 'Ask about current groups' }}
            imageSrc="https://images.unsplash.com/photo-1624863037771-b6e5dde7f4aa"
            imageAlt="Illustrative study image"
          />
        </TabsContent>

        <TabsContent value="youth" className="space-y-8">
          <ProgramTab
            title="Learning for young people"
            description="Ask about classes that build on earlier Islamic learning and Qur’an study."
            curriculum={[
              'Advanced Quran recitation with tajweed',
              'Memorisation of selected surahs',
              'Fundamentals of Islamic jurisprudence',
              'Islamic history and civilisation',
              'Contemporary Islamic issues',
              'Basic Arabic language',
            ]}
            schedule={{ time: 'Confirm class times', days: 'Ask about current groups' }}
            imageSrc="https://images.unsplash.com/photo-1604245155712-52ae0ae6fe2e"
            imageAlt="Illustrative study image"
          />
        </TabsContent>

        <TabsContent value="adults" className="space-y-8">
          <ProgramTab
            title="Adult learning"
            description="Ask the centre about adult courses, entry requirements and the topics you would like to study."
            curriculum={[
              'Advanced Quran study with tafsir (interpretation)',
              'Hadith studies',
              'Islamic jurisprudence (Fiqh)',
              'Islamic theology (Aqeedah)',
              'Comparative religion',
              'Intermediate Arabic language',
            ]}
            schedule={{ time: 'Confirm course times', days: 'Ask about current courses' }}
            imageSrc="https://images.unsplash.com/photo-1654860687488-119a90eafa86"
            imageAlt="Illustrative study image"
          />
        </TabsContent>
      </Tabs>
    </div>
  </section>
);

export default ProgramsSection;
