/**
 * Route: /youth
 * Youth landing + Masjid Itikaaf registration (in-app form; data → Google Sheet webhook or Supabase).
 */

import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

import ItikaafRegistrationForm from '@/components/sections/youth/ItikaafRegistrationForm';

const PAGE_TITLE = 'Youth Programs | Jamatia Islamic Centre';
const META_DESCRIPTION =
	'Join our youth programs and activities at Jamatia Islamic Centre. Engage with the community through educational, spiritual, and recreational programs designed for young Muslims.';

const HERO_HEADING = 'Youth Programs';
const HERO_BODY =
	'Empowering our youth through faith-based programs, educational activities, and community engagement. Join us in building a stronger, more connected Muslim youth community.';

const REGISTRATION_HEADING = 'Itikaaf Registration';
const REGISTRATION_INTRO =
	'Register for our youth Itikaaf program by completing the form below. Please fill in all required information accurately.';

function YouthHero() {
	return (
		<motion.section
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
			className="relative bg-gradient-to-br from-primary/10 via-secondary/5 to-background py-20 md:py-32"
		>
			<div className="container mx-auto px-4">
				<div className="max-w-4xl mx-auto text-center">
					<motion.h1
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.2, duration: 0.6 }}
						className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground"
					>
						{HERO_HEADING}
					</motion.h1>
					<motion.p
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.3, duration: 0.6 }}
						className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
					>
						{HERO_BODY}
					</motion.p>
				</div>
			</div>
		</motion.section>
	);
}

function YouthRegistrationSection() {
	return (
		<motion.section
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4, duration: 0.6 }}
			className="py-6 md:py-8"
		>
			<div className="container mx-auto px-3 sm:px-4">
				<div className="mx-auto max-w-4xl">
					<div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
						<div className="mb-3 text-center md:text-left">
							<h2 className="text-xl font-bold text-card-foreground md:text-2xl">{REGISTRATION_HEADING}</h2>
							<p className="text-sm text-muted-foreground">{REGISTRATION_INTRO}</p>
						</div>
						<ItikaafRegistrationForm />
					</div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.6, duration: 0.6 }}
						className="mt-4 text-center"
					>
						<p className="text-sm text-muted-foreground">
							For questions or assistance with registration, please contact us at{' '}
							<a href="/contact" className="text-primary hover:underline font-medium">
								our contact page
							</a>
							.
						</p>
					</motion.div>
				</div>
			</div>
		</motion.section>
	);
}

export default function YouthPage() {
	return (
		<>
			<Helmet>
				<title>{PAGE_TITLE}</title>
				<meta name="description" content={META_DESCRIPTION} />
			</Helmet>

			<div className="min-h-screen bg-background">
				<YouthHero />
				<YouthRegistrationSection />
			</div>
		</>
	);
}
