import Constants from "expo-constants";
import { Platform } from "react-native";

// Expo Go, AdMob gibi özel native modülleri desteklemez (yalnızca geliştirme/üretim build'lerinde çalışır).
export const isExpoGo =
  Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

// Üretimde gerçek AdMob unit ID'lerini buraya (veya .env üzerinden) koy.
// Geliştirme sırasında her zaman test ID'leri kullanılır.
const PRODUCTION_BANNER_ID = Platform.select({
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/iosBannerUnitId",
  android: "ca-app-pub-XXXXXXXXXXXXXXXX/androidBannerUnitId",
})!;

const PRODUCTION_INTERSTITIAL_ID = Platform.select({
  ios: "ca-app-pub-XXXXXXXXXXXXXXXX/iosInterstitialUnitId",
  android: "ca-app-pub-XXXXXXXXXXXXXXXX/androidInterstitialUnitId",
})!;

// react-native-google-mobile-ads, import edildiği anda native modülü eagerly çözümlediği
// için Expo Go'da çökmemesi amacıyla TestIds'e de yalnızca gerektiğinde (lazy) erişiyoruz.
// Placeholder ("XXXX...") ID'ler gerçek değerlerle değiştirilene kadar test
// reklamlarına düş; geçersiz ID release build'de reklam yükleme hatası üretir.
function isPlaceholder(id: string): boolean {
  return id.includes("XXXX");
}

export function getBannerAdUnitId(): string {
  if (isExpoGo) return "";
  const { TestIds } = require("react-native-google-mobile-ads");
  return __DEV__ || isPlaceholder(PRODUCTION_BANNER_ID) ? TestIds.BANNER : PRODUCTION_BANNER_ID;
}

export function getInterstitialAdUnitId(): string {
  if (isExpoGo) return "";
  const { TestIds } = require("react-native-google-mobile-ads");
  return __DEV__ || isPlaceholder(PRODUCTION_INTERSTITIAL_ID)
    ? TestIds.INTERSTITIAL
    : PRODUCTION_INTERSTITIAL_ID;
}
