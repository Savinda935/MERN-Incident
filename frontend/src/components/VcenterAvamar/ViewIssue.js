
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../../css/VcenterAvamar/ViewIssue.css';

const CATEGORIES = ['Vcenter', 'Avamar'];

const normalizeCategory = (value = '') => value.trim().toLowerCase();

const ViewIssue = () => {
    const [issues, setIssues] = useState([]);
    const [editModal, setEditModal] = useState({ open: false, issue: null });

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/vc_am');
                setIssues(response.data);
            } catch (error) {
                console.error('Error fetching issues:', error);
            }
        };
        fetchIssues();
    }, []);

    const handleDelete = async (id) => {
        const issue = issues.find(iss => iss._id === id);
        if (!issue) {
            alert('Issue not found!');
            return;
        }

        const warningMessage = `⚠️ WARNING: You are about to delete this issue permanently!\n\n` +
            `Category: ${issue.category}\n` +
            `Date: ${issue.Date}\n` +
            `Host: ${issue.host}\n` +
            `Status: ${issue.status}\n` +
            `Remarks: ${issue.remarks || 'None'}\n\n` +
            `This action cannot be undone. Are you sure you want to delete this issue?`;

        if (!window.confirm(warningMessage)) {
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/vc_am/${id}`);
            alert('✅ Issue deleted successfully!');
            setIssues(issues.filter(iss => iss._id !== id));
        } catch (error) {
            alert('❌ Error deleting issue: ' + error.message);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const updatedIssue = {
            category: e.target.category.value,
            Date: e.target.Date.value,
            host: e.target.host.value,
            status: e.target.status.value,
            remarks: e.target.remarks.value,
        };

        try {
            await axios.put(`http://localhost:5000/api/vc_am/${editModal.issue._id}`, updatedIssue);
            alert('✅ Issue updated successfully');
            setEditModal({ open: false, issue: null });
            const response = await axios.get('http://localhost:5000/api/vc_am');
            setIssues(response.data);
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const groupedIssues = useMemo(() => {
        return CATEGORIES.reduce((acc, label) => {
            const normalizedLabel = normalizeCategory(label);
            acc[label] = issues.filter(
                issue => normalizeCategory(issue.category) === normalizedLabel
            );
            return acc;
        }, {});
    }, [issues]);

    const renderTable = (title, data) => (
        <div style={{ marginBottom: '24px' }}>
            <h2>{title}</h2>
            {data.length === 0 ? (
                <p>No issues recorded.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Host</th>
                            <th>Status</th>
                            <th>Remarks</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(issue => (
                            <tr key={issue._id}>
                                <td>{issue.Date}</td>
                                <td>{issue.host}</td>
                                <td>{issue.status}</td>
                                <td>{issue.remarks}</td>
                                <td>
                                    <button
                                        onClick={() =>
                                            setEditModal({ open: true, issue })
                                        }
                                        style={{
                                            background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                                            color: 'white',
                                            padding: '6px 12px',
                                            margin: '0 3px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(issue._id)}
                                        style={{
                                            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                                            color: 'white',
                                            padding: '6px 12px',
                                            margin: '0 3px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        🗑️ Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    return (
        <div>
            <h1>Vcenter / Avamar Issues</h1>
            {CATEGORIES.map(label =>
                renderTable(`${label} Issues`, groupedIssues[label] || [])
            )}

            {editModal.open && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={() => setEditModal({ open: false, issue: null })}>
                            ×
                        </span>
                        <h2>Edit Issue</h2>
                        <form onSubmit={handleEditSubmit}>
                            <div className="form-group">
                                <label htmlFor="editCategory">Category:</label>
                                <select
                                    id="editCategory"
                                    name="category"
                                    required
                                    defaultValue={editModal.issue.category}
                                >
                                    <option value="">Select Category</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="editDate">Date:</label>
                                <input
                                    type="date"
                                    id="editDate"
                                    name="Date"
                                    required
                                    defaultValue={editModal.issue.Date}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editHost">Host:</label>
                                <input
                                    type="text"
                                    id="editHost"
                                    name="host"
                                    required
                                    defaultValue={editModal.issue.host}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editStatus">Status:</label>
                                <input
                                    type="text"
                                    id="editStatus"
                                    name="status"
                                    required
                                    defaultValue={editModal.issue.status}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="editRemarks">Remarks:</label>
                                <textarea
                                    id="editRemarks"
                                    name="remarks"
                                    defaultValue={editModal.issue.remarks}
                                />
                            </div>
                            <button type="submit">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewIssue;