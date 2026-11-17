"use client";

import Link from "next/link";

const collections = [
  { name: "Necklaces", note: "Delicate pieces, made to be treasured", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=85" },
  { name: "Earrings", note: "A little detail. A lasting impression.", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85" },
  { name: "Bracelets", note: "Subtle accents for every day", image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=85" },
];

export default function Home() {
  return (
    <main className="kc-landing">
      <div className="kc-topline">THOUGHTFULLY CHOSEN · BEAUTIFULLY YOURS <span>✦</span> MADE FOR YOUR MOMENTS</div>
      <header className="kc-header">
        <Link href="/" className="kc-wordmark">KURINJI CREATIONS<span>JEWELLERY &amp; MORE</span></Link>
        <nav>
          <a href="#collections">COLLECTIONS</a>
          <a href="#story">OUR STORY</a>
          <a href="#custom">CUSTOMISE</a>
        </nav>
        <Link href="/shop" className="kc-header-cta">EXPLORE THE SHOP <span>↗</span></Link>
      </header>

      <section className="kc-hero kc-cinematic">
        <div className="kc-cinematic-slides" aria-hidden="true">
          <img className="kc-slide kc-slide-one" src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=2200&q=90" alt="" />
          <img className="kc-slide kc-slide-two" src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=2200&q=90" alt="" />
          <img className="kc-slide kc-slide-three" src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=2200&q=90" alt="" />
        </div>
        <div className="kc-cinematic-content">
          <div className="kc-eyebrow"><span /> THE ART OF EVERYDAY ELEGANCE</div>
          <h1>Little details.<br /><em>Lasting charm.</em></h1>
          <p>Jewellery that feels like you. Discover thoughtfully selected pieces and personal touches made to celebrate your style.</p>
          <div className="kc-hero-actions">
            <Link href="/shop" className="kc-button">DISCOVER THE COLLECTION <span>↗</span></Link>
            <a href="#story" className="kc-text-link">A LITTLE ABOUT US <span>→</span></a>
          </div>
          <div className="kc-cinematic-caption"><i /> PIECES TO LOVE, MOMENTS TO KEEP</div>
        </div>
        <div className="kc-cinematic-side">KURINJI CREATIONS <span>✦</span> MADE WITH YOU IN MIND</div>
        <a className="kc-scroll-cue" href="#collections"><span /> SCROLL TO DISCOVER</a>
      </section>

      <section className="kc-intro" id="story">
        <div className="kc-intro-mark">K</div>
        <div><div className="kc-eyebrow"><span /> OUR LITTLE WORLD</div><h2>Beauty in the <em>details.</em></h2></div>
        <p>At Kurinji Creations, we believe the smallest details can make you feel most like yourself. Explore pieces chosen with care, made to complement your everyday and your special moments.</p>
      </section>

      <section className="kc-collections" id="collections">
        <div className="kc-section-head">
          <div><div className="kc-eyebrow"><span /> FIND YOUR FAVOURITE</div><h2>Explore our collections</h2></div>
          <Link href="/shop" className="kc-text-link">VIEW ALL PIECES <span>↗</span></Link>
        </div>
        <div className="kc-collection-grid">
          {collections.map((item) => <Link href={`/shop?category=${encodeURIComponent(item.name)}`} className="kc-collection-card" key={item.name}>
            <div className="kc-collection-image"><img src={item.image} alt={item.name} loading="lazy" /><span>THE COLLECTION</span></div>
            <div className="kc-collection-meta"><div><h3>{item.name}</h3><p>{item.note}</p></div><span>↗</span></div>
          </Link>)}
        </div>
      </section>

      <section className="kc-custom" id="custom">
        <div className="kc-custom-image"><img src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85" alt="Delicate jewellery details" loading="lazy" /></div>
        <div className="kc-custom-copy">
          <div className="kc-eyebrow"><span /> MADE A LITTLE MORE YOU</div>
          <h2>Your style.<br /><em>Your colours.</em><br />Your creation.</h2>
          <p>Have a colour in mind or a design you have been dreaming of? Tell us what you love and let us create something that feels uniquely yours.</p>
          <Link href="/shop?category=Custom%20Jewellery" className="kc-button">DISCOVER CUSTOM PIECES <span>↗</span></Link>
        </div>
      </section>

      <section className="kc-quote">
        <div className="kc-eyebrow" style={{ justifyContent: "center" }}>A NOTE FROM KURINJI</div>
        <p>“The loveliest things are often found in the little details.”</p>
        <span>WITH LOVE · KURINJI CREATIONS</span>
      </section>

      <section className="kc-process">
        <div className="kc-process-heading">
          <div className="kc-eyebrow"><span /> A THOUGHTFUL EXPERIENCE</div>
          <h2>From our hands to yours.</h2>
          <p>Finding something you love should feel just as lovely as wearing it.</p>
        </div>
        <div className="kc-process-steps">
          <article><span>01</span><h3>Discover</h3><p>Explore pieces selected to bring a little beauty to your everyday.</p></article>
          <article><span>02</span><h3>Make it yours</h3><p>Choose your favourite or share your ideas for a personal creation.</p></article>
          <article><span>03</span><h3>Love every detail</h3><p>We prepare your order with care, ready for its new home.</p></article>
        </div>
        <Link href="/shop" className="kc-process-link">FIND YOUR PIECE <span>↗</span></Link>
      </section>

      <footer className="kc-footer">
        <Link href="/" className="kc-wordmark">KURINJI CREATIONS<span>JEWELLERY &amp; MORE</span></Link>
        <p>Little details. Lasting charm.</p>
        <div><Link href="/shop">SHOP</Link><a href="#collections">COLLECTIONS</a><a href="#custom">CUSTOMISE</a></div>
        <small>© {new Date().getFullYear()} KURINJI CREATIONS · MADE WITH LOVE</small>
      </footer>
    </main>
  );
}
