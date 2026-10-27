import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main" className="trail-backdrop flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark animated className="mb-6 size-16" />
      <p className="text-xs font-medium tracking-widest text-accent uppercase">404</p>
      <h1 className="mt-2 font-display text-5xl text-fg">Bu iz bir yere çıkmıyor</h1>
      <p className="mt-3 max-w-sm text-muted">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-all hover:brightness-110 active:scale-95"
      >
        Aramaya dön
      </Link>
    </main>
  );
}
