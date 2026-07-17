import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createShipmentInSupabase,
  createShipmentEventInSupabase,
  deleteShipmentFromSupabase,
  fetchShipmentByTrackingNumber,
  fetchShipmentsFromSupabase,
  getAdminSession,
  onAdminAuthChange,
  signInAdmin,
  signOutAdmin,
  supabaseEnabled,
  updateShipmentEventInSupabase,
  updateShipmentInSupabase
} from './supabaseClient';
import './styles.css';

const pageMap = {
  home: 'home',
  tracking: 'tracking',
  quote: 'quote',
  ship: 'ship',
  account: 'account',
  security: 'security',
  minerals: 'minerals',
  business: 'business',
  portals: 'portals',
  service: 'service'
};

const navItems = [
  ['Track', 'tracking'],
  ['Ship', 'ship'],
  ['Solutions', 'business'],
  ['Security', 'security'],
  ['Precious Minerals', 'minerals'],
  ['Customer Service', 'service']
];

const actionCards = [
  ['Ship Now', 'Book a shipment with the right service', 'ship'],
  ['Get a Quote', 'Estimate cost to share and compare', 'quote'],
  ['Request a Business Account', 'Shipping regularly or frequently?', 'account']
];

const onlineSecurityGuardImage = 'https://static.wixstatic.com/media/3c4599_c659c98c3bcd48e6b346e29b00a81366~mv2.png/v1/fill/w_980%2Ch_980%2Cal_c%2Cq_90%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/Warehouse%20Security.png';

const sectors = [
  {
    title: 'Document and Parcel Shipping',
    audience: 'For All Shippers',
    image: '/assets/op-parcel.png',
    copy: 'Express domestic and international delivery for documents, parcels, samples, and time-sensitive orders.',
    features: ['Next possible business day', 'Flexible import/export options', 'Tailored business solutions', 'Wide variety of optional services'],
    link: 'ship'
  },
  {
    title: 'Security Logistics',
    audience: 'Controlled Shipments',
    image: onlineSecurityGuardImage,
    copy: 'Protected movement for restricted, sensitive, and regulated shipments with control-tower oversight.',
    features: ['Route risk review', 'Tamper-evident handling', 'Escorted transfers', 'Exception response'],
    link: 'security'
  },
  {
    title: 'Precious Minerals Logistics',
    audience: 'High Value',
    image: '/assets/op-security-minerals.png',
    copy: 'Specialist custody for gold, diamonds, rare metals, samples, and exchange-grade commodities.',
    features: ['Armored collections', 'Vault-to-vault transfers', 'Chain-of-custody records', 'Insured lanes'],
    link: 'minerals'
  },
  {
    title: 'Cargo Shipping',
    audience: 'Business Only',
    image: '/assets/op-cargo.png',
    copy: 'Air, ocean, road, and rail freight options with customs, warehousing, and forwarding expertise.',
    features: ['Air freight', 'Road freight', 'Ocean freight', 'Rail freight'],
    link: 'business'
  }
];

const portalLinks = ['Ocean Peak Ship+', 'Commerce Freight Desk', 'Secure Control Tower', 'VaultLink', 'MySupplyChain', 'LifeTrack'];

const supportCards = [
  {
    title: 'Track a Shipment',
    copy: 'Check delivery status, route movement, custody scans, and estimated arrival for one or more tracking numbers.',
    action: 'Open Tracking',
    href: 'tracking'
  },
  {
    title: 'Start a Claim',
    copy: 'Report a missing, delayed, damaged, or exception shipment and attach the reference details your support team needs.',
    action: 'Start Claim',
    href: 'service'
  },
  {
    title: 'Customs Support',
    copy: 'Get help with commercial invoices, tariff questions, restricted goods paperwork, and import or export holds.',
    action: 'Get Customs Help',
    href: 'quote'
  },
  {
    title: 'Business Account',
    copy: 'Request account setup, billing support, shipping permissions, rate review, or recurring pickup assistance.',
    action: 'Request Account Help',
    href: 'account'
  },
  {
    title: 'Security Logistics Desk',
    copy: 'Reach specialists for restricted shipments, sealed handling, controlled-route exceptions, and custody verification.',
    action: 'Contact Security Desk',
    href: 'security'
  },
  {
    title: 'Precious Minerals Support',
    copy: 'Coordinate vault appointments, armored collection, assay samples, insured lanes, and high-value documentation.',
    action: 'Contact Minerals Desk',
    href: 'minerals'
  },
  {
    title: 'Report Fraud',
    copy: 'Tell us about suspicious messages, payment requests, fake tracking notices, or sites misusing the brand.',
    action: 'Report Fraud',
    href: 'service'
  },
  {
    title: 'Find a Service Point',
    copy: 'Locate drop-off, pickup, document handling, and account service locations near your shipment route.',
    action: 'Find Locations',
    href: 'service'
  }
];

async function loadShipmentsFromSupabase() {
  const remoteShipments = await fetchShipmentsFromSupabase();
  return remoteShipments.map(hydrateShipment);
}

function routeFromHash() {
  const raw = window.location.hash.replace('#/', '') || 'home';
  return raw.split('?')[0];
}

function makeTrackingNumber() {
  return `OPL-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function currentDateInput() {
  return toDateInputValue(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
}

function currentTimeInput() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toDateInputValue(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value} 00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEta(value) {
  if (!value) return 'Pending';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(`${value} 00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTrackingDate(value, weekday = true) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    weekday: weekday ? 'long' : undefined,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function normalizePiece(value) {
  const raw = String(value || '1').trim();
  return raw.toLowerCase().includes('piece') ? raw : `${raw || '1'} Piece`;
}

function parseHistoryTime(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: '', time: '' };
  }
  return {
    date: toDateInputValue(parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })),
    time: parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  };
}

function sortScans(scans) {
  return [...scans].sort((a, b) => (
    `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`) ||
    (b.sortOrder || 0) - (a.sortOrder || 0)
  ));
}

function getShipmentScans(shipment) {
  if (Array.isArray(shipment.scans) && shipment.scans.length) {
    return sortScans(shipment.scans);
  }

  return sortScans([...(shipment.history || [])].reverse().map((item) => {
    const parsed = parseHistoryTime(item.time);
    return {
      date: parsed.date,
      time: parsed.time,
      description: item.status,
      location: item.place,
      piece: normalizePiece(shipment.pieceCount)
    };
  }));
}

function hydrateShipment(shipment) {
  return {
    ...shipment,
    signedBy: shipment.signedBy || '',
    originServiceArea: shipment.originServiceArea || shipment.origin || '',
    destinationServiceArea: shipment.destinationServiceArea || shipment.destination || '',
    pieceCount: shipment.pieceCount || '1',
    scans: getShipmentScans(shipment)
  };
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [shipments, setShipments] = useState([]);
  const [dataError, setDataError] = useState(supabaseEnabled ? '' : 'Service temporarily unavailable. Error code: OP-503.');
  const [loadingShipments, setLoadingShipments] = useState(supabaseEnabled);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  useEffect(() => {
    if (!supabaseEnabled) {
      setLoadingShipments(false);
      return undefined;
    }

    let active = true;
    setLoadingShipments(true);
    loadShipmentsFromSupabase()
      .then((next) => {
        if (active) {
          setShipments(next);
          setDataError('');
        }
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setDataError('Tracking service temporarily unavailable. Error code: OP-502.');
          setShipments([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingShipments(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateShipments = (next) => {
    setShipments(next);
  };

  if (route === 'admin') {
    return (
      <AdminPortal
        dataError={dataError}
        loadingShipments={loadingShipments}
        shipments={shipments}
        setDataError={setDataError}
        setShipments={updateShipments}
      />
    );
  }

  const page = pageMap[route] || 'home';

  return (
    <>
      <Header />
      {dataError && <div className="data-warning">{dataError}</div>}
      {loadingShipments && <div className="data-warning">Loading shipment data...</div>}
      <PublicPage page={page} shipments={shipments} />
      <Footer />
    </>
  );
}

function Header() {
  return (
    <header>
      <div className="country-strip">
        <span>You are in United States of America</span>
        <a href="#/home">Stay on this site</a>
        <a href="#/home">Select a different country</a>
      </div>
      <div className="utility-nav">
        <a href="#/service">Find a Service Point</a>
        <button type="button">Search</button>
        <a href="#/home">United States</a>
      </div>
      <nav className="main-nav" aria-label="Main navigation">
        <a className="brand" href="#/home" aria-label="Ocean Peak Logistics home">
          <span className="brand-mark">OP</span>
          <span>Ocean Peak Logistics</span>
        </a>
        <div className="nav-links">
          {navItems.map(([label, page]) => (
            <a key={label} href={`#/${page}`}>{label}</a>
          ))}
        </div>
      </nav>
      <MegaNav />
    </header>
  );
}

function MegaNav() {
  return (
    <div className="mega-nav">
      <div>
        <h3>Start Shipping</h3>
        <a href="#/quote">Get a Quote</a>
        <a href="#/ship">Ship Now</a>
        <a href="#/account">Request a Business Account</a>
      </div>
      <div>
        <h3>Document and Package</h3>
        <a href="#/ship">Express document and package shipping</a>
        <a href="#/business">Retailers or volume shipping</a>
      </div>
      <div>
        <h3>Pallets, Containers and Cargo</h3>
        <a href="#/business">Explore freight services</a>
        <a href="#/security">Security logistics</a>
      </div>
      <div>
        <h3>Customer Tools</h3>
        <a href="#/tracking">Track</a>
        <a href="#/portals">Customer portal logins</a>
        <a href="#/service">Customer service</a>
      </div>
    </div>
  );
}

function PublicPage({ page, shipments }) {
  if (page === 'tracking') return <TrackingPage shipments={shipments} />;
  if (page === 'quote') return <QuotePage />;
  if (page === 'ship') return <ShipPage />;
  if (page === 'account') return <AccountPage />;
  if (page === 'security') return <SecurityPage />;
  if (page === 'minerals') return <MineralsPage />;
  if (page === 'business') return <BusinessPage />;
  if (page === 'portals') return <PortalsPage />;
  if (page === 'service') return <CustomerServicePage />;
  return <Home shipments={shipments} />;
}

function Home({ shipments }) {
  return (
    <main>
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <h1>Ocean Peak Logistics Home</h1>
          <TrackingPanel shipments={shipments} />
        </div>
      </section>
      <QuickActions />
      <TariffBand />
      <ServiceList />
      <BusinessBand />
      <Updates />
    </main>
  );
}

function TrackingPanel({ shipments, compact = false }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [tracked, setTracked] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleTrack = async (event) => {
    event.preventDefault();
    const trackingNumber = query.trim();
    setSubmitted(trackingNumber);
    setTracked(null);
    setTrackingError('');

    if (!trackingNumber) return;
    if (!supabaseEnabled) {
      setTrackingError('Tracking service temporarily unavailable. Error code: TRK-503.');
      return;
    }

    setTrackingLoading(true);
    try {
      const result = await fetchShipmentByTrackingNumber(trackingNumber);
      setTracked(result ? hydrateShipment(result) : null);
    } catch (error) {
      console.error(error);
      setTrackingError('Unable to retrieve tracking details. Error code: TRK-502.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <>
      <form className={`tracking-panel ${compact ? 'compact' : ''}`} onSubmit={handleTrack}>
        <h2>Track Your Shipment</h2>
        <div className="tracking-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter your tracking number(s)"
            aria-label="Tracking number"
          />
          <button type="submit">Track</button>
        </div>
        <p>Please enter your tracking number(s). Example: {shipments[0]?.id || 'OPL-9472-6813'}</p>
      </form>
      {trackingLoading && <section className="tracking-result missing"><h2>Loading tracking</h2><p>Checking shipment records for {submitted}.</p></section>}
      {trackingError && <section className="tracking-result missing"><h2>Tracking unavailable</h2><p>{trackingError}</p></section>}
      {submitted && !trackingLoading && !trackingError && <TrackingResult shipment={tracked} submitted={submitted} />}
    </>
  );
}

function QuickActions() {
  return (
    <section className="quick-actions" aria-label="Start shipping">
      {actionCards.map(([title, copy, href]) => (
        <a className="action-card" href={`#/${href}`} key={title}>
          <strong>{title}</strong>
          <span>{copy}</span>
        </a>
      ))}
    </section>
  );
}

function TariffBand() {
  return (
    <section className="alert-band">
      <img src="/assets/op-custody.png" alt="Ocean Peak Logistics secure custody van" />
      <div>
        <h2>Navigating Complex Trade and Secure Custody</h2>
        <p>Global trade is becoming increasingly complex as tariffs, documentation rules, and restricted-goods requirements shift. Ocean Peak Logistics helps teams move confidently with clear options and controlled handling.</p>
        <a href="#/business">Explore Our Solutions</a>
      </div>
    </section>
  );
}

function ServiceList() {
  return (
    <section className="service-list" aria-label="Shipping services">
      {sectors.map((sector, index) => (
        <article className={`service-row ${index % 2 ? 'reverse' : ''}`} key={sector.title}>
          <img src={sector.image} alt={`${sector.title} operation`} />
          <div>
            <h2>{sector.title}</h2>
            <p className="eyebrow">{sector.audience}</p>
            <p>{sector.copy}</p>
            <h3>Services Available</h3>
            <ul>
              {sector.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <a href={`#/${sector.link}`}>Explore {sector.title}</a>
          </div>
        </article>
      ))}
    </section>
  );
}

function BusinessBand() {
  return (
    <section className="business-band">
      <div>
        <h2>Ocean Peak Logistics for Your Business</h2>
        <p>Power small, medium, and enterprise logistics with express shipping, freight forwarding, secure custody, and precious minerals operations.</p>
        <a href="#/business">Explore Our Business Solutions</a>
      </div>
    </section>
  );
}

function Updates() {
  return (
    <section className="updates">
      <h2>Important Service Updates</h2>
      <p>Service bulletins keep you up to date with news and alerts.</p>
      <div className="update-grid">
        <a href="#/service">Operational update for high-value lanes</a>
        <a href="#/service">Weekly secure fuel and escort surcharge notice</a>
        <a href="#/business">Sustainable business begins with low carbon supply chains</a>
      </div>
    </section>
  );
}

function TrackingPage({ shipments }) {
  return (
    <main>
      <PageHero title="Track & Trace" copy="Enter your tracking number to see the latest status, route, custody handling, and delivery history." />
      <section className="narrow-page">
        <TrackingPanel shipments={shipments} compact />
        <Faq />
      </section>
      <CareerBand />
    </main>
  );
}

function TrackingResult({ shipment, submitted }) {
  if (!shipment) {
    return (
      <section className="tracking-result missing">
        <h2>No shipment found</h2>
        <p>{submitted} is not in the current tracking database. Confirm the number with your shipper.</p>
      </section>
    );
  }

  const scans = getShipmentScans(shipment);
  const latest = scans[0] || {};
  const signedBy = shipment.signedBy || 'Pending';
  let currentDate = '';
  let rowNumber = scans.length + 1;

  return (
    <section className="tracking-result">
      <div className="tracking-breadcrumb">
        <span>Ocean Peak Logistics</span>
        <span>Express</span>
        <span>Tracking</span>
      </div>
      <h2 className="tracking-title">Track Express Shipments</h2>
      <p className="tracking-intro">Here's the fastest way to check the status of your shipment. Online results give you detailed progress as your shipment moves through the network.</p>

      <h3 className="result-heading">Result Summary</h3>
      <div className="result-summary">
        <div className="summary-check" aria-hidden="true">✓</div>
        <div className="summary-waybill">
          <strong>Waybill: {shipment.id}</strong>
          <span>Signed for by: {signedBy}</span>
          <a href="#/tracking">Get Signature Proof of Delivery</a>
        </div>
        <div className="summary-route">
          <strong>{formatTrackingDate(latest.date)} at {latest.time || '--:--'}</strong>
          <span>Origin Service Area:</span>
          <em>{shipment.originServiceArea || shipment.origin}</em>
          <span>Destination Service Area:</span>
          <em>{shipment.destinationServiceArea || shipment.destination}</em>
        </div>
        <div className="summary-piece"><span className="piece-plus">+</span>{normalizePiece(shipment.pieceCount)}</div>
      </div>

      <table className="scan-table">
        <tbody>
          {scans.map((scan) => {
            const showDate = scan.date !== currentDate;
            currentDate = scan.date;
            rowNumber -= 1;
            return (
              <React.Fragment key={`${scan.date}-${scan.time}-${scan.description}-${rowNumber}`}>
                {showDate && (
                  <tr className="scan-date-row">
                    <th colSpan="2">{formatTrackingDate(scan.date)}</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>Piece</th>
                  </tr>
                )}
                <tr>
                  <td className="scan-index">{rowNumber}</td>
                  <td>{scan.description}</td>
                  <td>{scan.location}</td>
                  <td>{scan.time}</td>
                  <td><span className="piece-plus">+</span>{scan.piece || normalizePiece(shipment.pieceCount)}</td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="tracking-footer-actions">
        <a href="#/tracking">Hide Details</a>
        <a href="#/tracking">Try a new search</a>
        <button type="button" onClick={() => window.print()}>Print »</button>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    ['What is a tracking number and where can I find it?', 'A tracking number uniquely identifies your shipment and is usually provided by the shipper or online shop.'],
    ['When will my tracking information appear?', 'Tracking events normally appear after a shipment is accepted at a facility or scanned by a courier.'],
    ['Why is my tracking number not working?', 'Check the format and remove extra punctuation. If it still does not work, contact your shipper.'],
    ['Can I track without a tracking number?', 'The shipper may be able to search by reference, invoice, or shipment order.']
  ];
  return (
    <section className="faq">
      <h2>Frequently Asked Questions</h2>
      {items.map(([question, answer]) => (
        <details key={question} open={question.startsWith('What')}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}

function QuotePage() {
  return (
    <main>
      <PageHero title="Get a Free Shipping Quote Online" copy="Use the quote planner to compare service options for packages, pallets, secure cargo, and precious minerals shipments." />
      <section className="form-page">
        <QuoteForm />
        <InfoPanel title="How the shipping calculator estimates cost" items={['Enter where the shipment is sent from and to.', 'Choose package, pallet, cargo, security, or precious minerals service.', 'Compare speed, handling level, customs, and protection options.', 'Review the estimate and book when ready.']} />
      </section>
    </main>
  );
}

function QuoteForm() {
  const [estimate, setEstimate] = useState('');
  const quote = (event) => {
    event.preventDefault();
    setEstimate('$184.60 - $429.90 estimated range');
  };
  return (
    <form className="public-form" onSubmit={quote}>
      <h2>Shipment Details</h2>
      <div className="split">
        <input required placeholder="From country or ZIP" />
        <input required placeholder="To country or ZIP" />
      </div>
      <div className="split">
        <select defaultValue="Document and Parcel Shipping">
          <option>Document and Parcel Shipping</option>
          <option>Cargo Shipping</option>
          <option>Security Logistics</option>
          <option>Precious Minerals Logistics</option>
        </select>
        <input placeholder="Total weight" />
      </div>
      <div className="triple">
        <input placeholder="Length" />
        <input placeholder="Width" />
        <input placeholder="Height" />
      </div>
      <button type="submit">Get Quote</button>
      {estimate && <p className="estimate">{estimate}</p>}
    </form>
  );
}

function ShipPage() {
  return (
    <main>
      <PageHero title="Ship Now" copy="Book courier, freight, security, and precious minerals movements from one shipping flow." />
      <section className="form-page">
        <form className="public-form">
          <h2>Create a Shipment</h2>
          <input placeholder="Sender name" />
          <input placeholder="Receiver name" />
          <div className="split">
            <input placeholder="Origin address" />
            <input placeholder="Destination address" />
          </div>
          <select defaultValue="Security Logistics">
            <option>Express Document</option>
            <option>Parcel Shipping</option>
            <option>Security Logistics</option>
            <option>Precious Minerals Logistics</option>
            <option>Freight Cargo</option>
          </select>
          <textarea placeholder="Shipment contents and handling notes" />
          <button type="button">Continue to Booking</button>
        </form>
        <InfoPanel title="Learn More About" items={['Document and package shipping', 'Pallets, containers and cargo', 'Security logistics', 'Precious minerals custody']} />
      </section>
    </main>
  );
}

function AccountPage() {
  return (
    <main>
      <PageHero title="Request a Business Account" copy="Set up recurring shipping, managed rates, billing controls, and secure-cargo permissions." />
      <section className="form-page">
        <form className="public-form">
          <h2>Business Information</h2>
          <input placeholder="Company name" />
          <div className="split">
            <input placeholder="Contact name" />
            <input placeholder="Work email" />
          </div>
          <select defaultValue="Weekly">
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
          <textarea placeholder="Tell us about your lanes, volume, and security needs" />
          <button type="button">Submit Request</button>
        </form>
        <InfoPanel title="Business Benefits" items={['Volume pricing', 'Shipment visibility', 'Customs guidance', 'High-value custody options']} />
      </section>
    </main>
  );
}

function SecurityPage() {
  const securityItems = [
    { label: 'Risk-assessed routing', href: 'quote' },
    { label: 'Tamper-evident packaging', href: 'ship' },
    { label: 'Escorted transfers', href: 'service' },
    { label: 'Control tower monitoring', href: 'tracking' },
    { label: 'Incident escalation', href: 'service' },
    { label: 'Custody records', href: 'portals' }
  ];

  return (
    <main>
      <PageHero title="Security Logistics" copy="Controlled transportation for sensitive freight, restricted materials, medical assets, documents, and mission-critical equipment." />
      <ImageFeature
        image={onlineSecurityGuardImage}
        alt="Security guard patrolling a protected logistics facility"
        kicker="Secure Handling"
        title="Visible control from handoff to delivery"
        copy="Security logistics requires trained handling, documented custody, sealed freight, and response procedures for every exception."
        actions={[
          ['Plan Secure Route', 'quote'],
          ['Contact Security Desk', 'service']
        ]}
      />
      <DetailGrid
        title="Controlled movement from pickup to delivery"
        copy="Our security logistics program layers route planning, identification checks, sealed handling, and exception management around every shipment."
        items={securityItems}
      />
    </main>
  );
}

function MineralsPage() {
  const mineralItems = [
    { label: 'Armored pickup', href: 'ship' },
    { label: 'Vault transfer', href: 'quote' },
    { label: 'Dual authorization', href: 'service' },
    { label: 'Insured lanes', href: 'quote' },
    { label: 'Customs documentation', href: 'quote' },
    { label: 'Sealed chain-of-custody', href: 'tracking' }
  ];

  return (
    <main>
      <PageHero title="Precious Minerals Logistics" copy="Secure logistics for gold, diamonds, rare metals, concentrates, assays, and exchange-grade commodities." />
      <ImageFeature
        image="/assets/op-security-minerals.png"
        alt="Gold bullion bars prepared for secure vault storage and handling"
        kicker="High Value Custody"
        title="Real vault handling for high-value metals"
        copy="Precious minerals moves depend on verified identity, armored collection, sealed custody records, insurance evidence, and exact receiving appointments."
        actions={[
          ['Quote Minerals Move', 'quote'],
          ['Contact Minerals Desk', 'service']
        ]}
      />
      <DetailGrid
        title="Specialist custody for high-value commodities"
        copy="Vault-to-vault coordination, armored collection, verified handoffs, insurance documentation, and chain-of-custody reporting support every high-value move."
        items={mineralItems}
      />
    </main>
  );
}

function BusinessPage() {
  return (
    <main>
      <PageHero title="Ocean Peak Logistics for Your Business" copy="Shipping and logistics for businesses moving parcels, freight, security shipments, and high-value cargo." />
      <DetailGrid
        title="Business logistics services"
        copy="Combine courier delivery, freight forwarding, customs support, warehousing, and specialist secure transport in one operational program."
        items={['Warehousing', 'Transport', 'Packaging', 'Service logistics', 'Real estate', 'Security and minerals operations']}
      />
      <ServiceList />
    </main>
  );
}

function PortalsPage() {
  return (
    <main>
      <PageHero title="Customer Portal Logins" copy="Choose the right customer tool for shipping, tracking, freight, supply chain, and secure cargo visibility." />
      <section className="portal-grid">
        {portalLinks.map((portal) => (
          <a href="#/portals" key={portal}>
            <strong>{portal}</strong>
            <span>Login opens in a secure customer environment</span>
          </a>
        ))}
      </section>
    </main>
  );
}

function CustomerServicePage() {
  return (
    <main>
      <PageHero title="Customer Service" copy="Get help with tracking, invoices, claims, customs, account setup, and specialist secure logistics." />
      <section className="support-grid">
        {supportCards.map((card) => (
          <a className="support-card" href={`#/${card.href}`} key={card.title}>
            <span className="support-kicker">Support</span>
            <strong>{card.title}</strong>
            <p>{card.copy}</p>
            <em>{card.action}</em>
          </a>
        ))}
      </section>
      <section className="contact-band">
        <div>
          <h2>Need Direct Assistance?</h2>
          <p>Have your tracking number, account number, shipment route, and any customs or custody references ready so the right team can help faster.</p>
        </div>
        <div className="contact-options">
          <span><strong>Express Desk</strong> 24/7 shipment support</span>
          <span><strong>Security Desk</strong> controlled cargo exceptions</span>
          <span><strong>Minerals Desk</strong> vault and armored moves</span>
        </div>
      </section>
      <CareerBand />
    </main>
  );
}

function PageHero({ title, copy }) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">Ocean Peak Logistics</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
    </section>
  );
}

function InfoPanel({ title, items }) {
  return (
    <aside className="info-panel">
      <h2>{title}</h2>
      <ol>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ol>
    </aside>
  );
}

function ImageFeature({ image, alt, kicker, title, copy, actions }) {
  return (
    <section className="image-feature">
      <img src={image} alt={alt} />
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
        <div className="feature-actions">
          {actions.map(([label, href]) => (
            <a href={`#/${href}`} key={label}>{label}</a>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailGrid({ title, copy, items }) {
  return (
    <section className="detail-grid">
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className="capability-grid">
        {items.map((item) => {
          const card = typeof item === 'string' ? { label: item, href: 'service' } : item;
          return (
            <a href={`#/${card.href}`} key={card.label}>
              <strong>{card.label}</strong>
              <span>Open support</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function CareerBand() {
  return (
    <section className="career-band">
      <h2>Stop Tracking the Box. Start Tracking Your Future.</h2>
      <p>Explore logistics, operations, secure transport, and customer service roles with clear routes for advancement.</p>
      <a href="#/service">Explore Open Roles</a>
    </section>
  );
}

function AdminPortal({ dataError, loadingShipments, shipments, setDataError, setShipments }) {
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(supabaseEnabled);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!supabaseEnabled) return undefined;
    const unsubscribe = onAdminAuthChange((session) => {
      setAuthed(Boolean(session));
      setCheckingSession(false);
    });

    getAdminSession()
      .then((session) => {
        setAuthed(Boolean(session));
        setCheckingSession(false);
      })
      .catch((error) => {
        console.error(error);
        setLoginError('Could not verify admin session. Error code: ADM-401.');
        setCheckingSession(false);
      });

    return unsubscribe;
  }, []);

  const login = async (event, credentials) => {
    event.preventDefault();
    setLoginError('');
    if (!supabaseEnabled) {
      setLoginError('Admin service temporarily unavailable. Error code: ADM-503.');
      return;
    }

    try {
      await signInAdmin(credentials.email, credentials.password);
      setAuthed(true);
    } catch (error) {
      console.error(error);
      setLoginError('Invalid admin email or password. Error code: ADM-403.');
    }
  };
  const logout = async () => {
    if (supabaseEnabled) {
      try {
        await signOutAdmin();
      } catch (error) {
        console.error(error);
      }
    }
    setAuthed(false);
  };

  if (checkingSession) {
    return (
      <main className="admin-login-page">
        <div className="admin-login">
          <span className="brand-mark">OP</span>
          <h1>Ocean Peak Control Tower</h1>
          <p>Verifying secure session...</p>
        </div>
      </main>
    );
  }

  if (!authed) {
    return <AdminLogin loginError={loginError} onLogin={login} />;
  }

  return (
    <AdminDashboard
      dataError={dataError}
      loadingShipments={loadingShipments}
      shipments={shipments}
      setDataError={setDataError}
      setShipments={setShipments}
      onLogout={logout}
    />
  );
}

function AdminLogin({ loginError, onLogin }) {
  const [credentials, setCredentials] = useState({
    email: 'admin@oceanpeaklogistics.test',
    password: 'password'
  });

  return (
    <main className="admin-login-page">
      <form className="admin-login" onSubmit={(event) => onLogin(event, credentials)}>
        <span className="brand-mark">OP</span>
        <h1>Ocean Peak Control Tower</h1>
        <p>Separate administrator portal for shipment creation and tracking updates.</p>
        {loginError && <p className="login-error">{loginError}</p>}
        <input value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} aria-label="Email" />
        <input value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} type="password" aria-label="Password" />
        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}

function AdminDashboard({ dataError, loadingShipments, shipments, setDataError, setShipments, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState({
    customer: '',
    service: 'Security Logistics',
    origin: '',
    destination: '',
    weight: '',
    valueClass: 'Controlled',
    security: '',
    eta: '',
    signedBy: '',
    originServiceArea: '',
    destinationServiceArea: '',
    pieceCount: '1'
  });

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredShipments = normalizedSearch
    ? shipments.filter((shipment) => shipment.id.toLowerCase().includes(normalizedSearch))
    : shipments;
  const exactSearchMatch = normalizedSearch
    ? shipments.find((shipment) => shipment.id.toLowerCase() === normalizedSearch)
    : null;

  useEffect(() => {
    if (!exactSearchMatch) return;
    const target = document.getElementById(`shipment-${exactSearchMatch.id}`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [exactSearchMatch]);

  const createShipment = async (event) => {
    event.preventDefault();
    const now = new Date();
    const eventDate = currentDateInput();
    const eventTime = currentTimeInput();
    const originArea = draft.originServiceArea || draft.origin;
    const destinationArea = draft.destinationServiceArea || draft.destination;
    const created = {
      ...draft,
      id: makeTrackingNumber(),
      status: 'Shipment Created',
      originServiceArea: originArea,
      destinationServiceArea: destinationArea,
      pieceCount: draft.pieceCount || '1',
      history: [
        {
          time: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          place: draft.origin || 'Origin pending',
          status: 'Shipment created'
        }
      ],
      scans: [
        {
          date: eventDate,
          time: eventTime,
          description: 'Shipment picked up',
          location: originArea || 'ORIGIN PENDING',
          piece: normalizePiece(draft.pieceCount)
        }
      ]
    };
    try {
      const saved = await createShipmentInSupabase(created);
      setShipments([saved, ...shipments]);
      setDataError('');
      setDraft({
        customer: '',
        service: 'Security Logistics',
        origin: '',
        destination: '',
        weight: '',
        valueClass: 'Controlled',
        security: '',
        eta: '',
        signedBy: '',
        originServiceArea: '',
        destinationServiceArea: '',
        pieceCount: '1'
      });
    } catch (error) {
      console.error(error);
      setDataError('Tracking record could not be created. Error code: ADM-CREATE-500.');
    }
  };

  const persistShipment = async (nextShipment, fallbackMessage) => {
    try {
      const saved = await updateShipmentInSupabase(nextShipment);
      setShipments(shipments.map((shipment) => (
        shipment.id === nextShipment.id ? saved : shipment
      )));
      setDataError('');
    } catch (error) {
      console.error(error);
      setDataError(fallbackMessage);
    }
  };

  const updateShipment = (id, patch) => {
    const nextShipment = hydrateShipment({
      ...shipments.find((shipment) => shipment.id === id),
      ...patch
    });
    setShipments(shipments.map((shipment) => (
      shipment.id === id ? nextShipment : shipment
    )));
    persistShipment(nextShipment, 'Tracking record could not be updated. Error code: ADM-UPDATE-500.');
  };

  const addEvent = async (id, event) => {
    const now = new Date();
    const shipment = shipments.find((item) => item.id === id);
    if (!shipment) return;

    const nextScan = {
      date: event.date || currentDateInput(),
      time: event.time || currentTimeInput(),
      description: event.status || 'Shipment updated',
      location: event.place || 'Control Tower',
      piece: normalizePiece(event.piece || shipment.pieceCount),
      sortOrder: getShipmentScans(shipment).length + 1
    };

    try {
      const savedEvent = await createShipmentEventInSupabase(shipment.dbId, nextScan);
      const nextShipment = hydrateShipment({
        ...shipment,
        status: event.status || shipment.status,
        scans: [savedEvent, ...getShipmentScans(shipment)],
        history: [
          ...(shipment.history || []),
          {
            time: now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            place: event.place || 'Control Tower',
            status: event.status || 'Shipment updated'
          }
        ]
      });
      setShipments(shipments.map((item) => (item.id === id ? nextShipment : item)));
      await persistShipment(nextShipment, 'Tracking event status could not be updated. Error code: ADM-EVENT-STATUS-500.');
      setDataError('');
    } catch (error) {
      console.error(error);
      setDataError('Tracking event could not be published. Error code: ADM-EVENT-500.');
    }
  };

  const updateScanEvent = async (shipmentId, eventId, patch) => {
    const shipment = shipments.find((item) => item.id === shipmentId);
    if (!shipment) return;

    try {
      const savedEvent = await updateShipmentEventInSupabase(eventId, patch);
      const nextScans = sortScans(getShipmentScans(shipment).map((scan) => (
        scan.eventId === eventId ? savedEvent : scan
      )));
      const latestScan = nextScans[0];
      const nextShipment = hydrateShipment({
        ...shipment,
        scans: nextScans,
        status: latestScan?.description || shipment.status
      });
      setShipments(shipments.map((item) => (item.id === shipmentId ? nextShipment : item)));
      if (latestScan?.eventId === eventId && patch.description) {
        await persistShipment(nextShipment, 'Tracking event status could not be updated. Error code: ADM-EVENT-STATUS-500.');
      }
      setDataError('');
    } catch (error) {
      console.error(error);
      setDataError('Tracking event could not be updated. Error code: ADM-EVENT-UPDATE-500.');
    }
  };

  const deleteShipment = async (id) => {
    try {
      await deleteShipmentFromSupabase(id);
      setShipments(shipments.filter((shipment) => shipment.id !== id));
      setDataError('');
    } catch (error) {
      console.error(error);
      setDataError('Tracking record could not be deleted. Error code: ADM-DELETE-500.');
    }
  };

  return (
    <main className="admin-page">
      {dataError && <div className="data-warning admin-warning">{dataError}</div>}
      {loadingShipments && <div className="data-warning admin-warning">Loading shipment data...</div>}
      <section className="admin-topbar">
        <a className="brand" href="#/admin">
          <span className="brand-mark">OP</span>
          <span>Control Tower</span>
        </a>
        <button type="button" onClick={onLogout}>Sign Out</button>
      </section>
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Private Admin Portal</p>
          <h1>Shipment Administration</h1>
          <p>Generate tracking numbers, create secure shipments, and publish status updates to the customer portal.</p>
        </div>
        <div className="metric-strip">
          <span><strong>{shipments.length}</strong> Shipments</span>
          <span><strong>{shipments.filter((item) => item.service.includes('Security')).length}</strong> Security</span>
          <span><strong>{shipments.filter((item) => item.service.includes('Minerals')).length}</strong> Minerals</span>
        </div>
      </section>

      <section className="admin-grid">
        <form className="admin-form" onSubmit={createShipment}>
          <h2>Create Tracking</h2>
          <input required placeholder="Customer" value={draft.customer} onChange={(event) => setDraft({ ...draft, customer: event.target.value })} />
          <select value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })}>
            <option>Security Logistics</option>
            <option>Precious Minerals Logistics</option>
            <option>Document and Parcel Shipping</option>
            <option>Cargo Shipping</option>
          </select>
          <div className="split">
            <input required placeholder="Origin" value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} />
            <input required placeholder="Destination" value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} />
          </div>
          <div className="split">
            <input required placeholder="Origin Service Area" value={draft.originServiceArea} onChange={(event) => setDraft({ ...draft, originServiceArea: event.target.value })} />
            <input required placeholder="Destination Service Area" value={draft.destinationServiceArea} onChange={(event) => setDraft({ ...draft, destinationServiceArea: event.target.value })} />
          </div>
          <div className="split">
            <input placeholder="Weight" value={draft.weight} onChange={(event) => setDraft({ ...draft, weight: event.target.value })} />
            <label className="date-field">
              <span>ETA</span>
              <input required type="date" value={draft.eta} onChange={(event) => setDraft({ ...draft, eta: event.target.value })} />
            </label>
          </div>
          <div className="split">
            <input placeholder="Signed for by" value={draft.signedBy} onChange={(event) => setDraft({ ...draft, signedBy: event.target.value })} />
            <input placeholder="Piece Count" value={draft.pieceCount} onChange={(event) => setDraft({ ...draft, pieceCount: event.target.value })} />
          </div>
          <input placeholder="Value class" value={draft.valueClass} onChange={(event) => setDraft({ ...draft, valueClass: event.target.value })} />
          <textarea required placeholder="Security handling instructions" value={draft.security} onChange={(event) => setDraft({ ...draft, security: event.target.value })} />
          <button type="submit">Generate Tracking Number</button>
        </form>

        <div className="shipment-admin-list">
          <div className="admin-search-head">
            <div>
              <h2>Tracking Updates</h2>
              <p>{filteredShipments.length} of {shipments.length} records visible</p>
            </div>
            <label className="admin-search">
              <span>Search Tracking Number</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Enter tracking number"
              />
            </label>
          </div>
          {filteredShipments.length === 0 && (
            <div className="empty-search">No tracking record matches {searchQuery}.</div>
          )}
          {filteredShipments.map((shipment) => (
            <ShipmentEditor
              key={shipment.id}
              highlighted={exactSearchMatch?.id === shipment.id}
              shipment={shipment}
              onPatch={(patch) => updateShipment(shipment.id, patch)}
              onScanPatch={(eventId, patch) => updateScanEvent(shipment.id, eventId, patch)}
              onEvent={(event) => addEvent(shipment.id, event)}
              onDelete={() => deleteShipment(shipment.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function ShipmentEditor({ highlighted = false, shipment, onPatch, onScanPatch, onEvent, onDelete }) {
  const scans = getShipmentScans(shipment);
  const [event, setEvent] = useState({
    status: '',
    place: '',
    date: currentDateInput(),
    time: currentTimeInput(),
    piece: shipment.pieceCount || '1'
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submitEvent = (formEvent) => {
    formEvent.preventDefault();
    onEvent(event);
    setEvent({
      status: '',
      place: '',
      date: currentDateInput(),
      time: currentTimeInput(),
      piece: shipment.pieceCount || '1'
    });
  };

  const deleteTracking = () => {
    if (confirmDelete) {
      onDelete();
      return;
    }
    setConfirmDelete(true);
  };

  const updateScan = (index, patch) => {
    const target = scans[index];
    if (!target?.eventId) return;
    onScanPatch(target.eventId, patch);
  };

  return (
    <article className={`shipment-editor ${highlighted ? 'highlighted-shipment' : ''}`} id={`shipment-${shipment.id}`}>
      <div className="editor-head">
        <div>
          <strong>{shipment.id}</strong>
          <span>{shipment.customer} | {shipment.service}</span>
        </div>
        <div className="editor-actions">
          <select value={shipment.status} onChange={(change) => onPatch({ status: change.target.value })}>
            <option>Shipment Created</option>
            <option>Processing</option>
            <option>Security Screening</option>
          <option>In Transit</option>
          <option>Customs Review</option>
          <option>Held at Customs</option>
          <option>Out for Delivery</option>
            <option>Delivered</option>
            <option>Exception</option>
          </select>
          <button className="delete-tracking" type="button" onClick={deleteTracking}>
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </button>
        </div>
      </div>
      <div className="editor-fields">
        <label className="date-field">
          <span>ETA</span>
          <input type="date" value={toDateInputValue(shipment.eta)} onChange={(eventChange) => onPatch({ eta: eventChange.target.value })} aria-label="ETA" />
        </label>
        <input value={shipment.destination} onChange={(eventChange) => onPatch({ destination: eventChange.target.value })} aria-label="Destination" />
      </div>
      <div className="editor-fields">
        <input value={shipment.signedBy || ''} onChange={(eventChange) => onPatch({ signedBy: eventChange.target.value })} aria-label="Signed for by" placeholder="Signed for by" />
        <input value={shipment.pieceCount || '1'} onChange={(eventChange) => onPatch({ pieceCount: eventChange.target.value })} aria-label="Piece count" placeholder="Piece Count" />
      </div>
      <div className="editor-fields">
        <input value={shipment.originServiceArea || shipment.origin || ''} onChange={(eventChange) => onPatch({ originServiceArea: eventChange.target.value })} aria-label="Origin service area" placeholder="Origin Service Area" />
        <input value={shipment.destinationServiceArea || shipment.destination || ''} onChange={(eventChange) => onPatch({ destinationServiceArea: eventChange.target.value })} aria-label="Destination service area" placeholder="Destination Service Area" />
      </div>
      <form className="event-form" onSubmit={submitEvent}>
        <input required placeholder="New status event" value={event.status} onChange={(change) => setEvent({ ...event, status: change.target.value })} />
        <input placeholder="Location" value={event.place} onChange={(change) => setEvent({ ...event, place: change.target.value })} />
        <label className="date-field">
          <span>Event Date</span>
          <input required type="date" value={event.date} onChange={(change) => setEvent({ ...event, date: change.target.value })} />
        </label>
        <label className="date-field">
          <span>Time</span>
          <input required type="time" value={event.time} onChange={(change) => setEvent({ ...event, time: change.target.value })} />
        </label>
        <input placeholder="Piece" value={event.piece} onChange={(change) => setEvent({ ...event, piece: change.target.value })} />
        <button type="submit">Publish Update</button>
      </form>
      <section className="previous-updates">
        <h3>Previous Updates</h3>
        {scans.length === 0 ? (
          <p>No previous updates have been published yet.</p>
        ) : (
          scans.map((scan, index) => (
            <div className="previous-update-card" key={`${scan.date}-${scan.time}-${index}`}>
              <label className="date-field">
                <span>Date</span>
                <input disabled={!scan.eventId} type="date" value={scan.date || ''} onChange={(change) => updateScan(index, { date: change.target.value })} />
              </label>
              <label className="date-field">
                <span>Time</span>
                <input disabled={!scan.eventId} type="time" value={scan.time || ''} onChange={(change) => updateScan(index, { time: change.target.value })} />
              </label>
              <input disabled={!scan.eventId} value={scan.description || ''} onChange={(change) => updateScan(index, { description: change.target.value })} aria-label="Previous update status" placeholder="Update status" />
              <input disabled={!scan.eventId} value={scan.location || ''} onChange={(change) => updateScan(index, { location: change.target.value })} aria-label="Previous update location" placeholder="Location" />
              <input disabled={!scan.eventId} value={scan.piece || normalizePiece(shipment.pieceCount)} onChange={(change) => updateScan(index, { piece: change.target.value })} aria-label="Previous update piece" placeholder="Piece" />
            </div>
          ))
        )}
      </section>
    </article>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div>
          <h3>Quick Links</h3>
          <a href="#/service">Customer Service</a>
          <a href="#/portals">Customer Portal Logins</a>
          <a href="#/quote">Get a Quote</a>
          <a href="#/account">Request a Business Account</a>
          <a href="#/business">Ocean Peak for Your Business</a>
          <a href="#/ship">Shipping Guidance</a>
        </div>
        <div>
          <h3>Our Divisions</h3>
          <a href="#/ship">Ocean Peak Express</a>
          <a href="#/business">Ocean Peak Global Forwarding</a>
          <a href="#/business">Ocean Peak Supply Chain</a>
          <a href="#/security">Security Logistics</a>
          <a href="#/minerals">Precious Minerals Logistics</a>
        </div>
        <div>
          <h3>Industry Sectors</h3>
          <a href="#/business">Auto-Mobility</a>
          <a href="#/business">Energy</a>
          <a href="#/business">Engineering and Manufacturing</a>
          <a href="#/business">Life Sciences and Healthcare</a>
          <a href="#/business">Retail and Fashion</a>
          <a href="#/business">Technology</a>
        </div>
        <div>
          <h3>Company Information</h3>
          <a href="#/business">About Ocean Peak Logistics</a>
          <a href="#/service">Fraud Awareness</a>
          <a href="#/service">Legal Notice</a>
          <a href="#/service">Privacy Notice</a>
          <a href="#/business">Innovation</a>
        </div>
      </div>
      <div className="footer-bottom">
        <strong>Ocean Peak Logistics Group</strong>
        <span>2026 © all rights reserved</span>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
