import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPage = () => {
  return (
    <div className="page-transition pt-24">
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Last Updated: May 31, 2025
            </p>
            
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                At Jamatia Islamic Centre, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or interact with us in any way.
              </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
              <p>
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Register for our services or events</li>
                <li>Sign up for our newsletter</li>
                <li>Fill out a contact form</li>
                <li>Enroll in our Madrassah or other educational programs</li>
                <li>Make a donation</li>
                <li>Participate in surveys or feedback forms</li>
              </ul>
              
              <p>
                The personal information we collect may include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Date of birth (for age-specific programs)</li>
                <li>Payment information (for donations or service fees)</li>
                <li>Emergency contact information</li>
                <li>Photographs or videos (with your consent)</li>
              </ul>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Your Information</h2>
              <p>
                We may use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing and maintaining our services</li>
                <li>Processing donations and payments</li>
                <li>Sending newsletters and communications about our activities and events</li>
                <li>Responding to your inquiries and requests</li>
                <li>Improving our website and services</li>
                <li>Administering educational programs</li>
                <li>Complying with legal obligations</li>
              </ul>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Information Sharing and Disclosure</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to outside parties except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your consent</li>
                <li>To trusted third parties who assist us in operating our website, conducting our business, or servicing you</li>
                <li>To comply with legal requirements, such as responding to a subpoena or court order</li>
                <li>To protect our rights, property, or safety, or the rights, property, or safety of others</li>
              </ul>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access the personal information we hold about you</li>
                <li>The right to request correction of inaccurate information</li>
                <li>The right to request deletion of your information</li>
                <li>The right to withdraw consent</li>
                <li>The right to lodge a complaint with a supervisory authority</li>
              </ul>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Cookies and Tracking Technologies</h2>
              <p>
                Our website may use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can control cookies through your browser settings.
              </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Children's Privacy</h2>
              <p>
                We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
              
              <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
              <p>
                If you have any questions or concerns about our Privacy Policy, please contact us at:
              </p>
              <p className="mt-2">
                Jamatia Islamic Centre<br />
                179 - 183 Woodlands Road<br />
                Sparkhill, Birmingham, B11 4ER<br />
                Email: info@jicmasjid.org<br />
                Phone: +44 121 778 6612
              </p>
            </div>
            
            <div className="mt-12 text-center">
              <Button asChild>
                <Link to="/contact">Contact Us With Questions</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPage;