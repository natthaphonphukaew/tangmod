import type { Metadata } from "next";
import { TangmodApp } from "@/components/app/TangmodApp";
import { getAuthOptions } from "@/lib/auth-options";

export const metadata: Metadata = {
  title: "เข็มทิศสาขา",
  description: "หาสาขาที่เข้ากับเรา สำรวจและเทียบปริญญาตรีทุกคณะของ มจธ. พร้อมค่าเทอม วิทยาเขต และวันรับสมัคร TCAS",
};

// แอปตัวเดียวกับหน้าแรก (แถบซ้ายไม่หาย) TangmodApp ดู path แล้วแสดงเข็มทิศ
export default function CompassPage() {
  return <TangmodApp authOptions={getAuthOptions()} />;
}
