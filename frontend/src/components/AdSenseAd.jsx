// frontend/src/components/AdSenseAd.jsx
import { useEffect, useRef } from 'react';

const AdSenseAd = ({ adSlot, adFormat = "auto", fullWidthResponsive = true, className = "" }) => {
  const adRef = useRef(null);
  const isPushed = useRef(false);

  useEffect(() => {
    // Only push once when mounted
    if (!isPushed.current && adRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isPushed.current = true;
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-8690159120607552"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  );
};

export default AdSenseAd;