"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Heart, House, Search, ShoppingBag, UserRound, Menu, MessageCircle, ShieldCheck, PackageCheck, Sparkles, X, Instagram } from "lucide-react";

type Product = { id:number; name:string; category:string; price:number; image:string; tag?:string; description:string };
const products: Product[] = [
 {id:1,name:"Golden Hour Hoops",category:"Earrings",price:399,image:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",tag:"Bestseller",description:"A warm golden accent for everyday moments."},
 {id:2,name:"Pearl Drop Elegance",category:"Earrings",price:549,image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85",tag:"New",description:"Soft pearl details with a graceful finish."},
 {id:3,name:"Everyday Charm Chain",category:"Necklaces",price:699,image:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85",description:"A delicate layer made for every day."},
 {id:4,name:"Solstice Bracelet",category:"Bracelets",price:449,image:"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=85",description:"An understated finishing touch."},
];
const categories = [
 {name:"Earrings",image:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=85"},
 {name:"Necklaces",image:"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=85"},
 {name:"Bracelets",image:"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=85"},
 {name:"Rings",image:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=85"},
];
const money = (value:number) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);

export default function Home() {
 const [cart,setCart] = useState<number[]>([]);
 const [wishlist,setWishlist] = useState<number[]>([]);
 const [active,setActive] = useState("Home");
 const [toast,setToast] = useState("");
 const [searchOpen,setSearchOpen] = useState(false);
 const [query,setQuery] = useState("");
 const [menuOpen,setMenuOpen] = useState(false);
 const [cartOpen,setCartOpen] = useState(false);
 const cartCount = cart.length;
 const filtered = useMemo(()=>products.filter(p=>(p.name+" "+p.category).toLowerCase().includes(query.toLowerCase())),[query]);
 const notify = (message:string) => { setToast(message); window.setTimeout(()=>setToast(""),2200); };
 const add = (id:number) => { setCart(prev=>[...prev,id]); notify("Added to your bag"); };
 const toggleWish = (id:number) => setWishlist(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 const whatsapp = "https://wa.me/?text="+encodeURIComponent("Hello Kurinji Creations! I would love to know more about your jewellery collection.");
 const cartProducts = cart.map(id=>products.find(p=>p.id===id)!).filter(Boolean);
 const total = cartProducts.reduce((sum,p)=>sum+p.price,0);

 return <main>
  <div className="promo">COMPLIMENTARY GIFT PACKAGING ON SELECT ORDERS · MADE TO MAKE YOU FEEL SPECIAL</div>
  <header className="container site-header">
   <button className="icon-button" aria-label="Open menu" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button>
   <a href="#" className="brand" aria-label="Kurinji Creations home">KURINJI<small>CREATIONS</small></a>
   <nav className="desktop-nav"><a href="#collections">COLLECTIONS</a><a href="#bestsellers">BESTSELLERS</a><a href="#story">OUR STORY</a><a href="#contact">CONTACT</a></nav>
   <div style={{display:"flex",alignItems:"center",gap:1}}>
    <button className="icon-button" aria-label="Search products" onClick={()=>setSearchOpen(!searchOpen)}><Search size={19}/></button>
    <button className="icon-button" aria-label="Open bag" onClick={()=>setCartOpen(true)}><ShoppingBag size={19}/>{cartCount>0&&<span className="cart-count">{cartCount}</span>}</button>
   </div>
  </header>
  {menuOpen&&<div className="container" style={{padding:"0 0 16px",display:"flex",gap:18,flexWrap:"wrap"}}><a className="text-link" href="#collections" onClick={()=>setMenuOpen(false)}>SHOP COLLECTIONS</a><a className="text-link" href="#bestsellers" onClick={()=>setMenuOpen(false)}>BESTSELLERS</a><a className="text-link" href="#story" onClick={()=>setMenuOpen(false)}>OUR STORY</a></div>}
  {searchOpen&&<div className="container" style={{paddingBottom:14}}><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search earrings, necklaces, bracelets..." style={{width:"100%",padding:"14px 15px",border:"1px solid var(--line)",background:"var(--white)",outline:"none",fontSize:12}}/></div>}
  <section className="hero">
   <img className="hero-image" src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1800&q=90" alt="Elegant gold jewellery styled in warm natural light"/>
   <div className="hero-content">
    <div className="eyebrow">THE ART OF EVERYDAY ELEGANCE</div>
    <h1>Little details.<br/>Lasting charm.</h1>
    <p>Thoughtfully chosen jewellery to make every day feel a little more beautiful.</p>
    <a href="#bestsellers" className="primary-button light" style={{textDecoration:"none",marginTop:14}}>DISCOVER THE COLLECTION <ArrowRight size={14}/></a>
   </div>
  </section>

  <section className="container section" id="collections">
   <div className="section-head"><div><div className="kicker">FIND YOUR FAVOURITE</div><h2 className="section-title">Shop by category</h2></div><a href="#bestsellers" className="text-link">VIEW ALL</a></div>
   <div className="category-grid">{categories.map(c=><a className="category-card" href="#bestsellers" key={c.name} onClick={()=>{setQuery(c.name);setSearchOpen(true);}}><img src={c.image} alt={c.name+" jewellery collection"}/><span className="category-label">{c.name}</span></a>)}</div>
  </section>

  <section className="container section" id="bestsellers" style={{paddingTop:8}}>
   <div className="section-head"><div><div className="kicker">CURATED FOR YOU</div><h2 className="section-title">A few lovely things</h2></div><span className="text-link">THE EDIT</span></div>
   {query&&<div style={{fontSize:11,color:"var(--muted)",marginBottom:14}}>Showing results for “{query}” · <button onClick={()=>setQuery("")} style={{border:0,background:"none",textDecoration:"underline",color:"var(--ink)"}}>Clear</button></div>}
   <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}>
    <div className="product-photo"><img src={p.image} alt={p.name}/>{p.tag&&<span className="product-tag">{p.tag}</span>}<button className="heart" aria-label={wishlist.includes(p.id)?"Remove from wishlist":"Add to wishlist"} onClick={()=>toggleWish(p.id)}><Heart size={17} fill={wishlist.includes(p.id)?"#8f5d58":"none"} color={wishlist.includes(p.id)?"#8f5d58":"currentColor"}/></button></div>
    <div className="product-info"><h3 className="product-name">{p.name}</h3><div className="product-meta"><span>{p.category}</span><span>Thoughtful details</span></div><div className="product-price">{money(p.price)}</div><button className="add-small" onClick={()=>add(p.id)}>ADD TO BAG</button></div>
   </article>)}</div>
   {filtered.length===0&&<p style={{fontSize:12,color:"var(--muted)"}}>No products match that search yet. Try another category.</p>}
   <p style={{fontSize:10,color:"var(--muted)",marginTop:22}}>Preview catalogue · Product names, prices and availability are sample content and can be replaced in the product catalogue.</p>
  </section>

  <section className="container story" id="story">
   <img src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1100&q=85" alt="Delicate jewellery photographed with soft neutral styling"/>
   <div className="story-copy"><div className="kicker">A NOTE FROM KURINJI</div><h2>Beauty lives in the little things.</h2><p>Kurinji Creations is a celebration of personal style, thoughtful details and the joy of finding a piece that feels like you. Explore pieces for everyday moments, thoughtful gifting and everything in between.</p><a href={whatsapp} target="_blank" rel="noreferrer" className="text-link">SAY HELLO ON WHATSAPP <ArrowRight size={12} style={{verticalAlign:"middle"}}/></a></div>
  </section>

  <section className="container section">
   <div className="section-head" style={{justifyContent:"center",textAlign:"center"}}><div><div className="kicker">THE KURINJI PROMISE</div><h2 className="section-title">A lovely experience, always</h2></div></div>
   <div className="promise-grid">
    <div className="promise-item"><Sparkles size={22}/><strong>Thoughtful picks</strong><span>Pieces chosen with care</span></div>
    <div className="promise-item"><PackageCheck size={22}/><strong>Gift-ready details</strong><span>Little touches that matter</span></div>
    <div className="promise-item"><ShieldCheck size={22}/><strong>Personal support</strong><span>Here when you need us</span></div>
    <div className="promise-item"><MessageCircle size={22}/><strong>Easy conversations</strong><span>Connect with us directly</span></div>
   </div>
  </section>

  <section className="newsletter" id="contact"><div className="kicker" style={{color:"#c2a47d"}}>STAY IN THE KNOW</div><h2>Notes from Kurinji</h2><p>Be the first to hear about new collections and little surprises.</p><form className="newsletter-form" onSubmit={e=>{e.preventDefault();notify("Thank you for your interest!");}}><input type="email" required placeholder="Your email address" aria-label="Email address"/><button type="submit">SIGN ME UP <ArrowRight size={13} style={{verticalAlign:"middle"}}/></button></form><a href={whatsapp} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:7,color:"#e7d7c5",fontSize:10,marginTop:20,textDecoration:"none"}}><MessageCircle size={14}/> CHAT WITH US ON WHATSAPP</a></section>

  <footer className="container footer"><div style={{textAlign:"center"}}><div className="brand">KURINJI<small>CREATIONS</small></div><div className="footer-links"><a href="#collections">Shop</a><a href="#story">Our story</a><a href="#contact">Contact</a><a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></div><div style={{fontSize:9,color:"var(--muted)"}}>© {new Date().getFullYear()} KURINJI CREATIONS. MADE WITH CARE.</div></div></footer>

  <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="Chat with Kurinji Creations on WhatsApp" style={{position:"fixed",right:17,bottom:82,zIndex:15,width:48,height:48,borderRadius:"50%",background:"#536b51",color:"white",display:"grid",placeItems:"center",boxShadow:"0 5px 18px #0002"}}><MessageCircle size={21}/></a>
  <nav className="bottom-nav" aria-label="Main navigation">
   <button className={active==="Home"?"active":""} onClick={()=>{setActive("Home");window.scrollTo({top:0,behavior:"smooth"});}}><House size={19}/><span>Home</span></button>
   <button className={active==="Shop"?"active":""} onClick={()=>{setActive("Shop");document.getElementById("collections")?.scrollIntoView({behavior:"smooth"});}}><Search size={19}/><span>Shop</span></button>
   <button className={active==="Wishlist"?"active":""} onClick={()=>{setActive("Wishlist");notify(wishlist.length?wishlist.length+" saved pieces":"Your wishlist is waiting");}}><Heart size={19}/><span>Wishlist</span></button>
   <button className={active==="Bag"?"active":""} onClick={()=>{setActive("Bag");setCartOpen(true);}} style={{position:"relative"}}><ShoppingBag size={19}/>{cartCount>0&&<span className="cart-count">{cartCount}</span>}<span>Bag</span></button>
   <button className={active==="Account"?"active":""} onClick={()=>{setActive("Account");notify("Customer accounts coming soon");}}><UserRound size={19}/><span>Account</span></button>
  </nav>

  {cartOpen&&<div role="dialog" aria-modal="true" aria-label="Shopping bag" style={{position:"fixed",inset:0,zIndex:50,background:"#17130f66",display:"flex",justifyContent:"flex-end"}} onClick={()=>setCartOpen(false)}><div onClick={e=>e.stopPropagation()} style={{background:"var(--paper)",width:"min(100%,430px)",height:"100%",padding:22,overflowY:"auto",boxShadow:"-8px 0 30px #0002"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 className="section-title" style={{margin:0}}>Your bag ({cartCount})</h2><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Close bag"><X/></button></div><div style={{marginTop:24}}>{cartProducts.length===0?<p style={{fontSize:13,color:"var(--muted)"}}>Your bag is waiting for something lovely.</p>:cartProducts.map((p,i)=><div key={i} style={{display:"flex",gap:13,padding:"12px 0",borderBottom:"1px solid var(--line)"}}><img src={p.image} alt="" style={{width:76,height:88,objectFit:"cover"}}/><div style={{flex:1}}><div className="product-name">{p.name}</div><div style={{fontSize:12,marginTop:8}}>{money(p.price)}</div><button onClick={()=>setCart(prev=>{const index=prev.indexOf(p.id);return prev.filter((_,j)=>j!==index);})} style={{border:0,background:"none",padding:"10px 0 0",fontSize:10,color:"var(--muted)",textDecoration:"underline"}}>Remove</button></div></div>)}</div>{cartProducts.length>0&&<div style={{position:"sticky",bottom:0,background:"var(--paper)",paddingTop:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16,fontSize:13}}><strong>Subtotal</strong><strong>{money(total)}</strong></div><a href={"https://wa.me/?text="+encodeURIComponent("Hello Kurinji Creations, I would like to order: "+cartProducts.map(p=>p.name).join(", ")+". Total: "+money(total))} target="_blank" rel="noreferrer" className="primary-button" style={{textDecoration:"none",width:"100%"}}>ORDER VIA WHATSAPP <ArrowRight size={14}/></a><p style={{fontSize:10,color:"var(--muted)",lineHeight:1.6}}>This preview sends your selected items to WhatsApp. Secure website checkout will be connected in the next integration phase.</p></div>}</div></div>}
  {toast&&<div className="toast" role="status">{toast}</div>}
 </main>;
}
