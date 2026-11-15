import { brand } from "@/lib/config";

export const dynamic = "force-static";

/** Downloadable contact card so visitors can save WALOOP to their phone. */
export function GET() {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${brand.name}`,
    `ORG:${brand.name}`,
    `TITLE:${brand.tagline}`,
    `TEL;TYPE=WORK,VOICE:${brand.phone.replace(/\s/g, "")}`,
    `TEL;TYPE=CELL:${brand.whatsapp.replace(/\s/g, "")}`,
    `EMAIL;TYPE=WORK:${brand.email}`,
    `URL:${brand.website}`,
    `NOTE:${brand.description}`,
    "END:VCARD",
  ].join("\r\n");

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="WALOOP.vcf"',
    },
  });
}
