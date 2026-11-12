import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export const metadata = {
  title: "Página no encontrada",
};

export const generateStaticParams = () => {
  return {};
};

export default function NotFoundPage() {
  notFound();
}