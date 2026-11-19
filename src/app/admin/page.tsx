"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Box, Camera, Check, ChevronDown, CirclePlus, ClipboardList, ImagePlus, LayoutDashboard, LogOut, Package, Pencil, Plus, Search, Settings2, ShieldCheck, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import "./admin.css";

type Category = { id: string; name: string; slug: string; is_active: boolean };
type StoreOrder = { id:string; order_number:number; customer_name:string; phone:string; email:string|null; address:string|null; customer_note:string|null; items:any[]; subtotal_paise:number; status:"new"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled"; payment_status:string; admin_note:string|null; created_at:string };
type Product = {
  id: string; name: string; slug: string; category_id: string | null; short_description: string | null;
  description: string | null; price_paise: number; compare_at_price_paise: number | null; sku: string | null;
  stock_quantity: number; material: string | null; care_instructions: string | null; is_featured: boolean;
  is_active: boolean; allows_customization: boolean; customization_notes: string | null;
  product_categories?: { name: string } | { name: string }[] | null;
  product_images?: { id: string; image_url: string; is_primary: boolean; sort_order: number }[];
};
const emptyForm = {
  name: "", category_id: "", price: "", compare_price: "", sku: "", stock: "0", short_description: "",
  description: "", material: "", care: "Keep away from water, perfume and harsh chemicals. Store in a dry pouch.",
  featured: false, active: false, customizable: false,
  customization_notes: "Customers may request preferred colours or design variations. Confirm availability before accepting the order."
};
const slugify = (value: string) => value.toLowerCase().trim().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);\n  const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<"overview" | "products" | "categories" | "orders" | "inventory">("overview");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");\n  const [inventoryFilter, setInventoryFilter] = useState<"all" | "in" | "low" | "out">("all");

  const loadData = useCallback(async () => {
    const [{ data: categoryRows }, { data: productRows }, { data: orderRows }, { data: historyRows }] = await Promise.all([
      supabase.from("product_categories").select("id,name,slug,is_active").order("sort_order"),
      supabase.from("products").select("*,product_categories(name),product_images(id,image_url,is_primary,sort_order)").order("created_at", { ascending: false }),
      supabase.from("store_orders").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    setCategories((categoryRows ?? []) as Category[]);
    setProducts((productRows ?? []) as Product[]);
    setOrders((orderRows ?? []) as StoreOrder[]);\n    setInventoryHistory(historyRows ?? []);
  }, [supabase]);

  const verifySession = useCallback(async () => {
    setChecking(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email ?? "");
      const { data: adminRow, error } = await supabase.from("store_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (adminRow && !error) {
        setAuthorized(true);
        await loadData();
      } else {
        setAuthorized(false);
      }
    }
    setChecking(false);
  }, [supabase, loadData]);

  useEffect(() => { void verifySession(); }, [verifySession]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: userEmail.trim(), password });
    if (error) setLoginError(error.message);
    else await verifySession();
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAuthorized(false); setPassword(""); router.refresh();
  }

  function editProduct(product: Product) {
    setEditing(product.id); setFormOpen(true);
    setForm({
      name: product.name, category_id: product.category_id ?? "", price: String(product.price_paise / 100),
      compare_price: product.compare_at_price_paise ? String(product.compare_at_price_paise / 100) : "",
      sku: product.sku ?? "", stock: String(product.stock_quantity), short_description: product.short_description ?? "",
      description: product.description ?? "", material: product.material ?? "", care: product.care_instructions ?? "",
      featured: product.is_featured, active: product.is_active, customizable: product.allows_customization,
      customization_notes: product.customization_notes ?? ""
    });
    setImages([]);
    setTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newProduct() {
    setEditing(null); setFormOpen(true); setForm(emptyForm); setImages([]); setTab("products");
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.price || Number(form.price) < 0) return setNotice("Enter a product name and a valid price.");
    setBusy(true); setNotice("");
    const payload = {
      name: form.name.trim(), slug: slugify(form.name), category_id: form.category_id || null,
      short_description: form.short_description.trim() || null, description: form.description.trim() || null,
      price_paise: Math.round(Number(form.price) * 100),
      compare_at_price_paise: form.compare_price ? Math.round(Number(form.compare_price) * 100) : null,
      sku: form.sku.trim() || null, stock_quantity: Math.max(0, Math.floor(Number(form.stock) || 0)),
      material: form.material.trim() || null, care_instructions: form.care.trim() || null,
      is_featured: form.featured, is_active: form.active, allows_customization: form.customizable,
      customization_notes: form.customizable ? form.customization_notes.trim() || null : null
    };
    let productId = editing;
    let error;
    if (editing) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editing));
    } else {
      const result = await supabase.from("products").insert(payload).select("id").single();
      error = result.error; productId = result.data?.id ?? null;
    }
    if (!error && productId && images.length) {
      for (let index = 0; index < images.length; index++) {
        const file = images[index];
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${productId}/${Date.now()}-${index}.${extension}`;
        const upload = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
        if (upload.error) { error = upload.error; break; }
        const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
        const imageInsert = await supabase.from("product_images").insert({
          product_id: productId, image_url: publicUrl.publicUrl, alt_text: form.name,
          sort_order: index, is_primary: index === 0 && !editing
        });
        if (imageInsert.error) { error = imageInsert.error; break; }
      }
    }
    if (error) setNotice(error.message);
    else { setNotice(editing ? "Product updated successfully." : "Product created successfully."); setForm(emptyForm); setEditing(null); setFormOpen(false); setImages([]); await loadData(); }
    setBusy(false);
  }

  async function togglePublish(product: Product) {
    const { error } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
    if (error) setNotice(error.message); else await loadData();
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) setNotice(error.message); else { setNotice("Product deleted."); await loadData(); }
  }

  async function updateOrderStatus(order: StoreOrder, status: StoreOrder["status"]) {
    const { error } = await supabase.from("store_orders").update({ status }).eq("id", order.id);
    if (error) setNotice(error.message); else { setNotice(`Order #${order.order_number} updated.`); await loadData(); }
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const name = categoryName.trim(); if (!name) return;
    const { error } = await supabase.from("product_categories").insert({ name, slug: slugify(name), sort_order: categories.length + 1, is_active: true });
    if (error) setNotice(error.message); else { setCategoryName(""); setNotice("Category added."); await loadData(); }
  }

  async function toggleCategory(category: Category) {
    const { error } = await supabase.from("product_categories").update({ is_active: !category.is_active }).eq("id", category.id);
    if (error) setNotice(error.message); else await loadData();
  }

  const visibleProducts = products.filter(p => (p.name + " " + (p.sku ?? "")).toLowerCase().includes(search.toLowerCase()));
  const activeCount = products.filter(p => p.is_active).length;
  const lowStock = products.filter(p => p.stock_quantity <= 5).length;

  if (checking) return <main className="admin-shell"><div className="admin-loading"><span className="admin-mark">K</span><p>Preparing your boutique workspace…</p></div></main>;

  if (!authorized) return <main className="admin-login-wrap">
    <div className="admin-login-aside"><div className="admin-login-brand">KURINJI <span>CREATIONS</span></div><div className="admin-login-quote">A little more<br/><em>beautiful.</em></div><p>Your private space to curate every detail of the collection.</p><div className="admin-login-bottom">THE KURINJI CREATIONS STUDIO · EST. 2026</div></div>
    <section className="admin-login-card"><a className="admin-back" href="/"><ArrowLeft size={16}/> Back to storefront</a><div className="admin-login-icon"><ShieldCheck size={22}/></div><div className="admin-eyebrow">OWNER ACCESS</div><h1>Welcome back.</h1><p>Sign in to manage your jewellery collection, inventory and custom orders.</p>
      <form onSubmit={signIn} className="admin-form"><label>Email address<input type="email" required autoComplete="username" value={userEmail} onChange={e=>setUserEmail(e.target.value)} placeholder="owner@example.com"/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>{loginError&&<div className="admin-error">{loginError}</div>}<button className="admin-primary" disabled={busy}>{busy?"Signing in…":"Sign in to dashboard"} <ArrowLeft className="admin-arrow-flip" size={16}/></button></form>
      <div className="admin-login-foot">Secure owner access · Protected by Supabase</div>
    </section>
  </main>;

  return <main className="admin-shell">
    <aside className="admin-sidebar"><a href="/" className="admin-side-brand">KURINJI<small>CREATIONS · STUDIO</small></a><div className="admin-side-label">WORKSPACE</div>
      <button className={tab==="overview"?"selected":""} onClick={()=>setTab("overview")}><LayoutDashboard size={17}/> Overview</button>
      <button className={tab==="products"?"selected":""} onClick={()=>setTab("products")}><ShoppingBag size={17}/> Products <span>{products.length}</span></button>
      <button className={tab==="categories"?"selected":""} onClick={()=>setTab("categories")}><ClipboardList size={17}/> Categories</button>
      <button className={tab==="orders"?"selected":""} onClick={()=>setTab("orders")}><Package size={17}/> Orders <span>{orders.filter(o=>o.status==="new").length}</span></button>\n      <button className={tab==="inventory"?"selected":""} onClick={()=>setTab("inventory")}><Box size={17}/> Inventory</button>
      <div className="admin-side-bottom"><div className="admin-user"><div className="admin-avatar">{userEmail.slice(0,1).toUpperCase()}</div><div><strong>Store owner</strong><small>{userEmail}</small></div></div><button onClick={signOut}><LogOut size={16}/> Sign out</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><div className="admin-eyebrow">KURINJI CREATIONS / STUDIO</div><div className="admin-top-title">The boutique workspace</div></div><a href="/" className="admin-view-store">View storefront <ArrowLeft className="admin-arrow-flip" size={14}/></a></header>
      <div className="admin-content">
        {notice&&<div className="admin-notice"><Check size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        {tab==="overview"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">YOUR STORE AT A GLANCE</div><h1>Good day, Kurinji.</h1><p>Here’s what’s happening with your collection.</p></div><button className="admin-primary compact" onClick={newProduct}><Plus size={16}/> Add a product</button></div>
          <div className="admin-stat-grid"><article><span><Package size={17}/> NEW ORDERS</span><strong>{orders.filter(o=>o.status==="new").length}</strong><small>Awaiting your review</small></article><article><span><ShoppingBag size={17}/> TOTAL ORDERS</span><strong>{orders.length}</strong><small>Customer enquiries received</small></article><article><span><Package size={17}/> TOTAL PRODUCTS</span><strong>{products.length}</strong><small>Pieces in your catalogue</small></article><article><span><BadgeCheck size={17}/> PUBLISHED</span><strong>{activeCount}</strong><small>Visible on your storefront</small></article><article><span><Box size={17}/> LOW STOCK</span><strong>{lowStock}</strong><small>5 or fewer pieces remaining</small></article><article><span><Sparkles size={17}/> CATEGORIES</span><strong>{categories.length}</strong><small>Ways to explore your edit</small></article></div>
          <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">LATEST ADDITIONS</div><h2>Your collection</h2></div><button className="admin-text-button" onClick={()=>setTab("products")}>Manage products <ArrowLeft className="admin-arrow-flip" size={14}/></button></div>
          {products.length===0?<div className="admin-empty"><div className="admin-empty-icon"><ImagePlus size={24}/></div><h3>Your first piece starts here.</h3><p>Add your real jewellery photos, price and details. Products stay hidden until you choose to publish them.</p><button className="admin-primary compact" onClick={newProduct}><Plus size={16}/> Add your first product</button></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th/></tr></thead><tbody>{products.slice(0,6).map(p=><tr key={p.id}><td><div className="admin-product-cell"><img src={p.product_images?.find(i=>i.is_primary)?.image_url||p.product_images?.[0]?.image_url||"/placeholder.txt"} alt=""/><div><strong>{p.name}</strong><small>{p.sku||"No SKU"}</small></div></div></td><td>{money(p.price_paise)}</td><td>{p.stock_quantity}</td><td><span className={p.is_active?"admin-status live":"admin-status draft"}>{p.is_active?"Published":"Draft"}</span></td><td><button className="admin-icon-action" onClick={()=>editProduct(p)} aria-label="Edit product"><Pencil size={15}/></button></td></tr>)}</tbody></table></div>}</div>
        </>}
        {tab==="products"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">COLLECTION MANAGEMENT</div><h1>{editing?"Edit product":"Products"}</h1><p>Add, update and publish the pieces in your boutique.</p></div>{!editing&&<button className="admin-primary compact" onClick={newProduct}><Plus size={16}/> New product</button>}</div>
          {formOpen?<form className="admin-panel admin-product-form" onSubmit={saveProduct}><div className="admin-panel-head"><div><div className="admin-eyebrow">{editing?"UPDATE YOUR PIECE":"NEW ARRIVAL"}</div><h2>Product details</h2></div><button type="button" className="admin-icon-action" onClick={()=>{setEditing(null);setFormOpen(false);setForm(emptyForm);setImages([])}}><X size={18}/></button></div>
            <div className="admin-form-grid"><label>Product name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Purple Bloom Invisible Chain"/></label><label>Category<select value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Choose category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Price (₹) *<input required type="number" min="0" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="499"/></label><label>Compare-at price (₹)<input type="number" min="0" step="1" value={form.compare_price} onChange={e=>setForm({...form,compare_price:e.target.value})} placeholder="Optional"/></label><label>SKU / product code<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="KC-001"/></label><label>Available stock<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label className="span-two">Short description<input value={form.short_description} onChange={e=>setForm({...form,short_description:e.target.value})} placeholder="A delicate floral charm for everyday elegance"/></label><label className="span-two">Full description<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the design, finish, size and what makes this piece special."/></label><label>Material / finish<input value={form.material} onChange={e=>setForm({...form,material:e.target.value})} placeholder="Gold-tone fittings, invisible thread…"/></label><label>Care instructions<input value={form.care} onChange={e=>setForm({...form,care:e.target.value})}/></label></div>
            <div className="admin-upload"><div><strong><Camera size={17}/> Product photographs</strong><small>JPG, PNG or WebP · up to 5 MB each</small></div><label className="admin-upload-button"><ImagePlus size={16}/> Choose photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setImages(Array.from(e.target.files??[]).filter(f=>f.size<=5*1024*1024))}/></label></div>{images.length>0&&<p className="admin-upload-count">{images.length} photo(s) selected: {images.map(f=>f.name).join(", ")}</p>}
            <div className="admin-checks"><label><input type="checkbox" checked={form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Feature this product</label><label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Publish on storefront</label><label><input type="checkbox" checked={form.customizable} onChange={e=>setForm({...form,customizable:e.target.checked})}/> Customers can request custom colours / designs</label></div>
            {form.customizable&&<label className="admin-custom-notes">Customisation details<textarea rows={3} value={form.customization_notes} onChange={e=>setForm({...form,customization_notes:e.target.value})} placeholder="Mention available colours, design choices and what needs confirmation."/></label>}
            <div className="admin-form-actions"><button type="button" className="admin-secondary" onClick={()=>{setEditing(null);setFormOpen(false);setForm(emptyForm);setImages([])}}>Cancel</button><button className="admin-primary" disabled={busy}>{busy?"Saving…":editing?"Save changes":"Create product"} <Check size={16}/></button></div>
          </form>:<div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">ALL YOUR PIECES</div><h2>Product catalogue</h2></div><div className="admin-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products"/></div></div>{visibleProducts.length===0?<div className="admin-empty"><h3>No products yet</h3><p>Your real products will appear here after you add them.</p><button className="admin-primary compact" onClick={newProduct}><Plus size={16}/> Add product</button></div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{visibleProducts.map(p=><tr key={p.id}><td><div className="admin-product-cell"><img src={p.product_images?.find(i=>i.is_primary)?.image_url||p.product_images?.[0]?.image_url||"/placeholder.txt"} alt=""/><div><strong>{p.name}</strong><small>{p.product_categories&&("name" in p.product_categories?p.product_categories.name:p.product_categories[0]?.name)||"Uncategorised"}</small></div></div></td><td>{money(p.price_paise)}</td><td>{p.stock_quantity}</td><td><button className={p.is_active?"admin-status live":"admin-status draft"} onClick={()=>togglePublish(p)}>{p.is_active?"Published":"Draft"}</button></td><td><div className="admin-row-actions"><button className="admin-icon-action" onClick={()=>editProduct(p)} aria-label="Edit"><Pencil size={15}/></button><button className="admin-icon-action danger" onClick={()=>deleteProduct(p)} aria-label="Delete"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}</div>}
        </>}
        {tab==="inventory"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">STOCK CONTROL</div><h1>Inventory</h1><p>Monitor availability and make tracked stock adjustments.</p></div><button className="admin-secondary" onClick={()=>void loadData()}>Refresh</button></div>
          <div className="admin-stat-grid"><article><span><Box size={17}/> TOTAL PIECES</span><strong>{products.reduce((n,p)=>n+Math.max(0,p.stock_quantity||0),0)}</strong><small>Across all products</small></article><article><span><Package size={17}/> IN STOCK</span><strong>{products.filter(p=>p.stock_quantity>5).length}</strong><small>Products available</small></article><article><span><Sparkles size={17}/> LOW STOCK</span><strong>{products.filter(p=>p.stock_quantity>0&&p.stock_quantity<=5).length}</strong><small>5 or fewer pieces</small></article><article><span><Box size={17}/> OUT OF STOCK</span><strong>{products.filter(p=>p.stock_quantity<=0).length}</strong><small>Unavailable products</small></article></div>
          <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">STOCK STATUS</div><h2>Inventory list</h2></div><div className="admin-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory"/></div></div><div className="admin-inventory-filters">{(["all","in","low","out"] as const).map(f=><button key={f} className={inventoryFilter===f?"active":""} onClick={()=>setInventoryFilter(f)}>{f==="all"?"All":f==="in"?"In stock":f==="low"?"Low stock":"Out of stock"}</button>)}</div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>PRICE</th><th>QUANTITY</th><th>STOCK STATUS</th><th>ADJUST</th></tr></thead><tbody>{products.filter(p=>(p.name+" "+(p.sku??"")).toLowerCase().includes(search.toLowerCase())).filter(p=>inventoryFilter==="all"||(inventoryFilter==="in"&&p.stock_quantity>5)||(inventoryFilter==="low"&&p.stock_quantity>0&&p.stock_quantity<=5)||(inventoryFilter==="out"&&p.stock_quantity<=0)).map(p=><tr key={p.id}><td><div className="admin-product-cell"><img src={p.product_images?.find(i=>i.is_primary)?.image_url||p.product_images?.[0]?.image_url||"/placeholder.txt"} alt=""/><div><strong>{p.name}</strong><small>{p.sku||"No SKU"}</small></div></div></td><td>{money(p.price_paise)}</td><td><strong>{p.stock_quantity}</strong></td><td><span className={p.stock_quantity<=0?"admin-stock-status out":p.stock_quantity<=5?"admin-stock-status low":"admin-stock-status in"}>{p.stock_quantity<=0?"Out of stock":p.stock_quantity<=5?"Low stock":"In stock"}</span></td><td><button className="admin-secondary small" onClick={async()=>{const raw=window.prompt("Adjustment amount (use + to add, - to remove):");if(raw===null)return;const qty=Number(raw);if(!Number.isInteger(qty)||qty===0){setNotice("Enter a non-zero whole-number adjustment.");return;}const reason=window.prompt("Reason for this stock adjustment:");if(!reason?.trim())return;setBusy(true);const {error}=await supabase.rpc("adjust_store_inventory",{p_product_id:p.id,p_adjustment:qty,p_reason:reason.trim()});setBusy(false);if(error)setNotice(error.message);else{setNotice("Inventory updated for "+p.name);await loadData();}}} disabled={busy}>Adjust</button></td></tr>)}</tbody></table></div></div></>}
        {tab==="orders"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">CUSTOMER MANAGEMENT</div><h1>Customer orders</h1><p>Review enquiries and keep each customer updated.</p></div><button className="admin-secondary" onClick={()=>void loadData()}>Refresh orders</button></div>
          {orders.length===0?<div className="admin-panel admin-empty"><div className="admin-empty-icon"><Package size={24}/></div><h3>No customer orders yet.</h3><p>New orders submitted through the website will appear here.</p></div>:<div className="admin-order-list">{orders.map(order=><article className="admin-panel admin-order-card" key={order.id}><div className="admin-order-top"><div><div className="admin-eyebrow">ORDER #{order.order_number} · {new Date(order.created_at).toLocaleString("en-IN")}</div><h2>{order.customer_name}</h2><p>{order.phone}{order.email?" · "+order.email:""}</p></div><strong>{money(order.subtotal_paise)}</strong></div><div className="admin-order-items">{order.items.map((item:any,index:number)=><span key={index}>{item.name} × {item.quantity}</span>)}</div>{order.address&&<p className="admin-order-detail"><b>Address:</b> {order.address}</p>}{order.customer_note&&<p className="admin-order-detail"><b>Customer note:</b> {order.customer_note}</p>}<div className="admin-order-controls"><label>Order status<select value={order.status} onChange={e=>void updateOrderStatus(order,e.target.value as StoreOrder["status"])}><option value="new">New</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label><span className="admin-status draft">Payment: {order.payment_status}</span></div></article>)}</div>}
        </>}
        {tab==="categories"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">SHOP ORGANISATION</div><h1>Categories</h1><p>Keep your collections beautifully organised.</p></div></div><div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">COLLECTION TYPES</div><h2>Manage categories</h2></div></div><form className="admin-add-category" onSubmit={addCategory}><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="New category name" required/><button className="admin-primary compact"><Plus size={16}/> Add category</button></form><div className="admin-category-list">{categories.map(c=><div key={c.id}><div className="admin-category-icon"><ShoppingBag size={17}/></div><strong>{c.name}</strong><span className={c.is_active?"admin-status live":"admin-status draft"}>{c.is_active?"Visible":"Hidden"}</span><button className="admin-secondary small" onClick={()=>toggleCategory(c)}>{c.is_active?"Hide":"Show"}</button></div>)}</div></div></>}
      </div>
      <footer className="admin-footer">KURINJI CREATIONS STUDIO <span>Thoughtfully curated. Beautifully managed.</span></footer>
    </section>
  </main>;
}
