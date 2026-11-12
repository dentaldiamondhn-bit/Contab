"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CustomSignOutButton() {
  const router = useRouter();

  return (
    <SignOutButton>
      <button
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
        onClick={() => {
          // Force redirect to /auth/login after sign out
          setTimeout(() => {
            router.push("/auth/login");
          }, 100);
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Cerrar Sesión</span>
      </button>
    </SignOutButton>
  );
}
