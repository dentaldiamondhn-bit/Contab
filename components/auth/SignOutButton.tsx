"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  return (
    <SignOutButton>
      <button
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        onClick={() => {
          // Force redirect to /auth/login after sign out
          setTimeout(() => {
            router.push("/auth/login");
          }, 100);
        }}
      >
        Cerrar Sesión
      </button>
    </SignOutButton>
  );
}
