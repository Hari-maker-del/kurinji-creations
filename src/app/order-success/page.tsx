import Link from "next/link";
export default async function OrderSuccess({searchParams}:{searchParams:Promise<{order?:string}>}) {
 const {order}=await searchParams;
 return <main className="container section" style={{maxWidth:650,textAlign:"center",paddingTop:90,paddingBottom:90}}>
  <div style={{fontSize:42,color:"#62805d"}}>✓</div><h1 style={{fontSize:32,fontWeight:700,margin:"15px 0"}}>Thank you for your order!</h1>
  <p style={{fontSize:14,color:"var(--muted)",lineHeight:1.8}}>Your payment has been verified and your order is confirmed. Our team will contact you using the details provided to confirm dispatch and delivery arrangements. Keep your order number handy if you contact us.</p>
  {order&&<p style={{fontWeight:700,margin:"20px 0"}}>Order number: #{order}</p>}
  <Link href="/account" className="primary-button" style={{textDecoration:"none",marginTop:15,marginRight:8}}>VIEW MY ORDERS</Link><Link href="/shop" className="primary-button" style={{textDecoration:"none",marginTop:15}}>CONTINUE SHOPPING</Link>
 </main>;
}
