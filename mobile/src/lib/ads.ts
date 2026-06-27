import Constants from "expo-constants";
import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

// Expo Go, AdMob gibi özel native modülleri desteklemez (yalnızca geliştirme/üretim build'lerinde çalışır).
export const isExpoGo = Constants.appOwnership === "expo";

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

export const BANNER_AD_UNIT_ID = __DEV__ ? TestIds.BANNER : PRODUCTION_BANNER_ID;
export const INTERSTITIAL_AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : PRODUCTION_INTERSTITIAL_ID;
