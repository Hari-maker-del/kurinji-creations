"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Chrome, Gift, LockKeyhole, LogOut, Package, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Order = {id:string;order_number:number;customer_name:string;items:any[];subtotal_paise:number;discount_paise:number|null;loyalty_discount_paise:number|null;loyalty_points_redeemed:number|null;coupon_code:string|null;status:string;payment_status:string;created_at:string};
type AccountData = {profile:{name:string;phone:string};orders:Order[];loyalty:any|null};
const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(paise/100);
const stages=["confirmed","processing","shipped","delivered"];
const statusLabel=(status:string)=>({new:"Received",confirmed:"Confirmed",processing:"Preparing",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled"} as Record<string,string>)[status]??status;
const statusTone=(status:string)=>status==="delivered"?"done":status==="cancelled"?"cancel":status==="shipped"?"ship":"active";

export default function AccountPage(){
 const supabase=useMemo(()=>createClient(),[]);
 const [phone,setPhone]=useState("");
 const [googleNeedsPhone,setGoogleNeedsPhone]=useState(false);
 const [phoneLinkOtpSent,setPhoneLinkOtpSent]=useState(false);
 const [otp,setOtp]=useState("");
 const [otpSent,setOtpSent]=useState(false);
 const [loginMode,setLoginMode]=useState<"otp"|"password">("otp");
 const [password,setPassword]=useState("");
 const [resetMode,setResetMode]=useState(false);
 const [resetVerified,setResetVerified]=useState(false);
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [changePasswordOpen,setChangePasswordOpen]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [data,setData]=useState<AccountData|null>(null);
 const loadAccount=useCallback(async()=>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setData(null);setGoogleNeedsPhone(false);setLoading(false);return;}
  if(!user.phone){setData(null);setGoogleNeedsPhone(Boolean(user.email));setLoading(false);return;}
  setGoogleNeedsPhone(false);
  const response=await fetch("/api/account",{cache:"no-store"});
  const result=await response.json();
  if(!response.ok){setError(result.error||"Unable to load account.");setData(null);}
  else setData(result);
  setLoading(false);
 },[supabase]);
 useEffect(()=>{void loadAccount();},[loadAccount]);
 async function signInWithGoogle(){
  setBusy(true);setError("");
  const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/account"} });
  if(error){setError(error.message);setBusy(false);}
 }
 async function sendPhoneLinkCode(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const digits=phone.replace(/[^0-9]/g,"").replace(/^0/,"");
  if(!/^\d{10}$/.test(digits)){setError("Enter a valid 10-digit Indian mobile number.");setBusy(false);return;}
  const {error}=await supabase.auth.updateUser({phone:"+91"+digits});
  if(error)setError(error.message);else{setPhoneLinkOtpSent(true);setNotice("A verification code has been sent to link this mobile number to your Google account.");}
  setBusy(false);
 }
 async function verifyPhoneLinkCode(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const digits=phone.replace(/[^0-9]/g,"").replace(/^0/,"");
  const {error}=await supabase.auth.verifyOtp({phone:"+91"+digits,token:otp.trim(),type:"phone_change"});
  if(error)setError(error.message);else{setOtp("");setPhoneLinkOtpSent(false);setGoogleNeedsPhone(false);setLoading(true);await loadAccount();}
  setBusy(false);
 }
 async function sendOtp(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const digits=phone.replace(/[^0-9]/g,"").replace(/^0/,"");
  if(!/^\d{10}$/.test(digits)){setError("Enter a valid 10-digit Indian mobile number.");setBusy(false);return;}
  const {error}=await supabase.auth.signInWithOtp({phone:"+91"+digits,options:{shouldCreateUser:true}});
  if(error)setError(error.message);else{setOtpSent(true);setNotice("A verification code has been sent to your mobile.");}
  setBusy(false);
 }
 async function verifyOtp(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const digits=phone.replace(/[^0-9]/g,"").replace(/^0/,"");
  const {error}=await supabase.auth.verifyOtp({phone:"+91"+digits,token:otp.trim(),type:"sms"});
  if(error)setError(error.message);else if(resetMode){setOtp("");setOtpSent(false);setResetVerified(true);setNotice("Your mobile number is verified. Create your new password.");}else{setOtp("");setOtpSent(false);setLoading(true);await loadAccount();}
  setBusy(false);
 }
 async function signInPassword(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const digits=phone.replace(/[^0-9]/g,"").replace(/^0/,"");
  if(!/^\d{10}$/.test(digits)){setError("Enter a valid 10-digit Indian mobile number.");setBusy(false);return;}
  const {error}=await supabase.auth.signInWithPassword({phone:"+91"+digits,password});
  if(error)setError(error.message);else{setPassword("");setLoading(true);await loadAccount();}
  setBusy(false);
 }
 async function saveNewPassword(event:React.FormEvent){
  event.preventDefault();setError("");setNotice("");
  if(newPassword.length<8){setError("Use at least 8 characters for your password.");return;}
  if(newPassword!==confirmPassword){setError("Your passwords do not match.");return;}
  setBusy(true);const {error}=await supabase.auth.updateUser({password:newPassword});
  if(error)setError(error.message);else{setNewPassword("");setConfirmPassword("");setResetVerified(false);setResetMode(false);setNotice("Your password has been reset successfully.");setLoading(true);await loadAccount();}
  setBusy(false);
 }
 async function changePassword(event:React.FormEvent){
  event.preventDefault();setError("");setNotice("");
  if(newPassword.length<8){setError("Use at least 8 characters for your password.");return;}
  if(newPassword!==confirmPassword){setError("Your passwords do not match.");return;}
  setBusy(true);const {error}=await supabase.auth.updateUser({password:newPassword});
  if(error)setError(error.message);else{setNewPassword("");setConfirmPassword("");setChangePasswordOpen(false);setNotice("Your password has been changed.");}
  setBusy(false);
 }
 async function signOut(){await supabase.auth.signOut();setData(null);setPhone("");setOtp("");setOtpSent(false);}
 if(loading)return <main className="container section kc-account"><p>Loading your account…</p></main>;
 return <main className="container kc-account">
  <header className="kc-account-header"><Link href="/shop" className="back-link"><ArrowLeft size={15}/> BACK TO SHOP</Link><Link href="/" className="brand">KURINJI<small>CREATIONS</small></Link><span className="kc-account-secure"><ShieldCheck size={14}/> SECURE</span></header>
  {googleNeedsPhone?<section className="kc-account-login"><div className="kc-account-mark"><ShieldCheck size={25}/></div><div className="kicker">ONE LAST STEP</div><h1 className="section-title">Link your mobile number.</h1><p>Your Google account is signed in. Verify your mobile number to securely connect your orders and Kurinji rewards.</p>{!phoneLinkOtpSent?<form onSubmit={sendPhoneLinkCode}><label>Mobile number<input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={14}/></label><button className="primary-button" disabled={busy}>{busy?"SENDING…":"SEND VERIFICATION CODE"}</button></form>:<form onSubmit={verifyPhoneLinkCode}><label>SMS verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter the SMS code" maxLength={8}/></label><button className="primary-button" disabled={busy||otp.trim().length<4}>{busy?"VERIFYING…":"VERIFY & CONTINUE"}</button><button type="button" className="kc-account-text-button" onClick={()=>{setPhoneLinkOtpSent(false);setOtp("");}}>Change mobile number</button></form>}{error&&<p className="kc-account-error" role="alert">{error}</p>}{notice&&<p className="kc-account-notice" role="status">{notice}</p>}</section>:!data?<section className="kc-account-login">
   <div className="kc-account-mark"><ShieldCheck size={25}/></div><div className="kicker">YOUR KURINJI ACCOUNT</div><h1 className="section-title">A little space, just for you.</h1>
   <p>Verify your mobile number to view your orders, delivery progress and loyalty rewards.</p>
   <button type="button" className="kc-google-signin" onClick={signInWithGoogle} disabled={busy}><Chrome size={17}/> CONTINUE WITH GOOGLE</button><div className="kc-login-divider"><span>OR CONTINUE WITH MOBILE</span></div>
   {resetVerified?<form onSubmit={saveNewPassword}><label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters" minLength={8}/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Enter password again"/></label><button className="primary-button" disabled={busy}>{busy?"UPDATING…":"RESET PASSWORD"}</button></form>
   :resetMode?<><p>Enter your registered mobile number. We’ll send an SMS verification code before allowing a password reset.</p>{!otpSent?<form onSubmit={sendOtp}><label>Mobile number<input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={14}/></label><button className="primary-button" disabled={busy}>{busy?"SENDING…":"SEND RESET CODE"}</button></form>:<form onSubmit={verifyOtp}><label>Verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter the SMS code" maxLength={8}/></label><button className="primary-button" disabled={busy||otp.trim().length<4}>{busy?"VERIFYING…":"VERIFY MOBILE NUMBER"}</button><button type="button" className="kc-account-text-button" onClick={()=>{setOtpSent(false);setOtp("");}}>Change mobile number</button></form>}<button type="button" className="kc-account-text-button" onClick={()=>{setResetMode(false);setOtpSent(false);setOtp("");}}>Back to sign in</button></>
   :loginMode==="password"?<form onSubmit={signInPassword}><label>Mobile number<input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={14}/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="primary-button" disabled={busy}>{busy?"SIGNING IN…":"SIGN IN"}</button><button type="button" className="kc-account-text-button" onClick={()=>{setResetMode(true);setPassword("");setError("");}}>Forgot password?</button><button type="button" className="kc-account-text-button" onClick={()=>{setLoginMode("otp");setPassword("");}}>Sign in with SMS code instead</button></form>
   :!otpSent?<><form onSubmit={sendOtp}><label>Mobile number<input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={14}/></label><button className="primary-button" disabled={busy}>{busy?"SENDING…":"SEND VERIFICATION CODE"}</button></form><button type="button" className="kc-account-text-button" onClick={()=>setLoginMode("password")}>Sign in with password</button></>
   :<form onSubmit={verifyOtp}><label>Verification code<input type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter the SMS code" maxLength={8}/></label><button className="primary-button" disabled={busy||otp.trim().length<4}>{busy?"VERIFYING…":"VERIFY & VIEW ACCOUNT"}</button><button type="button" className="kc-account-text-button" onClick={()=>{setOtpSent(false);setOtp("");}}>Change mobile number</button></form>}
   {error&&<p className="kc-account-error" role="alert">{error}</p>}{notice&&<p className="kc-account-notice" role="status">{notice}</p>}
  </section>:<>
   <div className="kc-account-welcome"><div><div className="kicker">WELCOME BACK</div><h1 className="section-title">{data.profile.name||"Your account"}</h1><p>{data.profile.phone}</p></div><button onClick={signOut} className="kc-account-signout"><LogOut size={15}/> SIGN OUT</button></div>
   {data.loyalty&&<section className="kc-loyalty-panel"><div className="kc-loyalty-top"><div><div className="kicker">KURINJI REWARDS · {data.loyalty.tier.toUpperCase()}</div><h2>{Number(data.loyalty.points_balance).toLocaleString("en-IN")} <small>POINTS AVAILABLE</small></h2><p>{Number(data.loyalty.lifetime_points).toLocaleString("en-IN")} lifetime points</p></div><div className="kc-loyalty-icon"><Sparkles size={24}/></div></div><div className="kc-loyalty-referral"><div><small>YOUR FRIEND REFERRAL CODE</small><strong>{data.loyalty.referral_code}</strong></div><button onClick={()=>{void navigator.clipboard.writeText(data.loyalty.referral_code);setNotice("Referral code copied.");}}>COPY CODE</button></div><p className="kc-loyalty-hint">Earn 1 point for every ₹100 paid. Redeem 10 points for ₹1 off your next order.</p></section>}
   <section className="kc-password-panel"><div><div className="kicker">ACCOUNT SECURITY</div><h2 className="section-title">Password & security</h2><p>Update your password whenever you need to.</p></div>{!changePasswordOpen?<button className="kc-account-refresh" onClick={()=>{setChangePasswordOpen(true);setNewPassword("");setConfirmPassword("");setError("");}}><LockKeyhole size={14}/> CHANGE PASSWORD</button>:<form onSubmit={changePassword}><label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Enter password again"/></label><div className="kc-password-actions"><button className="primary-button" disabled={busy}>{busy?"SAVING…":"SAVE NEW PASSWORD"}</button><button type="button" className="kc-account-text-button" onClick={()=>setChangePasswordOpen(false)}>CANCEL</button></div></form>}</section>
   <section className="kc-account-orders"><div className="section-head"><div><div className="kicker">YOUR PURCHASES</div><h2 className="section-title">Order history</h2></div><button className="kc-account-refresh" onClick={()=>{setLoading(true);void loadAccount();}}><RefreshCw size={14}/> REFRESH</button></div>
    {!data.orders.length?<div className="kc-account-empty"><Package size={27}/><h3>Your story starts here.</h3><p>Your orders will appear here after checkout.</p><Link href="/shop" className="primary-button">EXPLORE JEWELLERY</Link></div>:
    <div className="kc-order-list">{data.orders.map(order=>{const total=order.subtotal_paise-(order.discount_paise||0)-(order.loyalty_discount_paise||0);const current=stages.indexOf(order.status);return <article className="kc-order-card" key={order.id}><div className="kc-order-head"><div><small>ORDER #{order.order_number}</small><strong>{new Date(order.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</strong></div><span className={"kc-order-status "+statusTone(order.status)}>{statusLabel(order.status)}</span></div><div className="kc-order-items">{(order.items||[]).map((item:any,i:number)=><span key={i}>{item.name} <b>× {item.quantity}</b></span>)}</div><div className="kc-order-foot"><span>{order.payment_status==="paid"?"PAID":"PAYMENT "+order.payment_status.toUpperCase()}</span><strong>{money(total)}</strong></div>{order.status!=="cancelled"&&<div className="kc-order-progress">{stages.map((stage,i)=><div className={i<=current?"reached":""} key={stage}><i/><span>{statusLabel(stage)}</span></div>)}</div>}</article>})}</div>}
   </section>
   {data.loyalty&&<section className="kc-account-ledger"><div className="kicker">POINTS ACTIVITY</div><h2 className="section-title">Rewards history</h2>{data.loyalty.ledger.length?<div className="kc-ledger-list">{data.loyalty.ledger.map((entry:any)=><div key={entry.id}><span><strong>{entry.description}</strong><small>{new Date(entry.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</small></span><b className={entry.points>0?"positive":"negative"}>{entry.points>0?"+":""}{entry.points}</b></div>)}</div>:<p className="kc-account-muted">Your points activity will appear here.</p>}</section>}
   {notice&&<p className="kc-account-notice">{notice}</p>}
  </>}
  <footer className="kc-account-footer">HANDCRAFTED WITH CARE · KURINJI CREATIONS</footer>
 </main>;
}
