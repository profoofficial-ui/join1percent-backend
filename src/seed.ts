import bcrypt from 'bcryptjs';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { Course } from './models/Course.js';
import { User } from './models/User.js';
import { Faq } from './models/Faq.js';

export async function seedAdmin() {
  const email = env.adminEmail;
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
    }
    console.log(`Admin already exists: ${email}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  const admin = await User.create({
    name: env.adminName,
    email,
    passwordHash,
    role: 'admin',
    affiliateCode: 'ADMIN',
    isActive: true,
  });

  console.log(`Admin seeded: ${email} / ${env.adminPassword}`);
  return admin;
}

export async function seedFaqs() {
  const count = await Faq.countDocuments();
  if (count > 0) {
    console.log(`FAQs already seeded: ${count}`);
    return;
  }

  const defaultFaqs = [
    {
      category: 'General',
      question: 'How is Coursellm different from Udemy, YouTube, or other edtech platforms?',
      answer: 'Unlike massive aggregators with low quality control, Coursellm courses are exclusively created by active industry practitioners (Staff Engineers, Growth Leads, Agency Founders). We cut all filler content to focus on actionable frameworks, modern production toolsets (2026 standards), and portfolio capstones.',
      orderIndex: 1,
    },
    {
      category: 'Courses',
      question: 'Are the courses pre-recorded or live?',
      answer: 'All core modules are high-definition, tightly edited on-demand video lessons so you can learn at your own pace. In addition, bundle and Pro learners receive access to monthly live Q&A sessions and interactive workshops.',
      orderIndex: 2,
    },
    {
      category: 'Certificates',
      question: 'Do I receive a certificate upon course completion?',
      answer: 'Yes. Upon completing all lessons and passing the module checkpoints, you receive an official, cryptographically verifiable Coursellm Certificate of Completion with a unique ID that you can embed directly into LinkedIn and your resume.',
      orderIndex: 3,
    },
    {
      category: 'Payments',
      question: 'What payment methods are supported?',
      answer: 'We support all major Indian and international payment options, including UPI (Google Pay, PhonePe, Paytm), Net Banking, Credit/Debit Cards (Visa, Mastercard, RuPay, Amex), and EMI options.',
      orderIndex: 4,
    },
    {
      category: 'Refunds',
      question: 'What is your refund policy?',
      answer: 'We offer a 100% 30-day money-back guarantee. If you complete less than 30% of a course and feel it did not deliver practical value, simply reach out to our team at support@coursellm.com and we will issue a full refund.',
      orderIndex: 5,
    },
    {
      category: 'Account',
      question: 'How long do I keep access to my purchased courses?',
      answer: 'You receive full lifetime access. This includes all future updates, refreshed tool guides, and new lesson additions at no extra charge.',
      orderIndex: 6,
    },
  ];

  await Faq.create(defaultFaqs);
  console.log(`Seeded ${defaultFaqs.length} default FAQs.`);
}

import { Bundle } from './models/Bundle.js';

export async function seedBundlesAndCourses() {
  const plans = [
    {
      slug: 'trial',
      name: 'Trial Package',
      price: 599,
      image: 'https://plus.unsplash.com/premium_photo-1683980578016-a1f980719ec2?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: ['Affiliate Marketing Series', 'Theme Pages'],
      tagline: 'Try the core lessons before you commit.',
      badge: 'Starter',
    },
    {
      slug: 'gold',
      name: 'Gold',
      price: 999,
      image: 'https://plus.unsplash.com/premium_photo-1682310088032-4320a8bdd5d0?q=80&w=1212&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: [
        'Affiliate Marketing Mastery',
        'Instagram Mastery',
        'YouTube Mastery',
        'Social Media Marketing',
        'Canva Mastery',
        'Facebook Ads Mastery',
        'Video Editing Mastery',
        'Communication Mastery',
      ],
      tagline: 'The everyday pack for affiliates getting started.',
      badge: 'Popular',
    },
    {
      slug: 'platinum',
      name: 'Platinum',
      price: 2299,
      image: 'https://plus.unsplash.com/premium_photo-1781937379667-8504970206f4?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: [
        'Affiliate Marketing Series',
        'Theme Pages',
        'Affiliate Marketing Mastery',
        'Video Editing Mastery',
        'Social Media Marketing',
        'Instagram Mastery',
        'Canva Mastery',
        'Facebook Ads Mastery',
        'YouTube Mastery',
        'Communication Mastery',
        'Lead Generation',
        'Content Creation',
        'Chat GPT',
        'Attraction Marketing',
      ],
      tagline: 'More depth for people already making sales.',
      badge: 'Best value',
    },
    {
      slug: 'diamond',
      name: 'Diamond',
      price: 4999,
      image: 'https://plus.unsplash.com/premium_photo-1780623449432-943b7a6ab0c8?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: [
        'Affiliate Marketing Series',
        'Theme Pages',
        'Affiliate Marketing Mastery',
        'Video Editing Mastery',
        'Social Media Marketing',
        'Instagram Mastery',
        'Canva Mastery',
        'Facebook Ads Mastery',
        'YouTube Mastery',
        'Communication Mastery',
        'Lead Generation',
        'Content Creation',
        'Chat GPT',
        'Attraction Marketing',
        'Blogging',
        'Email Marketing',
        'WhatsApp Funnel',
        'Web Development',
      ],
      tagline: 'Full stack of growth and content skills.',
      badge: 'Pro',
    },
    {
      slug: 'sapphire',
      name: 'Sapphire',
      price: 7999,
      image: 'https://plus.unsplash.com/premium_photo-1670213989448-311d36bd6dca?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: [
        'Affiliate Marketing Series',
        'Theme Pages',
        'Affiliate Marketing Mastery',
        'Video Editing Mastery',
        'Social Media Marketing',
        'Instagram Mastery',
        'Canva Mastery',
        'Facebook Ads Mastery',
        'YouTube Mastery',
        'Communication Mastery',
        'Lead Generation',
        'Content Creation',
        'Chat GPT',
        'Attraction Marketing',
        'Blogging',
        'Email Marketing',
        'WhatsApp Funnel',
        'Web Development',
        'Finance Mastery',
        'Stock Market',
        'Drop Shipping',
      ],
      tagline: 'Premium set for serious operators.',
      badge: 'Premium',
    },
    {
      slug: 'titan-ai-plus',
      name: 'Titan AI+',
      price: 12999,
      image: 'https://plus.unsplash.com/premium_photo-1683583961436-fa9efb9f72d7?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      courses: [
        'Affiliate Marketing Series',
        'Theme Pages',
        'Affiliate Marketing Mastery',
        'Video Editing Mastery',
        'Social Media Marketing',
        'Instagram Mastery',
        'Canva Mastery',
        'Facebook Ads Mastery',
        'YouTube Mastery',
        'Communication Mastery',
        'Lead Generation',
        'Content Creation',
        'Chat GPT',
        'Attraction Marketing',
        'Blogging',
        'Email Marketing',
        'WhatsApp Funnel',
        'Web Development',
        'Finance Mastery',
        'Stock Market',
        'Drop Shipping',
        'AI Basics for Beginners',
        'Chat GPT Mastery',
      ],
      tagline: 'AI-first pack for high-ticket offers.',
      badge: 'Flagship',
    },
  ];

  const toCourseSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const defaultLessons = [
    { id: '1', title: 'Introduction', duration: '12 min', videoUrl: '' },
    { id: '2', title: 'Core concepts', duration: '28 min', videoUrl: '' },
    { id: '3', title: 'Practice session', duration: '35 min', videoUrl: '' },
    { id: '4', title: 'Wrap up', duration: '10 min', videoUrl: '' },
  ];

  const uniqueTitles = [...new Set(plans.flatMap((p) => p.courses))];
  const categories = ['Marketing', 'Design', 'Content', 'AI', 'Development', 'Communication', 'Digital Skills'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  const instructors = ['Neha Kapoor', 'Rahul Mehta', 'Ananya Iyer', 'Coursellm Faculty'];
  const durations = ['2h 15m', '4h 20m', '6h 40m', '3h 05m', '5h 10m'];

  console.log(`Seeding ${uniqueTitles.length} courses...`);
  for (let i = 0; i < uniqueTitles.length; i++) {
    const title = uniqueTitles[i];
    const slug = toCourseSlug(title);
    await Course.findOneAndUpdate(
      { slug },
      {
        slug,
        title,
        description: `Video lessons and practice for ${title}.`,
        image: plans[i % plans.length].image,
        instructor: instructors[i % instructors.length],
        level: levels[i % levels.length],
        duration: durations[i % durations.length],
        language: i % 2 === 0 ? 'Hindi + English' : 'English',
        category: categories[i % categories.length],
        videoUrl: '',
        lessons: defaultLessons,
      },
      { upsert: true, new: true }
    );
  }

  console.log(`Seeding ${plans.length} bundles...`);
  for (const plan of plans) {
    await Bundle.findOneAndUpdate(
      { slug: plan.slug },
      {
        slug: plan.slug,
        name: plan.name,
        price: plan.price,
        image: plan.image,
        courseIds: plan.courses.map(toCourseSlug),
        tagline: plan.tagline,
        badge: plan.badge,
      },
      { upsert: true, new: true }
    );
  }

  console.log('Seeding courses and bundles complete.');
}

import { Instructor } from './models/Instructor.js';

export async function seedInstructors() {
  const count = await Instructor.countDocuments();
  if (count > 0) {
    console.log(`Instructors already seeded: ${count}`);
    return;
  }

  const defaultInstructors = [
    {
      slug: 'aravind_nair',
      name: 'Aravind Nair',
      role: 'Staff AI Engineer & LLM Architect',
      company: 'Ex-Flipkart & Stripe',
      bio: '11+ years building production generative AI systems, prompt orchestration engines, and high-throughput agent workflows.',
      avatarUrl: 'https://thumbs.dreamstime.com/b/indian-man-portrait-close-up-happy-young-56800239.jpg',
      studentsCount: 14200,
      coursesCount: 3,
      rating: 4.9,
      orderIndex: 1,
      isActive: true,
    },
    {
      slug: 'devanshi_patel',
      name: 'Devanshi Patel',
      role: 'Head of Growth Marketing',
      company: 'ScaleX Digital',
      bio: 'Scaled 40+ D2C and B2B SaaS brands through algorithmic paid media, performance funnels, and retention systems.',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
      studentsCount: 18900,
      coursesCount: 4,
      rating: 4.85,
      orderIndex: 2,
      isActive: true,
    },
    {
      slug: 'vikram_mehta',
      name: 'Vikram Mehta',
      role: 'Principal Full-Stack Engineer',
      company: 'TechLead & Architect',
      bio: 'Full-stack systems craftsman specializing in modern React 19, TypeScript, Next.js architecture, and distributed backend scaling.',
      avatarUrl: 'https://thumbs.dreamstime.com/b/close-up-portrait-smiling-indian-business-man-arms-crossed-isolated-white-51836176.jpg',
      studentsCount: 22100,
      coursesCount: 5,
      rating: 4.92,
      orderIndex: 3,
      isActive: true,
    },
    {
      slug: 'ananya_sen',
      name: 'Ananya Sen',
      role: 'Principal Product Designer',
      company: 'Design System Lead',
      bio: 'Passionate design leader mentoring thousands in Figma typography, design tokens, microinteractions, and user research.',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
      studentsCount: 16500,
      coursesCount: 3,
      rating: 4.9,
      orderIndex: 4,
      isActive: true,
    },
  ];

  await Instructor.create(defaultInstructors);
  console.log(`Seeded ${defaultInstructors.length} default instructors.`);
}

import { Testimonial } from './models/Testimonial.js';

export async function seedTestimonials() {
  const count = await Testimonial.countDocuments();
  if (count > 0) {
    console.log(`Testimonials already seeded: ${count}`);
    return;
  }

  const defaultTestimonials = [
    {
      name: 'Aaditya Rao',
      role: 'Growth Engineer',
      company: 'Fintech Startup, Bengaluru',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      quote: 'Coursellm courses are completely devoid of fluff. The AI Agent workflows course directly enabled me to deploy an internal support assistant that processes 4,000 queries daily.',
      careerImpact: 'Promoted to Lead AI Integration Engineer with a 45% salary hike.',
      orderIndex: 1,
      isActive: true,
    },
    {
      name: 'Sneha Chawla',
      role: 'Independent Brand Consultant',
      company: 'Mumbai',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      quote: 'The high-ticket freelancing framework completely changed my positioning. I stopped charging hourly rates and closed two European retainers worth $4,200/mo.',
      careerImpact: 'Transitioned from ₹40k/month freelance gigs to $4,000+ monthly international retainers.',
      orderIndex: 2,
      isActive: true,
    },
    {
      name: 'Harsh Vardhan',
      role: 'Frontend Architect',
      company: 'Scale-up SaaS, Pune',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      rating: 5,
      quote: 'The curriculum is built by genuine practitioners who understand what production code looks like. No toy examples or outdated syntax. Every lesson is dense with gold.',
      careerImpact: 'Shipped a redesign that boosted web core vitals score to 99.',
      orderIndex: 3,
      isActive: true,
    },
  ];

  await Testimonial.create(defaultTestimonials);
  console.log(`Seeded ${defaultTestimonials.length} default testimonials.`);
}

export async function reportCatalogueCounts() {
  const courses = await Course.countDocuments();
  const bundles = await Bundle.countDocuments();
  const instructors = await Instructor.countDocuments();
  const testimonials = await Testimonial.countDocuments();
  console.log(`Courses in database: ${courses}`);
  console.log(`Bundles in database: ${bundles}`);
  console.log(`Instructors in database: ${instructors}`);
  console.log(`Testimonials in database: ${testimonials}`);
}

async function run() {
  await connectDb();
  await seedAdmin();
  await seedFaqs();
  await seedBundlesAndCourses();
  await seedInstructors();
  await seedTestimonials();
  await reportCatalogueCounts();
  process.exit(0);
}

const isDirectRun = process.argv[1]?.includes('seed');
if (isDirectRun) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
