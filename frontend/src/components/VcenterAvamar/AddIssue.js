import React, { useState } from 'react';
import axios from 'axios';

const CATEGORY_OPTIONS = ['Vcenter', 'Avamar'];

const AddIssue = () => {
    const [formData, setFormData] = useState({
        category: CATEGORY_OPTIONS[0],
        Date: '',
        host: '',
        status: '',
        remarks: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/vc_am', formData);
            alert('Issue added successfully!');
            setFormData({ category: CATEGORY_OPTIONS[0], Date: '', host: '', status: '', remarks: '' });
        } catch (error) {
            console.error('Error adding issue:', error);
            alert('Failed to add issue.');
        }
    };

    return (
        <div>
            <h1>Add Issue</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Category:</label>
                    <select
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
                <div>
                    <label>Date:</label>
                    <input
                        type="text"
                        name="Date"
                        value={formData.Date}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Host:</label>
                    <input
                        type="text"
                        name="host"
                        value={formData.host}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Status:</label>
                    <input
                        type="text"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div>
                    <label>Remarks:</label>
                    <input
                        type="text"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                    />
                </div>
                <button type="submit">Add Issue</button>
            </form>
        </div>
    );
};

export default AddIssue;