import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Hexagon, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { API_ENDPOINTS } from '../apiConfig';
import logo from '../assets/logo.png';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminRole', data.role);
                localStorage.setItem('branchId', data.branchId || '');
                localStorage.setItem('branchName', data.branchName || 'Superadmin');
                localStorage.setItem('tenantName', data.tenantName || 'Friska');
                navigate('/admin');
            } else {
                setError(data.error || 'Login failed');
            }
        } catch(err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-split-body">
            <div className="login-left-panel">
                <div className="hero-gradient-overlay"></div>
                <div className="left-content">
                    <img src={logo} alt="Friska Logo" style={{ width: '120px', height: '120px', marginBottom: '32px', objectFit: 'contain' }} />
                    <h1>Elevate Your<br/>Commerce Workspace</h1>
                    <p>Experience a next-generation dashboard built for speed, robust analytics, and seamless content control across your entire catalog.</p>
                    <div className="features-list">
                        <div className="feature-item"><ShieldCheck size={20} /> Enterprise-grade token security</div>
                        <div className="feature-item"><Sparkles size={20} /> Beautiful, responsive interface</div>
                        <div className="feature-item"><Layers size={20} /> Seamless category & product handling</div>
                    </div>
                </div>
            </div>

            <div className="login-right-panel">
                <div className="auth-card">
                    <div className="login-header text-left">
                        <h2>Welcome back.</h2>
                        <p>Sign in to your admin workspace</p>
                    </div>

                    <form onSubmit={handleLogin} className="auth-form">
                        <div className="input-group has-icon auth-input">
                            <label>Username</label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={18} />
                                <input type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                        </div>
                        <div className="input-group has-icon auth-input">
                            <label>Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                        </div>
                        {error && <div className="error-msg">{error}</div>}
                        
                        <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Sign In To Dashboard'}
                            {!loading && <ArrowRight className="btn-icon" size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
