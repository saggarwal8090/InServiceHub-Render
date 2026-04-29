import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Shield, Clock, IndianRupee, Star, Users, ChevronRight, ArrowRight, Phone, CheckCircle } from 'lucide-react';
import './Home.css';

const indianCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
    'Chandigarh', 'Kochi', 'Indore', 'Bhopal', 'Nagpur',
    'Surat', 'Vadodara', 'Noida', 'Gurgaon', 'Ghaziabad'
];

const services = [
    { value: 'Plumber', label: 'Plumber', icon: '🔧', desc: 'Pipe, tap, leak repairs', img: '/images/service-plumber.png' },
    { value: 'Electrician', label: 'Electrician', icon: '⚡', desc: 'Wiring, switches, MCB', img: '/images/service-electrician.png' },
    { value: 'AC Repair', label: 'AC Repair', icon: '❄️', desc: 'Service, gas refill', img: '/images/service-ac-repair.png' },
    { value: 'Cleaning', label: 'Cleaning', icon: '🧹', desc: 'Deep clean, sanitize', img: '/images/service-cleaning.png' },
    { value: 'Carpenter', label: 'Carpenter', icon: '🪚', desc: 'Furniture, fittings', img: '/images/service-carpenter.png' },
    { value: 'Painter', label: 'Painter', icon: '🎨', desc: 'Interior, exterior', img: '/images/service-plumber.png' },
    { value: 'Pest Control', label: 'Pest Control', icon: '🐛', desc: 'Bugs, termites, rats', img: '/images/service-cleaning.png' },
    { value: 'Appliance Repair', label: 'Appliance Repair', icon: '🔌', desc: 'Washing machine, fridge', img: '/images/service-electrician.png' },
];

// Background slideshow images
const heroSlides = [
    '/images/hero-banner.png',
    '/images/service-plumber.png',
    '/images/service-electrician.png',
    '/images/service-carpenter.png',
    '/images/service-cleaning.png',
    '/images/service-ac-repair.png',
];

const Home = () => {
    const [city, setCity] = useState('');
    const [service, setService] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const navigate = useNavigate();

    // Auto-advance background slideshow
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const filteredCities = indianCities.filter(c =>
        c.toLowerCase().includes(city.toLowerCase())
    );

    const handleSearch = (e) => {
        e.preventDefault();
        if (city && service) {
            navigate(`/search?city=${encodeURIComponent(city)}&service=${encodeURIComponent(service)}`);
        } else if (!city) {
            document.querySelector('.search-input')?.focus();
        } else {
            document.querySelector('.search-select')?.focus();
        }
    };

    const selectCity = (c) => {
        setCity(c);
        setShowSuggestions(false);
    };

    return (
        <div className="home-container">
            {/* ===== HERO ===== */}
            <section className="hero">
                {/* Background slideshow */}
                <div className="hero-slideshow" aria-hidden="true">
                    {heroSlides.map((src, i) => (
                        <div
                            key={i}
                            className={`hero-slide ${i === currentSlide ? 'active' : ''}`}
                            style={{ backgroundImage: `url(${src})` }}
                        />
                    ))}
                </div>
                <div className="hero-overlay"></div>

                {/* Floating background images */}
                <div className="hero-floating-photos" aria-hidden="true">
                    {heroSlides.slice(0, 6).map((src, i) => (
                        <div key={i} className={`floating-photo fp-${i + 1}`}>
                            <img src={src} alt="" loading="lazy" />
                        </div>
                    ))}
                </div>

                <div className="hero-content">
                    <div className="hero-badge">🇮🇳 Trusted by 10,000+ customers across India</div>
                    <h1>Home Services,<br /><span className="hero-highlight">Made Simple.</span></h1>
                    <p>Find verified plumbers, electricians, carpenters & more in your city. Book instantly, pay transparently.</p>
                    <form className="search-box" onSubmit={handleSearch}>
                        <div className="search-input-wrapper">
                            <MapPin size={18} className="input-icon" />
                            <input
                                type="text"
                                placeholder="Your city (e.g. Mumbai)"
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                className="search-input"
                                autoComplete="off"
                                id="hero-city-input"
                            />
                            {showSuggestions && city && filteredCities.length > 0 && (
                                <div className="city-suggestions">
                                    {filteredCities.slice(0, 6).map(c => (
                                        <div key={c} className="suggestion-item" onMouseDown={() => selectCity(c)}>
                                            <MapPin size={14} /> {c}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <select
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                            className="search-select"
                            id="hero-service-select"
                        >
                            <option value="">What do you need?</option>
                            {services.map(s => (
                                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                            ))}
                        </select>
                        <button type="submit" className="search-btn" id="hero-search-btn">
                            <Search size={18} /> Search
                        </button>
                    </form>
                    <div className="hero-stats">
                        <div className="stat"><Users size={16} /> <strong>10,000+</strong> Verified Providers</div>
                        <div className="stat"><Star size={16} /> <strong>4.8</strong> Average Rating</div>
                        <div className="stat"><MapPin size={16} /> <strong>20+</strong> Cities</div>
                    </div>
                </div>
            </section>

            {/* ===== HOW IT WORKS ===== */}
            <section className="how-it-works">
                <h2>How It Works</h2>
                <p className="section-subtitle">Get help in 3 simple steps</p>
                <div className="steps-grid">
                    <div className="step-card">
                        <div className="step-number">1</div>
                        <div className="step-icon"><Search size={28} /></div>
                        <h3>Search & Select</h3>
                        <p>Enter your city and select the service you need. Browse available providers or send a request to all.</p>
                    </div>
                    <div className="step-arrow"><ArrowRight size={24} /></div>
                    <div className="step-card">
                        <div className="step-number">2</div>
                        <div className="step-icon"><CheckCircle size={28} /></div>
                        <h3>Book Instantly</h3>
                        <p>Pick a date & time, describe your problem, and confirm. The provider will accept your request.</p>
                    </div>
                    <div className="step-arrow"><ArrowRight size={24} /></div>
                    <div className="step-card">
                        <div className="step-number">3</div>
                        <div className="step-icon"><Phone size={28} /></div>
                        <h3>Get Service</h3>
                        <p>Once accepted, you'll see the provider's phone number. Call them directly and get the job done!</p>
                    </div>
                </div>
            </section>

            {/* ===== POPULAR SERVICES with Images ===== */}
            <section className="popular-services">
                <h2>Popular Services</h2>
                <p className="section-subtitle">Browse our most requested services across India</p>
                <div className="service-grid">
                    {services.map(s => (
                        <div
                            key={s.value}
                            className="service-card"
                            onClick={() => navigate(`/search?service=${encodeURIComponent(s.value)}`)}
                        >
                            <div className="service-card-img">
                                <img src={s.img} alt={s.label} loading="lazy" />
                            </div>
                            <span className="service-icon">{s.icon}</span>
                            <h4>{s.label}</h4>
                            <p className="service-desc">{s.desc}</p>
                            <ChevronRight size={16} className="arrow-icon" />
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== FEATURES ===== */}
            <section className="features">
                <h2>Why Choose InServiceHub?</h2>
                <p className="section-subtitle">India's most trusted service marketplace</p>
                <div className="feature-grid">
                    <div className="feature-card">
                        <Shield size={32} className="feature-icon" />
                        <h3>Verified Professionals</h3>
                        <p>Every provider is background-checked and quality-verified before joining our platform.</p>
                    </div>
                    <div className="feature-card">
                        <Clock size={32} className="feature-icon" />
                        <h3>Instant Booking</h3>
                        <p>Book in seconds. Send your request to all providers — the fastest one responds first.</p>
                    </div>
                    <div className="feature-card">
                        <IndianRupee size={32} className="feature-icon" />
                        <h3>Transparent Pricing</h3>
                        <p>No hidden charges. See prices upfront in ₹ before you confirm your booking.</p>
                    </div>
                    <div className="feature-card">
                        <Star size={32} className="feature-icon" />
                        <h3>Rated & Reviewed</h3>
                        <p>Read real reviews from verified customers. Only book providers you trust.</p>
                    </div>
                </div>
            </section>

            {/* ===== CITIES ===== */}
            <section className="cities-section">
                <h2>Available in 20+ Cities</h2>
                <p className="section-subtitle">Find services in your city — click to explore</p>
                <div className="cities-grid">
                    {indianCities.map(c => (
                        <div
                            key={c}
                            className="city-chip"
                            onClick={() => navigate(`/search?city=${encodeURIComponent(c)}`)}
                        >
                            <MapPin size={14} /> {c}
                        </div>
                    ))}
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>🏠 InServiceHub</h3>
                        <p>India's trusted home services marketplace. Connecting customers with verified professionals since 2024.</p>
                    </div>
                    <div className="footer-links">
                        <h4>Quick Links</h4>
                        <a href="/">Home</a>
                        <a href="/search">Find Services</a>
                        <a href="/register?role=provider">Become a Provider</a>
                        <a href="/login">Login</a>
                    </div>
                    <div className="footer-links">
                        <h4>Services</h4>
                        <a href="/search?service=Plumber">Plumber</a>
                        <a href="/search?service=Electrician">Electrician</a>
                        <a href="/search?service=AC+Repair">AC Repair</a>
                        <a href="/search?service=Carpenter">Carpenter</a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} InServiceHub. All rights reserved. Made with ❤️ in India.</p>
                </div>
            </footer>
        </div>
    );
};

export default Home;
