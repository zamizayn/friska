import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CheckCircle2, ArrowRight, ArrowLeft, ExternalLink, Key, Phone, Settings, Globe, Layout, Hexagon,
    UserPlus, AppWindow, Briefcase, MousePointerClick, Wand2, Save, Rocket, Bell, ToggleRight
} from 'lucide-react';

const steps = [
    {
        title: "Meta Developer Account",
        icon: <UserPlus className="vibrant-icon" size={32} />,
        content: "Create or log in to your account at developers.facebook.com. This is the hub for managing all your Meta integrations.",
        link: "https://developers.facebook.com"
    },
    {
        title: "App Creation",
        icon: <AppWindow className="vibrant-icon" size={32} />,
        content: "Navigate to 'My Apps' and click 'Create App'. Choose 'Other' and then select 'Business' as your app type.",
        link: null
    },
    {
        title: "Business Profile Setup",
        icon: <Briefcase className="vibrant-icon" size={32} />,
        content: "Inside your app dashboard, go to the 'WhatsApp' product. You'll be prompted to create or select a Meta Business Account.",
        link: null
    },
    {
        title: "Verify Business Selection",
        icon: <MousePointerClick className="vibrant-icon" size={32} />,
        content: "Meta requires you to explicitly select the correct Business Manager account to link with your new WhatsApp app.",
        link: null
    },
    {
        title: "Customize Use Case",
        icon: <Wand2 className="vibrant-icon" size={32} />,
        content: "Select 'WhatsApp Business Platform' and define your primary use case as 'Customer Service' or 'Utility'.",
        link: null
    },
    {
        title: "Generate Access Token",
        icon: <Key className="vibrant-icon" size={32} />,
        content: "Go to 'WhatsApp > Getting Started'. For production, we recommend creating a System User and a Permanent Token.",
        link: null
    },
    {
        title: "Collect Meta IDs",
        icon: <Save className="vibrant-icon" size={32} />,
        content: "Copy the 'Phone Number ID' and 'WhatsApp Business Account ID' from the 'Getting Started' page.",
        link: null
    },
    {
        title: "Webhook Configuration",
        icon: <Globe className="vibrant-icon" size={32} />,
        content: "In the 'Configuration' tab, set the Callback URL to your WStore domain and enter your specific Verify Token.",
        link: null
    },
    {
        title: "Production Setup",
        icon: <Rocket className="vibrant-icon" size={32} />,
        content: "Switch your app mode from 'Development' to 'Live'. Ensure your payment method is linked to handle message billing.",
        link: null
    },
    {
        title: "Subscribe to Webhooks",
        icon: <Bell className="vibrant-icon" size={32} />,
        content: "In the Webhook settings, click 'Manage' and subscribe to 'messages' and 'message_template_status_update'.",
        link: null
    },
    {
        title: "Finalize Dashboard Toggle",
        icon: <ToggleRight className="vibrant-icon" size={32} />,
        content: "Return to your WStore Admin Dashboard and enable the 'WhatsApp Bot' toggle to activate your AI storefront.",
        link: null
    }
];

export default function OnboardingGuide() {
    const [activeStep, setActiveStep] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            navigate('/onboard-wizard');
        } else {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
    };

    return (
        <div className="onboarding-guide-page premium-dark">
            <div className="guide-background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <div className="guide-container">
                {/* Header */}
                <header className="guide-header-minimal">
                    <div className="landing-logo">
                        <Hexagon className="vibrant-icon pulse" size={32} />
                        <span className="brand-name">WStore Setup</span>
                    </div>
                    <div className="step-dots">
                        {steps.map((_, i) => (
                            <div key={i} className={`dot ${i === activeStep ? 'active' : ''} ${i < activeStep ? 'done' : ''}`}></div>
                        ))}
                    </div>
                    <Link to="/" className="close-guide"><X size={24} /></Link>
                </header>

                <main className="guide-main-card-wrapper">
                    <div className={`guide-step-card glass-morph animate-slide-up`}>
                        <div className="card-left">
                            <div className="step-counter">STEP {activeStep + 1}</div>
                            <h1 className="step-title">{steps[activeStep].title}</h1>
                            <p className="step-description">{steps[activeStep].content}</p>

                            {steps[activeStep].link && (
                                <a href={steps[activeStep].link} target="_blank" rel="noreferrer" className="meta-link-btn">
                                    <ExternalLink size={18} /> Open Developer Portal
                                </a>
                            )}

                            <div className="card-footer-actions">
                                <button
                                    onClick={handleBack}
                                    className={`nav-btn btn-back ${activeStep === 0 ? 'invisible' : ''}`}
                                >
                                    <ArrowLeft size={20} /> Previous
                                </button>

                                <button onClick={handleNext} className="nav-btn btn-next">
                                    <span>{activeStep === steps.length - 1 ? "Start Integration" : "Next Step"}</span>
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="card-right visual-area">
                            <div className="visual-illustration">
                                {steps[activeStep].icon}
                                <div className="glow-effect"></div>
                            </div>
                            <div className="tip-box">
                                <strong>💡 Pro Tip:</strong>
                                <span>{indexToTip[activeStep]}</span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

const indexToTip = [
    "Ensure you have administrative access to your Facebook Business Manager for a smoother verification process.",
    "Naming your app clearly (e.g., 'WStore [YourStoreName]') helps identify it in the Meta dashboard.",
    "Double-check your business address and website URL; they must match your official business records.",
    "Selecting the wrong business account can cause integration errors later. Take a moment to confirm.",
    "Defining your use case correctly helps Meta optimize your messaging experience and approval speed.",
    "Temporary tokens expire in 24 hours. Always use Permanent Tokens for your live storefront.",
    "These IDs are unique to your setup and are required for our dashboard to communicate with WhatsApp.",
    "Our system uses this webhook to receive real-time updates when customers send you messages.",
    "Meta provides a free tier for the first 1,000 conversations every month.",
    "Subscribing to these fields is essential for the AI bot to 'hear' and 'respond' to your customers.",
    "Once enabled, the AI bot will automatically handle incoming inquiries and process orders."
];

import { X } from 'lucide-react';
