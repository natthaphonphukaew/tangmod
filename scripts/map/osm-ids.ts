/*
 * จับคู่รหัสตึกของ มจธ. (ผัง MapNavi) กับรูปร่างตึกใน OpenStreetMap
 * วิธีจับคู่: หมุด Google Maps ของแต่ละตึกในหน้า MapNavi ตกอยู่ในรูปตึก OSM ไหน (หรือใกล้สุดไม่เกิน ~20 ม.)
 * key ของ OSM: "w" + way id, "r" + relation id, "n" + node id
 */

/** way ของขอบเขตมหาวิทยาลัย (amenity=university) */
export const CAMPUS_WAY = 420312611;

export const BUILDING_OSM: Record<string, string[]> = {
  S2: ["w378153794"],
  S3: ["r9183623"],
  // กลุ่มอาคารวิศววัฒนะมีหลายปีก (OSM ตั้งชื่อปีกหนึ่งว่า "คณะวิศวกรรมโยธา" ซึ่งไม่ตรงกับผัง จึงไม่ใช้ชื่อนั้น)
  S4: ["w420044928", "w420044929", "w420044930", "w420044931"],
  S5: ["w420045662"],
  S6: ["w420051710"],
  S7: ["w436983066"],
  // S8 กับ S9 อยู่ในรูปตึกเดียวกันใน OSM แบ่งครึ่งตามหมุดของสองตึก (ดู SPLITS)
  S8: ["w651713745"],
  S9: ["w651713745"],
  S10: ["w1333533934"],
  S11: ["w420533543"],
  S12: ["w420534334"],
  S13: ["w420534582"],
  S14: ["w346449664"],
  S15: ["w436983067"],
  N2: ["w420327738"],
  N3: ["w436983064"],
  // OSM ตั้งชื่อว่า "ภาควิชาคณิตศาสตร์" ผังทางการคือ ฟิสิกส์-คณิตศาสตร์
  N4: ["w436983063"],
  N6: ["w420328169"],
  N7: ["w420302821"],
  N8: ["w420303666"],
  N9: ["w346450376"],
  N10: ["w311879209"],
  N11: ["w224982053"],
  N13: ["w1333533936"],
  N14: ["w1333533937"],
  N15: ["w420534007"],
  N16: ["w1333533935"],
  N17: ["w420534143"],
  N20: ["w436983061"],
};

export const SPLITS: Record<string, string> = { S8: "S9", S9: "S8" };

/** ตึกที่ OSM ยังไม่มีรูปร่าง: วาดกล่องขนาดประมาณ (เมตร กว้าง × ลึก) รอบหมุด MapNavi */
export const SYNTH_SIZE: Record<string, [number, number]> = {
  S1: [26, 18],
  N1: [24, 16],
  N5: [18, 14],
  N12: [18, 12],
  N18: [16, 12],
  N19: [20, 14],
};

/**
 * จำนวนชั้นเมื่อ OSM ไม่มี ใช้แค่กำหนดความสูงของภาพตึก (ตึกที่ไม่รู้ใช้ค่ากลาง 4 ชั้น)
 * ใส่เฉพาะที่มีแหล่ง: S2 14 ชั้น (admission.kmutt.ac.th), LX 15 ชั้น, หอสมุดมีชั้น 5 (KM Room),
 * CB5 มีชั้น 8 (GMI), CB4 มีชั้น 10 (ENE), S14 มีชั้น 4 (บล็อกนักศึกษา)
 */
export const EXTRA_FLOORS: Record<string, number> = {
  S2: 14,
  N16: 15,
  N10: 5,
  S11: 8,
  S12: 10,
  S14: 4,
};

export type MapPointDef = { id: string; kind: "gate" | "bus" | "shuttle" | "shop" | "landmark" | "sport"; osm?: string; lat?: number; lon?: number };

/** จุดบนแผนที่ที่เป็นสถานที่ใน places.json */
export const POINTS: MapPointDef[] = [
  { id: "main_gate", kind: "gate", osm: "n4200331143" },
  { id: "gate_2", kind: "gate", osm: "n4200380479" },
  { id: "bus_stop_front", kind: "bus", lat: 13.6507049, lon: 100.4965371 },
  { id: "shuttle_stop", kind: "shuttle", osm: "n4348163154" },
  { id: "seven_eleven_eng", kind: "shop", osm: "w1333533931" },
  { id: "seven_eleven_dorm", kind: "shop", osm: "n6207310420" },
  { id: "lan_phrachom", kind: "landmark", osm: "n3176409880" },
  { id: "football_field", kind: "sport", osm: "w1317832382" },
  { id: "tennis_court", kind: "sport", osm: "w1333533933" },
  // ไม่ใช้จุด "สนามบาส" ของ OSM (n6110949756) เพราะตกอยู่บนตึก N6 พอดี ตำแหน่งน่าจะผิด
];

/**
 * หน้าตาตึก (สีผนัง หลังคา แบบหน้าต่าง ของเด่น) ดูจากรูปจริง แหล่งรูปอยู่ใน docs/research/building-looks.md
 * ตึกที่ไม่มีรูปอ้างอิงใช้ค่ากลาง (ผนังขาวครีม หน้าต่างตาราง) ตามที่ตึกส่วนใหญ่ใน มจธ. เป็นตึกสีขาว
 * windows: grid = หน้าต่างเป็นช่อง · band = แถบหน้าต่างยาวรอบตึก · glass = ผนังกระจก · fins = ครีบแนวตั้ง · balcony = ระเบียงห้องพัก
 * accent: เส้นแนวตั้งเด่นบนผนัง (เสาสีส้มของ LX, ระแนงไม้ของวิศวะเคมี, แถบสีของหอพัก)
 * deco: garden = สวนบนหลังคา · canopy = หลังคาทางเข้าเด่น
 * roof: ตึกที่สีผนังเด่น แต้มสีหลังคาให้ใกล้สีผนัง คนดูจากมุมบนจะยังจำได้ว่าเป็นตึกแดง/ตึกกระจก
 */
export type BuildingStyleDef = {
  wall: string;
  roof: string;
  windows: "grid" | "band" | "glass" | "fins" | "balcony";
  glass?: string;
  accent?: string;
  deco?: ("garden" | "canopy")[];
};

const WHITE = { wall: "#f4f2ec", roof: "#e9e6df" };
const CB = { ...WHITE, windows: "fins" as const };

export const BUILDING_STYLE: Record<string, BuildingStyleDef> = {
  // ตึกแดง: ผนังแดงอิฐคาดแถบขาว
  S4: { wall: "#b9473c", roof: "#d9a99f", windows: "band" },
  // ผนังครีม ระแนงไม้สีน้ำตาล ฐานอิฐแดง
  S15: { wall: "#efe5d4", roof: "#e6d6bf", windows: "grid", accent: "#a8703f" },
  // ตึกขาว หน้าต่างตาราง หลังคาทางเข้าโลหะเฉียงสีเงิน
  N11: { ...WHITE, windows: "grid", deco: ["canopy"] },
  // ตึกขาวกับผนังกระจกโค้งสีเขียวอมฟ้า
  N9: { ...WHITE, roof: "#d6e8e6", windows: "glass", glass: "#4f9c9a" },
  // ตึกขาว ด้านหน้าเป็นกระจกสีเขียวอ่อน
  N10: { ...WHITE, roof: "#e2eee9", windows: "glass", glass: "#86b9ae" },
  // พื้นแต่ละชั้นโค้งสีขาว เสาเฉียงสีส้ม มีสวนบนหลังคา
  N16: { wall: "#f7f6f2", roof: "#e6e3dc", windows: "band", accent: "#f0662a", deco: ["garden"] },
  // อาคารเรียนรวม: ตึกขาวครีบแนวตั้ง
  N17: CB,
  N20: CB,
  S11: CB,
  S12: CB,
  S13: CB,
  // หอพักธรรมรักษา: ผนังครีม แถบแนวตั้งสีส้มอมชมพู มีระเบียง
  S5: { wall: "#f3e8d8", roof: "#f0d3c2", windows: "balcony", accent: "#e08e68" },
  S6: { wall: "#f3e8d8", roof: "#f0d3c2", windows: "balcony", accent: "#e08e68" },
  // ศูนย์กีฬาและนันทนาการ (รูปใน Commons ชื่อ Sport and Recreation Complex น่าจะเป็นตึกนี้): ขาวอมเทา แผงเทา
  S14: { wall: "#eceae5", roof: "#dcd8d0", windows: "band", accent: "#8d949b" },
};
