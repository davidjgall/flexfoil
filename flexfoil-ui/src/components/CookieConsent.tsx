import { useCallback, useEffect, useState } from 'react';
import { getStoredConsent, updateGtagConsent, type ConsentStatus } from '../lib/analytics';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored === null) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = useCallback(() => {
    updateGtagConsent('granted');
    setVisible(false);
  }, []);

  const handleReject = useCallback(() => {
    updateGtagConsent('denied');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner__body">
        <p className="cookie-banner__text">
          We use cookies for anonymous usage analytics to improve this tool.
          No personal data is collected or shared with advertisers.{' '}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
            className="cookie-banner__link"
          >
            Learn more
          </a>
        </p>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__btn cookie-banner__btn--reject" onClick={handleReject}>
            Reject
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Manage consent after initial choice -- call from a settings menu to let
 * users change their mind (GDPR right to withdraw).
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentStatus>(getStoredConsent);

  const grant = useCallback(() => {
    updateGtagConsent('granted');
    setConsent('granted');
  }, []);

  const revoke = useCallback(() => {
    updateGtagConsent('denied');
    setConsent('denied');
  }, []);

  return { consent, grant, revoke };
}
