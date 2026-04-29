import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <div className="not-found-illustration">
                    <span className="not-found-404">404</span>
                    <div className="not-found-emoji">🔍</div>
                </div>
                <h1>Page Not Found</h1>
                <p>Sorry, the page you're looking for doesn't exist or has been moved.</p>
                <div className="not-found-actions">
                    <button className="btn-go-home" onClick={() => navigate('/')}>
                        <Home size={18} /> Go to Homepage
                    </button>
                    <button className="btn-go-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
