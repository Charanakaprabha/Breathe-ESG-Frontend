import React, { useState, useEffect } from 'react';
import api from './services/api';
import { 
  Database, Upload, AlertTriangle, CheckCircle, 
  Lock, FileText, Search, Filter, RefreshCw, X,
  LayoutDashboard, History, User, Settings, Shield,
  Activity, BarChart3, ChevronLeft, ChevronRight, ClipboardList, Info,
  Cloud, Flame, Zap, Plane, Building2, Calendar, ChevronDown, Eye, Pencil, Check,
  Menu
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import logo from './logo.png';

// Custom Tooltip for Recharts Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        zIndex: 50
      }}>
        <p style={{ margin: 0, fontWeight: '700', color: data.color, fontSize: '0.85rem' }}>{data.name}</p>
        <p style={{ margin: '0.25rem 0 0 0', color: '#f8fafc', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {payload[0].value.toFixed(2)} tCO₂e
        </p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Recharts Bar Chart
const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        zIndex: 50
      }}>
        <p style={{ margin: 0, fontWeight: '700', color: '#f8fafc', fontSize: '0.85rem' }}>{payload[0].payload.name}</p>
        <p style={{ margin: '0.25rem 0 0 0', color: '#3b82f6', fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {payload[0].value.toFixed(2)} tCO₂e
        </p>
      </div>
    );
  }
  return null;
};

const App = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('esg_site_authenticated') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginUsername === 'Admin' && loginPassword === 'Admin@5583') {
      setIsAuthenticated(true);
      localStorage.setItem('esg_site_authenticated', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid Administrator credentials.');
    }
  };

  // Core State
  const [records, setRecords] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    total_co2e: 0.0,
    pending_count: 0,
    flagged_count: 0,
    locked_count: 0,
    total_records: 0,
    scopes: { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 }
  });

  // Navigation and Simulated Role/Organization/Date states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [persons, setPersons] = useState([
    { name: 'Admin', email: 'admin@breatheesg.com', role: 'Super Admin', initials: 'AD' }
  ]);
  const [activePersonIndex, setActivePersonIndex] = useState(0);
  const currentUser = persons[activePersonIndex];
  const userRole = currentUser.role;

  // Add workspace organizations list
  const [organizations, setOrganizations] = useState(['Breathe-ESG test workspace']);
  const [activeOrg, setActiveOrg] = useState('Breathe-ESG test workspace');
  const [newOrgName, setNewOrgName] = useState('');
  const [showAddOrgForm, setShowAddOrgForm] = useState(false);

  // Settings page Team members inputs
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('ESG Analyst');
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);

  const [reportingDateRange, setReportingDateRange] = useState('May 1 - May 31, 2026');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [viewAllModalType, setViewAllModalType] = useState(null); // 'suspicious' | 'pending' | null

  const formatSourceType = (src) => {
    if (src === 'SAP') return 'Fuel';
    if (src === 'Utility') return 'Electricity';
    if (src === 'Travel') return 'Travel';
    return src;
  };

  // Switch workspace tenant contexts and flush/fetch data
  const switchWorkspace = (orgName) => {
    setActiveOrg(orgName);
    if (orgName === 'Breathe-ESG test workspace') {
      fetchData();
    } else {
      setRecords([]);
      setStats({
        total_co2e: 0.0,
        pending_count: 0,
        flagged_count: 0,
        locked_count: 0,
        total_records: 0,
        scopes: { 'Scope 1': 0, 'Scope 2': 0, 'Scope 3': 0 }
      });
      setBatches([]);
    }
    showToast('success', `Workspace tenant set to: ${orgName}`);
  };

  const handleAddOrganization = (e) => {
    e.preventDefault();
    const trimmed = newOrgName.trim();
    if (!trimmed) return;
    if (organizations.includes(trimmed)) {
      showToast('danger', 'Workspace already exists.');
      return;
    }
    const updated = [...organizations, trimmed];
    setOrganizations(updated);
    switchWorkspace(trimmed);
    setNewOrgName('');
    setShowAddOrgForm(false);
  };

  const handleAddPerson = (e) => {
    e.preventDefault();
    if (!newPersonName.trim() || !newPersonEmail.trim()) {
      showToast('danger', 'Please enter a name and email.');
      return;
    }
    const parts = newPersonName.trim().split(' ');
    const initials = parts.map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'U';
    const newPerson = {
      name: newPersonName.trim(),
      email: newPersonEmail.trim(),
      role: newPersonRole,
      initials
    };
    setPersons([...persons, newPerson]);
    setNewPersonName('');
    setNewPersonEmail('');
    setNewPersonRole('ESG Analyst');
    setShowAddPersonForm(false);
    showToast('success', `Added team member: ${newPerson.name}`);
  };

  const setUserRole = (role) => {
    const updated = [...persons];
    updated[activePersonIndex] = { ...updated[activePersonIndex], role };
    setPersons(updated);
  };

  // Review Queue Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [suspiciousFilter, setSuspiciousFilter] = useState('');
  const [search, setSearch] = useState('');

  // Dashboard Sub-tables Pagination States (5 records per view)
  const [uploadPage, setUploadPage] = useState(1);
  const [suspPage, setSuspPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);

  // Detail Drawer and Modals State
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [drawerComments, setDrawerComments] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [rawRecordModal, setRawRecordModal] = useState(null);
  
  // Ingest state tracker per source
  const [uploadingSource, setUploadingSource] = useState(null); // 'SAP' | 'Utility' | 'Travel' | null
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Client Side Audit Logs state (persisted in localStorage)
  const [auditLogs, setAuditLogs] = useState([]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/audit-logs/');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  // Log compliance actions to centralized audit logs database
  const logAuditAction = async (action, details, targetId = null, targetCategory = '', targetScope = '') => {
    const payload = {
      action,
      user_name: currentUser.name,
      user_role: currentUser.role,
      details,
      record_id: targetId,
      record_category: targetCategory,
      record_scope: targetScope
    };

    try {
      await api.post('/audit-logs/create/', payload);
      fetchAuditLogs();
    } catch (err) {
      console.error('Failed to log compliance action:', err);
    }
  };

  const fetchData = async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await api.get('/dashboard/stats/');
      setStats(statsRes.data);

      // 2. Fetch Records
      const params = {
        status: statusFilter,
        source_type: sourceFilter,
        suspicious: suspiciousFilter,
        search: search
      };
      const recsRes = await api.get('/records/', { params });
      setRecords(recsRes.data);

      // 3. Fetch Batches
      const batchesRes = await api.get('/batches/');
      setBatches(batchesRes.data);

      // 4. Fetch Audit Logs
      await fetchAuditLogs();
    } catch (err) {
      showToast('danger', 'Failed to retrieve ESG ledger details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, sourceFilter, suspiciousFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  // Upload CSV API trigger
  const performUpload = async (sourceType, csvText, fileName) => {
    if (userRole === 'Viewer / Auditor') {
      showToast('danger', 'Action Denied: Viewer/Auditor has read-only access.');
      return;
    }
    setUploadingSource(sourceType);

    const blob = new Blob([csvText], { type: 'text/csv' });
    const file = new File([blob], fileName, { type: 'text/csv' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_type', sourceType);

    try {
      const response = await api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { batch } = response.data;
      
      showToast('success', `Ingestion Complete! Ingested ${batch.processed_rows} rows from ${fileName}.`);
      
      // Log audit entry
      logAuditAction(
        'upload',
        `CSV file "${fileName}" parsed successfully. Ingested ${batch.processed_rows} valid rows, failed ${batch.failed_rows} rows, flagged ${batch.flagged_rows} warnings.`,
        batch.id,
        fileName,
        sourceType
      );

      fetchData();
    } catch (err) {
      showToast('danger', `Pipeline failed: ${err.response?.data?.error || 'Unresolved mapping error.'}`);
    } finally {
      setUploadingSource(null);
    }
  };

  // File drop handler
  const handleDrop = (e, sourceType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        showToast('danger', 'Gateway accepts CSV spreadsheets only.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        performUpload(sourceType, evt.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  // File selector handler
  const handleFileSelect = (e, sourceType) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        performUpload(sourceType, evt.target.result, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Approve & Lock Action
  const handleApprove = async (id) => {
    if (userRole === 'Viewer / Auditor') {
      showToast('danger', 'Action Denied: Viewer/Auditor has read-only access.');
      return;
    }
    try {
      const res = await api.post(`/records/${id}/approve/`);
      const updatedRecord = res.data;
      showToast('success', `Normalized record #${id} validated and locked for audit.`);
      
      // Log audit
      logAuditAction(
        'approve',
        `Record #${id} verified and locked for regulatory compliance sign-off.`,
        id,
        updatedRecord.activity_type,
        updatedRecord.scope
      );

      // Close drawer if open and edit state
      if (drawerRecord && drawerRecord.id === id) {
        setDrawerRecord({ ...drawerRecord, status: 'Approved', locked: true });
      }

      fetchData();
    } catch (err) {
      showToast('danger', err.response?.data?.error || 'Approval rejected.');
    }
  };

  // Reject Action
  const handleReject = async (id) => {
    if (userRole === 'Viewer / Auditor') {
      showToast('danger', 'Action Denied: Viewer/Auditor has read-only access.');
      return;
    }
    try {
      const res = await api.post(`/records/${id}/reject/`);
      const updatedRecord = res.data;
      showToast('warning', `Record #${id} flagged as Discarded/Rejected.`);
      
      // Log audit
      logAuditAction(
        'reject',
        `Record #${id} marked as rejected / discarded.`,
        id,
        updatedRecord.activity_type,
        updatedRecord.scope
      );

      // Close drawer if open and edit state
      if (drawerRecord && drawerRecord.id === id) {
        setDrawerRecord({ ...drawerRecord, status: 'Rejected' });
      }

      fetchData();
    } catch (err) {
      showToast('danger', 'Rejection rejected.');
    }
  };

  // Comments feed operations (stored locally)
  const addComment = (recordId) => {
    if (!newCommentText.trim()) return;

    const newComment = {
      id: Date.now(),
      author: currentUser.name,
      role: currentUser.role,
      text: newCommentText,
      timestamp: new Date().toLocaleTimeString()
    };

    const recordComments = drawerComments[recordId] || [];
    setDrawerComments({
      ...drawerComments,
      [recordId]: [...recordComments, newComment]
    });

    setNewCommentText('');
    showToast('success', 'Comment published in review timeline.');
  };

  // Inline edits (client-side updates to mock database changes)
  const saveQuantityEdit = (recordId, newQty) => {
    const numericQty = parseFloat(newQty);
    if (isNaN(numericQty)) {
      showToast('danger', 'Please enter a valid numeric quantity.');
      return;
    }

    // Find the record and recalculate estimate based on factor
    const recordIndex = records.findIndex(r => r.id === recordId);
    if (recordIndex !== -1) {
      const oldRec = records[recordIndex];
      
      // Calculate multiplier
      const oldQty = oldRec.normalized_quantity;
      const factor = oldRec.co2e_estimate / (oldQty || 1);
      const newEstimate = Math.round(numericQty * factor * 100) / 100;

      // Update in local records state
      const updatedRecords = [...records];
      updatedRecords[recordIndex] = {
        ...oldRec,
        normalized_quantity: numericQty,
        co2e_estimate: newEstimate,
        normalization_metadata: {
          ...oldRec.normalization_metadata,
          raw_value: numericQty,
          calculation_formula: `Standardized quantity (${numericQty} ${oldRec.normalized_unit}) * emissions factor`
        }
      };
      setRecords(updatedRecords);

      // Update drawer
      setDrawerRecord(updatedRecords[recordIndex]);

      // Audit Log
      logAuditAction(
        'edit',
        `Corrected activity quantity from ${oldQty} to ${numericQty}. Recalculated carbon output to ${(newEstimate / 1000).toFixed(2)} t.`,
        recordId,
        oldRec.activity_type,
        oldRec.scope
      );

      showToast('success', 'Ledger quantities corrected and carbon emissions recalculated.');
    }
  };

  // Calculate totals and statistics for rendering
  const totalEmissionsTons = stats.total_co2e / 1000;
  const scope1Tons = (stats.scopes['Scope 1'] || 0) / 1000;
  const scope2Tons = (stats.scopes['Scope 2'] || 0) / 1000;
  const scope3Tons = (stats.scopes['Scope 3'] || 0) / 1000;

  // Pie chart scope dataset
  const scopePieData = [
    { name: 'Scope 1', value: scope1Tons, color: 'var(--scope-1)' },
    { name: 'Scope 2', value: scope2Tons, color: 'var(--scope-2)' },
    { name: 'Scope 3', value: scope3Tons, color: 'var(--scope-3)' }
  ];

  // Bar chart source dataset (calculated dynamically)
  const getSourceChartData = () => {
    let sapSum = 0;
    let utilitySum = 0;
    let travelSum = 0;

    records.forEach(rec => {
      if (rec.status === 'Approved') {
        const val = rec.co2e_estimate / 1000;
        if (rec.source_type === 'SAP') sapSum += val;
        else if (rec.source_type === 'Utility') utilitySum += val;
        else if (rec.source_type === 'Travel') travelSum += val;
      }
    });

    return [
      { name: 'Fuel', emissions: parseFloat(sapSum.toFixed(2)), color: 'var(--scope-1)' },
      { name: 'Electricity', emissions: parseFloat(utilitySum.toFixed(2)), color: 'var(--scope-2)' },
      { name: 'Travel', emissions: parseFloat(travelSum.toFixed(2)), color: 'var(--scope-3)' }
    ];
  };

  // --- Rendering Dashboard View Tab ---
  const renderDashboardTab = () => {
    // Local pagination indices
    const uploadPageSize = 5;
    const suspPageSize = 5;
    const pendingPageSize = 5;

    // Filter sub-datasets
    const suspiciousRecordsList = records.filter(r => r.suspicious);
    const pendingRecordsList = records.filter(r => r.status === 'Pending');

    const totalUploads = batches.length;
    const totalSuspicious = suspiciousRecordsList.length;
    const totalPending = pendingRecordsList.length;

    const displayedUploads = batches.slice((uploadPage - 1) * uploadPageSize, uploadPage * uploadPageSize);
    const displayedSuspicious = suspiciousRecordsList.slice((suspPage - 1) * suspPageSize, suspPage * suspPageSize);
    const displayedPending = pendingRecordsList.slice((pendingPage - 1) * pendingPageSize, pendingPage * pendingPageSize);

    // Dynamic calculations for data quality footer
    const totalRowsIngested = batches.reduce((sum, b) => sum + b.total_rows, 0);
    const totalFailedRows = batches.reduce((sum, b) => sum + b.failed_rows, 0);
    const totalSuccessRows = batches.reduce((sum, b) => sum + b.processed_rows, 0);

    const validationSuccessRate = totalRowsIngested > 0 ? ((totalSuccessRows / totalRowsIngested) * 100).toFixed(1) : '0.0';
    const validationFailedRate = totalRowsIngested > 0 ? ((totalFailedRows / totalRowsIngested) * 100).toFixed(1) : '0.0';

    return (
      <div className="fade-in" style={styles.dashboardContainer}>
        
        {/* Top KPI Cards Row */}
        <div className="dashboard-kpi-grid">
          {/* Card 1: Total Emissions */}
          <div className="glass-card dashboard-kpi-card kpi-total-card">
            <div style={styles.kpiHeader}>
              <div>
                <span style={styles.kpiLabel}>Total Emissions</span>
                <h3 style={styles.kpiValue}>
                  {totalEmissionsTons.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span style={styles.kpiUnit}>tCO₂e</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(124, 58, 237, 0.1)', color: 'var(--scope-3)' }}>
                <Cloud size={24} />
              </div>
            </div>
            <div style={styles.kpiFooter}>
              Regulatory Reporting Period
            </div>
          </div>

          {/* Card 5: Pending Reviews */}
          <div className="glass-card dashboard-kpi-card kpi-pending-card">
            <div style={styles.kpiHeader}>
              <div>
                <span style={styles.kpiLabel}>Pending Reviews</span>
                <h3 style={{ ...styles.kpiValue, color: 'var(--warning)' }}>{stats.pending_count}</h3>
                <span style={styles.kpiUnit}>Records</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(234, 88, 12, 0.1)', color: 'var(--warning)' }}>
                <FileText size={24} />
              </div>
            </div>
            <div style={{ ...styles.kpiFooter, color: 'var(--warning)', fontWeight: '600' }}>
              Needs your attention
            </div>
          </div>

          {/* Card 6: Suspicious Records */}
          <div className="glass-card dashboard-kpi-card kpi-suspicious-card">
            <div style={styles.kpiHeader}>
              <div>
                <span style={styles.kpiLabel}>Suspicious Records</span>
                <h3 style={{ ...styles.kpiValue, color: 'var(--danger)' }}>{stats.flagged_count}</h3>
                <span style={styles.kpiUnit}>Records</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                <AlertTriangle size={24} />
              </div>
            </div>
            <div style={{ ...styles.kpiFooter, color: 'var(--danger)', fontWeight: '600' }}>
              Requires review
            </div>
          </div>

          {/* Card 2: Scope 1 Emissions */}
          <div className="glass-card dashboard-kpi-card kpi-scope1-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ ...styles.kpiHeader, position: 'relative', zIndex: 2 }}>
              <div>
                <span style={styles.kpiLabel}>Scope 1 Emissions</span>
                <h3 style={styles.kpiValue}>
                  {scope1Tons.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span style={styles.kpiUnit}>tCO₂e</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--scope-1)' }}>
                <Flame size={24} />
              </div>
            </div>
            <div style={{ ...styles.kpiFooter, position: 'relative', zIndex: 2 }}>
              Direct Combustion Sources
            </div>
            <svg 
              className="scope-wave-svg" 
              style={{
                position: 'absolute',
                right: 0,
                bottom: '26px',
                width: '120px',
                height: '70px',
                zIndex: 1
              }} 
              viewBox="0 0 120 70" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="scope1-wave-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="scope1-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30 L 120 70 L 0 70 Z" fill="url(#scope1-wave-grad)" />
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30" stroke="url(#scope1-line-grad)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 3: Scope 2 Emissions */}
          <div className="glass-card dashboard-kpi-card kpi-scope2-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ ...styles.kpiHeader, position: 'relative', zIndex: 2 }}>
              <div>
                <span style={styles.kpiLabel}>Scope 2 Emissions</span>
                <h3 style={styles.kpiValue}>
                  {scope2Tons.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span style={styles.kpiUnit}>tCO₂e</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--scope-2)' }}>
                <Zap size={24} />
              </div>
            </div>
            <div style={{ ...styles.kpiFooter, position: 'relative', zIndex: 2 }}>
              Purchased Energy & Electricity
            </div>
            <svg 
              className="scope-wave-svg" 
              style={{
                position: 'absolute',
                right: 0,
                bottom: '26px',
                width: '120px',
                height: '70px',
                zIndex: 1
              }} 
              viewBox="0 0 120 70" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="scope2-wave-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="scope2-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30 L 120 70 L 0 70 Z" fill="url(#scope2-wave-grad)" />
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30" stroke="url(#scope2-line-grad)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Card 4: Scope 3 Emissions */}
          <div className="glass-card dashboard-kpi-card kpi-scope3-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ ...styles.kpiHeader, position: 'relative', zIndex: 2 }}>
              <div>
                <span style={styles.kpiLabel}>Scope 3 Emissions</span>
                <h3 style={styles.kpiValue}>
                  {scope3Tons.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </h3>
                <span style={styles.kpiUnit}>tCO₂e</span>
              </div>
              <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(234, 88, 12, 0.1)', color: 'var(--scope-3)' }}>
                <Plane size={24} />
              </div>
            </div>
            <div style={{ ...styles.kpiFooter, position: 'relative', zIndex: 2 }}>
              Indirect Scope 3 Value Chain
            </div>
            <svg 
              className="scope-wave-svg" 
              style={{
                position: 'absolute',
                right: 0,
                bottom: '26px',
                width: '120px',
                height: '70px',
                zIndex: 1
              }} 
              viewBox="0 0 120 70" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="scope3-wave-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="scope3-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ea580c" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#ea580c" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30 L 120 70 L 0 70 Z" fill="url(#scope3-wave-grad)" />
              <path d="M 0 55 C 30 65, 45 35, 70 45 C 95 55, 105 25, 120 30" stroke="url(#scope3-line-grad)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* Animated Upload Data Shortcut Card */}
          <div 
            className="glass-card dashboard-kpi-card upload-shortcut-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: '1.5px dashed rgba(var(--primary-rgb), 0.4)',
              textAlign: 'center',
              padding: '2rem 1.5rem',
              height: '100%',
              minHeight: '260px'
            }}
            onClick={() => setActiveTab('upload')}
          >
            <div className="upload-shortcut-icon-wrapper" style={{
              backgroundColor: 'var(--primary-glow)',
              color: 'var(--primary)',
              borderRadius: '50%',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '2px solid rgba(var(--primary-rgb), 0.2)',
              boxShadow: '0 0 15px rgba(var(--primary-rgb), 0.2)'
            }}>
              <Upload size={32} className="pulse-icon" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Upload Ingestion</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
              Drag & drop CSV files to automatically map and import records.
            </p>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              color: 'var(--primary)', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              Quick Access Gateways &rarr;
            </span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="dashboard-charts-grid">
          {/* Emissions by Scope Pie/Donut Chart */}
          <div className="glass-card dashboard-chart-card">
            <div style={styles.chartBlockHeader}>
              <h4 style={styles.chartBlockTitle}>Emissions by Scope</h4>
              <select style={styles.cardHeaderSelect}>
                <option>This Month</option>
                <option>This Quarter</option>
                <option>Full Year</option>
              </select>
            </div>
            <div className="donut-chart-container">
              <div style={styles.pieWrapper}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={scopePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {scopePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center total metric overlay */}
                <div style={styles.donutCenterLabel}>
                  <span style={styles.centerValText}>
                    {totalEmissionsTons.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  <span style={styles.centerUnitText}>tCO₂e Total</span>
                </div>
              </div>
              
              {/* Legend checklist */}
              <div className="donut-legend-list">
                {scopePieData.map((item, idx) => {
                  const totalVal = scope1Tons + scope2Tons + scope3Tons;
                  const pct = totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(1) : '0.0';
                  const finalVal = totalVal > 0 ? item.value.toFixed(2) : '0.00';

                  return (
                    <div key={idx} style={styles.legendItemRow}>
                      <span style={{ ...styles.legendDot, backgroundColor: item.color }}></span>
                      <div style={styles.legendTextWrapper}>
                        <span style={styles.legendScopeName}>{item.name}</span>
                        <span style={styles.legendScopeMetric}>{finalVal} tCO₂e ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Emissions by Source Bar Chart */}
          <div className="glass-card dashboard-chart-card">
            <div style={styles.chartBlockHeader}>
              <h4 style={styles.chartBlockTitle}>Emissions by Source</h4>
              <select style={styles.cardHeaderSelect}>
                <option>This Month</option>
                <option>This Quarter</option>
                <option>Full Year</option>
              </select>
            </div>
            <div className="bar-chart-container">
              <span style={styles.yAxisLabel}>tCO₂e</span>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={getSourceChartData()} margin={{ top: 25, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 800]}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar 
                    dataKey="emissions" 
                    radius={[6, 6, 0, 0]} 
                    barSize={60}
                    label={{ position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: '700', offset: 8 }}
                  >
                    {getSourceChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Lower Tables Section */}
        <div className="dashboard-tables-grid">

          {/* Card B: Suspicious Records */}
          <div className="glass-card dashboard-table-card">
            <div style={styles.tableCardHeader}>
              <h4 style={styles.tableCardTitle}>Suspicious Records</h4>
              <button 
                style={styles.viewAllButton} 
                onClick={() => setViewAllModalType('suspicious')}
              >
                View All
              </button>
            </div>
            <div className="table-scroller">
              <table style={styles.miniTable}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSuspicious.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={styles.emptyTableRow}>No anomalous records found.</td>
                    </tr>
                  ) : (
                    displayedSuspicious.map((rec, index) => (
                      <tr key={index}>
                        <td>
                          <span style={{ color: rec.source_type === 'SAP' ? 'var(--scope-1)' : rec.source_type === 'Utility' ? 'var(--scope-2)' : 'var(--scope-3)', fontWeight: '600' }}>
                            {formatSourceType(rec.source_type)}
                          </span>
                        </td>
                        <td style={styles.issueTextCell} title={rec.suspicious_reason}>{rec.suspicious_reason}</td>
                        <td>
                          <span className={`badge ${rec.suspicious_reason && (rec.suspicious_reason.includes('Negative') || rec.suspicious_reason.includes('5x')) ? 'badge-rejected' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                            {rec.suspicious_reason && (rec.suspicious_reason.includes('Negative') || rec.suspicious_reason.includes('5x')) ? 'High' : 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer */}
            {totalSuspicious > 0 && (
              <div style={styles.tableCardFooter}>
                <span style={styles.footerCountText}>
                  Showing {Math.min(displayedSuspicious.length, suspPageSize)} of {totalSuspicious} records
                </span>
                <div style={styles.arrowPagination}>
                  <button 
                    style={styles.pagArrowBtn} 
                    disabled={suspPage === 1}
                    onClick={() => setSuspPage(suspPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    style={styles.pagArrowBtn} 
                    disabled={suspPage * suspPageSize >= totalSuspicious}
                    onClick={() => setSuspPage(suspPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card C: Pending Review Queue */}
          <div className="glass-card dashboard-table-card">
            <div style={styles.tableCardHeader}>
              <h4 style={styles.tableCardTitle}>Pending Review Queue</h4>
              <button style={styles.viewAllButton} onClick={() => setViewAllModalType('pending')}>View All</button>
            </div>
            <div className="table-scroller">
              <table style={styles.miniTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Source</th>
                    <th>Scope</th>
                    <th>CO₂e (t)</th>
                    <th>Suspicious</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPending.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={styles.emptyTableRow}>No records awaiting approval.</td>
                    </tr>
                  ) : (
                    displayedPending.map((rec, index) => (
                      <tr key={index}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>#{rec.id}</td>
                        <td>
                          <span style={{ color: rec.source_type === 'SAP' ? 'var(--scope-1)' : rec.source_type === 'Utility' ? 'var(--scope-2)' : 'var(--scope-3)', fontWeight: '600' }}>
                            {formatSourceType(rec.source_type)}
                          </span>
                        </td>
                        <td>{rec.scope}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>
                          {(rec.co2e_estimate / 1000).toFixed(2)}
                        </td>
                        <td>
                          <span style={{ color: rec.suspicious ? 'var(--danger)' : 'var(--success)', fontWeight: '700' }}>
                            {rec.suspicious ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <div style={styles.miniActionsWrapper}>
                            <button 
                              style={styles.miniActBtn} 
                              title="Explore Raw" 
                              onClick={() => setRawRecordModal(rec)}
                            >
                              <Eye size={12} />
                            </button>
                            <button 
                              style={styles.miniActBtn} 
                              title="Edit Drawer" 
                              onClick={() => {
                                setDrawerRecord(rec);
                                setIsEditingDrawer(false);
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              style={{ ...styles.miniActBtn, color: 'var(--success)' }} 
                              title="Quick Approve"
                              onClick={() => handleApprove(rec.id)}
                              disabled={userRole === 'Viewer / Auditor'}
                            >
                              <Check size={12} />
                            </button>
                            <button 
                              style={{ ...styles.miniActBtn, color: 'var(--danger)' }} 
                              title="Quick Reject"
                              onClick={() => handleReject(rec.id)}
                              disabled={userRole === 'Viewer / Auditor'}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer */}
            {totalPending > 0 && (
              <div style={styles.tableCardFooter}>
                <span style={styles.footerCountText}>
                  Showing {Math.min(displayedPending.length, pendingPageSize)} of {totalPending} records
                </span>
                <div style={styles.arrowPagination}>
                  <button 
                    style={styles.pagArrowBtn} 
                    disabled={pendingPage === 1}
                    onClick={() => setPendingPage(pendingPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    style={styles.pagArrowBtn} 
                    disabled={pendingPage * pendingPageSize >= totalPending}
                    onClick={() => setPendingPage(pendingPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Data Quality Summary Card */}
        <div className="glass-card dashboard-quality-card">
          <div style={styles.qualityHeader}>
            <h4 style={styles.qualityTitle}>Data Quality Summary</h4>
          </div>
          <div style={styles.qualityItemsWrapper}>
            <div style={styles.qualityItem}>
              <CheckCircle size={18} color="var(--success)" />
              <span style={styles.qualityVal}>{validationSuccessRate}%</span>
              <span style={styles.qualityLabel}>Validation Success</span>
            </div>
            <div style={styles.qualityItem}>
              <X size={18} color="var(--danger)" />
              <span style={styles.qualityVal}>{validationFailedRate}%</span>
              <span style={styles.qualityLabel}>Validation Failed</span>
            </div>
            <div style={styles.qualityItem}>
              <FileText size={18} color="var(--scope-3)" />
              <span style={styles.qualityVal}>5</span>
              <span style={styles.qualityLabel}>Duplicate Records</span>
            </div>
            <div style={styles.qualityItem}>
              <RefreshCw size={18} color="var(--primary)" />
              <span style={styles.qualityVal}>{stats.total_records}</span>
              <span style={styles.qualityLabel}>Normalized Records</span>
            </div>
            <div style={styles.qualityItem}>
              <ClipboardList size={18} color="var(--warning)" />
              <span style={styles.qualityVal}>{stats.pending_count}</span>
              <span style={styles.qualityLabel}>Pending Reviews</span>
            </div>
            <div style={styles.qualityItem}>
              <AlertTriangle size={18} color="var(--danger)" />
              <span style={styles.qualityVal}>{stats.flagged_count}</span>
              <span style={styles.qualityLabel}>Suspicious Records</span>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // --- Upload Data Ingestion Tab View ---
  const renderUploadTab = () => {
    return (
      <div className="fade-in" style={styles.uploadTabContainer}>
        <div className="upload-gateways-grid">
          {/* Gateway 1: SAP Fuel ERP */}
          <div className="glass-card upload-gateway-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="gateway-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--scope-1)' }}>
                <Database size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Fuel</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Scope 1 Emissions</span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Ingest direct diesel, petrol, and natural gas quantities (Scope 1).
            </p>

            <div className="gateway-extract-section">
              <h4 className="gateway-extract-title">What we extract</h4>
              <div className="gateway-extract-list">
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Fuel type and quantities</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Plant/Location mapping</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Emission calculation (Scope 1)</span>
                </div>
              </div>
            </div>

            {/* Drag drop zone */}
            <div 
              className="upload-box upload-box-sap"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'SAP')}
            >
              <Upload size={32} color="var(--scope-1)" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag & drop CSV file here or</span>
              <label className="upload-btn-choose upload-btn-choose-sap">
                Choose CSV File
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'SAP')} disabled={uploadingSource === 'SAP'} />
              </label>
            </div>

            <button 
              className="gateway-action-btn gateway-action-btn-sap"
              onClick={() => {
                const fileInput = document.getElementById('sap-file-input');
                if (fileInput) fileInput.click();
              }}
              disabled={uploadingSource === 'SAP'}
            >
              <Upload size={16} />
              <span>{uploadingSource === 'SAP' ? 'Uploading...' : 'Upload File'}</span>
            </button>
            <input id="sap-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'SAP')} />
          </div>

          {/* Gateway 2: Utility Electricity */}
          <div className="glass-card upload-gateway-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="gateway-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--scope-2)' }}>
                <Zap size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Electricity</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Scope 2 Emissions</span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Parse facility electricity logs and kWh consumption bills (Scope 2).
            </p>

            <div className="gateway-extract-section">
              <h4 className="gateway-extract-title">What we extract</h4>
              <div className="gateway-extract-list">
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Meter & billing period</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>kWh consumption</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Emission calculation (Scope 2)</span>
                </div>
              </div>
            </div>

            {/* Drag drop zone */}
            <div 
              className="upload-box upload-box-utility"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'Utility')}
            >
              <Upload size={32} color="var(--scope-2)" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag & drop CSV file here or</span>
              <label className="upload-btn-choose upload-btn-choose-utility">
                Choose CSV File
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'Utility')} disabled={uploadingSource === 'Utility'} />
              </label>
            </div>

            <button 
              className="gateway-action-btn gateway-action-btn-utility"
              onClick={() => {
                const fileInput = document.getElementById('utility-file-input');
                if (fileInput) fileInput.click();
              }}
              disabled={uploadingSource === 'Utility'}
            >
              <Upload size={16} />
              <span>{uploadingSource === 'Utility' ? 'Uploading...' : 'Upload File'}</span>
            </button>
            <input id="utility-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'Utility')} />
          </div>

          {/* Gateway 3: Corporate Travel */}
          <div className="glass-card upload-gateway-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="gateway-icon-wrapper" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                <Plane size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Travel</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Scope 3 Emissions</span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Estimate flight aviation and travel transit distances (Scope 3).
            </p>

            <div className="gateway-extract-section">
              <h4 className="gateway-extract-title">What we extract</h4>
              <div className="gateway-extract-list">
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Trips and segments</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Distance estimation</span>
                </div>
                <div className="gateway-extract-item">
                  <span className="gateway-extract-check"><Check size={14} /></span>
                  <span>Emission calculation (Scope 3)</span>
                </div>
              </div>
            </div>

            {/* Drag drop zone */}
            <div 
              className="upload-box upload-box-travel"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, 'Travel')}
            >
              <Upload size={32} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drag & drop CSV file here or</span>
              <label className="upload-btn-choose upload-btn-choose-travel">
                Choose CSV File
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'Travel')} disabled={uploadingSource === 'Travel'} />
              </label>
            </div>

            <button 
              className="gateway-action-btn gateway-action-btn-travel"
              onClick={() => {
                const fileInput = document.getElementById('travel-file-input');
                if (fileInput) fileInput.click();
              }}
              disabled={uploadingSource === 'Travel'}
            >
              <Upload size={16} />
              <span>{uploadingSource === 'Travel' ? 'Uploading...' : 'Upload File'}</span>
            </button>
            <input id="travel-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, 'Travel')} />
          </div>
        </div>

        {/* Upload history table inside Ingestion center */}
        <div className="glass-card" style={{ marginTop: '2.5rem' }}>
          <h4 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>In-Progress & Completed Ingestion Jobs</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Permanent audit log of file uploads and background ingestion job metrics.</p>
          
          <div className="table-container">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Job Reference</th>
                  <th>Source Type</th>
                  <th>Succeeded Rows</th>
                  <th>Failed Rows</th>
                  <th>Flagged Warnings</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No upload batches found in database. Ingest your first CSV above!</td>
                  </tr>
                ) : (
                  batches.map(batch => (
                    <tr key={batch.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary)' }}>#BATCH-{batch.id}</td>
                      <td>
                        <span className={`badge badge-scope-${batch.source_type === 'SAP' ? '1' : (batch.source_type === 'Utility' ? '2' : '3')}`}>
                          {formatSourceType(batch.source_type)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: '700', fontFamily: 'monospace' }}>{batch.processed_rows} rows</td>
                      <td style={{ color: batch.failed_rows > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '700', fontFamily: 'monospace' }}>{batch.failed_rows} rows</td>
                      <td style={{ color: batch.flagged_rows > 0 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: '700', fontFamily: 'monospace' }}>{batch.flagged_rows} rows</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // --- Review Queue Tab View ---
  const [isEditingDrawer, setIsEditingDrawer] = useState(false);
  const [editDrawerQty, setEditDrawerQty] = useState('');

  const renderReviewTab = () => {
    return (
      <div className="fade-in">

        {/* Filter controls card */}
        <div className="glass-card" style={styles.filterCard}>
          <div style={styles.filterForm}>
            <div style={styles.searchBox}>
              <Search size={16} color="#64748b" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by activity description (e.g. Diesel, Electricity)..."
                style={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchData}>Search</button>
          </div>

          <div style={styles.selectorsRow}>
            <div style={styles.selectGroup}>
              <Filter size={14} color="#64748b" />
              <select className="form-input" style={styles.smallSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Review Statuses</option>
                <option value="Pending">Pending Review</option>
                <option value="Approved">Approved & Locked</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div style={styles.selectGroup}>
              <select className="form-input" style={styles.smallSelect} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All Source Gateways</option>
                <option value="SAP">Fuel</option>
                <option value="Utility">Electricity</option>
                <option value="Travel">Travel</option>
              </select>
            </div>

            <div style={styles.selectGroup}>
              <select className="form-input" style={styles.smallSelect} value={suspiciousFilter} onChange={(e) => setSuspiciousFilter(e.target.value)}>
                <option value="">All Ingested Records</option>
                <option value="true">Flagged Anomalies Only</option>
                <option value="false">Clean Records Only</option>
              </select>
            </div>

            {/* Clear filters button */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              onClick={() => {
                setStatusFilter('');
                setSourceFilter('');
                setSuspiciousFilter('');
                setSearch('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>SOURCE</th>
                  <th>ACTIVITY DETAILS</th>
                  <th>SCOPE</th>
                  <th>QUANTITY</th>
                  <th>UNIT</th>
                  <th>EST CO₂e WEIGHT</th>
                  <th>STATUS</th>
                  <th>ANOMALIES</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No records match the current filters. Seed the database or clear active filters!
                    </td>
                  </tr>
                ) : (
                  records.map(rec => (
                    <tr key={rec.id} style={rec.locked ? { backgroundColor: 'rgba(0, 236, 208, 0.005)' } : {}}>
                      <td>
                        <span className={`badge badge-scope-${rec.source_type === 'SAP' ? '1' : (rec.source_type === 'Utility' ? '2' : '3')}`}>
                          {formatSourceType(rec.source_type)}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', whiteSpace: 'normal', minWidth: '160px' }}>{rec.activity_type}</td>
                      <td>{rec.scope}</td>
                      <td style={{ fontFamily: 'monospace' }}>
                        {rec.normalized_quantity.toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {rec.normalized_unit}
                      </td>
                      <td>
                        <span style={{ color: 'var(--primary)', fontWeight: '700', fontFamily: 'monospace' }}>
                          {(rec.co2e_estimate / 1000).toFixed(2)} t
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${rec.status === 'Approved' ? 'approved' : (rec.status === 'Rejected' ? 'rejected' : 'pending')}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.suspicious ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }} title={rec.suspicious_reason}>
                            <AlertTriangle size={14} />
                            <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Flagged</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Clean</span>
                        )}
                      </td>
                      <td>
                        <div style={styles.actionCell}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ ...styles.actionBtn, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} 
                            onClick={() => {
                              setDrawerRecord(rec);
                              setIsEditingDrawer(false);
                            }}
                          >
                            Explore Details
                          </button>
                          
                          {rec.locked ? (
                            <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                              <Lock size={12} /> Locked
                            </span>
                          ) : (
                            <>
                              <button 
                                className="btn btn-primary" 
                                style={{ ...styles.actionBtn, padding: '0.3rem 0.5rem', fontSize: '0.75rem', marginLeft: '0.5rem' }}
                                onClick={() => handleApprove(rec.id)}
                                disabled={userRole === 'Viewer / Auditor'}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ ...styles.actionBtn, padding: '0.3rem 0.5rem', fontSize: '0.75rem', marginLeft: '0.25rem' }}
                                onClick={() => handleReject(rec.id)}
                                disabled={userRole === 'Viewer / Auditor'}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  };

  // --- Audit Logs Timeline View Tab ---
  const renderAuditTab = () => {
    return (
      <div className="fade-in">

        <div className="glass-card" style={styles.timelineContainer}>
          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
              <Shield size={48} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
              <h4>No compliance actions logged yet.</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Ingest files or validate records in the queue to write logs.</p>
            </div>
          ) : (
            <div style={styles.timelineTrack}>
              {auditLogs.map((log, index) => (
                <div key={log.id || index} style={styles.timelineItem}>
                  {/* Timeline bullet dot */}
                  <div style={{
                    ...styles.timelineDot,
                    borderColor: log.action === 'upload' ? 'var(--scope-2)' : log.action === 'approve' ? 'var(--success)' : log.action === 'reject' ? 'var(--danger)' : 'var(--warning)',
                    backgroundColor: log.action === 'upload' ? 'var(--scope-2-glow)' : log.action === 'approve' ? 'var(--primary-glow)' : log.action === 'reject' ? 'rgba(239, 68, 68, 0.05)' : 'var(--scope-3-glow)'
                  }}>
                    <Shield size={14} />
                  </div>

                  {/* Vertical connector line */}
                  {index < auditLogs.length - 1 && <div style={styles.timelineVerticalLine}></div>}

                  {/* Log Content Details Box */}
                  <div style={styles.timelineCard}>
                    <div style={styles.timelineCardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={styles.actorNameText}>{log.user_name}</span>
                        <span style={styles.actorRoleText}>({log.user_role})</span>
                      </div>
                      <span style={styles.logTimestampText}>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>

                    <p style={styles.logDetailsText}>{log.details}</p>

                    {log.record_id && (
                      <div style={styles.logMetadataBadge}>
                        <Info size={12} color="var(--text-muted)" />
                        <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{log.record_scope}</strong> • Entity: <strong style={{ color: 'var(--text-primary)' }}>{log.record_category}</strong> (ID #{log.record_id})</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Organizations Tab View ---
  const renderOrganizationsTab = () => {
    return (
      <div className="fade-in">
        <div className="organizations-grid">
          {organizations.map(org => {
            const isActive = activeOrg === org;
            return (
              <div key={org} className="glass-card org-card" style={{ borderColor: isActive ? 'var(--primary)' : 'var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>{org}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Industry: Environmental ESG Operations</span>
                  </div>
                  <span className={`badge ${isActive ? 'badge-approved' : 'badge-pending'}`}>
                    {isActive ? 'Active Workspace' : 'Standby Tenant'}
                  </span>
                </div>

                <div style={styles.orgMetricsList}>
                  <div style={styles.orgMetricItem}>
                    <span style={styles.orgMetricLabel}>Regional Grid</span>
                    <strong style={styles.orgMetricVal}>{org === 'Breathe-ESG test workspace' ? 'North America Grid' : 'Standard Grid'}</strong>
                  </div>
                  <div style={styles.orgMetricItem}>
                    <span style={styles.orgMetricLabel}>Scope 1 Diesel Factor</span>
                    <strong style={styles.orgMetricVal}>2.68 kg CO₂e / L</strong>
                  </div>
                  <div style={styles.orgMetricItem}>
                    <span style={styles.orgMetricLabel}>Scope 2 Electricity Factor</span>
                    <strong style={styles.orgMetricVal}>0.38 kg CO₂e / kWh</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button 
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      switchWorkspace(org);
                    }}
                    disabled={isActive}
                  >
                    {isActive ? 'Current Tenant' : 'Switch Workspace'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Organization card */}
          <div className="glass-card org-card" style={{ borderColor: 'var(--border-color)', justifyContent: 'flex-start' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>Add New Organization</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
              Create a fresh, isolated workspace tenant for corporate carbon ledger tracking.
            </p>

            {!showAddOrgForm ? (
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => setShowAddOrgForm(true)}
              >
                + Create Workspace Tenant
              </button>
            ) : (
              <form onSubmit={handleAddOrganization} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: 'auto' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">Organization Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Breathe-ESG Dev Team" 
                    value={newOrgName} 
                    onChange={(e) => setNewOrgName(e.target.value)} 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                    Add & Open
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setShowAddOrgForm(false);
                      setNewOrgName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Settings / Role Config Tab View ---
  const renderSettingsTab = () => {
    return (
      <div className="fade-in">
        <div className="settings-grid">
          {/* Section A: Role selector */}
          <div className="glass-card settings-block-card">
            <h4 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Simulated User Security Role</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Switch roles to test how UI elements, action permissions, and security locks adapt to your role scope.</p>

            <div style={styles.roleSelectionStack}>
              {[
                { role: 'ESG Analyst', title: 'ESG Analyst', desc: 'Ingests spreadsheet data, reviews activity queue, and quick-approves records.' },
                { role: 'Organization Admin', title: 'Organization Administrator', desc: 'Full administrative rights. Access to workspace variables and lock overrides.' },
                { role: 'Viewer / Auditor', title: 'Auditor / Viewer (Read-only)', desc: 'Read-only access. Full dashboard visibility, but cannot approve/reject or upload files.' },
                { role: 'Super Admin', title: 'Super Admin', desc: 'Simulated System-wide diagnostics and infrastructure stats overview.' }
              ].map(opt => (
                <div 
                  key={opt.role}
                  style={{
                    ...styles.roleOptionRow,
                    borderColor: userRole === opt.role ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: userRole === opt.role ? 'rgba(0, 168, 143, 0.02)' : 'transparent'
                  }}
                  onClick={() => {
                    setUserRole(opt.role);
                    showToast('success', `Simulated active identity switched to: ${opt.role}`);
                  }}
                >
                  <input type="radio" checked={userRole === opt.role} readOnly style={{ marginRight: '0.75rem' }} />
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>{opt.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'block' }}>{opt.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Simulated Team Members */}
          <div className="glass-card settings-block-card">
            <h4 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Simulated Workspace Members</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Simulate other team members. Click on a person to switch the active session persona.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {persons.map((p, idx) => {
                const isActive = activePersonIndex === idx;
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'rgba(0, 168, 143, 0.02)' : 'transparent',
                      transition: 'var(--transition-smooth)'
                    }}
                    onClick={() => {
                      setActivePersonIndex(idx);
                      showToast('success', `Simulated active identity switched to: ${p.name}`);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="sidebar-avatar" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                        {p.initials}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>{p.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.email}</span>
                      </div>
                    </div>
                    <span className="badge badge-pending" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                      {p.role}
                    </span>
                  </div>
                );
              })}
            </div>

            {!showAddPersonForm ? (
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                onClick={() => setShowAddPersonForm(true)}
              >
                + Add Simulated Member
              </button>
            ) : (
              <form onSubmit={handleAddPerson} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Jane Doe" 
                    value={newPersonName} 
                    onChange={(e) => setNewPersonName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="jane@breatheesg.com" 
                    value={newPersonEmail} 
                    onChange={(e) => setNewPersonEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Simulated Role</label>
                  <select 
                    className="form-input" 
                    value={newPersonRole} 
                    onChange={(e) => setNewPersonRole(e.target.value)}
                  >
                    <option value="ESG Analyst">ESG Analyst</option>
                    <option value="Organization Admin">Organization Administrator</option>
                    <option value="Viewer / Auditor">Auditor / Viewer (Read-only)</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                    Save Member
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                    onClick={() => setShowAddPersonForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section C: Regulatory Emission Factors */}
          <div className="glass-card settings-block-card">
            <h4 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Regulatory Emission Factors</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Conversion multipliers based on standard GHG protocols (e.g. EPA, DEFRA).</p>

            <div style={styles.factorsFormStack}>
              <div className="form-group">
                <label className="form-label">Scope 1 - Diesel combustion factor (kg CO₂e / L)</label>
                <input type="text" className="form-input" defaultValue="2.68" disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Scope 1 - Natural Gas combustion factor (kg CO₂e / kg)</label>
                <input type="text" className="form-input" defaultValue="2.02" disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Scope 2 - North America electricity grid factor (kg CO₂e / kWh)</label>
                <input type="text" className="form-input" defaultValue="0.38" disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Scope 3 - Business flight business class multiplier (kg CO₂e / km)</label>
                <input type="text" className="form-input" defaultValue="0.29" disabled />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Note: These regulatory factors are controlled globally by environmental committees and are locked to preserve audit consistency.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Detail Sliding Drawer Component Rendering ---
  const renderDetailDrawer = () => {
    if (!drawerRecord) return null;
    const commentsList = drawerComments[drawerRecord.id] || [];

    return (
      <div style={styles.drawerBackdrop} onClick={() => setDrawerRecord(null)}>
        <div style={styles.detailDrawer} onClick={(e) => e.stopPropagation()}>
          {/* Drawer Header */}
          <div style={styles.drawerHeader}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {drawerRecord.scope} • Transactions Auditor
              </span>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', marginTop: '0.2rem', fontFamily: 'Outfit, sans-serif' }}>
                {drawerRecord.activity_type}
              </h3>
            </div>
            <button style={styles.drawerCloseBtn} onClick={() => setDrawerRecord(null)}><X size={20} /></button>
          </div>

          {/* Drawer Body */}
          <div style={styles.drawerBody}>
            {/* Status indicators */}
            {drawerRecord.locked ? (
              <div style={styles.drawerLockAlert}>
                <Lock size={18} color="var(--success)" style={{ marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--success)' }}>Compliance Locked</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    This ESG transaction has been verified and locked. Quantity edit is restricted.
                  </p>
                </div>
              </div>
            ) : (
              <div style={styles.drawerUnlockAlert}>
                <Info size={18} color="var(--info)" style={{ marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--info)' }}>Awaiting Sign-off</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    This entry is in the active review queue. Values can be corrected before approval.
                  </p>
                </div>
              </div>
            )}

            {/* Ingest Metrics Summary Grid */}
            <div style={styles.drawerSection}>
              <h4 style={styles.drawerSecTitle}>Operational Footprint Metrics</h4>
              <div style={styles.miniStatsGrid}>
                <div style={styles.miniStatCard}>
                  <span style={styles.miniStatLabel}>Standard Quantity</span>
                  <span style={styles.miniStatVal}>{drawerRecord.normalized_quantity.toLocaleString()} {drawerRecord.normalized_unit}</span>
                </div>
                <div style={styles.miniStatCard}>
                  <span style={styles.miniStatLabel}>Carbon Emissions Estimate</span>
                  <span style={{ ...styles.miniStatVal, color: 'var(--success)' }}>{(drawerRecord.co2e_estimate / 1000).toFixed(2)} t</span>
                </div>
              </div>

              <div style={styles.detailTextList}>
                <div style={styles.detailTextItem}>
                  <span>Reporting Date:</span>
                  <strong>{drawerRecord.date ? new Date(drawerRecord.date).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div style={styles.detailTextItem}>
                  <span>Source Gateway:</span>
                  <strong>{formatSourceType(drawerRecord.source_type)} Gateway</strong>
                </div>
                <div style={styles.detailTextItem}>
                  <span>Ingestion Job:</span>
                  <span style={{ fontFamily: 'monospace' }}>#BATCH-{drawerRecord.batch}</span>
                </div>
                {drawerRecord.normalization_metadata && (
                  <div style={styles.detailTextItem}>
                    <span>Multiplier Formula:</span>
                    <span style={styles.formulaText}>{drawerRecord.normalization_metadata.calculation_formula || 'Standard calculation'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Flags & Warnings */}
            {drawerRecord.suspicious && (
              <div style={styles.drawerSection}>
                <h4 style={{ ...styles.drawerSecTitle, color: 'var(--danger)' }}>AI Anomaly Detector Alerts</h4>
                <div style={styles.flagItemBox}>
                  <AlertTriangle size={18} color="var(--danger)" style={{ marginTop: '2px' }} />
                  <div>
                    <span style={{ fontWeight: '700', color: 'var(--danger)', fontSize: '0.8rem', display: 'block' }}>High Severity Warning</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{drawerRecord.suspicious_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity corrections */}
            <div style={styles.drawerSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={styles.drawerSecTitle}>Ledger Correction</h4>
                {!drawerRecord.locked && (
                  <button 
                    style={styles.editToggleLink}
                    onClick={() => {
                      setIsEditingDrawer(!isEditingDrawer);
                      setEditDrawerQty(drawerRecord.normalized_quantity);
                    }}
                  >
                    {isEditingDrawer ? 'Cancel' : 'Edit Quantity'}
                  </button>
                )}
              </div>

              {isEditingDrawer ? (
                <div style={styles.editDrawerForm}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Corrected Quantity ({drawerRecord.normalized_unit})</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={editDrawerQty}
                      onChange={(e) => setEditDrawerQty(e.target.value)}
                    />
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      saveQuantityEdit(drawerRecord.id, editDrawerQty);
                      setIsEditingDrawer(false);
                    }}
                  >
                    Save & Recalculate Emissions
                  </button>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {drawerRecord.locked ? 'This record is compliance-locked. Direct edits are disabled.' : 'Values can be edited to fix data anomalies before signing.'}
                </p>
              )}
            </div>

            {/* Comments Thread */}
            <div style={styles.drawerSection}>
              <h4 style={styles.drawerSecTitle}>Peer Review Collaboration</h4>
              <div style={styles.commentsContainer}>
                {commentsList.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>No discussion comments logged yet.</p>
                ) : (
                  commentsList.map(c => (
                    <div key={c.id} style={styles.commentItem}>
                      <div style={styles.commentHeader}>
                        <strong style={{ color: 'var(--text-primary)' }}>{c.author}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({c.role}) • {c.timestamp}</span>
                      </div>
                      <p style={styles.commentBodyText}>{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.commentInputRow}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ask a question or explain override reason..."
                  style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addComment(drawerRecord.id);
                  }}
                />
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem 1rem' }}
                  onClick={() => addComment(drawerRecord.id)}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Drawer Actions Footer */}
          {!drawerRecord.locked && (
            <div style={styles.drawerFooter}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => {
                  handleApprove(drawerRecord.id);
                  setDrawerRecord(null);
                }}
                disabled={userRole === 'Viewer / Auditor'}
              >
                Approve & Lock
              </button>
              <button 
                className="btn btn-danger" 
                style={{ flex: 1 }}
                onClick={() => {
                  handleReject(drawerRecord.id);
                  setDrawerRecord(null);
                }}
                disabled={userRole === 'Viewer / Auditor'}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- View Raw Data Modal Overlay ---
  const renderRawRecordModal = () => {
    if (!rawRecordModal) return null;

    return (
      <div style={styles.modalBackdrop} onClick={() => setRawRecordModal(null)}>
        <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--primary)" />
              <h4 style={{ color: '#f8fafc', fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                Raw Spreadsheet Lineage Trace
              </h4>
            </div>
            <button style={styles.modalClose} onClick={() => setRawRecordModal(null)}><X size={18} /></button>
          </div>
          
          <div style={styles.modalBody}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Original ingested CSV data row parsed before ESG normalization and conversion formulas:
            </p>
            <pre style={styles.jsonBlock}>
              {JSON.stringify(rawRecordModal.raw_record?.raw_data || rawRecordModal.normalization_metadata, null, 2)}
            </pre>
            
            <h5 style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '1.25rem', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              Standardization Outputs:
            </h5>
            <div style={styles.normComparisonGrid}>
              <div style={styles.normCompCell}>
                <span style={styles.normCompLabel}>Scope</span>
                <span style={styles.normCompVal}>{rawRecordModal.scope}</span>
              </div>
              <div style={styles.normCompCell}>
                <span style={styles.normCompLabel}>Normalized Quantity</span>
                <span style={styles.normCompVal}>{rawRecordModal.normalized_quantity} {rawRecordModal.normalized_unit}</span>
              </div>
              <div style={styles.normCompCell}>
                <span style={styles.normCompLabel}>Emissions Weight</span>
                <span style={styles.normCompVal}>{(rawRecordModal.co2e_estimate / 1000).toFixed(2)} t CO₂e</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- View All Records Modal Overlay ---
  const renderViewAllModal = () => {
    if (!viewAllModalType) return null;

    const title = viewAllModalType === 'suspicious' ? 'All Suspicious Records' : 'All Pending Reviews';
    const filtered = viewAllModalType === 'suspicious' 
      ? records.filter(r => r.suspicious) 
      : records.filter(r => r.status === 'Pending');

    return (
      <div style={styles.modalBackdrop} onClick={() => setViewAllModalType(null)}>
        <div 
          style={{ 
            ...styles.modalCard, 
            width: '90%', 
            maxWidth: '1000px', 
            backgroundColor: '#ffffff', 
            border: '1px solid var(--border-color)' 
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ ...styles.modalHeader, borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-deep)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} color="var(--primary)" />
              <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                {title}
              </h4>
            </div>
            <button style={{ ...styles.modalClose, color: 'var(--text-muted)' }} onClick={() => setViewAllModalType(null)}>
              <X size={18} />
            </button>
          </div>
          
          <div style={{ ...styles.modalBody, padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="table-container" style={{ border: '1px solid var(--border-color)' }}>
              <table className="enterprise-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  {viewAllModalType === 'suspicious' ? (
                    <tr>
                      <th>SOURCE</th>
                      <th>ACTIVITY DETAILS</th>
                      <th>SCOPE</th>
                      <th>QUANTITY</th>
                      <th>UNIT</th>
                      <th>EST CO₂e WEIGHT</th>
                      <th>STATUS</th>
                      <th>ANOMALIES</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>SOURCE</th>
                      <th>ACTIVITY DETAILS</th>
                      <th>SCOPE</th>
                      <th>QUANTITY</th>
                      <th>UNIT</th>
                      <th>EST CO₂e WEIGHT</th>
                      <th>STATUS</th>
                      <th>ANOMALIES</th>
                      <th style={{ textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={viewAllModalType === 'suspicious' ? 8 : 9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No records found in this view.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(rec => (
                      <tr key={rec.id}>
                        <td>
                          <span className={`badge badge-scope-${rec.source_type === 'SAP' ? '1' : (rec.source_type === 'Utility' ? '2' : '3')}`}>
                            {formatSourceType(rec.source_type)}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', whiteSpace: 'normal', minWidth: '160px' }}>{rec.activity_type}</td>
                        <td>{rec.scope}</td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {rec.normalized_quantity.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {rec.normalized_unit}
                        </td>
                        <td>
                          <span style={{ color: 'var(--primary)', fontWeight: '700', fontFamily: 'monospace' }}>
                            {(rec.co2e_estimate / 1000).toFixed(2)} t
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${rec.status === 'Approved' ? 'approved' : (rec.status === 'Rejected' ? 'rejected' : 'pending')}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td>
                          {rec.suspicious ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)' }} title={rec.suspicious_reason}>
                              <AlertTriangle size={14} />
                              <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>Flagged</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Clean</span>
                          )}
                        </td>
                        {viewAllModalType !== 'suspicious' && (
                          <td>
                            <div style={styles.miniActionsWrapper}>
                              <button 
                                style={styles.miniActBtn} 
                                title="Explore Raw" 
                                onClick={() => setRawRecordModal(rec)}
                              >
                                <Eye size={12} />
                              </button>
                              <button 
                                style={styles.miniActBtn} 
                                title="Edit Drawer" 
                                onClick={() => {
                                  setDrawerRecord(rec);
                                  setIsEditingDrawer(false);
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button 
                                style={{ ...styles.miniActBtn, color: 'var(--success)' }} 
                                title="Quick Approve"
                                onClick={() => handleApprove(rec.id)}
                                disabled={userRole === 'Viewer / Auditor'}
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                style={{ ...styles.miniActBtn, color: 'var(--danger)' }} 
                                title="Quick Reject"
                                onClick={() => handleReject(rec.id)}
                                disabled={userRole === 'Viewer / Auditor'}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.loginScreenWrapper}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <div style={styles.loginLogoRow}>
              <Shield size={32} color="#00a88f" />
              <span style={styles.loginBrandTitle}>Breathe ESG</span>
            </div>
            <h2 style={styles.loginTitle}>Compliance Console Login</h2>
            <p style={styles.loginSubtitle}>Access the enterprise emissions ledger</p>
          </div>
          
          <form onSubmit={handleLoginSubmit} style={styles.loginForm}>
            <div style={styles.loginFormGroup}>
              <label style={styles.loginLabel}>Administrator Username</label>
              <input
                type="text"
                style={styles.loginInput}
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div style={styles.loginFormGroup}>
              <label style={styles.loginLabel}>Security Password</label>
              <input
                type="password"
                style={styles.loginInput}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <div style={styles.loginErrorAlert}>
                <AlertTriangle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" style={styles.loginSubmitBtn}>
              Enter Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Floating mobile menu hamburger toggle */}
      <button 
        className="mobile-menu-toggle-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        title={mobileMenuOpen ? "Close Menu" : "Open Menu"}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Backdrop overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Top Header Bar */}
      <div className="mobile-top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logo} alt="Breathe-ESG" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: '800',
              fontSize: '0.95rem',
              color: '#ffffff',
              lineHeight: '1.2'
            }}>Breathe-ESG</span>
            <span style={{
              fontSize: '0.6rem',
              color: 'var(--text-sidebar)',
              fontWeight: '600'
            }}>Emissions Management</span>
          </div>
        </div>
      </div>
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand header */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: sidebarCollapsed ? '0' : '0.5rem', overflow: 'hidden', width: '100%' }}>
            <img src={logo} alt="Breathe-ESG" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={styles.sidebarBrandTitleText}>Breathe-ESG</span>
                <span style={styles.sidebarBrandSubtitleText}>Emissions Management</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          <div 
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </div>

          <div 
            onClick={() => { setActiveTab('upload'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'upload' ? 'active' : ''}`}
          >
            <Database size={18} />
            {!sidebarCollapsed && <span>Upload Data</span>}
          </div>

          <div 
            onClick={() => { setActiveTab('review'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'review' ? 'active' : ''}`}
          >
            <ClipboardList size={18} />
            {!sidebarCollapsed && <span>Review Queue</span>}
            {!sidebarCollapsed && stats.pending_count > 0 && (
              <span style={styles.sidebarReviewBadge}>{stats.pending_count}</span>
            )}
          </div>

          <div 
            onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <Shield size={18} />
            {!sidebarCollapsed && <span>Audit Logs</span>}
          </div>

          <div 
            onClick={() => { setActiveTab('organizations'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'organizations' ? 'active' : ''}`}
          >
            <Building2 size={18} />
            {!sidebarCollapsed && <span>Organizations</span>}
          </div>

          <div 
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} 
            className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </div>
        </nav>

        {/* Sidebar bottom Profile Card */}
        <div className="sidebar-footer">
          {/* Role switcher dropdown popover */}
          {roleDropdownOpen && !sidebarCollapsed && (
            <div style={styles.popoverRoleDropdown}>
              <div style={styles.popoverTitle}>Active Persona</div>
              {persons.map((p, idx) => (
                <div 
                  key={idx} 
                  style={{
                    ...styles.popoverItem,
                    backgroundColor: activePersonIndex === idx ? 'rgba(0, 168, 143, 0.05)' : 'transparent',
                    color: activePersonIndex === idx ? 'var(--primary)' : 'var(--text-sidebar)'
                  }}
                  onClick={() => {
                    setActivePersonIndex(idx);
                    setRoleDropdownOpen(false);
                    showToast('success', `Simulated active identity switched to: ${p.name}`);
                  }}
                >
                  {p.name}
                </div>
              ))}
              <div 
                style={{
                  ...styles.popoverItem,
                  borderTop: '1px solid #334155',
                  color: '#ef4444',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem'
                }}
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('esg_site_authenticated');
                  setRoleDropdownOpen(false);
                  showToast('warning', 'Logged out of ESG console.');
                }}
              >
                Log Out
              </div>
            </div>
          )}

          <div className="sidebar-profile" onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}>
            <div className="sidebar-avatar">
              {currentUser.initials}
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-profile-details">
                <span className="sidebar-username">{currentUser.name}</span>
                <span className="sidebar-userrole">{activeOrg}</span>
              </div>
            )}
            {!sidebarCollapsed && <ChevronDown size={14} color="var(--text-sidebar)" />}
          </div>
        </div>
        
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          className="sidebar-toggle-btn"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        
        {/* Global Toast Notification */}
        {toast && (
          <div style={{
            ...styles.toast,
            backgroundColor: toast.type === 'success' ? 'var(--success)' : (toast.type === 'warning' ? 'var(--warning)' : 'var(--danger)')
          }} className="fade-in">
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Global Topbar / Header controls */}
        <header className="dashboard-topbar">
          <div>
            <h1 style={styles.topbarTitle}>
              {activeTab === 'dashboard' ? 'Dashboard' : 
               activeTab === 'upload' ? 'Upload Ingestion Gateway' : 
               activeTab === 'review' ? 'Review Queue' : 
               activeTab === 'audit' ? 'Audit Logs Ledger' : 
               activeTab === 'organizations' ? 'Organizations' : 'Settings'}
            </h1>
            <p style={styles.topbarSubtitle}>
              {activeTab === 'dashboard' ? 'Overview of emissions data and review status' : 
               activeTab === 'upload' ? 'Ingest raw CSV spreadsheet records' : 
               activeTab === 'review' ? 'Approve, reject, or correct normalized quantities' : 
               activeTab === 'audit' ? 'Immutable change tracking lineage ledger' : 
               activeTab === 'organizations' ? 'Configure tenants and boundaries' : 'Configure system metrics'}
            </p>
          </div>

          <div className="topbar-controls">
            {/* Org selector dropdown */}
            <div className="topbar-select-wrapper">
              <Building2 size={14} color="var(--text-muted)" />
              <select className="topbar-select" value={activeOrg} onChange={(e) => switchWorkspace(e.target.value)}>
                {organizations.map(o => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown size={12} color="var(--text-muted)" />
            </div>

            {/* Date Picker select */}
            <div className="topbar-select-wrapper">
              <Calendar size={14} color="var(--text-muted)" />
              <select className="topbar-select" value={reportingDateRange} onChange={(e) => setReportingDateRange(e.target.value)}>
                <option>May 1 - May 31, 2026</option>
                <option>Jan 1 - Dec 31, 2026</option>
                <option>Apr 1 - Apr 30, 2026</option>
              </select>
              <ChevronDown size={12} color="var(--text-muted)" />
            </div>

            {/* Refresh or Reset Button */}
            {activeTab === 'audit' ? (
              <button 
                className="btn btn-danger" 
                style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '700' }}
                onClick={async () => {
                  try {
                    await api.post('/audit-logs/clear/');
                    setAuditLogs([]);
                    showToast('warning', 'Audit timeline logs reset successfully.');
                  } catch (err) {
                    showToast('danger', 'Failed to reset audit logs.');
                  }
                }}
              >
                Reset Timeline
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', fontWeight: '700' }}
                onClick={fetchData}
              >
                Refresh
              </button>
            )}
          </div>
        </header>

        {/* Content body switcher */}
        <div className="content-body">
          {activeTab === 'dashboard' && renderDashboardTab()}
          {activeTab === 'upload' && renderUploadTab()}
          {activeTab === 'review' && renderReviewTab()}
          {activeTab === 'audit' && renderAuditTab()}
          {activeTab === 'organizations' && renderOrganizationsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>

      {/* View Details drawer overlay */}
      {drawerRecord && renderDetailDrawer()}

      {/* View Raw Json lineage modal overlay */}
      {rawRecordModal && renderRawRecordModal()}

      {/* View All Modal overlay */}
      {viewAllModalType && renderViewAllModal()}
    </div>
  );
};

// Layout Specific Styles (CSS-in-JS for clean styling layout matching)
const styles = {
  // Sidebar styling
  sidebarBrandTitleText: {
    fontFamily: 'var(--font-display)',
    fontWeight: '800',
    color: '#ffffff',
    fontSize: '1rem',
    lineHeight: '1.2'
  },
  sidebarBrandSubtitleText: {
    color: 'var(--text-sidebar)',
    fontSize: '0.7rem',
    fontWeight: '600'
  },
  sidebarReviewBadge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.65rem',
    fontWeight: '700',
    borderRadius: '50px',
    padding: '0.1rem 0.4rem',
    marginLeft: 'auto'
  },
  popoverRoleDropdown: {
    position: 'absolute',
    bottom: '72px',
    left: '12px',
    right: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.5rem 0',
    boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.4)',
    zIndex: 110,
    display: 'flex',
    flexDirection: 'column'
  },
  popoverTitle: {
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    color: '#64748b',
    fontWeight: '800',
    padding: '0.25rem 0.75rem 0.5rem 0.75rem',
    borderBottom: '1px solid #334155',
    marginBottom: '0.25rem',
    letterSpacing: '0.05em'
  },
  popoverItem: {
    fontSize: '0.75rem',
    padding: '0.4rem 0.75rem',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s ease'
  },

  // Topbar
  topbar: {
    height: 'var(--topbar-height)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2.5rem',
    backgroundColor: '#ffffff'
  },
  topbarTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)'
  },
  topbarSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  topbarControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  topbarSelectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0 0.5rem',
    backgroundColor: '#f8fafc',
    position: 'relative'
  },
  topbarSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    padding: '0.4rem 1.25rem 0.4rem 0.25rem',
    cursor: 'pointer',
    appearance: 'none'
  },
  topbarRefreshBtn: {
    padding: '0.45rem',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    backgroundColor: '#ffffff'
  },

  // Dashboard Layout
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem'
  },
  kpiCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  kpiLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    display: 'block',
    marginBottom: '0.25rem'
  },
  kpiValue: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)',
    lineHeight: '1.1'
  },
  kpiUnit: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  kpiIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiFooter: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.5rem',
    marginTop: '0.75rem'
  },

  // Charts
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem'
  },
  chartBlockCard: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '290px'
  },
  chartBlockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  chartBlockTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)'
  },
  cardHeaderSelect: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },
  donutChartContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    flex: 1,
    position: 'relative'
  },
  pieWrapper: {
    position: 'relative',
    width: '220px',
    height: '220px'
  },
  donutCenterLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none'
  },
  centerValText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    display: 'block',
    lineHeight: '1.1'
  },
  centerUnitText: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  donutLegendList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  legendItemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'block'
  },
  legendTextWrapper: {
    display: 'flex',
    flexDirection: 'column'
  },
  legendScopeName: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  legendScopeMetric: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace'
  },
  barChartContainer: {
    flex: 1,
    position: 'relative',
    marginTop: '0.5rem'
  },
  yAxisLabel: {
    position: 'absolute',
    top: '-5px',
    left: '0px',
    fontSize: '0.65rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase'
  },

  // Tables Grid
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem'
  },
  tableCardContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '340px'
  },
  tableCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  tableCardTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)'
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '700',
    fontSize: '0.75rem',
    cursor: 'pointer',
    padding: '0.2rem'
  },
  tableScroller: {
    flex: 1,
    overflowY: 'auto'
  },
  miniTable: {
    width: '100%',
    minWidth: '550px',
    borderCollapse: 'collapse',
    fontSize: '0.75rem',
    textAlign: 'left'
  },
  emptyTableRow: {
    padding: '2rem 0',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.75rem'
  },
  fileNameCell: {
    fontWeight: '600',
    color: 'var(--text-primary)',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  issueTextCell: {
    color: 'var(--text-muted)',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniActionsWrapper: {
    display: 'flex',
    gap: '0.35rem',
    alignItems: 'center',
    justifyContent: 'center'
  },
  miniActBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.2rem',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    backgroundColor: '#f1f5f9'
  },
  tableCardFooter: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.5rem',
    marginTop: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footerCountText: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)'
  },
  arrowPagination: {
    display: 'flex',
    gap: '0.25rem'
  },
  pagArrowBtn: {
    border: '1px solid var(--border-color)',
    background: '#ffffff',
    borderRadius: '4px',
    cursor: 'pointer',
    padding: '0.15rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Quality Summary Footer
  qualitySummaryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.25rem'
  },
  qualityHeader: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.5rem',
    marginBottom: '0.75rem'
  },
  qualityTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-display)'
  },
  qualityItemsWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  qualityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  qualityVal: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'monospace'
  },
  qualityLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },

  // Upload Tab
  uploadTabContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  uploadIntroRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  uploadGatewayRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.5rem'
  },
  uploadGatewayCard: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '260px'
  },
  dropText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.5rem'
  },

  // Review Tab
  reviewTabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  filterCard: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.25rem',
    marginBottom: '1.5rem'
  },
  filterForm: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap'
  },
  searchBox: {
    position: 'relative',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.55rem 1rem 0.55rem 2.25rem',
    color: 'var(--text-primary)',
    fontSize: '0.85rem'
  },
  selectorsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  selectGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0 0.4rem',
    backgroundColor: '#f8fafc'
  },
  smallSelect: {
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: '0.4rem'
  },
  actionCell: {
    display: 'flex',
    alignItems: 'center'
  },
  actionBtn: {
    fontWeight: '700',
    borderRadius: '4px',
    cursor: 'pointer'
  },

  // Audit Logs Tab
  timelineContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '2rem'
  },
  timelineTrack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    position: 'relative'
  },
  timelineItem: {
    display: 'flex',
    gap: '1.5rem',
    position: 'relative'
  },
  timelineDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: '4px'
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: '15px',
    top: '36px',
    bottom: '-28px',
    width: '2px',
    backgroundColor: '#e2e8f0',
    zIndex: 1
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '1rem 1.25rem'
  },
  timelineCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  actorNameText: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  actorRoleText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  logTimestampText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  logDetailsText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    marginBottom: '0.5rem'
  },
  logMetadataBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.7rem',
    color: 'var(--text-muted)'
  },

  // Organizations
  orgsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem'
  },
  orgCard: {
    backgroundColor: '#ffffff',
    border: '1.5px solid',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '220px'
  },
  orgMetricsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  orgMetricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem'
  },
  orgMetricLabel: {
    color: 'var(--text-muted)'
  },
  orgMetricVal: {
    color: 'var(--text-primary)'
  },

  // Settings
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '1.5rem'
  },
  settingsBlock: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-color)',
    padding: '1.5rem'
  },
  roleSelectionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  roleOptionRow: {
    border: '1.5px solid',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'flex-start',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  factorsFormStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  // Sliding Side Drawer details panel
  drawerBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 150
  },
  detailDrawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '460px',
    maxWidth: '100%',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid var(--border-color)',
    boxShadow: '-10px 0 30px rgba(15, 23, 42, 0.1)',
    zIndex: 151,
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s ease-out forwards'
  },
  drawerHeader: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  drawerCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0.2rem'
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem'
  },
  drawerFooter: {
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    gap: '0.75rem'
  },
  drawerLockAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem'
  },
  drawerUnlockAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem'
  },
  drawerSection: {
    marginBottom: '1.5rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid var(--border-color)'
  },
  drawerSecTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '800',
    fontFamily: 'var(--font-display)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.75rem'
  },
  miniStatsGrid: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem'
  },
  miniStatLabel: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  miniStatVal: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'monospace'
  },
  detailTextList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    fontSize: '0.75rem'
  },
  detailTextItem: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'var(--text-secondary)'
  },
  formulaText: {
    fontFamily: 'monospace',
    color: 'var(--primary)',
    fontWeight: '600'
  },
  flagItemBox: {
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem'
  },
  editToggleLink: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '0.75rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  editDrawerForm: {
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0.75rem',
    marginTop: '0.5rem'
  },
  commentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  commentItem: {
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0.5rem'
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.65rem',
    marginBottom: '0.25rem'
  },
  commentBodyText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  commentInputRow: {
    display: 'flex',
    gap: '0.5rem'
  },

  // Modal Card
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200
  },
  modalCard: {
    width: '520px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out forwards'
  },
  modalHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: '1.25rem'
  },
  jsonBlock: {
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '1rem',
    color: '#10b981',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    maxHeight: '180px',
    overflowY: 'auto',
    lineHeight: '1.5'
  },
  normComparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  normCompCell: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem'
  },
  normCompLabel: {
    fontSize: '0.6rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700'
  },
  normCompVal: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#f8fafc'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    zIndex: 250,
    fontWeight: '600',
    fontSize: '0.85rem'
  },
  loginScreenWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    fontFamily: 'var(--font-sans)',
    padding: '2rem'
  },
  loginCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
    boxSizing: 'border-box'
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  loginLogoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  loginBrandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  loginTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.35rem',
    fontFamily: 'var(--font-display)'
  },
  loginSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  },
  loginFormGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  loginLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#475569'
  },
  loginInput: {
    width: '100%',
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#0f172a',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease'
  },
  loginSubmitBtn: {
    width: '100%',
    backgroundColor: '#00a88f',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    boxShadow: '0 4px 12px rgba(0, 168, 143, 0.15)'
  },
  loginErrorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    fontWeight: '600'
  }
};

export default App;
