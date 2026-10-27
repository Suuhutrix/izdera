import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Gizlilik Bildirgesi",
  description: "İzdera neyi toplar, neyi toplamaz: çerez yok, profil yok, sunucuda arama geçmişi yok.",
  alternates: { canonical: "/gizlilik" },
};

const sections: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "toplamadiklarimiz",
    title: "Toplamadıklarımız",
    body: (
      <ul>
        <li>Çerez, izleme pikseli, reklam ya da analitik betiği kullanmıyoruz.</li>
        <li>Kullanıcı hesabı, profil veya parmak izi oluşturmuyoruz.</li>
        <li>Arama sorgularınızı veritabanına yazmıyor, satmıyor, paylaşmıyoruz.</li>
      </ul>
    ),
  },
  {
    id: "nasil-calisir",
    title: "Aramanız nasıl işlenir?",
    body: (
      <>
        <p>
          Sorgunuz İzdera sunucusuna gelir ve oradan açık kaynaklı arama ağlarına (SearXNG) ya da resmi, ücretsiz
          kaynaklara (Vikipedi, Wikimedia Commons, Marginalia, GDELT) <strong>İzdera adına</strong> iletilir. IP
          adresiniz, tarayıcı bilginiz veya çerezleriniz bu kaynaklara <strong>aktarılmaz</strong>.
        </p>
        <p>
          Aynı sorguya gelen yanıtlar, maliyeti sıfırda tutmak için 10 dakikaya kadar anonim olarak önbelleğe alınır.
          Önbellek yalnızca sorgu metnine bağlıdır; kim tarafından arandığı bilgisini içermez.
        </p>
      </>
    ),
  },
  {
    id: "tarayici",
    title: "Tarayıcınızda kalanlar",
    body: (
      <p>
        Tema, dil, güvenli arama tercihi ve (açıksa) son aramalarınız <strong>yalnızca kendi tarayıcınızın</strong>{" "}
        yerel depolamasında (localStorage) tutulur. Ayarlar menüsünden geçmişi tek tıkla silebilir ya da tamamen
        kapatabilirsiniz.
      </p>
    ),
  },
  {
    id: "dis-baglantilar",
    title: "Dış bağlantılar ve görseller",
    body: (
      <p>
        Bir sonuca tıkladığınızda hedef siteye <em>hangi kelimeyi aradığınız</em> bilgisi gönderilmez
        (<code>Referrer-Policy: no-referrer</code>). Site simgeleri İzdera üzerinden aktarılır. Görsel önizlemeleri
        ise doğrudan kaynak sunuculardan yüklenir; bu sunucular IP adresinizi görebilir.
      </p>
    ),
  },
  {
    id: "sesli-arama",
    title: "Sesli arama",
    body: (
      <p>
        Mikrofon düğmesi tarayıcınızın yerleşik konuşma tanıma özelliğini kullanır. Chrome ve Edge gibi tarayıcılar
        sesi tanıma için kendi sunucularına gönderebilir. Özellik yalnızca siz düğmeye bastığınızda çalışır.
      </p>
    ),
  },
  {
    id: "barindirma",
    title: "Barındırma",
    body: (
      <p>
        İzdera Vercel altyapısında çalışır. Altyapı sağlayıcısı, hizmetin işletimi için istek kayıtlarını (IP ve
        istek adresi dahil) kısa süreliğine tutabilir. İzdera bu kayıtları profil oluşturmak için kullanmaz.
      </p>
    ),
  },
  {
    id: "eklenti",
    title: "Tarayıcı eklentisi",
    body: (
      <p>
        İzdera eklentisi adres çubuğu aramalarınızı İzdera&apos;ya yönlendirir ve isteğe bağlı olarak yeni sekmede
        İzdera&apos;yı açar. Eklenti hiçbir veri toplamaz; tek izni ayarlarınızı saklamak için kullanılan{" "}
        <code>storage</code> iznidir.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo compact />
        <ThemeToggle />
      </header>

      <main id="main" className="mx-auto max-w-3xl px-5 pt-8 pb-24">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">Gizlilik Bildirgesi</p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-fg sm:text-6xl">
          İz sürmek, <em className="text-accent">izlenmek</em> değildir.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Kısa versiyon: Sizi tanımıyoruz ve tanımak da istemiyoruz. Uzun versiyon aşağıda.
        </p>

        <div className="mt-14 space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-8 grid gap-3 sm:grid-cols-[3rem_1fr]">
              <span className="font-display text-2xl text-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div className="space-y-3 text-[0.975rem] leading-relaxed text-muted [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-fg [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:top-[0.65em] [&_li]:before:left-0 [&_li]:before:size-1.5 [&_li]:before:rounded-full [&_li]:before:bg-accent [&_strong]:text-fg [&_ul]:space-y-2">
                <h2 className="text-xl font-medium text-fg">{s.title}</h2>
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-line pt-6 text-sm text-subtle">
          Sorularınız için GitHub üzerinden bize ulaşabilirsiniz. ·{" "}
          <Link href="/" className="text-link hover:underline">
            Aramaya dön
          </Link>
        </p>
      </main>
    </div>
  );
}
