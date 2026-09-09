import React from 'react';
    import { motion } from 'framer-motion';
    import { Card, CardContent } from '@/components/ui/card';

    const FaqCard = ({ question, answer, index }) => (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card className="h-full">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold mb-2">{question}</h3>
            <p className="text-gray-600 dark:text-gray-300">{answer}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
    export default FaqCard;