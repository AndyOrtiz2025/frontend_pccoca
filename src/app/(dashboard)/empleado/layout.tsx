import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Layout({ children }: LayoutProps<"/empleado">) {
  return <DashboardLayout rol="empleado">{children}</DashboardLayout>;
}
