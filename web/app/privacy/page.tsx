import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Kuaför Randevu",
  description: "Kuaför Randevu uygulaması gizlilik politikası",
};

export default function PrivacyPage() {
  const lastUpdated = "2 Temmuz 2026";

  return (
    <main className="min-h-screen bg-white text-gray-900 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">Gizlilik Politikası</h1>
          <p className="text-sm text-gray-500">Son güncelleme: {lastUpdated}</p>
        </div>

        <Section title="1. Giriş">
          <p>
            Kuaför Randevu uygulaması (&quot;Uygulama&quot;, &quot;biz&quot;, &quot;bizim&quot;), kullanıcılarının
            gizliliğini ciddiye alır. Bu politika, Uygulama aracılığıyla hangi kişisel verileri
            topladığımızı, bu verileri nasıl kullandığımızı ve koruduğumuzu açıklar.
          </p>
        </Section>

        <Section title="2. Topladığımız Veriler">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Hesap bilgileri:</strong> Ad soyad, e-posta adresi, telefon numarası, cinsiyet.</li>
            <li><strong>Randevu verileri:</strong> Seçilen salon, hizmet, tarih ve saat bilgileri.</li>
            <li><strong>Konum verisi:</strong> Yalnızca salon haritası görüntülenirken, cihazın yaklaşık konumu (isteğe bağlı).</li>
            <li><strong>Bildirim token'ı:</strong> Push bildirimleri için cihaz token'ı (iznin verilmesi halinde).</li>
            <li><strong>Sadakat puanları:</strong> Tamamlanan randevulara bağlı puan geçmişi.</li>
            <li><strong>Değerlendirmeler:</strong> Hizmet sonrası bırakılan yıldız puanı ve yorum.</li>
          </ul>
        </Section>

        <Section title="3. Verileri Nasıl Kullanıyoruz">
          <ul className="list-disc pl-5 space-y-2">
            <li>Randevu oluşturma, onaylama ve iptal işlemlerini gerçekleştirmek.</li>
            <li>Randevu hatırlatmaları ve durum güncellemeleri için bildirim göndermek.</li>
            <li>Sadakat programını yönetmek.</li>
            <li>Uygulama güvenliğini ve doğruluğunu sağlamak.</li>
            <li>Teknik sorunları teşhis etmek ve iyileştirmek.</li>
          </ul>
        </Section>

        <Section title="4. Üçüncü Taraf Hizmetler">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Supabase:</strong> Kimlik doğrulama ve veritabanı altyapısı. Veriler AB/ABD
              sunucularında şifreli olarak saklanır.{" "}
              <a href="https://supabase.com/privacy" className="text-purple-600 underline" target="_blank" rel="noreferrer">
                Supabase Gizlilik Politikası
              </a>
            </li>
            <li>
              <strong>Google Maps:</strong> Salon konumu görüntüleme. Konum verisi Google ile paylaşılabilir.{" "}
              <a href="https://policies.google.com/privacy" className="text-purple-600 underline" target="_blank" rel="noreferrer">
                Google Gizlilik Politikası
              </a>
            </li>
            <li>
              <strong>Google AdMob:</strong> Reklam gösterimi. Reklam kimliği kullanılabilir.{" "}
              <a href="https://support.google.com/admob/answer/6128543" className="text-purple-600 underline" target="_blank" rel="noreferrer">
                AdMob Politikası
              </a>
            </li>
          </ul>
        </Section>

        <Section title="5. Veri Güvenliği">
          <p>
            Tüm veriler HTTPS ile şifreli iletilir. Şifreler hiçbir zaman düz metin olarak saklanmaz.
            Supabase Row Level Security (RLS) ile kullanıcılar yalnızca kendi verilerine erişebilir.
          </p>
        </Section>

        <Section title="6. Veri Saklama">
          <p>
            Hesabınızı sildiğinizde kişisel verileriniz 30 gün içinde sistemden kaldırılır. Anonim
            istatistiksel veriler daha uzun süre saklanabilir.
          </p>
        </Section>

        <Section title="7. Haklarınız">
          <ul className="list-disc pl-5 space-y-2">
            <li>Verilerinize erişim talep edebilirsiniz.</li>
            <li>Yanlış verilerin düzeltilmesini isteyebilirsiniz.</li>
            <li>Verilerinizin silinmesini talep edebilirsiniz.</li>
            <li>Kişisel veri işlemeye itiraz edebilirsiniz.</li>
          </ul>
          <p className="mt-3">
            Talepler için: <a href="mailto:aykutdiren2@gmail.com" className="text-purple-600 underline">aykutdiren2@gmail.com</a>
          </p>
        </Section>

        <Section title="8. Çocukların Gizliliği">
          <p>
            Uygulamamız 13 yaşın altındaki çocuklara yönelik değildir ve bu yaş grubundan bilerek
            kişisel veri toplamayız.
          </p>
        </Section>

        <Section title="9. Politika Güncellemeleri">
          <p>
            Bu politikayı güncelleyebiliriz. Önemli değişikliklerde uygulama içi bildirim veya
            e-posta ile bilgilendirme yapılır. Güncel politikaya her zaman bu sayfadan ulaşabilirsiniz.
          </p>
        </Section>

        <Section title="10. İletişim">
          <p>
            Sorularınız için:{" "}
            <a href="mailto:aykutdiren2@gmail.com" className="text-purple-600 underline">
              aykutdiren2@gmail.com
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <a href="/" className="text-purple-600 hover:underline text-sm">
            ← Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-100">{title}</h2>
      <div className="text-gray-700 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
