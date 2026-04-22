import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg rounded-lg",
              headerTitle: "text-2xl font-bold text-gray-900",
              headerSubtitle: "text-gray-600",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              formFieldLabel: "text-gray-700",
              footerActionLink: "text-blue-600 hover:text-blue-700",
            },
          }}
          redirectUrl="/dashboard"
          signInUrl="/auth/sign-in"
        />
      </div>
    </div>
  );
}
