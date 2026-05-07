import { Link } from 'react-router-dom';
import { ShoppingCart, Zap, BarChart3, Users, MessageSquare, ArrowRight, ShieldCheck, Sparkles, Hexagon } from 'lucide-react';
import heroImage from '../assets/friska_hero.png';
import logo from '../assets/logo.png';

export default function Landing() {
    return (
        <div className="landing-page dark">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="container flex-between">
                    <div className="landing-logo">
                        <img src={logo} alt="Friska" />
                        <span className="brand-name">Friska</span>
                    </div>
                    <div className="nav-links">
                        <Link to="/login" className="nav-link">Login</Link>
                        <Link to="/onboarding-steps" className="btn-vibrant">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section">
                <div className="container hero-grid">
                    <div className="hero-content">
                        <div className="badge-wrapper">
                            <span className="pill-badge">v2.0 Now Live</span>
                        </div>
                        <h1>Turn WhatsApp into your <span className="gradient-text">Powerhouse Storefront.</span></h1>
                        <p className="hero-subtitle">The ultimate multi-tenant platform for businesses to launch, manage, and scale WhatsApp commerce in minutes.</p>
                        <div className="hero-actions">
                            {/* <Link to="/onboarding-steps" className="btn-primary-large">
                                Start Free Trial <ArrowRight size={20} />
                            </Link> */}
                            <a href="#features" className="btn-outline-large">Watch Demo</a>
                        </div>
                        <div className="hero-stats">
                            <div className="stat">
                                <strong>100+</strong>
                                <span>Brands</span>
                            </div>
                            <div className="stat">
                                <strong>50k+</strong>
                                <span>Orders</span>
                            </div>
                            <div className="stat">
                                <strong>99.9%</strong>
                                <span>Uptime</span>
                            </div>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="hero-image-wrapper">
                            <img src={heroImage} alt="Dashboard Preview" className="hero-image" />
                            <div className="floating-card c1">
                                <Zap size={18} /> <span>Instant Response</span>
                            </div>
                            <div className="floating-card c2">
                                <ShieldCheck size={18} /> <span>Secure Payments</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header centered">
                        <span className="section-subtitle">Features</span>
                        <h2>Everything you need to <span className="gradient-text">scale globally.</span></h2>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon-box"><MessageSquare size={24} /></div>
                            <h3>Conversational Selling</h3>
                            <p>Automated chat workflows that guide customers from product discovery to checkout without leaving WhatsApp.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-box"><Zap size={24} /></div>
                            <h3>Multi-Tenant Architecture</h3>
                            <p>Manage thousands of independent businesses or branches from a single unified control plane.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-box"><BarChart3 size={24} /></div>
                            <h3>Advanced Analytics</h3>
                            <p>Deep insights into customer behavior, popular products, and branch performance in real-time.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon-box"><Users size={24} /></div>
                            <h3>Smart CRM</h3>
                            <p>Automatically build customer profiles and track order history across all your communication channels.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="workflow" className="workflow-section">
                <div className="container">
                    <div className="section-header centered">
                        <span className="section-subtitle">Process</span>
                        <h2>Launch your store in <span className="gradient-text">3 simple steps.</span></h2>
                    </div>
                    <div className="workflow-grid">
                        <div className="workflow-step">
                            <div className="step-num">01</div>
                            <h3>Claim Your Brand</h3>
                            <p>Sign up and tell us about your business. We'll set up your dedicated multi-tenant space instantly.</p>
                        </div>
                        <div className="workflow-step">
                            <div className="step-num">02</div>
                            <h3>Connect & Catalog</h3>
                            <p>Link your WhatsApp number and upload your products. Use our bulk importer to go live in minutes.</p>
                        </div>
                        <div className="workflow-step">
                            <div className="step-num">03</div>
                            <h3>Start Selling</h3>
                            <p>Customers can now browse and buy directly from your WhatsApp number. Track every order in real-time.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="pricing-section">
                <div className="container">
                    <div className="section-header centered">
                        <span className="section-subtitle">Pricing</span>
                        <h2>Choose the plan that <span className="gradient-text">grows with you.</span></h2>
                    </div>
                    <div className="pricing-grid">
                        <div className="pricing-card">
                            <div className="plan-header">
                                <h3>Starter</h3>
                                <div className="price">₹0<span>/mo</span></div>
                                <p>Perfect for trying out the power of WhatsApp commerce.</p>
                            </div>
                            <ul className="plan-features">
                                <li><ShieldCheck size={18} /> 1 Branch Support</li>
                                <li><ShieldCheck size={18} /> 50 Products Limit</li>
                                <li><ShieldCheck size={18} /> Basic Analytics</li>
                            </ul>
                            <Link to="/login" className="btn-outline-large w-full">Start for Free</Link>
                        </div>
                        <div className="pricing-card featured">
                            <div className="featured-label">Most Popular</div>
                            <div className="plan-header">
                                <h3>Business Pro</h3>
                                <div className="price">₹1,999<span>/mo</span></div>
                                <p>Our most popular plan for established retailers.</p>
                            </div>
                            <ul className="plan-features">
                                <li><Sparkles size={18} /> Unlimited Branches</li>
                                <li><Sparkles size={18} /> Unlimited Products</li>
                                <li><Sparkles size={18} /> Advance Dashboard</li>
                                <li><Sparkles size={18} /> Priority Support</li>
                            </ul>
                            <Link to="/login" className="btn-primary-large w-full">Go Pro Now</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <Sparkles className="cta-sparkle" size={48} />
                        <h2>Ready to automate your business?</h2>
                        <p>Join the future of conversational commerce today.</p>
                        <Link to="/login" className="btn-white-large">Create Your Store Now</Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="landing-logo">
                                <img src={logo} alt="Friska" style={{ width: '32px', height: '32px' }} />
                                <span className="brand-name" style={{ fontSize: '18px' }}>Friska</span>
                            </div>
                            <p>Transforming how the world shops on chat.</p>
                        </div>
                        <div className="footer-links">
                            <h4>Platform</h4>
                            <Link to="/login">Login</Link>
                            <Link to="/login">Pricing</Link>
                            <Link to="/login">Terms</Link>
                        </div>
                        <div className="footer-links">
                            <h4>Support</h4>
                            <Link to="/login">Documentation</Link>
                            <Link to="/login">API Status</Link>
                            <Link to="/login">Contact</Link>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        &copy; 2026 Friska. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
