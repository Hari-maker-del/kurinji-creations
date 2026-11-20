import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({error:"Reference uploads are temporarily unavailable."},{status:503});
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({error:"Choose an image first."},{status:400});
    const allowed = new Set(["image/jpeg","image/png","image/webp"]);
    if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({error:"Use a JPG, PNG or WebP image up to 5 MB."},{status:400});
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = new Date().toISOString().slice(0,10) + "/" + randomUUID() + "." + ext;
    const admin = createAdminClient();
    const {error:uploadError} = await admin.storage.from("customisation-references").upload(path, file, {contentType:file.type,upsert:false});
    if (uploadError) return NextResponse.json({error:"Could not upload the reference image. Please try again."},{status:500});
    const {data:signed,error:signedError} = await admin.storage.from("customisation-references").createSignedUrl(path,60*60*24*30);
    if (signedError || !signed?.signedUrl) return NextResponse.json({error:"Image uploaded but its preview link could not be created."},{status:500});
    return NextResponse.json({path,url:signed.signedUrl});
  } catch {
    return NextResponse.json({error:"Unable to upload this image."},{status:500});
  }
}
