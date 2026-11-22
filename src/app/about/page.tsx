import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="kc-landing kc-about-page">
      <div className="kc-topline">THOUGHTFULLY CHOSEN <span>✦</span> BEAUTIFULLY YOURS <span>✦</span> MADE FOR YOUR MOMENTS</div>
      <header className="kc-header">
        <Link href="/" className="kc-wordmark kc-logo-link" aria-label="Kurinji Creations home"><img src="/brand/IMG-20261119-WA0000.jpg.jpeg" alt="Kurinji Creations" /></Link>
        <nav aria-label="Main navigation">
          <Link href="/">HOME</Link><Link href="/about" aria-current="page">ABOUT US</Link><Link href="/shop">STORE</Link>
        </nav>
        <Link href="/shop" className="kc-header-cta">VISIT THE STORE <span>↗</span></Link>
      </header>
      <section className="kc-about-hero">
        <div className="kc-eyebrow"><span /> OUR STORY</div>
        <h1>A little more than<br /><em>just jewellery.</em></h1>
        <p>Kurinji Creations is built around a simple feeling: the things we wear can hold meaning, express personality and make ordinary moments feel special.</p>
        <img src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1800&q=90" alt="Jewellery details from Kurinji Creations' visual collection" />
      </section>
      <section className="kc-about-story">
        <div className="kc-eyebrow"><span /> THE HEART OF KURINJI</div>
        <h2>Celebrating the beauty of <em>individuality.</em></h2>
        <p>We believe personal style does not need to be loud. Sometimes it is a delicate detail, a favourite colour, or a piece chosen for a reason only you know. That is the feeling we want Kurinji Creations to stand for.</p>
        <p>Our aim is to make discovering jewellery feel warm and simple, while leaving room for your own ideas. If you have a colour preference or a design in mind, you can share a customisation request when placing an order for an eligible piece.</p>
      </section>
      <section className="kc-about-promise">
        <article><span>01</span><h3>Thoughtful details</h3><p>Pieces selected with an appreciation for the small things that make a difference.</p></article>
        <article><span>02</span><h3>Your individuality</h3><p>A welcoming space for personal preferences and customisation ideas.</p></article>
        <article><span>03</span><h3>A warm experience</h3><p>A simple journey from discovering a piece to making it part of your story.</p></article>
      </section>
      <section className="kc-about-contact" id="contact">
        <div className="kc-eyebrow"><span /> COME SAY HELLO</div>
        <h2>We would love to hear <em>from you.</em></h2>
        <p>Have a question about an order or an idea for a personalised piece? Visit our store to explore the collections and find the available ways to get in touch.</p>
        <a href="https://wa.me/919345858353?text=Hello%20Kurinji%20Creations!%20I%20have%20a%20question." target="_blank" rel="noreferrer" className="kc-button">CHAT ON WHATSAPP <span>↗</span></a>
        <Link href="/shop" className="kc-text-link">VISIT KURINJI STORE <span>↗</span></Link>
      </section>
      <footer className="kc-footer">
        <Link href="/" className="kc-wordmark kc-logo-link" aria-label="Kurinji Creations home"><img src="/brand/IMG-20261119-WA0000.jpg.jpeg" alt="Kurinji Creations" /></Link>
        <p>Little details. Lasting charm.</p>
        <div><Link href="/">HOME</Link><Link href="/shop">VISIT STORE</Link><Link href="/about">ABOUT US</Link></div>
        <small>© {new Date().getFullYear()} KURINJI CREATIONS · MADE WITH LOVE</small>
      </footer>
    </main>
  );
}
