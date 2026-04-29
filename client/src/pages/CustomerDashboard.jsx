import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Star, Calendar, MapPin, CheckCircle, Phone, User, Clock, Send } from 'lucide-react';
import './Dashboard.css';

const CustomerDashboard = () => {
    const [bookings, setBookings] = useState([]);
    const [reviewModal, setReviewModal] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
        // Auto-refresh every 10 seconds to check for accepted bookings
        const interval = setInterval(fetchBookings, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchBookings = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const res = await axios.get(`${API_URL}/my-bookings`);
            setBookings(res.data);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            setBookings([]);
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            await axios.post(`${API_URL}/reviews`, {
                booking_id: reviewModal,
                rating,
                comment
            });
            setReviewModal(null);
            setRating(5);
            setComment('');
            navigate('/thank-you');
        } catch (error) {
            console.error('Failed to submit review:', error);
            alert('Failed to submit review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} color="#28a745" />;
            case 'pending': return <Clock size={16} color="#ffc107" />;
            case 'accepted': return <Star size={16} color="#007bff" />;
            default: return null;
        }
    };

    const getStatusLabel = (booking) => {
        if (booking.status === 'pending' && !booking.provider_name) {
            return 'Waiting for provider';
        }
        return booking.status;
    };

    return (
        <div className="dashboard-container">
            <h2>My Bookings</h2>
            <p className="dashboard-subtitle">Track your service requests and leave reviews</p>
            <div className="booking-list">
                {bookings.length === 0 ? (
                    <div className="empty-state">
                        <MapPin size={48} color="#ccc" />
                        <p>No bookings yet. <span className="link-text" onClick={() => navigate('/search')}>Find a service provider</span></p>
                    </div>
                ) : (
                    bookings.map(booking => (
                        <div key={booking.id} className={`booking-card ${booking.status}`}>
                            <div className="booking-info">
                                <h4>
                                    {getStatusIcon(booking.status)} {booking.service_name || booking.service_type}
                                    {booking.provider_name ? ` with ${booking.provider_name}` : ''}
                                </h4>
                                <p><Calendar size={14} /> {new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {booking.time}</p>
                                {booking.city && <p><MapPin size={14} /> {booking.city}</p>}

                                {/* PENDING — no provider yet */}
                                {booking.status === 'pending' && !booking.provider_name && (
                                    <div className="waiting-badge">
                                        <Send size={14} /> Request sent to all {booking.service_type || booking.service_name} providers in {booking.city}. Waiting for a provider to accept...
                                    </div>
                                )}

                                {/* ACCEPTED/COMPLETED — show provider details + phone */}
                                {(booking.status === 'accepted' || booking.status === 'completed') && booking.provider_name && (
                                    <div className="provider-details-card">
                                        <h5><User size={14} /> Your Service Provider</h5>
                                        <p className="provider-detail-name">{booking.provider_name}</p>
                                        {booking.provider_phone && (
                                            <p className="provider-detail-phone">
                                                <Phone size={14} />
                                                <a href={`tel:${booking.provider_phone}`}>{booking.provider_phone}</a>
                                            </p>
                                        )}
                                        {booking.provider_rating && (
                                            <p className="provider-detail-rating">
                                                <Star size={14} fill="#FFD700" stroke="#FFD700" /> {booking.provider_rating} rating
                                            </p>
                                        )}
                                        {booking.provider_experience && (
                                            <p>{booking.provider_experience} years experience</p>
                                        )}
                                    </div>
                                )}

                                <span className={`status-badge ${booking.status}`}>{getStatusLabel(booking)}</span>
                            </div>
                            {booking.status === 'completed' && (
                                <button className="btn-review" onClick={() => setReviewModal(booking.id)}>
                                    <Star size={14} /> Rate & Review
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {reviewModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReviewModal(null)}>
                    <div className="modal-content review-modal">
                        <h3>⭐ Write a Review</h3>
                        <p className="modal-subtitle">Your feedback helps other customers make better decisions</p>
                        <form onSubmit={submitReview}>
                            <div className="form-group">
                                <label>Rating</label>
                                <div className="star-rating">
                                    {[5, 4, 3, 2, 1].map(star => (
                                        <span
                                            key={star}
                                            className={`star ${rating >= star ? 'active' : ''}`}
                                            onClick={() => setRating(star)}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Comment</label>
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    required
                                    placeholder="Share your experience with this service provider..."
                                    rows="4"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-submit-review" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Review'}
                                </button>
                                <button type="button" className="btn-cancel" onClick={() => setReviewModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
