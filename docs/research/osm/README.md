# ข้อมูลแผนที่จาก OpenStreetMap

ดึงเมื่อ 3 พ.ย. 2569 ใช้สร้าง `content/map-layout.json` ด้วยคำสั่ง

```bash
npx tsx scripts/map/build-layout.ts
```

## ไฟล์

| ไฟล์ | มาจาก |
|---|---|
| `campus.json` | Overpass API: ทุกอย่างในขอบเขต มจธ. บางมด (way 420312611) ได้แก่ ตึก ถนน ทางเดิน สวน สนาม ลานจอด ประตู ป้ายรถ ร้าน |
| `surroundings.json` | Overpass API: ถนนสายหลัก ซอย คลอง สระ และป้ายรถเมล์รอบมอ (bbox 13.6470,100.4895 – 13.6570,100.4985) |
| `mapnavi-pins.json` | หมุด Google Maps ของตึก S1–S15, N1–N20 ที่ลิงก์ไว้ในหน้า [MapNavi](https://bgm.kmutt.ac.th/MapNavi/MAPNAVI.html) ของ มจธ. (เปิดลิงก์สั้นแล้วอ่านพิกัดจาก URL) |

การจับคู่รหัสตึกกับรูปตึกใน OSM อยู่ที่ `scripts/map/osm-ids.ts`

## สิ่งที่ต้องรู้

- **ไลเซนส์:** ข้อมูล OSM ใช้ภายใต้ [ODbL](https://www.openstreetmap.org/copyright) แผนที่ในแอปจึงต้องแสดง "© OpenStreetMap contributors" (อยู่มุมซ้ายล่างของแผนที่)
- **ถนนในมอไม่มีชื่อใน OSM:** วาดถนนครบแต่ไม่ตั้งชื่อเอง ชื่อที่แสดงมีแค่ถนนประชาอุทิศ
- **ตึกที่ OSM ไม่มีรูป:** S1, N1, N5, N12, N18, N19 วาดเป็นกล่องประมาณรอบหมุด MapNavi (เส้นประบนแผนที่)
- **ชื่อใน OSM ที่ไม่ตรงผังทางการ:** ปีกหนึ่งของวิศววัฒนะชื่อ "คณะวิศวกรรมโยธา" และ N4 ชื่อ "ภาควิชาคณิตศาสตร์" ใช้ชื่อจากผังทางการแทน
- **จุดที่ไม่ใช้:** "สนามบาส" (node 6110949756) ตกอยู่บนตึก N6 พอดี น่าจะผิด

## ดึงใหม่

Overpass ต้องส่ง User-Agent ไม่งั้นได้ 406 ตัวอย่าง query ของ `campus.json`:

```
[out:json][timeout:60];
way(420312611)->.campus;.campus map_to_area->.a;
(.campus;way(area.a)[building];relation(area.a)[building];way(area.a)[highway];way(area.a)[leisure];
 way(area.a)[natural];way(area.a)[landuse];way(area.a)[amenity];way(area.a)[waterway];way(area.a)[water];
 node(area.a)[barrier=gate];node(area.a)[entrance];node(area.a)[highway=bus_stop];node(area.a)[amenity];
 node(area.a)[shop];node(area.a)[leisure];node(area.a)[historic];node(area.a)[tourism];);
out geom;
```
