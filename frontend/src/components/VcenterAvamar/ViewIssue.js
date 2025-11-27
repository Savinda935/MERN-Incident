
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const CATEGORIES = ['Vcenter', 'Avamar'];

const normalizeCategory = (value = '') => value.trim().toLowerCase();

const ViewIssue = () => {
    const [issues, setIssues] = useState([]);

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
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(issue => (
                            <tr key={issue._id}>
                                <td>{issue.Date}</td>
                                <td>{issue.host}</td>
                                <td>{issue.status}</td>
                                <td>{issue.remarks}</td>
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
        </div>
    );
};

export default ViewIssue;