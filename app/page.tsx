"use client";

import { useRef, useState } from "react";

const assetBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const links = {
  spotify: "https://open.spotify.com/artist/6TgHkrX7BoeIIpLlNrOKDK",
  instagram: "https://www.instagram.com/maicon_leoni/",
  facebook: "https://www.facebook.com/maicon.leoni.77/",
  youtube: "https://www.youtube.com/@maicon_leoni",
  youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI",
  deezer: "https://www.deezer.com/search/MAICON%20LEONI/artist",
};

const platformIcons = {
  spotify: "https://cdn.simpleicons.org/spotify/1ED760",
  youtube: "https://cdn.simpleicons.org/youtube/FF0000",
  youtubeMusic: "https://cdn.simpleicons.org/youtubemusic/FF0000",
  deezer: "https://cdn.simpleicons.org/deezer/A238FF",
  instagram: "https://cdn.simpleicons.org/instagram/FFFFFF",
  facebook: "https://cdn.simpleicons.org/facebook/0866FF",
};

const releases = [
  {
    title: "Tua Mão Sobre a Casa",
    type: "Faixa do EP Tu Permaneces Deus • Gospel",
    year: "2026",
    href: "https://open.spotify.com/track/4chg24X8hJipWWpaYYeLux",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20Tua%20M%C3%A3o%20Sobre%20a%20Casa",
    cover: "https://i.scdn.co/image/ab67616d0000e1a357887fe25a43bace6a1d637a",
    featured: true,
  },
  {
    title: "Lamento de Israel - Hebraico/ Portugues",
    type: "Single • Adoração",
    year: "2026",
    href: "https://open.spotify.com/album/5s6kl5T8eF2B9U9AtrcrnA",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20Lamento%20de%20Israel%20Hebraico%20Portugu%C3%AAs",
    cover: "https://i.scdn.co/image/ab67616d0000e1a3532853cccfe444cb56ffecb6",
  },
  {
    title: "Até a Cadeia Cantar",
    type: "Single • Gospel",
    year: "2026",
    href: "https://open.spotify.com/album/5ph8IUXTYP03gWuVoC22F4",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20At%C3%A9%20a%20Cadeia%20Cantar",
    cover: "https://i.scdn.co/image/ab67616d0000b273717c9d5be9d1cc98e0e3e7ea",
  },
  {
    title: "Armadura de Deus",
    type: "Single • Gospel",
    year: "2026",
    href: "https://open.spotify.com/album/41YBBRm4TQi9Msfjf37q1u",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20Armadura%20de%20Deus",
    cover: "https://i.scdn.co/image/ab67616d0000b273122d3266c4a353d6e679e95c",
  },
  {
    title: "Não Me Solta Jesus",
    type: "Single • Adoração",
    year: "2026",
    href: "https://open.spotify.com/album/0CjV5xrOltEWrKVtEYv3ny",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20N%C3%A3o%20Me%20Solta%20Jesus",
    cover: "https://i.scdn.co/image/ab67616d0000b2737933e20eff5fe41cfcbdca45",
  },
  {
    title: "Sabor Atleta",
    type: "Single • Personalizada",
    year: "2026",
    href: "https://open.spotify.com/album/0mMY1TJ1VVairUoPLpulpx",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20Sabor%20Atleta",
    cover: "https://i.scdn.co/image/ab67616d0000b273082ea4c372fca8d561dd6b4f",
  },
  {
    title: "Voz Que Cura, Não Que Fere",
    type: "Single • Reflexiva",
    year: "2026",
    href: "https://open.spotify.com/album/1L6J9DAK0b8PLRSzDTZ9Nq",
    youtubeMusic: "https://music.youtube.com/search?q=MAICON%20LEONI%20Voz%20Que%20Cura%20N%C3%A3o%20Que%20Fere",
    cover: "https://i.scdn.co/image/ab67616d0000b273c04209e8864f9f1d3950cfb1",
  },
];

const platforms = [
  { name: "Spotify", note: "Perfil oficial", href: links.spotify, icon: platformIcons.spotify, tone: "spotify" },
  { name: "YouTube", note: "Vídeos e novidades", href: links.youtube, icon: platformIcons.youtube, tone: "youtube" },
  { name: "YouTube Music", note: "Ouça as canções", href: links.youtubeMusic, icon: platformIcons.youtubeMusic, tone: "youtubeMusic" },
  { name: "Deezer", note: "Discografia", href: links.deezer, icon: platformIcons.deezer, tone: "deezer" },
  { name: "Instagram", note: "@maicon_leoni", href: links.instagram, icon: platformIcons.instagram, tone: "instagram" },
  { name: "Facebook", note: "Página oficial", href: links.facebook, icon: platformIcons.facebook, tone: "facebook" },
];

function BrandLockup({ className }: { className: string }) {
  return (
    <span className={`brandLockup ${className}`} aria-label="Maicon Leoni — Criação e Produção Musical">
      <img src={`${assetBasePath}/maicon-leoni-logo-horizontal.png`} alt="" />
    </span>
  );
}

function Logo() {
  return <BrandLockup className="logo" />;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  function moveCarousel(direction: number) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollLeft += direction * Math.min(carousel.clientWidth * 0.82, 820);
  }

  async function shareSite() {
    const data = {
      title: "Maicon Leoni — Produtor Musical",
      text: "Conheça as músicas e os lançamentos de Maicon Leoni.",
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copiado!");
  }

  return (
    <main>
      <header className="siteHeader">
        <a href="#inicio" className="brand"><Logo /></a>
        <button
          className="menuButton"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Abrir menu"
        >
          <i /><i />
        </button>
        <nav className={menuOpen ? "open" : ""}>
          <a href="#lancamentos" onClick={() => setMenuOpen(false)}>Lançamentos</a>
          <a href="#sobre" onClick={() => setMenuOpen(false)}>Sobre</a>
          <a href="#plataformas" onClick={() => setMenuOpen(false)}>Plataformas</a>
          <a className="headerCta" href={links.instagram} target="_blank" rel="noreferrer">Contato ↗</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="heroCopy">
          <p className="kicker"><span /> PRODUTOR MUSICAL • CRIADOR</p>
          <BrandLockup className="heroLogo" />
          <div className="aiCreator" aria-label="Criador de músicas com inteligência artificial">
            <span className="aiCreatorMark" aria-hidden="true">✦</span>
            <span>CRIADOR DE MÚSICAS COM I.A.</span>
          </div>
          <p className="heroLead">Músicas gospel e personalizadas que transformam fé, histórias e sentimentos em canções com propósito.</p>
          <div className="heroActions">
            <a className="buttonPrimary" href={links.spotify} target="_blank" rel="noreferrer"><b>▶</b> Ouvir agora</a>
            <a className="buttonGhost" href="#lancamentos">Ver lançamentos <span>↓</span></a>
          </div>
          <div className="heroMeta">
            <span><b>Gospel</b><small>Canções de fé</small></span>
            <span><b>Personalizadas</b><small>Histórias únicas</small></span>
            <span><b>Produção autoral</b><small>Identidade e propósito</small></span>
          </div>
        </div>

        <div className="heroPortrait">
          <div className="portraitFrame">
            <img
              src="https://i.scdn.co/image/ab6761610000e5eb3e2a727a18958ffd636196a1"
              alt="Maicon Leoni, produtor musical"
            />
          </div>
          <div className="verticalWord">MÚSICA • FÉ • HISTÓRIAS</div>
          <BrandLockup className="heroSeal" />
        </div>
      </section>

      <div className="ticker" aria-hidden="true">
        <div>GOSPEL <i>✦</i> MÚSICAS PERSONALIZADAS <i>✦</i> NOVOS LANÇAMENTOS <i>✦</i> FÉ QUE SE TRANSFORMA EM SOM <i>✦</i></div>
      </div>

      <section className="section latest" id="lancamentos">
        <div className="sectionTop">
          <div><p className="kicker"><span /> EM DESTAQUE</p><h2>Último<br /><em>lançamento.</em></h2></div>
          <p>Uma oração cantada sobre consagrar o lar a Deus e confiar no cuidado da Sua mão sobre toda a família.</p>
        </div>
        <article className="featuredRelease">
          <a className="featuredCover" href={releases[0].href} target="_blank" rel="noreferrer">
            <img src={releases[0].cover} alt="Capa de Tua Mão Sobre a Casa" />
            <span className="coverPlay">▶</span>
          </a>
          <div className="featuredInfo">
            <span className="releaseIndex">01 / NOVO LANÇAMENTO</span>
            <h3>Tua Mão<br />Sobre a Casa</h3>
            <p>Uma canção de fé, proteção e entrega para declarar que o lar e a família permanecem debaixo do cuidado de Deus.</p>
            <div className="releaseCredits"><span><small>ARTISTA</small>Maicon Leoni</span><span><small>GÊNERO</small>Gospel</span><span><small>ANO</small>2026</span></div>
            <div className="featuredListen">
              <a className="textButton spotifyButton" href={releases[0].href} target="_blank" rel="noreferrer"><img src={platformIcons.spotify} alt="" /> SPOTIFY <span>↗</span></a>
              <a className="textButton youtubeButton" href={releases[0].youtubeMusic} target="_blank" rel="noreferrer"><img src={platformIcons.youtubeMusic} alt="" /> YOUTUBE MUSIC <span>↗</span></a>
            </div>
          </div>
        </article>

        <div className="catalogHeader">
          <div><p className="kicker"><span /> RECÉM-LANÇADAS</p><h3>Mais lançamentos</h3></div>
          <div className="carouselControls">
            <button onClick={() => moveCarousel(-1)} aria-label="Ver músicas anteriores">←</button>
            <button onClick={() => moveCarousel(1)} aria-label="Ver próximas músicas">→</button>
          </div>
        </div>
        <div className="carouselViewport" ref={carouselRef} aria-label="Carrossel de músicas recentemente lançadas">
          <div className="releaseTrack">
          {releases.slice(1).map((release, index) => (
            <article className="releaseCard" key={release.title}>
              <a className="releaseImage" href={release.href} target="_blank" rel="noreferrer" aria-label={`Ouvir ${release.title} no Spotify`}><img src={release.cover} alt={`Capa de ${release.title}`} /><span>▶</span></a>
              <div className="releaseCardMeta"><small>0{index + 2}</small><div><h4>{release.title}</h4><p>{release.type} • {release.year}</p></div></div>
              <div className="cardListen">
                <a href={release.href} target="_blank" rel="noreferrer"><b><img src={platformIcons.spotify} alt="" /></b> Spotify</a>
                <a href={release.youtubeMusic} target="_blank" rel="noreferrer"><b><img src={platformIcons.youtubeMusic} alt="" /></b> YouTube Music</a>
              </div>
            </article>
          ))}
          </div>
        </div>
        <a className="discographyLink" href={links.spotify} target="_blank" rel="noreferrer">Ver discografia completa no Spotify ↗</a>
      </section>

      <section className="services" id="sobre">
        <div className="servicesIntro">
          <p className="kicker"><span /> MAIS QUE UMA CANÇÃO</p>
          <h2>Sua história.<br /><em>Sua música.</em></h2>
          <p>Além dos lançamentos gospel, Maicon Leoni cria músicas personalizadas para pessoas, famílias, igrejas, eventos e marcas. Cada projeto nasce de uma história real e ganha letra, sentimento e identidade.</p>
          <a className="buttonLight" href={links.instagram} target="_blank" rel="noreferrer">Falar sobre meu projeto <span>↗</span></a>
        </div>
        <div className="serviceList">
          <article><span>01</span><div><h3>Música gospel</h3><p>Canções de adoração, reflexão e fé com mensagens fundamentadas em propósito cristão.</p></div></article>
          <article><span>02</span><div><h3>Música personalizada</h3><p>Histórias, homenagens e momentos especiais transformados em uma canção exclusiva.</p></div></article>
          <article><span>03</span><div><h3>Identidade para projetos</h3><p>Criações musicais para igrejas, ministérios, eventos, empresas e campanhas.</p></div></article>
        </div>
      </section>

      <section className="about">
        <div className="aboutNumber">ML</div>
        <div className="aboutCopy">
          <p className="kicker"><span /> SOBRE O PRODUTOR</p>
          <h2>Fé, emoção e<br />verdade em cada <em>nota.</em></h2>
          <p>Maicon Leoni é produtor e criador musical. Seu trabalho une sensibilidade, mensagem e direção artística para criar canções que se conectam com pessoas — seja em um lançamento gospel ou em uma música feita para eternizar uma história.</p>
          <div className="signature">MAICON LEONI <small>PRODUTOR MUSICAL</small></div>
        </div>
      </section>

      <section className="platforms section" id="plataformas">
        <div className="sectionTop compact">
          <div><p className="kicker"><span /> CONECTE-SE</p><h2>Ouça. Siga.<br /><em>Compartilhe.</em></h2></div>
          <p>Acompanhe os lançamentos e conteúdos nos canais oficiais de Maicon Leoni.</p>
        </div>
        <div className="platformGrid">
          {platforms.map((platform) => (
            <a href={platform.href} target="_blank" rel="noreferrer" key={platform.name}>
              <b className={platform.tone}><img src={platform.icon} alt="" /></b><span><strong>{platform.name}</strong><small>{platform.note}</small></span><i>↗</i>
            </a>
          ))}
        </div>
      </section>

      <section className="finalCta">
        <p>UMA HISTÓRIA PODE VIRAR CANÇÃO</p>
        <h2>Vamos criar algo<br /><em>que permaneça?</em></h2>
        <div><a href={links.instagram} target="_blank" rel="noreferrer">INICIAR UM PROJETO <span>↗</span></a><button onClick={shareSite}>COMPARTILHAR O SITE <span>↗</span></button></div>
      </section>

      <aside className={`floatingPlayer ${playerExpanded ? "expanded" : "collapsed"}`} aria-label="Player do último lançamento">
        <div className="floatingPlayerBar">
          <div>
            <small>TOCANDO AGORA</small>
            <strong>Tua Mão Sobre a Casa</strong>
          </div>
          <button
            type="button"
            onClick={() => setPlayerExpanded(!playerExpanded)}
            aria-expanded={playerExpanded}
            aria-label={playerExpanded ? "Recolher player" : "Abrir player"}
          >
            {playerExpanded ? "−" : "▶"}
          </button>
        </div>
        <div className="floatingPlayerEmbed" aria-hidden={!playerExpanded}>
          <iframe
            title="Ouvir Tua Mão Sobre a Casa no Spotify"
            src="https://open.spotify.com/embed/track/4chg24X8hJipWWpaYYeLux?utm_source=generator&theme=0"
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      </aside>

      <footer>
        <Logo />
        <p>© 2026 Maicon Leoni. Música gospel e personalizada.</p>
        <div><a href={links.instagram} target="_blank" rel="noreferrer">Instagram</a><a href={links.youtube} target="_blank" rel="noreferrer">YouTube</a><a href={links.spotify} target="_blank" rel="noreferrer">Spotify</a></div>
      </footer>
    </main>
  );
}
