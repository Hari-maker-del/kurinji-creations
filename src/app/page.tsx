import Link from "next/link";
import { ArrowRight, Sparkles, Heart, Flower2, MessageCircle, Instagram } from "lucide-react";

const collections = [
  { name: "Earrings", note: "Little details that make a look", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85" },
  { name: "Necklaces", note: "Delicate pieces, lovely moments", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85" },
  { name: "Bracelets", note: "A graceful finishing touch", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=85" },
];

export default function LandingPage() {
  return <main className="kc-landing">
    <div className="kc-topline">A LITTLE BEAUTY, MADE PERSONAL <span>✦</span> THOUGHTFUL JEWELLERY FOR EVERY DAY</div>
    <header className="kc-header">
      <Link href="/" className="kc-wordmark">KURINJI<span>CREATIONS</span></Link>
      <nav><a href="#collections">Collections</a><a href="#story">Our story</a><a href="#custom">Custom pieces</a></nav>
      <Link href="/shop" className="kc-header-cta">Explore the shop <ArrowRight size={15}/></Link>
    </header>
    <section className="kc-hero">
      <div className="kc-hero-copy">
        <div className="kc-eyebrow"><span/> THE KURINJI EDIT</div>
        <h1>Jewellery that<br/><em>feels like you.</em></h1>
        <p>Thoughtful little details. Soft, expressive colours. Pieces chosen to make your everyday moments feel a little more special.</p>
        <div className="kc-hero-actions"><Link href="/shop" className="kc-button">Discover the collection <ArrowRight size={16}/></Link><a href="#story" className="kc-text-link">A little about us</a></div>
        <div className="kc-hero-foot"><span>01 — PERSONAL STYLE</span><span>MADE TO BE YOURS</span></div>
      </div>
      <div className="kc-hero-art">
        <img className="kc-hero-main" src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1400&q=90" alt="Elegant gold jewellery in warm natural light"/>
        <div className="kc-image-note"><span>THE BEAUTY OF</span><strong>little things</strong><Flower2 size={23}/></div>
        <div className="kc-vertical-note">KURINJI CREATIONS · EST. 2026</div>
      </div>
    </section>
    <section className="kc-intro" id="story"><div className="kc-intro-mark">K.</div><div><div className="kc-eyebrow">A NOTE FROM KURINJI</div><h2>Not just an accessory.<br/><em>A little piece of you.</em></h2></div><p>We believe the smallest details can hold the loveliest stories. Discover jewellery for everyday moments, thoughtful gifting and the colours that feel most like you.</p></section>
    <section className="kc-collections" id="collections"><div className="kc-section-head"><div><div className="kc-eyebrow">FIND YOUR KIND OF LOVELY</div><h2>Explore the collections</h2></div><Link href="/shop" className="kc-text-link">VIEW ALL PIECES <ArrowRight size={14}/></Link></div><div className="kc-collection-grid">{collections.map((item,i)=><Link href="/shop" className="kc-collection-card" key={item.name}><div className="kc-collection-image"><img src={item.image} alt={item.name}/><span>0{i+1}</span></div><div className="kc-collection-meta"><div><h3>{item.name}</h3><p>{item.note}</p></div><ArrowRight size={18}/></div></Link>)}</div></section>
    <section className="kc-custom" id="custom"><div className="kc-custom-image"><img src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1100&q=85" alt="Delicate jewellery details"/></div><div className="kc-custom-copy"><div className="kc-eyebrow">A PIECE THAT IS UNIQUELY YOURS</div><h2>Your colours.<br/><em>Your little story.</em></h2><p>Have a colour or design in mind? We welcome customisation requests. Tell us what you love and we'll help you explore the possibilities.</p><a href="https://wa.me/?text=Hello%20Kurinji%20Creations!%20I%20would%20love%20to%20discuss%20a%20custom%20jewellery%20piece." target="_blank" rel="noreferrer" className="kc-button">Discuss a custom piece <MessageCircle size={15}/></a></div></section>
    <section className="kc-quote"><Sparkles size={19}/><p>“The loveliest things are the ones that feel like they were made just for you.”</p><span>WITH LOVE, KURINJI CREATIONS</span></section>
    <footer className="kc-footer"><Link href="/" className="kc-wordmark">KURINJI<span>CREATIONS</span></Link><p>Little details. Lasting charm.</p><div><Link href="/shop">Shop jewellery</Link><a href="#story">Our story</a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Instagram size={15}/> Instagram</a></div><small>© 2026 KURINJI CREATIONS. MADE WITH CARE.</small></footer>
  </main>;
}
