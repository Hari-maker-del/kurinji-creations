"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Heart,Minus,Plus,MessageCircle,ShieldCheck,PackageCheck,Truck,ShoppingBag,X,ZoomIn} from "lucide-react";

type RazorpaySuccess={razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string};
declare global { interface Window { Razorpay?: new (options:any)=>{open:()=>void}; } }
type ProductDetail={id:string;slug?:string;name:string;category:string;price:number;stock:number;tag?:string;images:string[];description:string;material:string;care:string;allowsCustomization:boolean;customizationNotes:string};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v);
export default function ProductPage(){
 const router=useRouter();
 const params=useParams<{slug:string}>();
 const [product,setProduct]=useState<ProductDetail|null>(null);
 const [catalogueLoading,setCatalogueLoading]=useState(true),[relatedProducts,setRelatedProducts]=useState<ProductDetail[]>([]);
 const [photo,setPhoto]=useState(0),[qty,setQty]=useState(1),[saved,setSaved]=useState(false),[customColour,setCustomColour]=useState(""),[customRequest,setCustomRequest]=useState(""),[lightboxOpen,setLightboxOpen]=useState(false),[referenceUrl,setReferenceUrl]=useState(""),[referenceBusy,setReferenceBusy]=useState(false),[referenceMessage,setReferenceMessage]=useState("");
 const [customerName,setCustomerName]=useState(""),[customerPhone,setCustomerPhone]=useState(""),[customerEmail,setCustomerEmail]=useState(""),[customerAddress,setCustomerAddress]=useState(""),[customerNote,setCustomerNote]=useState("");
 const [submitting,setSubmitting]=useState(false),[orderMessage,setOrderMessage]=useState("");
 useEffect(()=>{
  let active=true;setCatalogueLoading(true);setProduct(null);setRelatedProducts([]);
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){setCatalogueLoading(false);return;}
  const supabase=createClient();
  supabase.from("products").select("id,slug,name,description,material,care_instructions,price_paise,stock_quantity,allows_customization,customization_notes,product_categories(name),product_images(image_url,sort_order,is_primary)").eq("slug",params.slug).eq("is_active",true).maybeSingle().then(({data,error})=>{
   if(!active)return;
   if(error || !data){setProduct(null);setCatalogueLoading(false);return;}
   const row=data as any;
   const category=Array.isArray(row.product_categories)?row.product_categories[0]:row.product_categories;
   const images=Array.isArray(row.product_images)?[...row.product_images].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)): [];
   setProduct({id:row.id,slug:row.slug,name:row.name,category:category?.name??"Jewellery",price:Number(row.price_paise)/100,stock:Math.max(0,Number(row.stock_quantity)||0),images:images.map(i=>i.image_url),description:row.description??"",material:row.material??"Details available on enquiry",care:row.care_instructions??"Please contact us for care guidance.",allowsCustomization:!!row.allows_customization,customizationNotes:row.customization_notes??"",tag:""});
   setPhoto(0);setQty(1);setCatalogueLoading(false);
   supabase.from("products").select("id,slug,name,description,material,care_instructions,price_paise,stock_quantity,allows_customization,customization_notes,product_categories(name),product_images(image_url,sort_order,is_primary)").eq("is_active",true).neq("id",row.id).limit(8).then(({data:related})=>{if(!active||!related)return;setRelatedProducts((related as any[]).map(item=>{const cat=Array.isArray(item.product_categories)?item.product_categories[0]:item.product_categories;const imgs=Array.isArray(item.product_images)?[...item.product_images].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)):[];return{id:item.id,slug:item.slug,name:item.name,category:cat?.name??"Jewellery",price:Number(item.price_paise)/100,stock:Math.max(0,Number(item.stock_quantity)||0),images:imgs.map((image:any)=>image.image_url).filter(Boolean),description:item.description??"",material:item.material??"Details available on enquiry",care:item.care_instructions??"",allowsCustomization:!!item.allows_customization,customizationNotes:item.customization_notes??"",tag:""} as ProductDetail;}));});
   try{const saved=JSON.parse(localStorage.getItem("kurinji_recently_viewed_v1")||"[]");const ids=Array.isArray(saved)?saved.filter((id:any)=>typeof id==="string"&&id!==row.id):[];localStorage.setItem("kurinji_recently_viewed_v1",JSON.stringify([row.id,...ids].slice(0,12)));}catch{}
  }).catch(()=>{if(active){setProduct(null);setCatalogueLoading(false);}});
  return()=>{active=false;};
 },[params.slug]);
 async function uploadReference(file?:File){
  if(!file)return;setReferenceBusy(true);setReferenceMessage("");
  const form=new FormData();form.append("file",file);
  try{const response=await fetch("/api/customisation-reference",{method:"POST",body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||"Upload failed.");setReferenceUrl(result.url);setReferenceMessage("Reference image attached successfully.");}
  catch(error){setReferenceMessage(error instanceof Error?error.message:"Unable to upload image.");}
  finally{setReferenceBusy(false);}
 }
 const orderText=encodeURIComponent("Hello Kurinji Creations! I would like to enquire about "+(product?.name??"this jewellery piece")+" (Qty: "+qty+")."+(customColour?" Preferred colour: "+customColour+".":"")+(customRequest?" Custom request: "+customRequest+".":"")+" Please confirm availability, customisation and delivery details.");

 async function startRazorpayPayment(){
  if(!customerName.trim()||customerPhone.trim().length<8){setOrderMessage("Please enter your name and phone number first.");return;}
  setSubmitting(true);setOrderMessage("");
  try{
   const response=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName,phone:customerPhone,email:customerEmail,address:customerAddress,note:[customerNote,customColour?"Preferred colour/charm: "+customColour:"",customRequest?"Custom design: "+customRequest:"",referenceUrl?"Reference image: "+referenceUrl:""].filter(Boolean).join("\n"),items:[{productId:product.id,quantity:qty}]})});
   const order=await response.json();
   if(!response.ok)throw new Error(order.error||"Unable to start secure checkout.");
   if(!window.Razorpay){
    await new Promise<void>((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=()=>resolve();script.onerror=()=>reject(new Error("Unable to load secure checkout."));document.body.appendChild(script);});
   }
   if(!window.Razorpay)throw new Error("Secure checkout is unavailable. Please try again.");
   const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Kurinji Creations",description:product.name,order_id:order.razorpayOrderId,prefill:{name:customerName,contact:customerPhone,email:customerEmail},theme:{color:"#8a6b4d"},handler:async(payment:RazorpaySuccess)=>{
    setSubmitting(true);
    const verification=await fetch("/api/payments/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.orderId,razorpayOrderId:payment.razorpay_order_id,razorpayPaymentId:payment.razorpay_payment_id,razorpaySignature:payment.razorpay_signature})});
    const result=await verification.json();setSubmitting(false);
    if(!verification.ok){setOrderMessage(result.error||"Payment received; confirmation is pending. Please contact the store.");return;}
    setOrderMessage("Payment successful! Your order #"+result.orderNumber+" is confirmed. Kurinji Creations will contact you shortly.");
   },modal:{ondismiss:()=>setSubmitting(false)}});
   setSubmitting(false);checkout.open();
  }catch(error){setSubmitting(false);setOrderMessage(error instanceof Error?error.message:"Unable to start payment.");}
 }
 if(catalogueLoading)return <main className="detail-page"><div className="container section"><p>Loading this piece…</p></div></main>;
 if(!product)return <main className="detail-page"><div className="container section"><div className="market-empty"><h1>This piece is unavailable</h1><p>It may have been removed from the collection or is temporarily unavailable.</p><Link href="/shop" className="primary-button">RETURN TO THE STORE</Link></div></div></main>;
 const related=relatedProducts.filter(p=>p.stock>0&&p.images.length>0).slice(0,3);
 return <main className="detail-page">
  <div className="promo">A LITTLE SOMETHING LOVELY · KURINJI CREATIONS</div>
  <header className="container detail-header"><Link href="/shop" className="back-link"><ArrowLeft size={17}/> <span>BACK TO SHOP</span></Link><Link href="/shop" className="brand kc-detail-logo" aria-label="Kurinji Creations"><img src="/brand/IMG-20261119-WA0000.jpg.jpeg" alt="Kurinji Creations"/></Link><span className="detail-header-note">THE LITTLE DETAILS</span></header>
  <div className="container detail-layout">
   <section className="detail-gallery">
    <button type="button" className="detail-main-photo detail-zoom-trigger" onClick={()=>setLightboxOpen(true)} aria-label="Enlarge product image"><img src={product.images[photo]||"/brand/IMG-20261119-WA0000.jpg.jpeg"} alt={product.name+" jewellery view"}/><span className="detail-photo-tag">{product.tag||"CURATED FOR YOU"}</span><span className="detail-zoom-hint"><ZoomIn size={15}/> VIEW DETAIL</span></button>
    <div className="detail-thumbs">{product.images.map((src,i)=><button key={src+i} className={photo===i?"selected":""} onClick={()=>setPhoto(i)} aria-label={"View product image "+(i+1)}><img src={src} alt=""/></button>)}</div>
   </section>
   <section className="detail-info">
    <div className="kicker">{product.category} · KURINJI EDIT</div>
    <h1>{product.name}</h1>
    <div className="detail-price">{money(product.price)}</div>
    <p className="detail-tax">Inclusive of listed price · Shipping confirmed on enquiry</p>
    <div className="detail-rule"/>
    <p className="detail-description">{product.description}</p>
    <div className="detail-spec"><span>PRODUCT TYPE</span><strong>{product.category}</strong></div>
    <div className="detail-spec"><span>MATERIAL</span><strong>{product.material}</strong></div>
    <div className="detail-rule"/>
    {product.allowsCustomization&&<div className="detail-customize"><div className="kicker">MAKE IT YOURS</div><h2>Personalise this piece</h2><p>{product.customizationNotes||"Ask us about available colour and design options."}</p><label>Preferred colour or charm<input value={customColour} onChange={e=>setCustomColour(e.target.value)} placeholder="e.g. lavender, rose pink, blue"/></label><label>Any other design request<textarea value={customRequest} onChange={e=>setCustomRequest(e.target.value)} rows={3} placeholder="Tell us how you would like your piece customised…"/></label><label className="detail-reference-upload">Reference photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={referenceBusy} onChange={e=>void uploadReference(e.target.files?.[0])}/><small>JPG, PNG or WebP · Maximum 5 MB</small></label>{referenceMessage&&<small role="status">{referenceMessage}</small>}<small>We’ll confirm available options with you before accepting the order.</small></div>}
    <div className="detail-stock" aria-live="polite">{product.stock<=0?<strong className="detail-stock-out">Sold out</strong>:product.stock<=3?<strong className="detail-stock-low">Only {product.stock} left — order soon</strong>:<strong className="detail-stock-in">In stock · {product.stock} available</strong>}</div><div className="quantity-label">QUANTITY</div>
    <div className="quantity-control"><button disabled={product.stock<=0||qty<=1} onClick={()=>setQty(q=>Math.max(1,q-1))} aria-label="Decrease quantity"><Minus size={15}/></button><span>{qty}</span><button disabled={product.stock<=0||qty>=Math.min(10,product.stock)} onClick={()=>setQty(q=>Math.min(10,product.stock,q+1))} aria-label="Increase quantity"><Plus size={15}/></button></div>
    <button disabled={product.stock<=0} className="primary-button detail-order" type="button" style={{width:"100%",marginTop:14}} onClick={()=>{const key="kurinji_cart_v1";let ids:string[]=[];try{const parsed=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(parsed))ids=parsed.filter((x):x is string=>typeof x==="string");}catch{}const already=ids.filter(id=>id===product.id).length;if(already+qty>product.stock){setOrderMessage("Only "+product.stock+" available. Your bag already has "+already+".");return;}localStorage.setItem(key,JSON.stringify([...ids,...Array(qty).fill(product.id)]));setOrderMessage("Added to your shopping bag.");}}>ADD TO BAG <ShoppingBag size={15}/></button>
    <button disabled={product.stock<=0} className="primary-button detail-order" type="button" style={{width:"100%",marginTop:9,background:"#a8794f",borderColor:"#a8794f"}} onClick={()=>{const key="kurinji_cart_v1";localStorage.setItem(key,JSON.stringify(Array(qty).fill(product.id)));const note=[customColour?"Preferred colour/charm: "+customColour:"",customRequest?"Custom design: "+customRequest:""].filter(Boolean).join("\n");if(note)localStorage.setItem("kurinji_checkout_note_v1",note);else localStorage.removeItem("kurinji_checkout_note_v1");router.push("/checkout");}}>BUY NOW <ArrowRight size={15}/></button>
    <form className="detail-enquiry-form" onSubmit={async(event)=>{event.preventDefault();setSubmitting(true);setOrderMessage("");const supabase=createClient();const {error}=await supabase.from("store_orders").insert({customer_name:customerName.trim(),phone:customerPhone.trim(),email:customerEmail.trim()||null,address:customerAddress.trim()||null,customer_note:[customerNote.trim(),customColour?"Preferred colour/charm: "+customColour:"",customRequest?"Custom design: "+customRequest:""].filter(Boolean).join("\n")||null,items:[{product_id:product.id,name:product.name,quantity:qty,unit_price_paise:Math.round(product.price*100)}],subtotal_paise:Math.round(product.price*qty*100)});setSubmitting(false);if(error){setOrderMessage("We couldn't submit your enquiry. Please try WhatsApp instead.");return;}setOrderMessage("Your enquiry has been received! Kurinji Creations will contact you to confirm availability, delivery and payment.");setCustomerName("");setCustomerPhone("");setCustomerEmail("");setCustomerAddress("");setCustomerNote("");}}>
      <div className="kicker">READY TO MAKE IT YOURS?</div><h2>Send an order enquiry</h2><p>Your request is saved for the store owner. This is not a payment or confirmed order yet.</p>
      <label>Your name *<input required minLength={2} maxLength={100} value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Full name"/></label>
      <label>WhatsApp / phone number *<input required minLength={8} maxLength={20} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+91 98765 43210"/></label>
      <label>Email (optional)<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Delivery address (optional)<textarea rows={2} value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="Share your delivery location"/></label>
      <label>Additional note (optional)<textarea rows={2} value={customerNote} onChange={e=>setCustomerNote(e.target.value)} placeholder="Any questions or delivery preferences?"/></label>
      <button className="primary-button detail-order" type="button" onClick={()=>void startRazorpayPayment()} disabled={submitting}>{submitting?"PLEASE WAIT…":"PAY SECURELY ONLINE"} <ShieldCheck size={15}/></button><button className="detail-enquiry-secondary" type="submit" disabled={submitting}>OR SEND AN ORDER ENQUIRY <ArrowRight size={14}/></button>
      {orderMessage&&<p className="detail-order-message" role="status">{orderMessage}</p>}
    </form>
    <div className="detail-actions"><a className="primary-button detail-order" href={"https://wa.me/?text="+orderText} target="_blank" rel="noreferrer">ENQUIRE / ORDER ON WHATSAPP <ArrowRight size={15}/></a><button className="detail-wish" onClick={()=>setSaved(!saved)} aria-label="Save product"><Heart size={19} fill={saved?"#8f5d58":"none"}/></button></div>
    <div className="detail-assurances"><div><PackageCheck size={18}/><span>Gift-ready packaging<br/><small>Ask us about gifting</small></span></div><div><Truck size={18}/><span>Delivery details<br/><small>Confirmed before ordering</small></span></div><div><ShieldCheck size={18}/><span>Personal support<br/><small>We're happy to help</small></span></div></div>
    <details className="detail-accordion"><summary>Care instructions</summary><p>{product.care}</p></details>
    <details className="detail-accordion"><summary>Need help choosing?</summary><p>Message us on WhatsApp and we'll help with product details, availability and gifting questions.</p></details>
   </section>
  </div>
  <section className="container related-section"><div className="kicker">MORE TO LOVE</div><h2 className="section-title">You may also like</h2><div className="related-grid">{related.map(p=><Link href={"/products/"+(p.slug||p.id)} key={p.id} className="related-card"><img src={p.images[0]} alt={p.name}/><span>{p.name}</span><strong>{money(p.price)}</strong></Link>)}</div></section>
  <footer className="container footer detail-footer"><div style={{textAlign:"center"}}><div className="brand kc-detail-footer-logo"><img src="/brand/IMG-20261119-WA0000.jpg.jpeg" alt="Kurinji Creations"/></div><p className="detail-footer-note">ELEGANCE IN EVERY DETAIL</p><Link href="/shop" className="text-link">CONTINUE SHOPPING</Link></div></footer>
  {lightboxOpen&&<div className="detail-lightbox" role="dialog" aria-modal="true" aria-label="Product image preview" onClick={()=>setLightboxOpen(false)}><button type="button" onClick={()=>setLightboxOpen(false)} aria-label="Close image preview"><X size={22}/></button><img src={product.images[photo]||"/brand/IMG-20261119-WA0000.jpg.jpeg"} alt={product.name+" enlarged view"} onClick={e=>e.stopPropagation()}/><span>{product.name} · IMAGE {photo+1} OF {product.images.length}</span></div>}\n  <a href={"https://wa.me/?text="+encodeURIComponent("Hello Kurinji Creations! I have a question about your jewellery.")} target="_blank" rel="noreferrer" className="detail-whatsapp" aria-label="Chat on WhatsApp"><MessageCircle size={21}/></a>
 </main>;
}
