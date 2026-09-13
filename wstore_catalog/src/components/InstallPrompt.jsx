import React, { useEffect, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';

const isIOS = () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
};

const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

export default function InstallPrompt() {
    const [show, setShow] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (isStandalone()) return;

        const iOSDevice = isIOS();
        setIos(iOSDevice);

        const onBeforeInstallPrompt = (e) => {
            e.preventDefault();
            if (!iOSDevice) {
                setDeferredPrompt(e);
                maybeShow();
            }
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

        const timer = setTimeout(() => {
            if (iOSDevice) maybeShow();
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const maybeShow = () => {
        if (isStandalone()) return;
        if (localStorage.getItem('friska_install_prompt_dismissed')) return;
        setShow(true);
    };

    const dismiss = () => {
        setShow(false);
        localStorage.setItem('friska_install_prompt_dismissed', '1');
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem('friska_install_prompt_dismissed', '1');
        }
        setDeferredPrompt(null);
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="install-prompt-overlay">
            <div className="install-prompt-card" role="dialog" aria-label="Add to Home Screen">
                <button className="install-prompt-close" onClick={dismiss} aria-label="Close">
                    <X size={20} strokeWidth={2.5} />
                </button>
                {ios ? (
                    <>
                        <div className="install-prompt-icon">
                            <Share size={24} strokeWidth={2.2} />
                        </div>
                        <h3 className="install-prompt-title">Add Friska to your Home Screen</h3>
                        <p className="install-prompt-text">
                            Install Friska Store like an app for faster access and a better experience.
                        </p>
                        <ol className="install-prompt-steps">
                            <li className="install-prompt-step">
                                <span className="install-prompt-step-icon"><Share size={14} /></span>
                                Tap the <strong>Share</strong> button in your browser
                            </li>
                            <li className="install-prompt-step">
                                <span className="install-prompt-step-icon"><Plus size={14} /></span>
                                Scroll down and tap <strong>Add to Home Screen</strong>
                            </li>
                            <li className="install-prompt-step">
                                <span className="install-prompt-step-icon"><Download size={14} /></span>
                                Tap <strong>Add</strong> to install
                            </li>
                        </ol>
                        <button className="install-prompt-btn install-prompt-btn-outline" onClick={dismiss}>
                            Not Now
                        </button>
                    </>
                ) : (
                    <>
                        <div className="install-prompt-icon">
                            <Download size={24} strokeWidth={2.2} />
                        </div>
                        <h3 className="install-prompt-title">Install Friska Store</h3>
                        <p className="install-prompt-text">
                            Install the app on your device for quick access to Friska — no browser needed.
                        </p>
                        <button className="install-prompt-btn" onClick={handleInstall}>
                            <Download size={18} /> Install App
                        </button>
                        <button className="install-prompt-btn install-prompt-btn-link" onClick={dismiss}>
                            Not Now
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}