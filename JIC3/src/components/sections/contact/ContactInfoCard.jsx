import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';

    const ContactInfoCard = ({ icon, title, details, index }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card className="h-full hover:shadow-lg transition-all">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="mb-4 p-3 rounded-full bg-primary/10">
              {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <ul className="space-y-1 text-gray-600 dark:text-gray-300">
              {details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    );

    export default ContactInfoCard;