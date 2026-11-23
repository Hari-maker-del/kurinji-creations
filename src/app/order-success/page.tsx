import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OrderSuccess({searchParams}:{searchParams:Promise<{order?:string}>}) {
 const {order}=await searchParams;
 const validOrder=order && /^\\d{1,20}$/.test(order);
 let confirmed=false;
 if(validOrder){
  const admin=createAdminClient();
  const {data}=await admin.from("store_orders").select("order_number,payment_status,status").eq("order_number",order).maybeSingle();
  confirmed=!!data && data.payment_status==="paid" && data.status!=="cancelled";
 }
 return <main className="container section" style={{maxWidth:650,textAlign:"center",paddingTop:90,paddingBottom:90}}>
  <div style={{fontSize:42,color:confirmed?"#62805d":"#a8794f"}}>{confirmed?"✓":"…"}</div>
  <h1 style={{fontSize:32,fontWeight:700,margin:"15px 0"}}>{confirmed?"Thank you for your order!":"We’re checking your order"}</h1>
  <p style={{fontSize:14,color:"var(--muted)",lineHeight:1.8}}>{confirmed
   ?"Your payment has been verified and your order is confirmed. Our team will contact you using the details provided to confirm dispatch and delivery arrangements. Keep your order number handy if you contact us."
   :"We haven’t confirmed a completed payment for this order yet. If money was deducted, please contact Kurinji Creations with your order number before trying to pay again."}</p>
  {validOrder&&<p style={{fontWeight:700,margin:"20px 0"}}>Order number: #{order}</p>}
  <Link href="/account" className="primary-button" style={{textDecoration:"none",marginTop:15,marginRight:8}}>VIEW MY ORDERS</Link><Link href="/shop" className="primary-button" style={{textDecoration:"none",marginTop:15}}>CONTINUE SHOPPING</Link>
 </main>;
}
