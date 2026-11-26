import TvLoginForm from "@/components/tv/TvLoginForm";

export default function TvLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0a0f] px-6 font-sans text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,168,130,0.18),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(96,120,150,0.18),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(120,80,90,0.16),transparent_50%)]" />
      <TvLoginForm />
    </main>
  );
}
