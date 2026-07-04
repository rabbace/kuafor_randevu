import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları | Kuaför Randevu",
  description: "Kuaför Randevu uygulaması kullanım koşulları",
};

export default function TermsPage() {
  const lastUpdated = "2 Temmuz 2026";

  return (
    <main className="min-h-screen bg-white text-gray-900 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">Kullanım Koşulları</h1>
          <p className="text-sm text-gray-500">Son güncelleme: {lastUpdated}</p>
        </div>

        <Section title="1. Hizmetin Tanımı">
          <p>
            Kuaför Randevu, kullanıcıların güzellik salonu ve kuaför hizmetleri için çevrimiçi
            randevu almasını sağlayan bir platformdur. Uygulamayı kullanarak bu koşulları kabul
            etmiş sayılırsınız.
          </p>
        </Section>

        <Section title="2. Hesap Sorumluluğu">
          <ul className="list-disc pl-5 space-y-2">
            <li>Hesabınızın güvenliğinden siz sorumlusunuz.</li>
            <li>Doğru ve güncel bilgi sağlamakla yükümlüsünüz.</li>
            <li>Hesabınızın yetkisiz kullanımını derhal bildirmeniz gerekir.</li>
            <li>18 yaşından küçükseniz ebeveyn onayı gereklidir.</li>
          </ul>
        </Section>

        <Section title="3. Randevu Kuralları">
          <ul className="list-disc pl-5 space-y-2">
            <li>Randevunuzu en az 2 saat öncesinden iptal etmeniz beklenir.</li>
            <li>Tekrarlayan iptal veya gelmeme durumunda hesabınız askıya alınabilir.</li>
            <li>Salon sahipleri randevuları makul gerekçe olmaksızın reddedemez.</li>
          </ul>
        </Section>

        <Section title="4. Salon Sahipleri İçin Koşullar">
          <ul className="list-disc pl-5 space-y-2">
            <li>Gerçek ve güncel hizmet bilgileri sağlamakla yükümlüsünüz.</li>
            <li>Müşteri verilerini yalnızca randevu amacıyla kullanabilirsiniz.</li>
            <li>Platformu spam veya yanıltıcı bilgi yaymak için kullanamazsınız.</li>
          </ul>
        </Section>

        <Section title="5. Yasaklı Kullanımlar">
          <ul className="list-disc pl-5 space-y-2">
            <li>Uygulamayı yasadışı amaçlarla kullanmak.</li>
            <li>Diğer kullanıcıları rahatsız etmek veya taciz etmek.</li>
            <li>Sistemleri aşmaya çalışmak veya güvenlik açığı aramak.</li>
            <li>Otomatik araçlarla sahte hesap oluşturmak.</li>
          </ul>
        </Section>

        <Section title="6. Sorumluluk Sınırlaması">
          <p>
            Platform, randevu sürecini kolaylaştırır ancak salonların verdiği hizmetin kalitesinden
            sorumlu tutulamaz. Uygulama &quot;olduğu gibi&quot; sunulmaktadır; kesintisiz veya hatasız
            çalışacağı garanti edilmez.
          </p>
        </Section>

        <Section title="7. Değişiklikler">
          <p>
            Bu koşulları dilediğimiz zaman güncelleyebiliriz. Önemli değişikliklerde uygulama
            içinde bildirim yapılacaktır.
          </p>
        </Section>

        <Section title="8. İletişim">
          <p>
            Sorularınız için:{" "}
            <a href="mailto:aykutdiren2@gmail.com" className="text-purple-600 underline">
              aykutdiren2@gmail.com
            </a>
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <a href="/privacy" className="text-purple-600 hover:underline text-sm mr-6">
            Gizlilik Politikası
          </a>
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
