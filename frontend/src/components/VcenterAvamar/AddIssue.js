import React, { useState } from 'react';
import axios from 'axios';
import '../../css/VcenterAvamar/AddIssue.css';

const CATEGORY_OPTIONS = ['Vcenter', 'Avamar'];

const AddIssue = () => {
    const [formData, setFormData] = useState({
        category: CATEGORY_OPTIONS[0],
        Date: '',
        host: '',
        status: '',
        remarks: '',
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        // Clear message when user starts typing
        if (message.text) {
            setMessage({ type: '', text: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await axios.post('http://localhost:5000/api/vc_am', formData);
            setMessage({ type: 'success', text: 'Issue added successfully!' });
            setFormData({ 
                category: CATEGORY_OPTIONS[0], 
                Date: '', 
                host: '', 
                status: '', 
                remarks: '' 
            });
        } catch (error) {
            console.error('Error adding issue:', error);
            setMessage({ 
                type: 'error', 
                text: 'Failed to add issue. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-issue-container">
            <div className="add-issue-wrapper">
                <h1 className="add-issue-title">Add New Issue</h1>
                <p className="add-issue-subtitle">Fill in the details to report a new issue</p>

                {message.text && (
                    <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
                        {message.type === 'success' ? '✓ ' : '✗ '}
                        {message.text}
                    </div>
                )}

                <form className="add-issue-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">
                            Category <span className="required-indicator">*</span>
                        </label>
                        <select
                            className="form-select"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            required
                        >
                            {CATEGORY_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Date <span className="required-indicator">*</span>
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            name="Date"
                            value={formData.Date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Host <span className="required-indicator">*</span>
                        </label>
                        <input
                            className="form-input"
                            type="text"
                            name="host"
                            value={formData.host}
                            onChange={handleChange}
                            placeholder="Enter host name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Status <span className="required-indicator">*</span>
                        </label>
                        <input
                            className="form-input"
                            type="text"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            placeholder="Enter status"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Remarks
                        </label>
                        <textarea
                            className="form-textarea"
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            placeholder="Add any additional remarks (optional)"
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={`submit-button ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {!loading && <span className="button-icon">✓</span>}
                        {loading ? 'Adding Issue...' : 'Add Issue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddIssue;