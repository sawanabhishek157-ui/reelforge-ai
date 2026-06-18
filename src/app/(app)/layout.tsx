import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-6 lg:px-10 lg:py-8">
          <Topbar />
          {children}
        </div>
      </main>
    </div>
  );
}
