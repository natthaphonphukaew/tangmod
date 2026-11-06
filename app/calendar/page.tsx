import type { Metadata } from "next";
import { CalendarScreen } from "@/components/calendar/CalendarScreen";

export const metadata: Metadata = {
  title: "ปฏิทินนักศึกษา",
  description: "วันลงทะเบียน จ่ายเงิน ถอน W สอบ วันหยุด และเรียนชดเชย ปีการศึกษา 2569 ของ มจธ. บางมด",
};

export default function CalendarPage() {
  return <CalendarScreen />;
}
