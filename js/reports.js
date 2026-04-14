document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadSidebar();
    initReportExport();
});

function initReportExport() {
    const generateBtn = document.getElementById('generateCsvBtn');
    const topExportBtn = document.getElementById('topExportBtn');

    if (generateBtn) {
        generateBtn.addEventListener('click', handleCsvExport);
    }
    if (topExportBtn) {
        topExportBtn.addEventListener('click', handleCsvExport);
    }
}

function setReportMessage(message, type) {
    const msgEl = document.getElementById('reportMessage');
    if (!msgEl) return;
    
    if (!message) {
        msgEl.className = 'status-message';
        msgEl.textContent = '';
        return;
    }

    msgEl.className = `status-message ${type}`;
    msgEl.textContent = message;
}

// Escapes fields that might have quotes, commas, or newlines in them
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

async function handleCsvExport() {
    const loader = document.getElementById('loader');
    const btns = [document.getElementById('generateCsvBtn'), document.getElementById('topExportBtn')];
    
    setReportMessage('', '');
    loader.style.display = 'block';
    btns.forEach(b => { if(b) { b.disabled = true; b.textContent = 'Generating...'; }});

    try {
        const token = getAuthToken();
        // Get date values
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        let url = `${API_BASE}/reports/csv`;
        const params = [];
        if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
        if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
        if (params.length > 0) url += `?${params.join('&')}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error((errData && errData.message) || 'Failed to download report from backend API. Please make sure the backend is updated.');
        }

        // Stream raw CSV Blob natively from backend
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Extract dynamic filename from server
        let filename = `RiskGuard_Master_Report_${new Date().toISOString().split('T')[0]}.csv`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        
        const link = document.createElement("a");
        link.setAttribute("href", blobUrl);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setReportMessage('Successfully downloaded latest Master Report straight from the global database!', 'success');

    } catch(err) {
        setReportMessage(err.message || 'An error occurred during generation.', 'error');
    } finally {
        loader.style.display = 'none';
        
        if (btns[0]) {
            btns[0].disabled = false;
            btns[0].innerHTML = '<span style="margin-right: 8px;">📥</span> Download Master CSV Report';
        }
        if (btns[1]) {
            btns[1].disabled = false;
            btns[1].textContent = 'Quick Export CSV';
        }
    }
}
