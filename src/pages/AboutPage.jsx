import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, BookOpen, Award, Globe } from 'lucide-react';
import MosqueIcon from '@/components/icons/MosqueIcon';
import { IMAGES } from '@/content/images';

const AboutPage = () => {
  return (
    <div className="page-transition pt-24">
      {/* Hero Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  About Jamatia Islamic Centre
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                  Founded with a vision to serve the Muslim community and promote Islamic values,
                  Jamatia Islamic Centre has been a cornerstone of spiritual guidance and community
                  service.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Our centre provides a welcoming environment for Muslims and non-Muslims alike to
                  learn about Islam, engage in worship, and participate in community activities.
                </p>
              </motion.div>
            </div>
            <div className="md:w-1/2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative rounded-lg overflow-hidden shadow-xl"
              >
                <img
                  src={IMAGES.aboutHero}
                  className="w-full h-auto rounded-lg object-cover aspect-[16/9]"
                  alt="Jamatia Islamic Centre exterior view"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Our History */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our History</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              The journey of Jamatia Islamic Centre from its humble beginnings to what it is today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <img
                src={IMAGES.aboutHistory}
                className="w-full h-auto rounded-lg shadow-lg object-cover aspect-[16/9]"
                alt="Historical photo of Jamatia Islamic Centre"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                From Small Beginnings
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Established in 1985, Jamatia Islamic Centre began as a small prayer room serving a
                handful of Muslim families in the area. Through dedication and community support, it
                has grown into a comprehensive Islamic center.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                In 1995, we moved to our current location and expanded our services to include
                educational programs, community outreach, and social services. The center underwent
                major renovations in 2010 to accommodate our growing congregation.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Today, Jamatia Islamic Centre stands as a beacon of Islamic knowledge and community
                service, welcoming hundreds of worshippers each week and offering a wide range of
                programs for all ages.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Mission & Vision */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Mission & Vision
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Guided by Islamic principles, we strive to serve our community and promote
              understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full border-t-4 border-t-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Heart className="h-8 w-8 text-primary mr-3" />
                    <h3 className="text-2xl font-bold">Our Mission</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To provide a welcoming space for worship, education, and community service based
                    on Islamic principles of peace, compassion, and understanding.
                  </p>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Promote Islamic education and understanding
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Provide spiritual guidance and support
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Foster community engagement and service
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Build bridges with other faith communities
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="h-full border-t-4 border-t-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <Globe className="h-8 w-8 text-primary mr-3" />
                    <h3 className="text-2xl font-bold">Our Vision</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    To be a leading Islamic center that inspires spiritual growth, promotes
                    educational excellence, and serves as a model of community engagement and
                    interfaith harmony.
                  </p>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Become a center of excellence for Islamic education
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Develop programs that address contemporary challenges
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Expand our facilities to serve more community members
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      Lead initiatives for positive social change
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              These principles guide everything we do at Jamatia Islamic Centre.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <MosqueIcon className="h-10 w-10 text-primary" />,
                title: 'Faith & Devotion',
                description:
                  'Unwavering commitment to Islamic principles and practices in all our activities.',
              },
              {
                icon: <Users className="h-10 w-10 text-primary" />,
                title: 'Community Service',
                description:
                  'Dedicated to serving the needs of our community with compassion and care.',
              },
              {
                icon: <BookOpen className="h-10 w-10 text-primary" />,
                title: 'Knowledge & Education',
                description:
                  'Promoting continuous learning and understanding of Islamic teachings.',
              },
              {
                icon: <Heart className="h-10 w-10 text-primary" />,
                title: 'Compassion & Mercy',
                description: 'Treating everyone with kindness, understanding, and respect.',
              },
              {
                icon: <Award className="h-10 w-10 text-primary" />,
                title: 'Excellence & Integrity',
                description: 'Striving for the highest standards in all our programs and services.',
              },
              {
                icon: <Globe className="h-10 w-10 text-primary" />,
                title: 'Inclusivity & Openness',
                description:
                  'Welcoming people of all backgrounds to learn about Islam and engage with our community.',
              },
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all">
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="mb-4 p-3 rounded-full bg-primary/10">{value.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
