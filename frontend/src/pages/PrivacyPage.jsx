import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-300 pt-20 p-6 md:p-12 font-sans selection:bg-white/20">
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>

      <div className="max-w-4xl mx-auto animate-fade-in">
        
        {/* ✅ FIXED: Increased 'mt-24' to push button down below the Navbar */}
        <div className="flex justify-end mb-8 mt-24 relative z-50">
          <Link 
            to="/signup" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-all duration-300 group text-xs font-bold uppercase tracking-widest bg-stone-900/50 px-5 py-3 rounded-full border border-white/10 hover:border-white/40 shadow-lg"
          >
            <div className="p-1 rounded-full border border-white/10 group-hover:border-white/40 transition-colors">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            </div>
            <span>Back to Signup</span>
          </Link>
        </div>

        {/* HEADER */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl text-white font-light uppercase tracking-widest mb-4">Privacy Policy</h1>
          <p className="text-stone-500 text-sm max-w-xl leading-relaxed">
            Your privacy is important to us. This policy explains how Flawless collects, uses, and protects your personal information.
          </p>
        </div>
        
        {/* CONTENT */}
        <div className="space-y-12">
          
          <section className="bg-stone-900/30 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">01. Information We Collect</h2>
            <p className="text-stone-400 text-sm leading-7 font-light mb-4">
              We collect minimal information necessary to provide our services effectively. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-stone-500 text-sm font-light">
              <li><strong>Personal Details:</strong> Name, phone number, and email address.</li>
              <li><strong>Booking History:</strong> Dates of service, services chosen, and preferences.</li>
              <li><strong>Payment Info:</strong> Transaction records (we do not store full credit card numbers).</li>
            </ul>
          </section>

          <div className="grid md:grid-cols-2 gap-8">
            <section className="bg-stone-900/30 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">02. How We Use Your Data</h2>
              <p className="text-stone-400 text-sm leading-7 font-light">
                Your data is used solely for operational purposes:
              </p>
              <ul className="list-disc pl-5 mt-4 space-y-2 text-stone-500 text-sm font-light">
                <li>Managing appointments and sending reminders.</li>
                <li>Contacting you regarding schedule changes.</li>
                <li>Improving our salon offerings based on trends.</li>
              </ul>
            </section>

            <section className="bg-stone-900/30 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">03. Data Protection</h2>
              <p className="text-stone-400 text-sm leading-7 font-light">
                We implement strict security measures to keep your personal information safe. We do not sell, trade, or share your data with third-party marketing agencies.
              </p>
            </section>
          </div>

          <section className="bg-stone-900/30 p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4">04. Contact Us</h2>
            <p className="text-stone-400 text-sm leading-7 font-light">
              If you have any questions or concerns about this policy, please reach out to us directly at <span className="text-white border-b border-white/20 pb-0.5">drashtikapadia26@gmail.com</span>.
            </p>
          </section>

        </div>

        {/* FOOTER */}
        <div className="mt-16 pt-8 border-t border-white/10 text-[10px] text-stone-600 uppercase tracking-widest flex justify-between items-center">
          <span>Last Updated: {new Date().getFullYear()}</span>
          <span>Flawless by Drashti</span>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPage;