import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── BRANCHES (4 sucursales) ────────────────────────────────
  const branches = [
    { id: "branch-cen", code: "CEN", name: "Sucursal Centro", address: "Av. Reforma 450, Col. Juarez", city: "CDMX", state: "Ciudad de Mexico", hours: "Lun-Sab 8:00-19:00, Dom 9:00-14:00", lat: 19.4326, lng: -99.1332, supportsPayAtBranch: true },
    { id: "branch-nte", code: "NTE", name: "Sucursal Norte", address: "Blvd. Industrial 1200, Col. Cumbres", city: "Monterrey", state: "Nuevo Leon", hours: "Lun-Sab 8:00-19:00", lat: 25.6866, lng: -100.3161, supportsPayAtBranch: true },
    { id: "branch-sur", code: "SUR", name: "Sucursal Sur", address: "Calle 60 #320, Col. Centro", city: "Merida", state: "Yucatan", hours: "Lun-Sab 8:30-18:30", lat: 20.9674, lng: -89.5926, supportsPayAtBranch: true },
    { id: "branch-ori", code: "ORI", name: "Sucursal Oriente", address: "Blvd. Hermanos Serdan 456", city: "Puebla", state: "Puebla", hours: "Lun-Sab 8:00-19:00", lat: 19.0414, lng: -98.2063, supportsPayAtBranch: false },
  ];

  for (const b of branches) {
    await prisma.branch.upsert({ where: { code: b.code }, update: b, create: b });
  }

  // ─── PRODUCTS (12 llantas en 4 medidas) ──────────────────────
  const products = [
    // 205/55 R16 (sedanes populares)
    { id: "p-bri-re760", sku: "BRI205516", slug: "bridgestone-potenza-re760-sport-205-55-r16", brand: "Bridgestone", model: "Potenza RE760 Sport", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "W", usage: "Sporting", traction: "AA", temperature: "A", treadwear: 340, priceCents: 180675, compareAtPriceCents: 240900, isFeatured: true, imageSvgSeed: 1, description: "Rendimiento deportivo superior en seco y mojado. Respuesta precisa en curvas." },
    { id: "p-gdy-eagle2", sku: "GDY205516", slug: "goodyear-eagle-sport-2-205-55-r16", brand: "Goodyear", model: "Eagle Sport 2", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "V", usage: "Touring", traction: "A", temperature: "A", treadwear: 460, priceCents: 164925, compareAtPriceCents: 219900, isFeatured: false, imageSvgSeed: 2, description: "Traccion confiable en lluvia. Tecnologia ActiveBraking para frenado efectivo." },
    { id: "p-pir-p7", sku: "PIR205516", slug: "pirelli-cinturato-p7-205-55-r16", brand: "Pirelli", model: "Cinturato P7", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "V", usage: "Touring", traction: "A", temperature: "A", treadwear: 400, priceCents: 187765, compareAtPriceCents: 220900, isFeatured: false, imageSvgSeed: 3, description: "Confort y eco-performance. Baja resistencia al rodamiento, menor consumo." },
    { id: "p-con-ultra", sku: "CON205516", slug: "continental-ultracontact-205-55-r16", brand: "Continental", model: "UltraContact", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "V", usage: "Touring", traction: "A", temperature: "A", treadwear: 480, priceCents: 187920, compareAtPriceCents: 234900, isFeatured: false, imageSvgSeed: 4, description: "Durabilidad excepcional con compuesto de silice. Frenado seguro en mojado." },
    { id: "p-kel-edge", sku: "KEL205516", slug: "kelly-edge-sport-2-205-55-r16", brand: "Kelly", model: "Edge Sport 2", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "V", usage: "Touring", traction: "A", temperature: "B", treadwear: 380, priceCents: 143900, compareAtPriceCents: null, isFeatured: false, imageSvgSeed: 5, description: "Excelente relacion precio-rendimiento. Ideal para uso diario." },
    { id: "p-com-blazer", sku: "COM205516", slug: "compasal-blazer-hp-205-55-r16", brand: "Compasal", model: "Blazer HP", width: 205, aspectRatio: 55, rim: 16, loadIndex: "91", speedRating: "V", usage: "Touring", traction: "B", temperature: "A", treadwear: 360, priceCents: 107900, compareAtPriceCents: null, isFeatured: false, imageSvgSeed: 6, description: "La opcion mas accesible sin sacrificar seguridad. Buen agarre general." },
    // 185/65 R15 (compactos)
    { id: "p-bri-eco15", sku: "BRI185615", slug: "bridgestone-ecopia-ep150-185-65-r15", brand: "Bridgestone", model: "Ecopia EP150", width: 185, aspectRatio: 65, rim: 15, loadIndex: "88", speedRating: "H", usage: "Touring", traction: "A", temperature: "A", treadwear: 440, priceCents: 149900, compareAtPriceCents: 179900, isFeatured: false, imageSvgSeed: 7, description: "Eco-friendly con baja resistencia al rodamiento. Ideal para ciudad." },
    { id: "p-gdy-assur15", sku: "GDY185615", slug: "goodyear-assurance-185-65-r15", brand: "Goodyear", model: "Assurance MaxLife", width: 185, aspectRatio: 65, rim: 15, loadIndex: "88", speedRating: "H", usage: "Touring", traction: "A", temperature: "B", treadwear: 520, priceCents: 135900, compareAtPriceCents: null, isFeatured: false, imageSvgSeed: 8, description: "La llanta de mayor duracion de Goodyear. Garantia de 130,000 km." },
    // 225/45 R17 (sedanes premium)
    { id: "p-mic-ps5", sku: "MIC225417", slug: "michelin-pilot-sport-5-225-45-r17", brand: "Michelin", model: "Pilot Sport 5", width: 225, aspectRatio: 45, rim: 17, loadIndex: "94", speedRating: "Y", usage: "Sporting", traction: "AA", temperature: "A", treadwear: 320, priceCents: 389900, compareAtPriceCents: null, isFeatured: true, imageSvgSeed: 9, description: "El benchmark en llantas deportivas. Agarre excepcional seco y mojado." },
    { id: "p-pir-pzero17", sku: "PIR225417", slug: "pirelli-p-zero-225-45-r17", brand: "Pirelli", model: "P Zero", width: 225, aspectRatio: 45, rim: 17, loadIndex: "94", speedRating: "Y", usage: "Sporting", traction: "AA", temperature: "A", treadwear: 300, priceCents: 419900, compareAtPriceCents: 479900, isFeatured: false, imageSvgSeed: 10, description: "Nacida en la pista, perfeccionada para la calle. OE de Ferrari y BMW." },
    // 235/55 R19 (SUVs)
    { id: "p-con-lx25", sku: "CON235519", slug: "continental-crosscontact-lx25-235-55-r19", brand: "Continental", model: "CrossContact LX25", width: 235, aspectRatio: 55, rim: 19, loadIndex: "101", speedRating: "H", usage: "HT", traction: "A", temperature: "B", treadwear: 500, priceCents: 420000, compareAtPriceCents: 480000, isFeatured: false, imageSvgSeed: 11, description: "Para SUVs premium. Confort silencioso y excelente vida util." },
    { id: "p-pir-scorp19", sku: "PIR235519", slug: "pirelli-scorpion-verde-235-55-r19", brand: "Pirelli", model: "Scorpion Verde All Season", width: 235, aspectRatio: 55, rim: 19, loadIndex: "101", speedRating: "V", usage: "HT", traction: "A", temperature: "A", treadwear: 460, priceCents: 510000, compareAtPriceCents: null, isFeatured: true, imageSvgSeed: 12, description: "SUV eco-performance. Equipamiento original de Audi Q5 y Volvo XC60." },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { ...p, compareAtPriceCents: p.compareAtPriceCents ?? undefined },
      create: { ...p, compareAtPriceCents: p.compareAtPriceCents ?? undefined },
    });
  }

  // ─── SERVICES ────────────────────────────────────────────────
  const services = [
    { id: "srv-inst-15", code: "INSTALACION_R15", name: "Instalacion completa R15 (montaje, balanceo, valvulas, nitrogeno)", priceCents: 17900, perUnit: true },
    { id: "srv-inst-16", code: "INSTALACION_R16", name: "Instalacion completa R16 (montaje, balanceo, valvulas, nitrogeno)", priceCents: 17900, perUnit: true },
    { id: "srv-inst-17", code: "INSTALACION_R17", name: "Instalacion completa R17 (montaje, balanceo, valvulas, nitrogeno)", priceCents: 19900, perUnit: true },
    { id: "srv-inst-19", code: "INSTALACION_R19", name: "Instalacion completa R19 (montaje, balanceo, valvulas, nitrogeno)", priceCents: 22900, perUnit: true },
    { id: "srv-seguro", code: "SEGURO", name: "Seguro contra danos por carretera (12 meses)", priceCents: 14900, perUnit: true },
    { id: "srv-alineacion", code: "ALINEACION", name: "Alineacion computarizada 3D", priceCents: 89900, perUnit: false },
  ];

  for (const s of services) {
    await prisma.service.upsert({ where: { code: s.code }, update: s, create: s });
  }

  // ─── VEHICLE FITMENTS ────────────────────────────────────────
  const fitments = [
    { make: "Volkswagen", model: "Jetta", year: 2024, version: "Comfortline", width: 205, aspectRatio: 55, rim: 16 },
    { make: "Volkswagen", model: "Jetta", year: 2024, version: "GLI", width: 225, aspectRatio: 45, rim: 17 },
    { make: "Nissan", model: "Sentra", year: 2024, version: "Advance", width: 205, aspectRatio: 55, rim: 16 },
    { make: "Nissan", model: "Versa", year: 2024, version: "Exclusive", width: 185, aspectRatio: 65, rim: 15 },
    { make: "Toyota", model: "Corolla", year: 2024, version: "SE", width: 205, aspectRatio: 55, rim: 16 },
    { make: "Chevrolet", model: "Aveo", year: 2023, version: "LT", width: 185, aspectRatio: 65, rim: 15 },
    { make: "Honda", model: "CR-V", year: 2024, version: "Touring", width: 235, aspectRatio: 55, rim: 19 },
    { make: "Mazda", model: "CX-5", year: 2024, version: "Signature", width: 225, aspectRatio: 45, rim: 17 },
  ];

  // Delete existing fitments and re-create
  await prisma.vehicleFitment.deleteMany();
  for (const f of fitments) {
    await prisma.vehicleFitment.create({ data: f });
  }

  // ─── BRANCH INVENTORY (fragmentado intencional) ──────────────
  // Format: [productId, CEN, NTE, SUR, ORI]
  const stockData: [string, number, number, number, number][] = [
    // 205/55 R16
    ["p-bri-re760",   8,  12,   4,   6],
    ["p-gdy-eagle2",  15,   0,  10,   8],
    ["p-pir-p7",       4,   6,  12,   3],
    ["p-con-ultra",   10,   8,   0,   5],
    ["p-kel-edge",    20,  14,  18,  22],
    ["p-com-blazer",  30,  25,  20,  15],
    // 185/65 R15
    ["p-bri-eco15",   12,   1,   8,  14],  // NTE = 1 unidad (para demo de carrera)
    ["p-gdy-assur15",  0,  16,   6,  10],  // CEN = agotado
    // 225/45 R17
    ["p-mic-ps5",      6,   4,   2,   0],  // ORI = agotado
    ["p-pir-pzero17",  3,   5,   0,   4],  // SUR = agotado
    // 235/55 R19
    ["p-con-lx25",     0,   0,   3,   5],  // CEN y NTE agotados
    ["p-pir-scorp19",  4,   6,   2,   3],
  ];

  const branchIds = ["branch-cen", "branch-nte", "branch-sur", "branch-ori"];

  // Delete existing inventory
  await prisma.branchInventory.deleteMany();
  for (const [productId, ...stocks] of stockData) {
    for (let i = 0; i < 4; i++) {
      await prisma.branchInventory.create({
        data: {
          branchId: branchIds[i],
          productId,
          physical: stocks[i],
          reserved: 0,
          version: 0,
        },
      });
    }
  }

  // ─── COUPON ──────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: "DEMO10" },
    update: { discountPercent: 10, active: true },
    create: { code: "DEMO10", discountPercent: 10, active: true, maxUses: 100, currentUses: 0 },
  });

  // ─── CLEAN EVENT TABLES ──────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  console.log("Seed completed: 4 branches, 12 products, 6 services, 8 fitments, 48 inventory records, 1 coupon");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
