import React, { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import GoogleSignInButton from '../components/GoogleSignInButton';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const hasGoogleOAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

    const redirectAfterAuth = useCallback((role) => {
        if (role === 'provider') {
            navigate('/provider-dashboard');
        } else {
            navigate('/');
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await login(email, password);
        if (res.success) {
            redirectAfterAuth(res.role);
        } else {
            setError(res.message || 'Login failed. Check your email and password.');
        }
        setLoading(false);
    };

    const handleGoogleCredential = useCallback(async (credential) => {
        setLoading(true);
        setError('');

        const res = await loginWithGoogle(credential);
        if (res.success) {
            redirectAfterAuth(res.role);
        } else {
            setError(res.message || 'Google sign-in failed. Please try again.');
        }

        setLoading(false);
    }, [loginWithGoogle, redirectAfterAuth]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-icon-circle">
                        <LogIn size={24} />
                    </div>
                    <h2>Welcome Back</h2>
                    <p className="auth-subtitle">Log in to your InServiceHub account</p>
                </div>
                {error && <div className="error-msg">⚠️ {error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label><Mail size={14} /> Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            id="login-email"
                        />
                    </div>
                    <div className="input-group">
                        <label><Lock size={14} /> Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                id="login-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading} id="login-submit">
                        {loading ? (
                            <><span className="btn-spinner"></span> Logging in...</>
                        ) : (
                            <><LogIn size={18} /> Login</>
                        )}
                    </button>
                    {hasGoogleOAuth && (
                        <>
                            <div className="auth-divider"><span>or</span></div>
                            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
                        </>
                    )}
                    <p className="auth-switch">
                        Don't have an account? <span onClick={() => navigate('/register')}>Create one for free</span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
