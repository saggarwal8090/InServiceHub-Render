import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_ID = 'google-identity-services';

const loadGoogleScript = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
        resolve();
        return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
        existingScript.addEventListener('load', resolve, { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
});

const GoogleSignInButton = ({ onCredential, disabled = false, text = 'continue_with' }) => {
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || disabled) return undefined;

        let mounted = true;

        loadGoogleScript()
            .then(() => {
                if (!mounted || !buttonRef.current || !window.google?.accounts?.id) return;

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: response => {
                        if (response.credential) onCredential(response.credential);
                    },
                });

                buttonRef.current.innerHTML = '';
                window.google.accounts.id.renderButton(buttonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'rectangular',
                    width: buttonRef.current.offsetWidth || 360,
                    text,
                });
            })
            .catch(() => {
                if (buttonRef.current) buttonRef.current.innerHTML = '';
            });

        return () => {
            mounted = false;
        };
    }, [disabled, onCredential, text]);

    if (!GOOGLE_CLIENT_ID) return null;

    return (
        <div className={`google-auth-wrap ${disabled ? 'disabled' : ''}`}>
            <div ref={buttonRef} className="google-auth-button" />
        </div>
    );
};

export default GoogleSignInButton;
