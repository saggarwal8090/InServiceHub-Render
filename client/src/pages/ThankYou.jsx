import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ThankYou.css';

const ThankYou = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="thankyou-container">
            <div className="thankyou-card">
                <div className="thankyou-icon">
                    <svg viewBox="0 0 52 52" className="checkmark-svg">
                        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                        <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                    </svg>
                </div>
                <h1>Thank You!</h1>
                <p className="thankyou-message">
                    Thanks for using <strong>InServiceHub</strong>! Your review has been submitted successfully.
                </p>
                <p className="thankyou-sub">
                    We appreciate your feedback — it helps us improve our services and support our providers.
                </p>
                <div className="thankyou-actions">
                    <button className="btn-home" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                    <button className="btn-search" onClick={() => navigate('/search')}>
                        Find More Services
                    </button>
                </div>
                <p className="auto-redirect">Redirecting to home in <strong>{countdown}</strong> seconds...</p>
            </div>
        </div>
    );
};

export default ThankYou;
