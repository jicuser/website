import React from 'react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';
    import { Button } from '@/components/ui/button';

    const registrationSteps = [
      { title: 'Complete the Registration Form', details: 'Fill out the registration form available at the centre or download it from our website.' },
      { title: 'Assessment', details: 'New students will undergo a brief assessment to determine their current level of knowledge.' },
      { title: 'Fee Payment', details: 'Pay the registration fee and first month\'s tuition.' },
      { title: 'Orientation', details: 'Attend the orientation session to learn about our policies and procedures.' },
      { title: 'Start Classes', details: 'Begin your journey of Islamic learning!' }
    ];

    const fees = [
      { program: 'Children\'s Program (5-10)', amount: '£25/month' },
      { program: 'Youth Program (11-16)', amount: '£30/month' },
      { program: 'Adult Program (17+)', amount: '£35/month' },
      { program: 'Special Courses', amount: 'Varies by course' }
    ];

    const schedule = [
      { program: 'Children\'s Program', time: 'Mon-Fri, 4:00 PM - 6:00 PM' },
      { program: 'Youth Program', time: 'Mon-Fri, 5:00 PM - 7:00 PM' },
      { program: 'Adult Program', time: 'Tue & Thu, 7:00 PM - 9:00 PM' },
      { program: 'Weekend Classes', time: 'Sat & Sun, 10:00 AM - 1:00 PM' }
    ];

    const EnrollmentSection = () => (
      <section id="enrollment" className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Enrollment Information</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Join our Madrassah and embark on a journey of Islamic learning and spiritual growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
            >
              <h3 className="text-xl font-bold mb-4">Registration Process</h3>
              <ol className="space-y-4 text-gray-600 dark:text-gray-300">
                {registrationSteps.map((step, index) => (
                  <li key={index} className="flex">
                    <span className="font-bold text-primary mr-2">{index + 1}.</span>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm">{step.details}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6"
            >
              <h3 className="text-xl font-bold mb-4">Fees & Schedule</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-lg mb-2">Tuition Fees</h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    {fees.map((fee, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{fee.program}:</span>
                        <span className="font-medium">{fee.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Class Schedule</h4>
                  <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                    {schedule.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.program}:</span>
                        <span className="font-medium">{item.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-600 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-bold">Note:</span> Financial assistance is available for families in need. Please contact the administration for more information.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-10">
            <Button asChild size="lg">
              <Link to="/contact">Contact Us for Enrollment</Link>
            </Button>
          </div>
        </div>
      </section>
    );

    export default EnrollmentSection;