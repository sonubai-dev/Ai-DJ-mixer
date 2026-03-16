import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type InfoPage = 'about' | 'contact' | 'terms' | 'privacy' | null;

interface InfoModalProps {
  page: InfoPage;
  onClose: () => void;
}

export function InfoModal({ page, onClose }: InfoModalProps) {
  if (!page) return null;

  const content = {
    about: {
      title: 'About AI DJ Mixer',
      body: (
        <div className="space-y-4 text-gray-300">
          <p>
            AI DJ Mixer is a professional, browser-based audio manipulation tool designed for creators, DJs, and music enthusiasts. 
          </p>
          <p>
            Our mission is to democratize music production by providing powerful, AI-assisted tools directly in your browser without the need for expensive software or complex setups.
          </p>
          <p>
            Built with modern web technologies including the Web Audio API, React, and advanced AI models, we bring studio-quality effects like Slowed + Reverb, Nightcore, and 8D Audio to everyone.
          </p>
        </div>
      )
    },
    contact: {
      title: 'Contact Us',
      body: (
        <div className="space-y-4 text-gray-300">
          <p>
            Have questions, feedback, or feature requests? We'd love to hear from you!
          </p>
          <p>
            <strong>Email:</strong> support@aidjmixer.example.com
          </p>
          <p>
            <strong>Twitter:</strong> @AIDJMixer
          </p>
          <p>
            For business inquiries or API access, please reach out to our partnerships team.
          </p>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      body: (
        <div className="space-y-4 text-gray-300 text-sm h-64 overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="font-bold text-white">1. Acceptance of Terms</h4>
          <p>By accessing and using AI DJ Mixer, you accept and agree to be bound by the terms and provision of this agreement.</p>
          
          <h4 className="font-bold text-white mt-4">2. User Uploads and Copyright</h4>
          <p>You retain all rights to the audio files you upload. You are solely responsible for ensuring you have the necessary rights and permissions to modify and distribute any audio files you process using our service. AI DJ Mixer does not claim ownership of your content.</p>
          
          <h4 className="font-bold text-white mt-4">3. Acceptable Use</h4>
          <p>You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. Automated scraping or API abuse is strictly prohibited.</p>
          
          <h4 className="font-bold text-white mt-4">4. Disclaimer of Warranties</h4>
          <p>The service is provided "as is" without any warranty of any kind. We do not guarantee that the service will be uninterrupted or error-free.</p>
        </div>
      )
    },
    privacy: {
      title: 'Privacy Policy',
      body: (
        <div className="space-y-4 text-gray-300 text-sm h-64 overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="font-bold text-white">1. Data Collection</h4>
          <p>We collect minimal personal information necessary to provide our services, such as your email address when you create an account.</p>
          
          <h4 className="font-bold text-white mt-4">2. Audio Files</h4>
          <p>Audio files uploaded to AI DJ Mixer are processed locally in your browser using the Web Audio API whenever possible. Files are not permanently stored on our servers unless you explicitly choose to save a preset or project to your account.</p>
          
          <h4 className="font-bold text-white mt-4">3. Third-Party Services</h4>
          <p>We use third-party services like Supabase for authentication and database management. Your data is handled in accordance with their respective privacy policies.</p>
          
          <h4 className="font-bold text-white mt-4">4. Cookies</h4>
          <p>We use essential cookies to maintain your session and preferences. We do not use tracking cookies for advertising purposes.</p>
        </div>
      )
    }
  };

  const { title, body } = content[page];

  const modal = (
    <AnimatePresence>
      <motion.div
        key="info-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="info-modal-content"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-secondary border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
          >
            <X size={20} />
          </button>

          <h3 className="text-2xl font-display font-bold text-white mb-6 pr-8">
            {title}
          </h3>

          <div className="prose prose-invert max-w-none">
            {body}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
