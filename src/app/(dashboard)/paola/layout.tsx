import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Layout({ children }: LayoutProps<"/paola">) {
  return <DashboardLayout rol="paola">{children}</DashboardLayout>;
}
