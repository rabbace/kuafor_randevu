import { useCallback, useEffect, useRef } from "react";
import { isExpoGo, getInterstitialAdUnitId } from "@/lib/ads";

/**
 * Randevu onaylandıktan sonra gösterilecek tam ekran reklam.
 * Kullanım: const { showAd } = useInterstitialAd(); ardından randevu başarıyla
 * oluşturulduğunda showAd() çağrılır.
 * Expo Go bu native modülü desteklemediği için orada no-op davranır.
 */
export function useInterstitialAd() {
  const adRef = useRef(
    isExpoGo
      ? null
      : require("react-native-google-mobile-ads").InterstitialAd.createForAdRequest(getInterstitialAdUnitId())
  );
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (isExpoGo) return;
    const { AdEventType } = require("react-native-google-mobile-ads");
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
    if (isExpoGo) return;
    if (isLoadedRef.current) {
      adRef.current.show();
    }
  }, []);

  return { showAd };
}
