import React from 'react';
import { Star, Phone, Calendar, Circle, MapPin, BadgeCheck } from 'lucide-react';
import './ProviderCard.css';

const ProviderCard = ({ provider, onBook }) => {
    return (
        <div className="provider-card">
            <div className="provider-image">
                <img
                    src={provider.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=667eea&color=fff&size=128&bold=true`}
                    alt={provider.name}
                    loading="lazy"
                />
                <div className={`status-indicator ${provider.is_online ? 'online' : 'offline'}`} title={provider.is_online ? 'Online — Available now' : 'Offline'}>
                    <Circle size={12} fill={provider.is_online ? '#28a745' : '#ccc'} stroke="none" />
                </div>
            </div>

            <div className="provider-info">
                <div className="provider-name-row">
                    <h3>{provider.name}</h3>
                    {provider.rating >= 4.5 && (
                        <span className="verified-badge" title="Top Rated">
                            <BadgeCheck size={16} />
                        </span>
                    )}
                </div>
                <p className="service-category">{provider.service_name}</p>
                {provider.city && (
                    <p className="provider-location"><MapPin size={12} /> {provider.city}{provider.state ? `, ${provider.state}` : ''}</p>
                )}

                <div className="rating-row">
                    <Star className="star-icon" size={16} fill="#FFD700" stroke="#FFD700" />
                    <span className="rating-value">{provider.rating || 'New'}</span>
                    <span className="reviews">({provider.total_reviews || 0} reviews)</span>
                </div>

                <div className="details-row">
                    <span>🛠️ {provider.experience || 0} Yrs Exp.</span>
                    <span className="separator">•</span>
                    <span className="price">₹{provider.price || 0}/hr</span>
                </div>

                <div className="card-actions">
                    <button className="btn-book" onClick={() => onBook && onBook(provider)} id={`book-${provider.id}`}>
                        <Calendar size={16} /> Book Now
                    </button>
                    {provider.phone ? (
                        <a href={`tel:${provider.phone}`} className="btn-call">
                            <Phone size={16} /> Call
                        </a>
                    ) : (
                        <button className="btn-call" onClick={() => onBook && onBook(provider)}>
                            <Phone size={16} /> Contact
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderCard;
