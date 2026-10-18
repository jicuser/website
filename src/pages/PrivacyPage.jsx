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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Privacy Policy
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Last updated: 18 October 2026</p>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                This policy explains how Jamatia Islamic Centre uses personal information provided
                through this website and its services. Contact the centre if you need to ask about
                a particular form, record or use of your information.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Information We Collect</h2>
              <p>
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Register for our services or events</li>
                <li>Request portal access or use your JIC account</li>
                <li>Fill out a contact form</li>
                <li>Enrol in our Madrassah or other educational programmes</li>
                <li>Make a donation or submit a fundraising page</li>
                <li>Request a booking, certificate or other centre service</li>
              </ul>

              <p>The personal information we collect may include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Age or date of birth, where needed for an activity or enrolment</li>
                <li>Invoice, donation and recorded payment details</li>
                <li>Emergency contacts and relevant health information for activities</li>
                <li>Files you upload with a form, where requested</li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4">How We Use Your Information</h2>
              <p>We may use the information we collect for various purposes, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing and maintaining our services</li>
                <li>Processing donations and payments</li>
                <li>Communicating with you about your account, activity or request</li>
                <li>Responding to your enquiries and requests</li>
                <li>Improving our website and services</li>
                <li>Administering educational programmes</li>
                <li>Complying with legal obligations</li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4">
                Portal, fundraising and centre records
              </h2>
              <p>
                We use your account email and access request details to provide the portal and
                review the access you need. Public fundraising pages show the organiser name, story,
                target and confirmed total that you submit for publication. Do not include private
                information about other people in your page.
              </p>
              <p>
                Invoices and payment references are restricted to authorised finance staff and,
                where explicitly linked, the verified account receiving the invoice. We do not
                collect card details through the donation pages. Bank transfers take place in your
                own banking service.
              </p>
              <p>
                Safeguarding review records have restricted access. Contact the centre directly
                about safeguarding information and how long it is kept. Do not send DBS
                certificates or criminal record details through general enquiry forms.
              </p>
              <p>
                Access requests include a temporary identifier derived from your network address
                to limit repeated abuse. The contact map loads from Google Maps, and the Qur’an
                reader requests text from AlQuran Cloud. Social previews and Polycam walkthroughs
                connect to their providers when you choose to open them. These services receive
                connection information when their content loads and apply their own privacy and
                cookie policies.
              </p>
              <p>
                For access, correction, deletion or retention questions, contact the centre using
                the details below. Accounting records may need to be retained to meet legal
                obligations; the team will explain any applicable limits.
              </p>
              <h2 className="text-2xl font-bold mt-8 mb-4">Information Sharing and Disclosure</h2>
              <p>
                We do not sell, trade, or otherwise transfer your personal information to outside
                parties except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your consent</li>
                <li>
                  With service providers needed to operate the website, manage records or respond
                  to your request
                </li>
                <li>
                  To meet legal requirements, including a valid court order
                </li>
                <li>
                  To protect our rights, property, or safety, or the rights, property, or safety of
                  others
                </li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4">Optional Salah Reminders</h2>
              <p>
                Reminders are off unless you choose to enable them and allow notifications. We store
                your device’s push subscription, a private device-access proof and your chosen
                prayers and timing settings. No account, name or telephone number is needed. Your
                browser’s notification provider delivers encrypted notifications to the device. The
                subscription is not published or used for advertising.
              </p>
              <p>
                Use Turn off reminders on the reminder page to remove this device’s subscription and
                settings. Unusable subscriptions are removed after the provider reports them
                expired. Delivery receipts are kept for up to eight days to prevent duplicates;
                hashed request-rate limits are kept for up to two days to limit abuse. Notifications
                can be delayed or silenced by phone settings or network conditions.
              </p>
              <h2 className="text-2xl font-bold mt-8 mb-4">Data Security</h2>
              <p>
                We use access controls to protect personal information from unauthorised access,
                alteration, disclosure or destruction. However, no method of
                transmission over the Internet or electronic storage is 100% secure, and we cannot
                guarantee absolute security.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Your Rights</h2>
              <p>
                You can contact the centre about your data protection rights, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access the personal information we hold about you</li>
                <li>The right to request correction of inaccurate information</li>
                <li>The right to request deletion of your information</li>
                <li>The right to withdraw consent</li>
                <li>The right to raise a concern with the UK Information Commissioner’s Office</li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4">Cookies and Browser Storage</h2>
              <p>
                The website uses browser storage for appearance preferences, sign-in within your
                current tab, reminder settings and display connections. You can manage or clear
                website data in your browser settings. Clearing it may sign you out or reset your
                preferences. External services may use their own cookies when their content loads.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Children's Privacy</h2>
              <p>
                Parents and guardians may provide information about children when enquiring about
                classes, registering for activities or requesting family access. Share only the
                details requested. Contact the centre if you are concerned about a child’s
                information or need to correct a record.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Changes to This Privacy Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any
                changes by posting the new Privacy Policy on this page and updating the "Last
                updated" date.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
              <p>
                If you have any questions or concerns about our Privacy Policy, please contact us
                at:
              </p>
              <p className="mt-2">
                Jamatia Islamic Centre
                <br />
                179 - 183 Woodlands Road
                <br />
                Sparkhill, Birmingham, B11 4ER
                <br />
                Email: info@jicwoodlands.org.uk
                <br />
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
