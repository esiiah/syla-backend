// frontend/src/pages/PricingPage.jsx
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  X,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Info,
  Sparkles
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { UserContext } from "../context/UserContext";

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showComparison, setShowComparison] = useState(false);

  const plans = [
    {
      name: "Free",
      icon: Zap,
      price: 0,
      yearlyPrice: 0,
      description: "Perfect for trying out Syla",
      color: "blue",
      features: [
        { text: "Unlimited file uploads (10MB each)", included: true },
        { text: "Basic data visualizations", included: true },
        { text: "50 AI forecast requests/month", included: true },
        { text: "All file conversion tools", included: true },
        { text: "CSV & PNG export", included: true },
        { text: "Community support", included: true },
        { text: "Advanced chart customization", included: false },
        { text: "Priority AI processing", included: false },
        { text: "API access", included: false },
        { text: "Team collaboration", included: false }
      ],
      cta: user ? "Current Plan" : "Sign Up Free",
      popular: false
    },
    {
      name: "Professional",
      icon: Crown,
      price: 12,
      yearlyPrice: 120,
      description: "For professionals and growing teams",
      color: "purple",
      features: [
        { text: "Everything in Free, plus:", included: true },
        { text: "Unlimited file uploads (50MB each)", included: true },
        { text: "500 AI forecast requests/month", included: true },
        { text: "Advanced chart customization", included: true },
        { text: "Priority AI processing queue", included: true },
        { text: "SVG, PDF, JSON export", included: true },
        { text: "Chart templates & themes", included: true },
        { text: "Email support (24h response)", included: true },
        { text: "Remove Syla branding", included: true },
        { text: "API access (1000 calls/day)", included: true }
      ],
      cta: "Start 14-Day Trial",
      popular: true
    },
    {
      name: "Business",
      icon: Building2,
      price: 49,
      yearlyPrice: 490,
      description: "For teams with advanced needs",
      color: "orange",
      features: [
        { text: "Everything in Professional, plus:", included: true },
        { text: "Unlimited AI forecast requests", included: true },
        { text: "Unlimited file uploads (500MB each)", included: true },
        { text: "Custom AI model training", included: true },
        { text: "Advanced forecasting models", included: true },
        { text: "Team collaboration (10 users)", included: true },
        { text: "Dedicated support (4h response)", included: true },
        { text: "Priority phone support", included: true },
        { text: "API access (unlimited)", included: true },
        { text: "Custom integrations", included: true }
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const comparisonFeatures = [
    {
      category: "Data Processing",
      features: [
        { name: "File upload size", free: "10MB", pro: "50MB", business: "500MB" },
        { name: "Monthly uploads", free: "Unlimited", pro: "Unlimited", business: "Unlimited" },
        { name: "Supported formats", free: "CSV, Excel, PDF", pro: "CSV, Excel, PDF", business: "CSV, Excel, PDF + Custom" },
        { name: "Data retention", free: "30 days", pro: "90 days", business: "1 year" }
      ]
    },
    {
      category: "AI Forecasting",
      features: [
        { name: "Monthly forecast requests", free: "50", pro: "500", business: "Unlimited" },
        { name: "Forecast horizon", free: "12 periods", pro: "120 periods", business: "Unlimited" },
        { name: "Model selection", free: "Basic", pro: "All models", business: "All + Custom" },
        { name: "Processing priority", free: "Standard", pro: "High", business: "Highest" }
      ]
    },
    {
      category: "Visualization",
      features: [
        { name: "Chart types", free: "5 basic", pro: "15 advanced", business: "All + Custom" },
        { name: "Custom themes", free: "No", pro: "Yes", business: "Yes + Templates" },
        { name: "Export formats", free: "CSV, PNG", pro: "CSV, PNG, SVG, PDF", business: "All formats" },
        { name: "Resolution", free: "Standard", pro: "High (300 DPI)", business: "Ultra (600 DPI)" }
      ]
    },
    {
      category: "Support & API",
      features: [
        { name: "Support channel", free: "Community", pro: "Email", business: "Email + Phone" },
        { name: "Response time", free: "Best effort", pro: "24 hours", business: "4 hours" },
        { name: "API access", free: "No", pro: "1000 calls/day", business: "Unlimited" },
        { name: "Documentation", free: "Public docs", pro: "Public docs", business: "Private docs" }
      ]
    }
  ];

  const getPrice = (plan) => {
    if (plan.price === 0) return "Free";
    const price = billingCycle === "monthly" ? plan.price : plan.yearlyPrice;
    const period = billingCycle === "monthly" ? "/month" : "/year";
    return `$${price}${period}`;
  };

  const getSavings = (plan) => {
    if (plan.price === 0) return null;
    const yearlySavings = ((plan.price * 12) - plan.yearlyPrice);
    const percentSavings = Math.round((yearlySavings / (plan.price * 12)) * 100);
    return billingCycle === "yearly" ? `Save $${yearlySavings} (${percentSavings}%)` : null;
  };

  const handleCTA = (plan) => {
    if (plan.name === "Free") {
      if (user) {
        navigate("/");
      } else {
        navigate("/signup");
      }
    } else if (plan.name === "Business") {
      window.location.href = "mailto:sales@syla.ai?subject=Business Plan Inquiry";
    } else {
      // Professional plan
      if (user) {
        navigate("/settings?tab=billing");
      } else {
        navigate("/signup?plan=professional");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-800 dark:text-slate-200 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 dark:text-slate-400 mb-8">
              Choose the plan that fits your needs. All plans include 14-day money-back guarantee.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1 bg-gray-200 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 shadow-sm"
                    : "text-gray-600 dark:text-slate-400"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 shadow-sm"
                    : "text-gray-600 dark:text-slate-400"
                }`}
              >
                Yearly
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const colorClasses = {
                blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
                purple: "border-purple-500 bg-purple-50 dark:bg-purple-900/20",
                orange: "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
              };

              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl border-2 bg-white dark:bg-slate-800 overflow-hidden transition-all hover:scale-105 ${
                    plan.popular
                      ? "border-purple-500 shadow-xl shadow-purple-200 dark:shadow-purple-900/50 relative"
                      : "border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-bl-xl text-sm font-semibold flex items-center gap-1">
                      <Sparkles size={14} />
                      Most Popular
                    </div>
                  )}

                  <div className={`p-8 ${plan.popular ? "pt-12" : ""}`}>
                    <div className={`inline-flex p-3 rounded-xl ${colorClasses[plan.color]} mb-4`}>
                      <Icon className={`text-${plan.color}-600 dark:text-${plan.color}-400`} size={32} />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
                      {plan.description}
                    </p>

                    <div className="mb-6">
                      <div className="text-4xl font-bold text-gray-800 dark:text-slate-200">
                        {getPrice(plan)}
                      </div>
                      {getSavings(plan) && (
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                          {getSavings(plan)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleCTA(plan)}
                      className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        plan.popular
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight size={16} />
                    </button>

                    <div className="mt-8 space-y-3">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          {feature.included ? (
                            <Check className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={18} />
                          ) : (
                            <X className="text-gray-400 flex-shrink-0 mt-0.5" size={18} />
                          )}
                          <span className={`text-sm ${
                            feature.included
                              ? "text-gray-700 dark:text-slate-300"
                              : "text-gray-400 dark:text-slate-500"
                          }`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Toggle */}
          <div className="text-center mb-8">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <Info size={20} />
              {showComparison ? "Hide" : "Show"} Detailed Comparison
            </button>
          </div>

          {/* Detailed Comparison Table */}
          {showComparison && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden mb-12">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-900">
                      <th className="text-left p-4 font-semibold text-gray-800 dark:text-slate-200">
                        Feature
                      </th>
                      <th className="text-center p-4 font-semibold text-gray-800 dark:text-slate-200">
                        Free
                      </th>
                      <th className="text-center p-4 font-semibold text-purple-600 dark:text-purple-400">
                        Professional
                      </th>
                      <th className="text-center p-4 font-semibold text-orange-600 dark:text-orange-400">
                        Business
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((category, catIdx) => (
                      <React.Fragment key={catIdx}>
                        <tr className="bg-gray-100 dark:bg-slate-700/50">
                          <td colSpan={4} className="p-3 font-semibold text-gray-800 dark:text-slate-200">
                            {category.category}
                          </td>
                        </tr>
                        {category.features.map((feature, featIdx) => (
                          <tr key={featIdx} className="border-b border-gray-200 dark:border-slate-700">
                            <td className="p-4 text-gray-700 dark:text-slate-300">
                              {feature.name}
                            </td>
                            <td className="p-4 text-center text-gray-600 dark:text-slate-400">
                              {feature.free}
                            </td>
                            <td className="p-4 text-center text-gray-600 dark:text-slate-400">
                              {feature.pro}
                            </td>
                            <td className="p-4 text-center text-gray-600 dark:text-slate-400">
                              {feature.business}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-display font-bold text-center text-gray-800 dark:text-slate-200 mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Can I change plans anytime?",
                  a: "Yes, upgrade or downgrade anytime. Changes take effect immediately with prorated billing."
                },
                {
                  q: "Do you offer refunds?",
                  a: "All paid plans include a 14-day money-back guarantee. Cancel anytime within 14 days for a full refund."
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. Enterprise customers can request invoicing."
                },
                {
                  q: "Is there a free trial?",
                  a: "Yes! Professional and Business plans include a 14-day free trial. No credit card required."
                },
                {
                  q: "Do you offer student discounts?",
                  a: "Yes, students and educators get 50% off all paid plans. Email support@syla.ai with your .edu address."
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
                  <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">
                    {faq.q}
                  </h4>
                  <p className="text-gray-600 dark:text-slate-400 text-sm">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to transform your data analysis?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of professionals using Syla to make data-driven decisions
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate("/help")}
                className="px-8 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default PricingPage;
