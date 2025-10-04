// frontend/src/pages/HelpPage.jsx (COMPLETE)
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  BookOpen,
  FileQuestion,
  Zap,
  Shield,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { UserContext } from "../context/UserContext";

const HelpPage = () => {
  const navigate = useNavigate();
  const { user, theme, setTheme } = useContext(UserContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState("getting-started");
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const categories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Zap,
      faqs: [
        {
          question: "How do I upload my first file?",
          answer: "Click the upload area on the homepage, select your CSV or Excel file (max 10MB), and our system will automatically process it. You'll see a preview with column types and summary statistics within seconds."
        },
        {
          question: "What file formats are supported?",
          answer: "Syla supports CSV (.csv), Excel (.xlsx, .xls), and can also process PDF files for data extraction. For visualization features, CSV and Excel work best."
        },
        {
          question: "Do I need to sign up to use Syla?",
          answer: "You can explore file conversion tools without an account, but data visualization, AI forecasting, and chart editing require a free account. Sign up takes less than 30 seconds with email or Google."
        },
        {
          question: "Is my data secure?",
          answer: "Yes. All files are encrypted in transit (HTTPS) and at rest. We never share your data with third parties. Files are automatically deleted after 30 days of inactivity. You can manually delete files anytime from your account."
        }
      ]
    },
    {
      id: "data-visualization",
      title: "Data Visualization",
      icon: BookOpen,
      faqs: [
        {
          question: "How do I create a chart?",
          answer: "After uploading your file, select X-axis and Y-axis columns from the dropdown menus. Choose a chart type (bar, line, pie, scatter) from the chart options panel. Your visualization updates in real-time."
        },
        {
          question: "Can I customize chart colors and styles?",
          answer: "Yes! Click the settings icon in the chart panel to access color schemes, font sizes, grid options, and background colors. You can save custom themes for future use."
        },
        {
          question: "How do I export my chart?",
          answer: "Go to the Editing page, click the export button, and choose your format: PNG (web), SVG (scalable), PDF (print), or CSV (data). You can also adjust DPI for high-resolution exports."
        },
        {
          question: "What if my data has missing values?",
          answer: "Syla automatically handles missing values by either removing rows with nulls or filling them with statistical defaults (mean/median). You can control this behavior in chart settings under 'Data Cleaning'."
        }
      ]
    },
    {
      id: "ai-forecasting",
      title: "AI Forecasting",
      icon: HelpCircle,
      faqs: [
        {
          question: "What is AI forecasting?",
          answer: "Our AI forecasting uses advanced language models (GPT-4) and statistical models (Prophet) to predict future trends based on your historical data and business scenarios. Simply describe your scenario in plain English."
        },
        {
          question: "How accurate are the forecasts?",
          answer: "Forecast accuracy depends on data quality and quantity. With 12+ months of clean historical data, our hybrid model typically achieves 85-95% accuracy for short-term (3-6 month) predictions. Longer forecasts have wider confidence intervals."
        },
        {
          question: "What's a 'scenario' in forecasting?",
          answer: "A scenario is a plain-English description of business conditions like 'increase marketing budget by 15% starting next month' or 'seasonal 20% sales boost during holidays'. The AI interprets this and adjusts forecasts accordingly."
        },
        {
          question: "Can I forecast any type of data?",
          answer: "Best results come from time-series data (sales over time, website traffic, inventory levels). You need at least 6 data points, though 12+ is recommended. The target column must be numeric."
        },
        {
          question: "What's the difference between Prophet and GPT models?",
          answer: "Prophet is a statistical model great for seasonal patterns and holidays. GPT uses AI to understand business context and scenarios. Hybrid combines both for best accuracy. We recommend starting with Hybrid."
        }
      ]
    },
    {
      id: "file-tools",
      title: "File Tools",
      icon: FileQuestion,
      faqs: [
        {
          question: "How do I convert PDF to Excel?",
          answer: "Navigate to Tools → PDF to Excel, upload your PDF file, and click Convert. Our system extracts tables and converts them to Excel format. Works best with PDFs containing clear table structures."
        },
        {
          question: "Can I merge multiple PDFs?",
          answer: "Yes! Go to Tools → Merge PDF, upload up to 15 PDF files, arrange them in your preferred order (drag-and-drop), and click Merge. The combined PDF downloads instantly."
        },
        {
          question: "How does file compression work?",
          answer: "We offer three compression levels: Light (10-30% reduction), Medium (30-50%), and Strong (50-70%). Higher compression may slightly reduce quality for images. PDFs and documents compress without quality loss."
        },
        {
          question: "Are converted files stored on your servers?",
          answer: "Converted files are temporarily stored for 10 minutes for download, then automatically deleted. You can also manually delete files immediately after download from the Tools → Files page."
        }
      ]
    },
    {
      id: "account-billing",
      title: "Account & Billing",
      icon: Shield,
      faqs: [
        {
          question: "Is Syla free to use?",
          answer: "Yes! We offer a generous free tier with 50 AI forecasts per month, unlimited file conversions, and core visualization features. Paid plans ($12-49/mo) add priority processing, advanced features, and higher limits."
        },
        {
          question: "What's included in the Free plan?",
          answer: "Free tier includes: unlimited file uploads (10MB each), basic visualizations, 50 AI forecast requests/month, all file conversion tools, CSV/PNG export, and community support."
        },
        {
          question: "How do I upgrade my account?",
          answer: "Click your profile → Settings → Billing, choose Professional or Business plan, and enter payment details. All plans include a 14-day money-back guarantee."
        },
        {
          question: "Can I cancel anytime?",
          answer: "Yes, cancel anytime from Settings → Billing. You'll retain access until the end of your billing period. No cancellation fees or questions asked."
        },
        {
          question: "Do you offer educational discounts?",
          answer: "Yes! Students and educators get 50% off all paid plans. Email support@syla.ai with your .edu email for verification."
        }
      ]
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: MessageCircle,
      faqs: [
        {
          question: "My file upload failed. What should I do?",
          answer: "Check: (1) File size under 10MB, (2) Supported format (CSV/Excel/PDF), (3) File isn't corrupted (try opening locally first), (4) Stable internet connection. Try clearing browser cache if issue persists."
        },
        {
          question: "Charts aren't displaying correctly",
          answer: "Ensure your data has numeric columns for Y-axis. Try refreshing the page, selecting different columns, or using a different chart type. Contact support if specific chart types consistently fail."
        },
        {
          question: "AI forecast request failed",
          answer: "Check: (1) Target column is numeric, (2) At least 6 data points exist, (3) You haven't exceeded monthly limit (50/month free tier), (4) Scenario text is under 500 characters. Try simplifying your scenario."
        },
        {
          question: "I forgot my password",
          answer: "Click 'Forgot Password' on the login page, enter your email, and follow the reset link sent to your inbox. Check spam folder if not received within 5 minutes. Links expire after 1 hour."
        },
        {
          question: "How do I delete my account?",
          answer: "Go to Settings → Account → Delete Account. This permanently removes all your data, files, and charts. This action cannot be undone. Export any data you want to keep first."
        }
      ]
    }
  ];

  const filteredCategories = categories.map(cat => ({
    ...cat,
    faqs: cat.faqs.filter(faq =>
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.faqs.length > 0);

  const toggleCategory = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar theme={theme} setTheme={setTheme} onReportChange={() => {}} />
      
      <div className="flex-1 transition-all duration-300">
        <Navbar user={user} />
        
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold text-gray-800 dark:text-slate-200 mb-4">
              How can we help you?
            </h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mb-8">
              Find answers to common questions about Syla Analytics
            </p>
            
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-slate-600 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <button
              onClick={() => navigate("/docs")}
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-slate-800 text-left group"
            >
              <BookOpen className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={24} />
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">Documentation</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Complete guides and API docs</p>
            </button>

            <a
              href="mailto:support@syla.ai"
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-slate-800 text-left group"
            >
              <Mail className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={24} />
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">Email Support</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Get help from our team</p>
            </a>

            <button
              onClick={() => navigate("/pricing")}
              className="p-6 rounded-xl border-2 border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-white dark:bg-slate-800 text-left group"
            >
              <Shield className="text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform" size={24} />
              <h3 className="font-semibold text-gray-800 dark:text-slate-200 mb-2">Pricing Plans</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">Compare features and pricing</p>
            </button>
          </div>

          <div className="space-y-4">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                No results found for "{searchQuery}". Try different keywords.
              </div>
            ) : (
              filteredCategories.map((category) => {
                const Icon = category.icon;
                const isExpanded = expandedCategory === category.id;

                return (
                  <div key={category.id} className="rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Icon className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200">
                          {category.title}
                        </h2>
                        <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
                          {category.faqs.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-slate-700">
                        {category.faqs.map((faq, idx) => {
                          const questionId = `${category.id}-${idx}`;
                          const isQuestionExpanded = expandedQuestion === questionId;

                          return (
                            <div key={idx} className="border-b border-gray-100 dark:border-slate-700 last:border-b-0">
                              <button
                                onClick={() => toggleQuestion(questionId)}
                                className="w-full p-5 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-start justify-between gap-4"
                              >
                                <span className="font-medium text-gray-800 dark:text-slate-200">
                                  {faq.question}
                                </span>
                                {isQuestionExpanded ? (
                                  <ChevronUp className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                                ) : (
                                  <ChevronDown className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                                )}
                              </button>
                              
                              {isQuestionExpanded && (
                                <div className="px-5 pb-5 text-gray-600 dark:text-slate-400 leading-relaxed">
                                  {faq.answer}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-12 p-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center">
            <MessageCircle className="mx-auto mb-4" size={40} />
            <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
            <p className="mb-6 text-blue-100">Our support team typically responds within 24 hours</p>
            <a
              href="mailto:support@syla.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <Mail size={20} />
              Contact Support
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default HelpPage;
