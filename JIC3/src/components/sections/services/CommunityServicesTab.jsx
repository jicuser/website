import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';
    import { Heart, Coffee, Gift, Users, Headphones, Globe } from 'lucide-react';

    const communityServices = [
      { 
        icon: <Heart className="h-10 w-10 text-primary" />, 
        title: 'Charity & Zakat', 
        description: 'Collection and distribution of Zakat and Sadaqah to help those in need in our community.' 
      },
      { 
        icon: <Coffee className="h-10 w-10 text-primary" />, 
        title: 'Community Gatherings', 
        description: 'Regular social events to strengthen community bonds and provide networking opportunities.' 
      },
      { 
        icon: <Gift className="h-10 w-10 text-primary" />, 
        title: 'Food Bank', 
        description: 'Weekly food distribution service for families in need, regardless of faith or background.' 
      },
      { 
        icon: <Users className="h-10 w-10 text-primary" />, 
        title: 'Youth Programs', 
        description: 'Activities and mentoring programs specifically designed for Muslim youth and teenagers.' 
      },
      { 
        icon: <Headphones className="h-10 w-10 text-primary" />, 
        title: 'Counseling Services', 
        description: 'Professional counseling for individuals and families facing personal or social challenges.' 
      },
      { 
        icon: <Globe className="h-10 w-10 text-primary" />, 
        title: 'Interfaith Activities', 
        description: 'Collaborative events with other faith communities to promote understanding and harmony.' 
      }
    ];

    const CommunityServicesTab = () => {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {communityServices.map((service, index) => (
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
                      {service.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
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
            className="prayer-time-gradient text-white rounded-lg p-8 text-center"
          >
            <h3 className="text-2xl font-bold mb-4">Volunteer With Us</h3>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Our community services rely on dedicated volunteers. Join us in making a difference in our community by volunteering your time and skills.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h4 className="font-bold mb-2">Food Bank</h4>
                <p className="text-sm">Help with food collection, sorting, and distribution.</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h4 className="font-bold mb-2">Youth Mentoring</h4>
                <p className="text-sm">Guide and support our youth through various activities.</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                <h4 className="font-bold mb-2">Event Organization</h4>
                <p className="text-sm">Assist in planning and organizing community events.</p>
              </div>
            </div>
          </motion.div>
        </>
      );
    };

    export default CommunityServicesTab;