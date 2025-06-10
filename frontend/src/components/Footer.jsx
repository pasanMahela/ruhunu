import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        bg-slate-900
        border-t border-slate-800
        py-5 px-2
        mt-auto
      "
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <span className="font-bold text-white text-base tracking-wide select-none">
          Ruhunu Tyre House - IMS
        </span>
        <span className="mx-3 text-slate-600 text-lg">|</span>
        <span className="text-slate-200 text-sm font-medium">
          © {currentYear} All rights reserved.
        </span>
      </div>
    </motion.footer>
  );
};

export default Footer;
