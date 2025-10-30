// frontend/src/components/AdSenseAd.jsx
import { useEffect, useRef } from 'react';

const AdSenseAd = ({ adSlot, adFormat = "auto", fullWidthResponsive = true, className = "" }) => {
  const adRef = useRef(null);
  const isPushed = useRef(false);

  useEffect(() => {
    const el = adRef.current;
    if (!el) return;

    const tryPush = () => {
      const width = el.offsetWidth;
      if (width && width > 100 && !isPushed.current) {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          isPushed.current = true;
          // console.log('AdSense pushed successfully, width:', width);
        } catch (err) {
          console.error('AdSense error:', err);
        }
      } else if (width <= 100) {
        // Retry after a short delay until width is big enough
        setTimeout(tryPush, 500);
      }
    };

    tryPush();
  }, []);

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', width: '100%', minHeight: '100px' }}
      data-ad-client="ca-pub-8690159120607552"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive.toString()}
    />
  );
};

export default AdSenseAd;
