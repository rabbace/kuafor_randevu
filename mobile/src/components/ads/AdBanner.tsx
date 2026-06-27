import { View } from "react-native";
import { isExpoGo, BANNER_AD_UNIT_ID } from "@/lib/ads";

/**
 * Müşteri uygulamasında ekran altlarına yerleştirilen reklam banner'ı.
 * Salon yönetim panelinde (web) ve berber/çalışan ekranlarında gösterilmez.
 */
export function AdBanner() {
  if (isExpoGo) return null;

  const { BannerAd, BannerAdSize } = require("react-native-google-mobile-ads");

  return (
    <View style={{ alignItems: "center" }}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
