import { useCallback, useEffect, useRef } from "react";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { INTERSTITIAL_AD_UNIT_ID } from "@/lib/ads";

/**
 * Randevu onaylandıktan sonra gösterilecek tam ekran reklam.
 * Kullanım: const { showAd } = useInterstitialAd(); ardından randevu başarıyla
 * oluşturulduğunda showAd() çağrılır.
 */
export function useInterstitialAd() {
  const adRef = useRef(InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID));
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const ad = adRef.current;

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      ad.load();
    });

    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAd = useCallback(() => {
    if (isLoadedRef.current) {
      adRef.current.show();
    }
  }, []);

  return { showAd };
}
