import Link from "next/link";

const logo = "/brand/IMG-20261119-WA0000.jpg.jpeg";

export default function Home() {
  return (
    <main className="kc-landing">
      <div className="kc-topline">THOUGHTFULLY CHOSEN <span>✦</span> BEAUTIFULLY YOURS <span>✦</span> MADE FOR YOUR MOMENTS</div>
      <header className="kc-header">
        <Link href="/" className="kc-logo-link kc-master-logo" aria-label="Kurinji Creations home"><img src={logo} alt="Kurinji Creations — Handcrafted Jewellery" /></Link>
        <nav aria-label="Main navigation"><Link href="/about">OUR STORY</Link><a href="#custom">CUSTOM JEWELLERY</a><a href="#craft">CRAFTSMANSHIP</a><Link href="/about#contact">CONTACT</Link><Link href="/account">MY ACCOUNT</Link></nav>
        <Link href="/shop" className="kc-header-cta">VISIT THE STORE <span>↗</span></Link>
      </header>

      <section className="kc-brand-hero">
        <div className="kc-brand-hero-copy">
          <div className="kc-eyebrow"><span/> WELCOME TO KURINJI CREATIONS</div>
          <h1>Little details.<br/><em>Lasting meaning.</em></h1>
          <p>Jewellery is more than an accessory. It is a little expression of who you are, a memory you carry, and a detail that makes a moment yours.</p>
          <div className="kc-hero-actions"><Link href="/shop" className="kc-button">VISIT OUR STORE <span>↗</span></Link><Link href="/about" className="kc-text-link">DISCOVER OUR STORY <span>→</span></Link></div>
          <div className="kc-brand-hero-foot"><span>DESIGNED TO FEEL PERSONAL</span><span>KURINJI CREATIONS · EST. WITH CARE</span></div>
        </div>
        <div className="kc-brand-hero-image"><img src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1600&q=90" alt="Elegant jewellery styled in warm natural light"/><div className="kc-image-note"><span>✦</span><div>MADE TO FEEL<br/>PERSONAL</div></div></div>
      </section>

      <section className="kc-brand-intro" id="belief">
        <div className="kc-brand-intro-symbol">✦</div>
        <div className="kc-eyebrow"><span/> THE HEART OF KURINJI</div>
        <h2>Not just jewellery.<br/><em>A little piece of you.</em></h2>
        <p>We believe the most meaningful details are the ones that feel personal. Kurinji Creations celebrates individuality, thoughtful design and the joy of finding — or creating — a piece that feels truly yours.</p>
        <Link href="/about" className="kc-text-link">GET TO KNOW US <span>↗</span></Link>
      </section>

      <section className="kc-custom" id="custom">
        <div className="kc-custom-image"><img src="https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1400&q=90" alt="Delicate handcrafted jewellery details" loading="lazy"/></div>
        <div className="kc-custom-copy"><div className="kc-eyebrow"><span/> YOUR IDEA, YOUR DETAILS</div><h2>Made personal.<br/><em>Made for you.</em></h2><p>A favourite colour, a thoughtful detail or an idea you have been saving. Tell us what you imagine and let’s explore a custom creation together.</p><ul><li>Share your preferred colours</li><li>Tell us about your design idea</li><li>Send a reference photo for inspiration</li></ul><Link href="/about#contact" className="kc-button">DISCUSS A CUSTOM ORDER <span>↗</span></Link></div>
      </section>

      <section className="kc-craft" id="craft">
        <div className="kc-craft-copy"><div className="kc-eyebrow"><span/> THE ART OF THE LITTLE DETAILS</div><h2>Thoughtfully finished.<br/><em>Meant to be treasured.</em></h2><p>Every detail contributes to how a piece looks, feels and becomes part of your story. We care about the finishing touches that make jewellery feel considered and special.</p><Link href="/shop" className="kc-text-link">EXPLORE THE STORE <span>↗</span></Link></div>
        <div className="kc-craft-image"><img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1400&q=90" alt="Close-up jewellery craftsmanship and finishing" loading="lazy"/></div>
      </section>

      <section className="kc-love">
        <div className="kc-love-image"><img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=90" alt="Jewellery chosen for a meaningful moment" loading="lazy"/></div>
        <div className="kc-love-copy"><div className="kc-eyebrow"><span/> WORN, GIFTED, REMEMBERED</div><h2>Your moments<br/><em>make our story.</em></h2><p>The most beautiful part of what we do is knowing a piece becomes part of someone’s everyday or a moment worth celebrating. Have a Kurinji piece you love? We would be delighted to see how you wear it.</p><a className="kc-text-link" href="https://wa.me/919345858353?text=Hello%20Kurinji%20Creations!%20I%20would%20love%20to%20share%20my%20jewellery%20photo." target="_blank" rel="noreferrer">SHARE YOUR KURINJI MOMENT <span>↗</span></a></div>
      </section>

      <section className="kc-brand-visit"><div className="kc-eyebrow"><span/> A LITTLE SOMETHING TO TREASURE</div><h2>Find the detail<br/><em>that feels like you.</em></h2><p>Discover the Kurinji Creations collection and choose something meaningful.</p><Link href="/shop" className="kc-button">VISIT THE STORE <span>↗</span></Link></section>

      <footer className="kc-footer">
        <Link href="/" className="kc-logo-link kc-master-logo kc-footer-master-logo" aria-label="Kurinji Creations home"><img src={logo} alt="Kurinji Creations — Handcrafted Jewellery"/></Link>
        <p>Little details. Lasting charm.</p>
        <div><Link href="/about">OUR STORY</Link><Link href="/shop">VISIT STORE</Link><Link href="/about#contact">CONTACT</Link><Link href="/account">MY ACCOUNT</Link><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">INSTAGRAM</a><a href="https://wa.me/919345858353" target="_blank" rel="noreferrer">WHATSAPP</a></div>
        <small>© {new Date().getFullYear()} KURINJI CREATIONS · HANDCRAFTED JEWELLERY</small>
      </footer>
    </main>
  );
}
