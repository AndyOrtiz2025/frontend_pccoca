import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Layout({ children }: LayoutProps<"/oscar">) {
  return <DashboardLayout rol="oscar">{children}</DashboardLayout>;
}
