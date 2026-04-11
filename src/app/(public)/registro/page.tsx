"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegistroPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/club/registro");
  }, [router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-16">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/6 px-6 py-5 text-sm text-slate-300 backdrop-blur-xl">
        Redirigiendo al registro del club...
      </div>
    </main>
  );
}
