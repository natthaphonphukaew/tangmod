import type { Metadata } from "next";
import { TangmodApp } from "@/components/app/TangmodApp";
import { getAuthOptions } from "@/lib/auth-options";

export const metadata: Metadata = {
  title: "ปฏิทินนักศึกษา",
  description: "วันลงทะเบียน จ่ายเงิน ถอน W สอบ วันหยุด และเรียนชดเชย ปีการศึกษา 2569 ของ มจธ. บางมด พร้อมตารางเรียนของคุณ",
};

// แอปตัวเดียวกับหน้าแรก (แถบซ้ายไม่หาย) TangmodApp ดู path แล้วแสดงปฏิทิน
export default function CalendarPage() {
  return <TangmodApp authOptions={getAuthOptions()} />;
}
