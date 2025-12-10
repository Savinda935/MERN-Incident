
import React, { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import '../../css/VcenterAvamar/ViewIssue.css';
import html2canvas from 'html2canvas';

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

    const tableRefs = useRef({});

    const groupedIssues = useMemo(() => {
        return CATEGORIES.reduce((acc, label) => {
            const normalizedLabel = normalizeCategory(label);
            acc[label] = issues.filter(
                issue => normalizeCategory(issue.category) === normalizedLabel
            );
            return acc;
        }, {});
    }, [issues]);

    const downloadCSV = (title, data) => {
        if (!data || data.length === 0) {
            alert('No data to download.');
            return;
        }
        const headers = ['Date', 'Host', 'Status', 'Remarks'];
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const vals = [row.Date, row.host, row.status, (row.remarks || '').replace(/\n/g, ' ')];
            const escaped = vals.map(v => '"' + String(v ?? '') .replace(/"/g, '""') + '"');
            csvRows.push(escaped.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadImage = async (title, data) => {
        if (!data || data.length === 0) {
            alert('No data to export as image.');
            return;
        }

        // Build a clean table DOM with only Date, Host, Status, Remarks
        const temp = document.createElement('div');
        temp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;background:#fff;padding:20px;';
        const h = document.createElement('h2');
        h.textContent = title;
        h.style.margin = '0 0 12px 0';
        temp.appendChild(h);

        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse;font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif;';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Date', 'Host', 'Status', 'Remarks'].forEach(hdr => {
            const th = document.createElement('th');
            th.textContent = hdr;
            th.style.cssText = 'text-align:left;padding:8px;border-bottom:1px solid #ddd;background:#f5f5f5;font-weight:700;';
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            const cells = [row.Date, row.host, row.status, (row.remarks || '').replace(/\n/g, ' ')];
            cells.forEach(text => {
                const td = document.createElement('td');
                td.textContent = text ?? '';
                td.style.cssText = 'padding:8px;border-bottom:1px solid #eee;';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        temp.appendChild(table);
        document.body.appendChild(temp);

        try {
            const canvas = await html2canvas(temp, { backgroundColor: '#fff', scale: 2 });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Image export failed', err);
            alert('Failed to export image.');
        } finally {
            document.body.removeChild(temp);
        }
    };

    const renderTable = (title, data) => (
        <div style={{ marginBottom: '24px' }} ref={el => (tableRefs.current[title] = el)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{title}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => downloadCSV(title, data)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#3498db', color: '#fff' }}
                    >Download CSV</button>
                    <button
                        onClick={() => downloadImage(title, data)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#28a745', color: '#fff' }}
                    >Download Image</button>
                </div>
            </div>
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