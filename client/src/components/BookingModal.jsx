import React, { useState } from 'react';
import axios from 'axios';
import { X, Calendar, Clock, MapPin, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './BookingModal.css';

const BookingModal = ({ provider, onClose, onSuccess }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const isBroadcast = !provider?.id; // No specific provider → broadcast mode

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                onClose();
                navigate('/login');
                return;
            }

            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const payload = isBroadcast
                ? {
                    service_type: provider.service_name,
                    city: provider.city,
                    date,
                    time,
                    address,
                    description
                }
                : {
                    provider_id: provider.id,
                    service_id: provider.service_id,
                    service_type: provider.service_name,
                    city: provider.city,
                    date,
                    time,
                    address,
                    description
                };

            await axios.post(`${API_URL}/bookings`, payload);

            setLoading(false);
            onSuccess();
            onClose();
            navigate('/customer-dashboard');
        } catch (err) {
            console.error('Booking failed:', err);
            setError(err.response?.data?.message || 'Booking failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="booking-modal-overlay">
            <div className="booking-modal">
                <div className="modal-header">
                    <h3>{isBroadcast ? `Request ${provider.service_name}` : `Book ${provider.service_name}`}</h3>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="provider-summary">
                    {isBroadcast ? (
                        <>
                            <div className="broadcast-badge">
                                <Send size={14} /> Broadcasting to all {provider.service_name} providers in {provider.city}
                            </div>
                            <p className="broadcast-hint">
                                Your request will be sent to all available {provider.service_name} providers in {provider.city}.
                                The first provider to accept will be assigned to you, and you'll see their contact details.
                            </p>
                        </>
                    ) : (
                        <>
                            <p><strong>Provider:</strong> {provider.name}</p>
                            <p><strong>Price:</strong> ₹{provider.price}/hr</p>
                        </>
                    )}
                </div>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label><Calendar size={14} /> Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="form-group">
                            <label><Clock size={14} /> Time</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label><MapPin size={14} /> Address</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} required placeholder="Full address for service" />
                    </div>

                    <div className="form-group">
                        <label>Description (what do you need?)</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="Describe what you need help with..."></textarea>
                    </div>

                    <button type="submit" className="confirm-btn" disabled={loading}>
                        {loading
                            ? 'Sending...'
                            : isBroadcast
                                ? `Send Request to All ${provider.service_name}s`
                                : 'Confirm Booking'
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookingModal;
