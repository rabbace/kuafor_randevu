import { View } from "react-native";
import { isExpoGo, getBannerAdUnitId } from "@/lib/ads";

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
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
