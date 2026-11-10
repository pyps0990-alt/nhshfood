import { AdminBackdrop } from "@/components/glass/Backdrop";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminBackdrop />
      {children}
    </>
  );
}
