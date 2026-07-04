#!/bin/bash
# Keystore oluşturma scripti — SADECE BİR KEZ ÇALIŞTIRILIR
# Üretilen dosyayı güvenli bir yerde sakla (iCloud, Google Drive şifreli vs.)
# Kaybedersen Play Store güncellemesi YAPAMAZSIN.

set -e

KEYSTORE_FILE="kuafor-randevu-release.keystore"
KEY_ALIAS="kuafor-randevu-key"

echo "=== Android Keystore Oluşturuluyor ==="
echo ""
echo "Şifre belirleyeceksin — hem STORE_PASSWORD hem KEY_PASSWORD için"
echo "aynı şifreyi kullanabilirsin. Unutma!"
echo ""

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

echo ""
echo "=== Keystore oluşturuldu: $KEYSTORE_FILE ==="
echo ""
echo "Şimdi GitHub Secrets'a eklemek için base64'e çevir:"
echo ""
echo "  base64 -i $KEYSTORE_FILE | pbcopy    # macOS (panoya kopyalar)"
echo "  base64 $KEYSTORE_FILE                # Linux (ekrana basar)"
echo ""
echo "=== GitHub Secrets'a şunları ekle ==="
echo "  ANDROID_KEYSTORE_BASE64  → yukarıdaki base64 çıktısı"
echo "  ANDROID_KEY_ALIAS        → $KEY_ALIAS"
echo "  ANDROID_KEY_PASSWORD     → keytool'a girdiğin key şifresi"
echo "  ANDROID_STORE_PASSWORD   → keytool'a girdiğin store şifresi"
echo ""
echo "GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret"
