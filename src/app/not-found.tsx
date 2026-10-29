import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="p-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link
        href="/"
        className="mt-5 inline-flex min-h-11 items-center text-primary"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
