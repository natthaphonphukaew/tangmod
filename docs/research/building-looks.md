# หน้าตาตึกบนแผนที่ (สีและรายละเอียด)

ดูจากรูปจริงเมื่อ 3 พ.ย. 2569 ใช้กำหนดสีผนัง หลังคา และแบบหน้าต่างใน `scripts/map/osm-ids.ts` (`BUILDING_STYLE`)
ตึกที่ไม่มีรูปอ้างอิงใช้ค่ากลาง: ผนังขาวครีม หน้าต่างตาราง (ตึกส่วนใหญ่ใน มจธ. บางมดเป็นตึกสีขาว)

ความสูงของภาพตึกมาจากจำนวนชั้นใน OSM หรือที่มีแหล่ง (ดู `EXTRA_FLOORS`) บีบให้ไม่เกิน 15 ชั้น ไม่ใช่สัดส่วนจริง
แอร์และป้อมบันไดบนหลังคาเป็นของตกแต่ง วางแบบกำหนดตายตัว ไม่ใช่ตำแหน่งจริง

| ตึก | หน้าตาที่ใช้ | แหล่งรูป |
|---|---|---|
| S4 วิศววัฒนะ (ตึกแดง) | ผนังแดงอิฐ แถบหน้าต่างขาวทุกชั้น หลังคาแต้มแดงอ่อน | [Commons: KMUTT Witsawawatthana Building 20220927.jpg](https://commons.wikimedia.org/wiki/File:KMUTT_Witsawawatthana_Building_20220927.jpg), [CEKMUTT 20220927.jpg](https://commons.wikimedia.org/wiki/File:CEKMUTT_20220927.jpg), [KMUTT Bangmod 1.jpg](https://commons.wikimedia.org/wiki/File:KMUTT_Bangmod_1.jpg) |
| S15 วิศวะเคมี | ผนังครีม ระแนงไม้สีน้ำตาล | [Commons: Chemical engineering building.jpg](https://commons.wikimedia.org/wiki/File:Chemical_engineering_building.jpg), [KMUTTChemeng 20220927.jpg](https://commons.wikimedia.org/wiki/File:KMUTTChemeng_20220927.jpg) |
| N11 SIT | ตึกขาว หน้าต่างตาราง หลังคาทางเข้าโลหะเฉียงสีเงิน | [Commons: N11 building.png](https://commons.wikimedia.org/wiki/File:N11_building.png) |
| N9 FIBO | ตึกขาวกับผนังกระจกโค้งสีเขียวอมฟ้า | [Commons: Fibo -.jpg](https://commons.wikimedia.org/wiki/File:Fibo_-.jpg), [Fibo --.jpg](https://commons.wikimedia.org/wiki/File:Fibo_--.jpg) |
| N10 หอสมุด | ตึกขาว ด้านหน้ากระจกสีเขียวอ่อน | [Commons: KMUTT Bangmod 5.jpg](https://commons.wikimedia.org/wiki/File:KMUTT_Bangmod_5.jpg) |
| N16 LX | พื้นแต่ละชั้นโค้งสีขาว เสาเฉียงสีส้ม มีสวน | ภาพค้น Bing "KMUTT Learning Exchange" (เว็บหอสมุด มจธ. และ OPH Architects), [Commons: Lx garden.jpg](https://commons.wikimedia.org/wiki/File:Lx_garden.jpg) |
| N17 CB2 และอาคารเรียนรวมอื่น (N20, S11, S12, S13) | ตึกขาว ครีบแนวตั้ง | [Commons: KMUTT N17 20220927.jpg](https://commons.wikimedia.org/wiki/File:KMUTT_N17_20220927.jpg) · CB อื่นยังไม่มีรูปของตัวเอง ใช้แบบเดียวกับ CB2 |
| S5, S6 หอพักธรรมรักษา | ผนังครีม แถบแนวตั้งสีส้มอมชมพู มีระเบียง | [Commons: KMUTT Bangmod 2.jpg](https://commons.wikimedia.org/wiki/File:KMUTT_Bangmod_2.jpg) (ตึกหอพักสูง ใช้กับทั้งสองหอ) |
| S14 ตึก 190 ปี | ขาวอมเทา แผงเทา | [Commons: SportandRecreationComplex 20220901.jpg](https://commons.wikimedia.org/wiki/File:SportandRecreationComplex_20220901.jpg) น่าจะเป็นตึกนี้ (ศูนย์กีฬาอยู่ใน S14) ยังไม่ยืนยัน |

## ยังไม่มีรูปอ้างอิง
S1, S2 (อาคารจอดรถ), S3, S7, S8, S9, S10, N1–N8 (ยกเว้นที่อยู่ในตาราง), N12–N15, N18, N19 · หน้าเว็บ MapNavi มีรูปทุกตึก (`images/<รหัส>.jpg`) แต่วันที่ค้นเซิร์ฟเวอร์ bgm.kmutt.ac.th เชื่อมต่อไม่ได้ ถ้ากลับมาใช้ได้ให้ดูรูปจากที่นั่นแล้วเติมตาราง
