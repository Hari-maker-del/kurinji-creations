"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Box, Camera, Check, ChevronDown, CirclePlus, ClipboardList, ImagePlus, LayoutDashboard, LogOut, Package, Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
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
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab] = useState<"overview" | "products" | "categories" | "orders" | "inventory" | "customisations" | "customers" | "analytics">("overview");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "in" | "low" | "out">("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");

  const loadData = useCallback(async () => {
    const [{ data: categoryRows }, { data: productRows }, { data: orderRows }, { data: historyRows }] = await Promise.all([
      supabase.from("product_categories").select("id,name,slug,is_active").order("sort_order"),
      supabase.from("products").select("*,product_categories(name),product_images(id,image_url,is_primary,sort_order)").order("created_at", { ascending: false }),
      supabase.from("store_orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("store_inventory_logs").select("id,product_name,adjustment,previous_stock,new_stock,reason,event_type,order_id,created_at").order("created_at", { ascending: false }).limit(100)
    ]);
    setCategories((categoryRows ?? []) as Category[]);
    setProducts((productRows ?? []) as Product[]);
    setOrders((orderRows ?? []) as StoreOrder[]);
    setInventoryHistory(historyRows ?? []);
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
  const outOfStock = products.filter(p => p.stock_quantity <= 0).length;
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const paidRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.subtotal_paise) || 0), 0);
  const recentOrders = [...orders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,5);
  const stockAlerts = products.filter(p=>p.stock_quantity<=5).sort((a,b)=>a.stock_quantity-b.stock_quantity).slice(0,5);
  const customerProfiles = Object.values(orders.reduce((groups, order) => {
    const key = (order.phone || order.email || order.customer_name).trim().toLowerCase();
    const current = groups[key] ?? { key, name: order.customer_name, phone: order.phone, email: order.email, address: order.address, orders: [] as StoreOrder[] };
    current.orders.push(order);
    if (new Date(order.created_at).getTime() > new Date(current.orders[0].created_at).getTime()) {
      current.name = order.customer_name; current.phone = order.phone; current.email = order.email; current.address = order.address;
    }
    groups[key] = current;
    return groups;
  }, {} as Record<string, {key:string;name:string;phone:string;email:string|null;address:string|null;orders:StoreOrder[]}>))
    .map(customer => ({ ...customer, paidSpend: customer.orders.filter(order => order.payment_status === "paid").reduce((sum, order) => sum + (Number(order.subtotal_paise) || 0), 0), lastOrder: [...customer.orders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())[0] }))
    .sort((a,b)=>b.paidSpend-a.paidSpend);
  const filteredCustomers = customerProfiles.filter(customer => [customer.name, customer.phone, customer.email ?? ""].some(value => value.toLowerCase().includes(customerSearch.trim().toLowerCase())));
  const paidOrderHistory = orders.filter(order => order.payment_status === "paid");
  const analyticsNow = new Date();
  const dayKeys = Array.from({length:7},(_,index)=>{const d=new Date(analyticsNow);d.setHours(0,0,0,0);d.setDate(d.getDate()-(6-index));return d;});
  const dailySales = dayKeys.map(day=>{const key=day.toDateString();const dayOrders=paidOrderHistory.filter(order=>new Date(order.created_at).toDateString()===key);return {label:day.toLocaleDateString("en-IN",{weekday:"short"}),revenue:dayOrders.reduce((sum,order)=>sum+(Number(order.subtotal_paise)||0),0),count:dayOrders.length};});
  const monthKeys = Array.from({length:6},(_,index)=>{const d=new Date(analyticsNow.getFullYear(),analyticsNow.getMonth()-(5-index),1);return d;});
  const monthlySales = monthKeys.map(month=>{const monthOrders=paidOrderHistory.filter(order=>{const d=new Date(order.created_at);return d.getFullYear()===month.getFullYear()&&d.getMonth()===month.getMonth();});return {label:month.toLocaleDateString("en-IN",{month:"short"}),revenue:monthOrders.reduce((sum,order)=>sum+(Number(order.subtotal_paise)||0),0),count:monthOrders.length};});
  const paidRevenueAll = paidOrderHistory.reduce((sum,order)=>sum+(Number(order.subtotal_paise)||0),0);
  const paidItems = paidOrderHistory.flatMap(order=>(Array.isArray(order.items)?order.items:[]).map((item:any)=>({name:String(item.name??item.product_name??"Jewellery item"),quantity:Math.max(0,Number(item.quantity)||0),revenue:(Number(item.price_paise??item.unit_price_paise??0)||0)*Math.max(0,Number(item.quantity)||0)})));
  const bestSellers = Object.values(paidItems.reduce((groups,item)=>{const key=item.name.toLowerCase();const current=groups[key]??{name:item.name,quantity:0,revenue:0};current.quantity+=item.quantity;current.revenue+=item.revenue;groups[key]=current;return groups;},{} as Record<string,{name:string;quantity:number;revenue:number}>)).sort((a,b)=>b.quantity-a.quantity).slice(0,5);
  const maxDailyRevenue = Math.max(1,...dailySales.map(day=>day.revenue));
  const maxMonthlyRevenue = Math.max(1,...monthlySales.map(month=>month.revenue));
  const customOrders = orders.filter(order => /(preferred colou?r|custom design|customis|customiz)/i.test(order.customer_note ?? ""));
  const customRequestText = (note: string | null) => (note ?? "").split(/\r?\n/).filter(line => /(preferred colou?r|custom design|customis|customiz)/i.test(line)).join(" · ");
  const filteredOrders = orders.filter(order => {
    const query = orderSearch.trim().toLowerCase();
    const matchesSearch = !query || [String(order.order_number), order.customer_name, order.phone, order.email ?? ""].some(value => value.toLowerCase().includes(query));
    return matchesSearch && (orderStatusFilter === "all" || order.status === orderStatusFilter) && (paymentFilter === "all" || order.payment_status === paymentFilter);
  });
  function exportOrders() {
    const columns = ["Order number","Date","Customer","Phone","Email","Order status","Payment status","Amount (INR)","Items"];
    const rows = filteredOrders.map(order => [order.order_number,new Date(order.created_at).toLocaleString("en-IN"),order.customer_name,order.phone,order.email ?? "",order.status,order.payment_status,(order.subtotal_paise/100).toFixed(2),(order.items ?? []).map((item:any)=>String(item.name)+" x "+item.quantity).join("; ")]);
    const csv = [columns,...rows].map(row=>row.map(value=>'"'+String(value ?? "").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
    const link = document.createElement("a"); link.href=url; link.download="kurinji-orders-"+new Date().toISOString().slice(0,10)+".csv"; link.click(); URL.revokeObjectURL(url);
  }

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
      <button className={tab==="orders"?"selected":""} onClick={()=>setTab("orders")}><Package size={17}/> Orders <span>{orders.filter(o=>o.status==="new").length}</span></button>
      <button className={tab==="inventory"?"selected":""} onClick={()=>setTab("inventory")}><Box size={17}/> Inventory</button>
      <button className={tab==="customisations"?"selected":""} onClick={()=>setTab("customisations")}><Sparkles size={17}/> Custom requests <span>{customOrders.length}</span></button>
      <button className={tab==="customers"?"selected":""} onClick={()=>setTab("customers")}><ShoppingBag size={17}/> Customers <span>{customerProfiles.length}</span></button>
      <button className={tab==="analytics"?"selected":""} onClick={()=>setTab("analytics")}><LayoutDashboard size={17}/> Sales analytics</button>
      <div className="admin-side-bottom"><div className="admin-user"><div className="admin-avatar">{userEmail.slice(0,1).toUpperCase()}</div><div><strong>Store owner</strong><small>{userEmail}</small></div></div><button onClick={signOut}><LogOut size={16}/> Sign out</button></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div><div className="admin-eyebrow">KURINJI CREATIONS / STUDIO</div><div className="admin-top-title">The boutique workspace</div></div><div className="admin-top-actions"><button className="admin-secondary admin-refresh" onClick={()=>void loadData()}><RefreshCw size={14}/> Refresh data</button><a href="/" className="admin-view-store">View storefront <ArrowLeft className="admin-arrow-flip" size={14}/></a></div></header>
      <div className="admin-content">
        {notice&&<div className="admin-notice"><Check size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        {tab==="overview"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">YOUR STORE AT A GLANCE</div><h1>Good day, Kurinji.</h1><p>Here’s what’s happening with your collection.</p></div><button className="admin-primary compact" onClick={newProduct}><Plus size={16}/> Add a product</button></div>
          <div className="admin-stat-grid"><article><span><Package size={17}/> NEW ORDERS</span><strong>{orders.filter(o=>o.status==="new").length}</strong><small>Awaiting your review</small></article><article><span><ShoppingBag size={17}/> TOTAL ORDERS</span><strong>{orders.length}</strong><small>Customer enquiries received</small></article><article><span><Package size={17}/> TOTAL PRODUCTS</span><strong>{products.length}</strong><small>Pieces in your catalogue</small></article><article><span><BadgeCheck size={17}/> PUBLISHED</span><strong>{activeCount}</strong><small>Visible on your storefront</small></article><article><span><Box size={17}/> LOW STOCK</span><strong>{lowStock}</strong><small>5 or fewer pieces remaining</small></article><article><span><Sparkles size={17}/> CATEGORIES</span><strong>{categories.length}</strong><small>Ways to explore your edit</small></article></div>
          <div className="admin-stat-grid admin-stat-grid-extra"><article><span><BadgeCheck size={17}/> PAID REVENUE</span><strong>{money(paidRevenue)}</strong><small>{paidOrders.length} successfully paid orders</small></article><article><span><Box size={17}/> OUT OF STOCK</span><strong>{outOfStock}</strong><small>Products unavailable to customers</small></article></div>
          <div className="admin-overview-grid">
            <section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">ORDER ACTIVITY</div><h2>Recent orders</h2></div><button className="admin-text-button" onClick={()=>setTab("orders")}>All orders <ArrowLeft className="admin-arrow-flip" size={14}/></button></div>
              {recentOrders.length===0?<p className="admin-overview-empty">New customer orders will appear here.</p>:<div className="admin-recent-list">{recentOrders.map(order=><div className="admin-recent-row" key={order.id}><div><strong>#{order.order_number} · {order.customer_name}</strong><small>{new Date(order.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} · {order.payment_status==="paid"?"Paid":order.payment_status}</small></div><div className="admin-recent-right"><strong>{money(order.subtotal_paise)}</strong><span className={"admin-status "+(order.status==="new"?"draft":"live")}>{order.status}</span></div></div>)}</div>}
            </section>
            <section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">REPLENISHMENT</div><h2>Stock alerts</h2></div><button className="admin-text-button" onClick={()=>setTab("inventory")}>Inventory <ArrowLeft className="admin-arrow-flip" size={14}/></button></div>
              {stockAlerts.length===0?<p className="admin-overview-empty">All products have healthy stock levels.</p>:<div className="admin-recent-list">{stockAlerts.map(product=><div className="admin-recent-row" key={product.id}><div><strong>{product.name}</strong><small>{product.sku||"No SKU"}</small></div><div className="admin-recent-right"><strong>{product.stock_quantity} left</strong><span className={"admin-status "+(product.stock_quantity<=0?"draft":"live")}>{product.stock_quantity<=0?"Sold out":"Low stock"}</span></div></div>)}</div>}
            </section>
          </div>
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
          <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">STOCK STATUS</div><h2>Inventory list</h2></div><div className="admin-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search inventory"/></div></div><div className="admin-inventory-filters">{(["all","in","low","out"] as const).map(f=><button key={f} className={inventoryFilter===f?"active":""} onClick={()=>setInventoryFilter(f)}>{f==="all"?"All":f==="in"?"In stock":f==="low"?"Low stock":"Out of stock"}</button>)}</div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>PRODUCT</th><th>PRICE</th><th>QUANTITY</th><th>STOCK STATUS</th><th>ADJUST</th></tr></thead><tbody>{products.filter(p=>(p.name+" "+(p.sku??"")).toLowerCase().includes(search.toLowerCase())).filter(p=>inventoryFilter==="all"||(inventoryFilter==="in"&&p.stock_quantity>5)||(inventoryFilter==="low"&&p.stock_quantity>0&&p.stock_quantity<=5)||(inventoryFilter==="out"&&p.stock_quantity<=0)).map(p=><tr key={p.id}><td><div className="admin-product-cell"><img src={p.product_images?.find(i=>i.is_primary)?.image_url||p.product_images?.[0]?.image_url||"/placeholder.txt"} alt=""/><div><strong>{p.name}</strong><small>{p.sku||"No SKU"}</small></div></div></td><td>{money(p.price_paise)}</td><td><strong>{p.stock_quantity}</strong></td><td><span className={p.stock_quantity<=0?"admin-stock-status out":p.stock_quantity<=5?"admin-stock-status low":"admin-stock-status in"}>{p.stock_quantity<=0?"Out of stock":p.stock_quantity<=5?"Low stock":"In stock"}</span></td><td><button className="admin-secondary small" onClick={async()=>{const raw=window.prompt("Adjustment amount (use + to add, - to remove):");if(raw===null)return;const qty=Number(raw);if(!Number.isInteger(qty)||qty===0){setNotice("Enter a non-zero whole-number adjustment.");return;}const reason=window.prompt("Reason for this stock adjustment:");if(!reason?.trim())return;setBusy(true);const {error}=await supabase.rpc("adjust_store_inventory",{p_product_id:p.id,p_adjustment:qty,p_reason:reason.trim()});setBusy(false);if(error)setNotice(error.message);else{setNotice("Inventory updated for "+p.name);await loadData();}}} disabled={busy}>Adjust</button></td></tr>)}</tbody></table></div></div><div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">AUDIT TRAIL</div><h2>Inventory history</h2></div><button className="admin-secondary small" onClick={()=>void loadData()}>Refresh history</button></div>{inventoryHistory.length===0?<p className="admin-history-empty">No stock movements recorded yet. Paid orders and manual adjustments will appear here.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>DATE</th><th>PRODUCT</th><th>CHANGE</th><th>BEFORE</th><th>AFTER</th><th>REASON / REFERENCE</th></tr></thead><tbody>{inventoryHistory.map((entry:any)=><tr key={entry.id}><td>{new Date(entry.created_at).toLocaleString("en-IN")}</td><td>{entry.product_name}</td><td><strong style={{color:entry.adjustment<0?"#9b4e40":"#547451"}}>{entry.adjustment>0?"+":""}{entry.adjustment}</strong></td><td>{entry.previous_stock}</td><td>{entry.new_stock}</td><td>{entry.reason}{entry.order_id?" · Order sale":""}</td></tr>)}</tbody></table></div>}</div></>}
        {tab==="orders"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">CUSTOMER MANAGEMENT</div><h1>Customer orders</h1><p>Review enquiries and keep each customer updated.</p></div><button className="admin-secondary" onClick={()=>void loadData()}>Refresh orders</button></div>
          {orders.length===0?<div className="admin-panel admin-empty"><div className="admin-empty-icon"><Package size={24}/></div><h3>No customer orders yet.</h3><p>New orders submitted through the website will appear here.</p></div>:<><div className="admin-panel admin-order-toolbar"><div className="admin-order-filters"><div className="admin-search"><Search size={15}/><input value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} placeholder="Search order, customer or phone"/></div><select aria-label="Filter by order status" value={orderStatusFilter} onChange={e=>setOrderStatusFilter(e.target.value)}><option value="all">All order statuses</option><option value="new">New</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><select aria-label="Filter by payment status" value={paymentFilter} onChange={e=>setPaymentFilter(e.target.value)}><option value="all">All payments</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option></select></div><div className="admin-order-export"><span>{filteredOrders.length} of {orders.length} orders</span><button className="admin-secondary small" onClick={exportOrders} disabled={!filteredOrders.length}>Export CSV</button></div></div>{filteredOrders.length===0?<div className="admin-panel admin-empty"><h3>No matching orders</h3><p>Try changing your search or filters.</p></div>:<div className="admin-order-list">{filteredOrders.map(order=><article className="admin-panel admin-order-card" key={order.id}><div className="admin-order-top"><div><div className="admin-eyebrow">ORDER #{order.order_number} · {new Date(order.created_at).toLocaleString("en-IN")}</div><h2>{order.customer_name}</h2><p>{order.phone}{order.email?" · "+order.email:""}</p></div><strong>{money(order.subtotal_paise)}</strong></div><div className="admin-order-items">{(order.items ?? []).map((item:any,index:number)=><span key={index}>{item.name} × {item.quantity}</span>)}</div>{order.address&&<p className="admin-order-detail"><b>Address:</b> {order.address}</p>}{order.customer_note&&<p className="admin-order-detail"><b>Customer note:</b> {order.customer_note}</p>}<div className="admin-order-controls"><label>Order status<select value={order.status} onChange={e=>void updateOrderStatus(order,e.target.value as StoreOrder["status"])}><option value="new">New</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label><span className="admin-status draft">Payment: {order.payment_status}</span></div></article>)}</div>}</>}
        </>}
        {tab==="customisations"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">PERSONALISED JEWELLERY</div><h1>Custom requests</h1><p>Review customer colour and design preferences before confirming each order.</p></div><button className="admin-secondary" onClick={()=>void loadData()}><RefreshCw size={14}/> Refresh</button></div>
          {customOrders.length===0?<div className="admin-panel admin-empty"><div className="admin-empty-icon"><Sparkles size={24}/></div><h3>No custom requests yet.</h3><p>When customers submit a colour or design preference through a product page, it will appear here.</p></div>:<div className="admin-custom-request-list">{customOrders.map(order=><article className="admin-panel admin-custom-request" key={order.id}><div className="admin-custom-request-head"><div><div className="admin-eyebrow">ORDER #{order.order_number} · {new Date(order.created_at).toLocaleString("en-IN")}</div><h2>{order.customer_name}</h2><p>{order.phone}{order.email?" · "+order.email:""}</p></div><span className={"admin-status "+(order.status==="new"?"draft":"live")}>{order.status}</span></div><div className="admin-custom-request-products">{(order.items??[]).map((item:any,index:number)=><span key={index}>{item.name} × {item.quantity}</span>)}</div><div className="admin-custom-request-note"><span>REQUESTED PERSONALISATION</span><p>{customRequestText(order.customer_note)||order.customer_note}</p></div>{order.address&&<p className="admin-order-detail"><b>Delivery address:</b> {order.address}</p>}<div className="admin-order-controls"><label>Request / order progress<select value={order.status} onChange={e=>void updateOrderStatus(order,e.target.value as StoreOrder["status"])}><option value="new">New — review request</option><option value="confirmed">Confirmed — options agreed</option><option value="processing">Processing — making piece</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label><span className="admin-status draft">Payment: {order.payment_status}</span></div></article>)}</div>}
        </>}
        {tab==="analytics"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">BUSINESS PERFORMANCE</div><h1>Sales analytics</h1><p>Track paid revenue, sales momentum and your best-selling pieces.</p></div><button className="admin-secondary" onClick={()=>void loadData()}><RefreshCw size={14}/> Refresh analytics</button></div>
          <div className="admin-stat-grid"><article><span><BadgeCheck size={17}/> TOTAL PAID REVENUE</span><strong>{money(paidRevenueAll)}</strong><small>Across the latest {orders.length} loaded orders</small></article><article><span><Package size={17}/> PAID ORDERS</span><strong>{paidOrderHistory.length}</strong><small>Successfully paid orders</small></article><article><span><ShoppingBag size={17}/> UNITS SOLD</span><strong>{paidItems.reduce((sum,item)=>sum+item.quantity,0)}</strong><small>Quantities from paid order items</small></article><article><span><BadgeCheck size={17}/> AVERAGE ORDER</span><strong>{paidOrderHistory.length?money(Math.round(paidRevenueAll/paidOrderHistory.length)):"₹0"}</strong><small>Average paid order value</small></article></div>
          <div className="admin-analytics-grid"><section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">DAILY PERFORMANCE</div><h2>Last 7 days</h2></div><span className="admin-analytics-note">Paid revenue</span></div><div className="admin-chart-bars">{dailySales.map(day=><div className="admin-chart-column" key={day.label}><strong>{day.revenue?money(day.revenue):"—"}</strong><div className="admin-chart-track"><i style={{height:(day.revenue/maxDailyRevenue*100)+"%"}}/></div><span>{day.label}</span><small>{day.count} orders</small></div>)}</div></section>
          <section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">MONTHLY PERFORMANCE</div><h2>Last 6 months</h2></div><span className="admin-analytics-note">Paid revenue</span></div><div className="admin-chart-bars monthly">{monthlySales.map(month=><div className="admin-chart-column" key={month.label}><strong>{month.revenue?money(month.revenue):"—"}</strong><div className="admin-chart-track"><i style={{height:(month.revenue/maxMonthlyRevenue*100)+"%"}}/></div><span>{month.label}</span><small>{month.count} orders</small></div>)}</div></section></div>
          <div className="admin-analytics-grid"><section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">PRODUCT PERFORMANCE</div><h2>Best sellers</h2></div></div>{bestSellers.length===0?<p className="admin-history-empty">Best sellers will appear after paid orders contain item details.</p>:<div className="admin-best-sellers">{bestSellers.map((item,index)=><div key={item.name}><span className="admin-best-rank">{index+1}</span><strong>{item.name}</strong><small>{item.quantity} units sold</small></div>)}</div>}</section>
          <section className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">ORDER HEALTH</div><h2>Payment breakdown</h2></div></div><div className="admin-payment-breakdown">{["paid","pending","failed"].map(status=>{const count=orders.filter(order=>order.payment_status===status).length;return <div key={status}><span>{status}</span><strong>{count}</strong><i><b style={{width:(orders.length?count/orders.length*100:0)+"%"}}/></i></div>})}</div><p className="admin-history-empty">Revenue and sales charts include paid orders only. Payment breakdown includes the loaded order records.</p></section></div>
          <p className="admin-analytics-footnote">Analytics are calculated from the latest 100 orders currently loaded in this dashboard. Revenue excludes unpaid, failed and cancelled payment attempts.</p>
        </>}
        {tab==="customers"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">CUSTOMER RELATIONSHIPS</div><h1>Customers</h1><p>Understand repeat visits, order history and paid customer value.</p></div><button className="admin-secondary" onClick={()=>void loadData()}><RefreshCw size={14}/> Refresh</button></div>
          <div className="admin-stat-grid"><article><span><ShoppingBag size={17}/> TOTAL CUSTOMERS</span><strong>{customerProfiles.length}</strong><small>Unique phone / email records</small></article><article><span><BadgeCheck size={17}/> REPEAT CUSTOMERS</span><strong>{customerProfiles.filter(c=>c.orders.length>1).length}</strong><small>More than one order</small></article><article><span><Package size={17}/> PAID CUSTOMERS</span><strong>{customerProfiles.filter(c=>c.paidSpend>0).length}</strong><small>At least one paid order</small></article><article><span><BadgeCheck size={17}/> CUSTOMER VALUE</span><strong>{money(customerProfiles.reduce((sum,c)=>sum+c.paidSpend,0))}</strong><small>Paid order totals in loaded history</small></article></div>
          <div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">YOUR CUSTOMER BOOK</div><h2>Customer profiles</h2></div><div className="admin-search"><Search size={15}/><input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Search name, phone or email"/></div></div>
            {filteredCustomers.length===0?<div className="admin-empty"><h3>No customers found</h3><p>Customer profiles are created automatically from submitted orders.</p></div>:<div className="admin-customer-list">{filteredCustomers.map(customer=><article className="admin-customer-card" key={customer.key}><div className="admin-customer-head"><div><div className="admin-eyebrow">{customer.orders.length>1?"REPEAT CUSTOMER":"CUSTOMER"}</div><h3>{customer.name}</h3><p>{customer.phone}{customer.email?" · "+customer.email:""}</p></div><strong>{money(customer.paidSpend)}<small>PAID SPEND</small></strong></div><div className="admin-customer-metrics"><span><b>{customer.orders.length}</b> orders</span><span><b>{customer.orders.filter(o=>o.payment_status==="paid").length}</b> paid</span><span>Last order <b>{new Date(customer.lastOrder.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</b></span></div>{customer.address&&<p className="admin-order-detail"><b>Latest address:</b> {customer.address}</p>}<details className="admin-customer-history"><summary>View order history</summary><div>{[...customer.orders].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(order=><div key={order.id}><span><b>#{order.order_number}</b> · {new Date(order.created_at).toLocaleDateString("en-IN")} · {order.status} / {order.payment_status}</span><strong>{money(order.subtotal_paise)}</strong><small>{(order.items??[]).map((item:any)=>item.name+" × "+item.quantity).join(", ")}</small></div>)}</div></details></article>)}</div>}
          </div></>}
        {tab==="categories"&&<><div className="admin-heading-row"><div><div className="admin-eyebrow">SHOP ORGANISATION</div><h1>Categories</h1><p>Keep your collections beautifully organised.</p></div></div><div className="admin-panel"><div className="admin-panel-head"><div><div className="admin-eyebrow">COLLECTION TYPES</div><h2>Manage categories</h2></div></div><form className="admin-add-category" onSubmit={addCategory}><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} placeholder="New category name" required/><button className="admin-primary compact"><Plus size={16}/> Add category</button></form><div className="admin-category-list">{categories.map(c=><div key={c.id}><div className="admin-category-icon"><ShoppingBag size={17}/></div><strong>{c.name}</strong><span className={c.is_active?"admin-status live":"admin-status draft"}>{c.is_active?"Visible":"Hidden"}</span><button className="admin-secondary small" onClick={()=>toggleCategory(c)}>{c.is_active?"Hide":"Show"}</button></div>)}</div></div></>}
      </div>
      <footer className="admin-footer">KURINJI CREATIONS STUDIO <span>Thoughtfully curated. Beautifully managed.</span></footer>
    </section>
  </main>;
}
