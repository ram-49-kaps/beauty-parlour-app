import React from 'react';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
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
            <ScrollText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl text-white font-light uppercase tracking-widest mb-4">Terms & Conditions</h1>
          <p className="text-stone-500 text-sm max-w-xl leading-relaxed">
            Please read these terms carefully before booking. By creating an appointment, you agree to the following policies.
          </p>
        </div>
        
        {/* CONTENT */}
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> 01. Appointments
            </h2>
            <p className="text-stone-400 text-sm leading-7 font-light">
              We value your time. Please arrive <strong>5-10 minutes prior</strong> to your scheduled appointment. Late arrivals of more than 15 minutes may result in a shortened service time.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> 02. Cancellations
            </h2>
            <p className="text-stone-400 text-sm leading-7 font-light">
              We respectfully ask for at least <strong>24 hours' notice</strong> if you need to cancel or reschedule. Cancellations made within 24 hours may be subject to a fee.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> 03. Payments
            </h2>
            <p className="text-stone-400 text-sm leading-7 font-light">
              Payment is due in full upon completion of your service. We accept cash, major credit/debit cards, and UPI.
            </p>
          </section>

          <section>
            <h2 className="text-white text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span> 04. Health & Safety
            </h2>
            <p className="text-stone-400 text-sm leading-7 font-light">
              Your safety is our priority. Please inform us of any allergies, skin conditions, or health issues prior to your service.
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

export default TermsPage;