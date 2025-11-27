
import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

    return (
        <div>
            <h1>View Issues</h1>
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
                    {issues.map((issue) => (
                        <tr key={issue._id}>
                            <td>{issue.Date}</td>
                            <td>{issue.host}</td>
                            <td>{issue.status}</td>
                            <td>{issue.remarks}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ViewIssue;