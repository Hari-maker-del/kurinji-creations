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
    <section className="kc-hero kc-cinematic">
      <div className="kc-cinematic-slides" aria-hidden="true">
        <img className="kc-slide kc-slide-one" src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=2200&q=90" alt=""/>
        <img className="kc-slide kc-slide-two" src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=2200&q=90" alt=""/>
        <img className="kc-slide kc-slide-three" src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=2200&q=90" alt=""/>
      </div>
      <div className="kc-cinematic-content">
        <div className="kc-eyebrow"><span/> THE KURINJI EDIT · EST. 2026</div>
        <h1>Jewellery that<br/><em>feels like you.</em></h1>
        <p>Thoughtful little details. Soft, expressive colours. Pieces chosen to make your everyday moments feel a little more special.</p>
        <div className="kc-hero-actions"><Link href="/shop" className="kc-button">Discover the collection <ArrowRight size={16}/></Link><a href="#story" className="kc-text-link">A little about us</a></div>
        <div className="kc-cinematic-caption"><span>01 / 03</span><i/><span>THE ART OF EVERYDAY ELEGANCE</span></div>
      </div>
      <div className="kc-cinematic-side">KURINJI CREATIONS <span>✦</span> LITTLE DETAILS. LASTING CHARM.</div>
      <a href="#story" className="kc-scroll-cue"><span/> SCROLL TO DISCOVER</a>
    </section>
    <section className="kc-intro" id="story"><div className="kc-intro-mark">K.</div><div><div className="kc-eyebrow">A NOTE FROM KURINJI</div><h2>Not just an accessory.<br/><em>A little piece of you.</em></h2></div><p>We believe the smallest details can hold the loveliest stories. Discover jewellery for everyday moments, thoughtful gifting and the colours that feel most like you.</p></section>
    <section className="kc-collections" id="collections"><div className="kc-section-head"><div><div className="kc-eyebrow">FIND YOUR KIND OF LOVELY</div><h2>Explore the collections</h2></div><Link href="/shop" className="kc-text-link">VIEW ALL PIECES <ArrowRight size={14}/></Link></div><div className="kc-collection-grid">{collections.map((item,i)=><Link href="/shop" className="kc-collection-card" key={item.name}><div className="kc-collection-image"><img src={item.image} alt={item.name}/><span>0{i+1}</span></div><div className="kc-collection-meta"><div><h3>{item.name}</h3><p>{item.note}</p></div><ArrowRight size={18}/></div></Link>)}</div></section>
    <section className="kc-custom" id="custom"><div className="kc-custom-image"><img src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1100&q=85" alt="Delicate jewellery details"/></div><div className="kc-custom-copy"><div className="kc-eyebrow">A PIECE THAT IS UNIQUELY YOURS</div><h2>Your colours.<br/><em>Your little story.</em></h2><p>Have a colour or design in mind? We welcome customisation requests. Tell us what you love and we'll help you explore the possibilities.</p><a href="https://wa.me/?text=Hello%20Kurinji%20Creations!%20I%20would%20love%20to%20discuss%20a%20custom%20jewellery%20piece." target="_blank" rel="noreferrer" className="kc-button">Discuss a custom piece <MessageCircle size={15}/></a></div></section>
    <section className="kc-process">
      <div className="kc-process-heading"><div className="kc-eyebrow">A LITTLE MORE PERSONAL</div><h2>Your piece, your way.</h2><p>Looking for a colour or detail that feels more like you? Start a conversation with us.</p></div>
      <div className="kc-process-steps">
        <article><span>01</span><h3>Find your favourite</h3><p>Explore the collection and choose a piece that catches your eye.</p></article>
        <article><span>02</span><h3>Share your idea</h3><p>Tell us your preferred colours, charms or design details.</p></article>
        <article><span>03</span><h3>Let's discuss it</h3><p>We'll connect with you to discuss the request and available options.</p></article>
      </div>
      <Link href="/shop" className="kc-process-link">EXPLORE THE COLLECTION <ArrowRight size={14}/></Link>
    </section>
    <section className="kc-quote"><Sparkles size={19}/><p>“The loveliest things are the ones that feel like they were made just for you.”</p><span>WITH LOVE, KURINJI CREATIONS</span></section>
    <footer className="kc-footer"><Link href="/" className="kc-wordmark">KURINJI<span>CREATIONS</span></Link><p>Little details. Lasting charm.</p><div><Link href="/shop">Shop jewellery</Link><a href="#story">Our story</a><a href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Instagram size={15}/> Instagram</a></div><small>© 2026 KURINJI CREATIONS. MADE WITH CARE.</small></footer>
  </main>;
}
