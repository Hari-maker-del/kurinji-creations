"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,LockKeyhole,Minus,Plus,ShoppingBag,Trash2,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/client";

type Product={id:string;slug:string;name:string;price:number;image:string;stock:number};
const KEY="kurinji_cart_v1";
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v);
export default function CheckoutPage(){
 const router=useRouter();
 const [products,setProducts]=useState<Product[]>([]);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[address,setAddress]=useState(""),[note,setNote]=useState("");
 const total=useMemo(()=>products.reduce((s,p)=>s+p.price*(quantities[p.id]||0),0),[products,quantities]);
 useEffect(()=>{
  let ids:string[]=[];
  try{const parsed=JSON.parse(localStorage.getItem(KEY)||"[]");if(Array.isArray(parsed))ids=parsed.filter((x):x is string=>typeof x==="string");}catch{}
  const counts:Record<string,number>={};ids.forEach(id=>counts[id]=(counts[id]||0)+1);
  setQuantities(counts);
  const unique=Object.keys(counts);
  if(!unique.length){setLoading(false);return;}
  const supabase=createClient();
  supabase.from("products").select("id,slug,name,price_paise,stock_quantity,product_images(image_url,is_primary,sort_order)").in("id",unique).eq("is_active",true).then(({data,error})=>{
   if(error||!data){setMessage("We couldn't load your bag. Please return to the shop and try again.");setLoading(false);return;}
   setProducts((data as any[]).map(p=>{const imgs=Array.isArray(p.product_images)?[...p.product_images].sort((a,b)=>a.sort_order-b.sort_order):[];return{id:p.id,slug:p.slug,name:p.name,price:p.price_paise/100,stock:p.stock_quantity,image:imgs.find(i=>i.is_primary)?.image_url||imgs[0]?.image_url||""};}));
   setLoading(false);
  });
 },[]);
 function updateQty(id:string,next:number){
  const value=Math.max(0,Math.min(10,next));
  setQuantities(old=>{const updated={...old};if(value===0)delete updated[id];else updated[id]=value;localStorage.setItem(KEY,JSON.stringify(Object.entries(updated).flatMap(([key,q])=>Array(q).fill(key))));return updated;});
  if(value===0)setProducts(old=>old.filter(p=>p.id!==id));
 }
 async function pay(){
  if(!name.trim()||phone.trim().length<8||!address.trim()){setMessage("Enter your name, phone number and delivery address.");return;}
  if(!products.length){setMessage("Your shopping bag is empty.");return;}
  setBusy(true);setMessage("");
  try{
   const items=products.map(p=>({productId:p.id,quantity:quantities[p.id]||1}));
   const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:name,phone,email,address,note,items})});
   const order=await response.json();if(!response.ok)throw new Error(order.error||"Unable to create order.");
   if(!window.Razorpay){await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=()=>resolve();script.onerror=()=>reject(new Error("Payment window could not load."));document.body.appendChild(script);});}
   if(!window.Razorpay)throw new Error("Razorpay checkout is unavailable.");
   const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Kurinji Creations",description:"Your jewellery order",order_id:order.razorpayOrderId,prefill:{name,contact:phone,email},theme:{color:"#a8794f"},handler:async(payment:any)=>{
    const verify=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.orderId,razorpayOrderId:payment.razorpay_order_id,razorpayPaymentId:payment.razorpay_payment_id,razorpaySignature:payment.razorpay_signature})});
    const result=await verify.json();if(!verify.ok){setMessage(result.error||"Payment confirmation is pending. Contact the store with your order number.");setBusy(false);return;}
    localStorage.removeItem(KEY);router.push("/order-success?order="+encodeURIComponent(result.orderNumber));
   },modal:{ondismiss:()=>setBusy(false)}});
   setBusy(false);checkout.open();
  }catch(e){setMessage(e instanceof Error?e.message:"Checkout failed.");setBusy(false);}
 }
 if(loading)return <main className="container section"><p>Loading your shopping bag…</p></main>;
 return <main className="container" style={{paddingTop:28,paddingBottom:70,maxWidth:1100}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:22,borderBottom:"1px solid var(--line)"}}><Link href="/shop" className="back-link"><ArrowLeft size={16}/> CONTINUE SHOPPING</Link><Link href="/shop" className="brand">KURINJI<small>CREATIONS</small></Link><span style={{fontSize:10,color:"var(--muted)"}}><LockKeyhole size={13} style={{display:"inline",verticalAlign:"middle"}}/> SECURE CHECKOUT</span></header>
  <h1 style={{fontSize:30,fontWeight:700,margin:"30px 0 8px"}}>Checkout</h1><p style={{fontSize:12,color:"var(--muted)",marginBottom:25}}>Review your pieces and add delivery details.</p>
  {products.length===0?<section className="admin-empty"><ShoppingBag size={28}/><h2>Your bag is empty</h2><Link className="primary-button" href="/shop">EXPLORE JEWELLERY</Link></section>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:34}}>
   <section><h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>Your items ({Object.values(quantities).reduce((a,b)=>a+b,0)})</h2>{products.map(p=><article key={p.id} style={{display:"flex",gap:14,padding:"14px 0",borderBottom:"1px solid var(--line)"}}>{p.image?<img src={p.image} alt={p.name} style={{width:88,height:100,objectFit:"cover",background:"var(--deep)"}/>:null}<div style={{flex:1}}><Link href={"/products/"+p.slug} style={{fontWeight:600,color:"var(--ink)",textDecoration:"none"}}>{p.name}</Link><p style={{fontSize:12,margin:"7px 0"}}>{money(p.price)}</p><div className="quantity-control"><button onClick={()=>updateQty(p.id,(quantities[p.id]||1)-1)}><Minus size={14}/></button><span>{quantities[p.id]||1}</span><button onClick={()=>updateQty(p.id,Math.min(p.stock,(quantities[p.id]||1)+1))}><Plus size={14}/></button></div><button onClick={()=>updateQty(p.id,0)} style={{display:"block",border:0,background:"none",padding:"8px 0",fontSize:10,color:"var(--muted)"}}><Trash2 size={12} style={{display:"inline",verticalAlign:"middle"}}/> Remove</button></div><strong>{money(p.price*(quantities[p.id]||0))}</strong></article>)}
   <div style={{display:"flex",justifyContent:"space-between",padding:"18px 0",fontWeight:700}}>Subtotal <span>{money(total)}</span></div><p style={{fontSize:10,color:"var(--muted)"}}>Delivery charges, if applicable, will be confirmed by the store.</p></section>
   <section style={{background:"var(--white)",padding:22,border:"1px solid var(--line)",alignSelf:"start"}}><h2 style={{fontSize:17,fontWeight:700,margin:"0 0 18px"}}>Delivery details</h2><form onSubmit={e=>{e.preventDefault();void pay();}} style={{display:"grid",gap:13}}>
    <label style={{fontSize:11}}>Full name *<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>
    <label style={{fontSize:11}}>Phone / WhatsApp *<input required minLength={8} maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"/></label>
    <label style={{fontSize:11}}>Email (optional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label style={{fontSize:11}}>Full delivery address *<textarea required rows={3} value={address} onChange={e=>setAddress(e.target.value)} placeholder="House, street, city, state and PIN code"/></label>
    <label style={{fontSize:11}}>Order note (optional)<textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Custom colour, charm or gift request"/></label>
    <button className="primary-button" disabled={busy} type="submit" style={{width:"100%"}}>{busy?"PLEASE WAIT…":"PAY "+money(total)+" SECURELY"} <ShieldCheck size={15}/></button>
    {message&&<p role="status" style={{fontSize:11,color:"#9b4e40",lineHeight:1.6}}>{message}</p>}
   </form><p style={{fontSize:10,color:"var(--muted)",lineHeight:1.6,marginTop:14}}>Payments are processed by Razorpay. Your card/UPI details are handled by Razorpay, not stored by this website.</p></section>
  </div>}
 </main>;
}
declare global {interface Window {Razorpay?:new(options:any)=>{open:()=>void}}}
