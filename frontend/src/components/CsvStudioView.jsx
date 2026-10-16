import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Database,
  Filter,
  CheckCircle2
} from 'lucide-react';

const FAULT_OPTIONS = [
  'Normal',
  'Mechanical Imbalance',
  'Shaft Misalignment',
  'Bearing / Gear Wear',
  'Thermal Overheating',
  'Mechanical Looseness'
];

export function CsvStudioView() {
  const [files, setFiles] = useState([]);
  const [readings, setReadings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ text: '', type: 'info' });

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('append');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Add row modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRow, setNewRow] = useState({
    motor_id: 'BO_MOTOR_01',
    temperature_c: 35.0,
    pwm_duty: 80.0,
    ax: 0.12,
    ay: 0.15,
    az: 0.98,
    vibration_rms: 0.25,
    source: 'real',
    status: 'Normal',
    fault_type: 'Normal'
  });

  // Inline editing state: { [id]: { temperature_c, pwm_duty, vibration_rms, health_score, status, fault_type } }
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    fetchReadings();
  }, [page, sourceFilter, statusFilter, search]);

  const showToast = (text, type = 'info') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: 'info' }), 4500);
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/dataset/files');
      if (res.ok) {
        const json = await res.json();
        setFiles(json.files || []);
      }
    } catch (e) {
      console.error('Failed to load dataset files:', e);
    }
  };

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const url = `/api/readings?page=${page}&limit=20&source=${sourceFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setReadings(json.data || []);
        setTotalPages(json.pages || 1);
        setTotalCount(json.total || 0);
      }
    } catch (e) {
      console.error('Failed to load readings table:', e);
    } finally {
      setLoading(false);
    }
  };

  // Upload CSV handler
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a valid .csv file first.', 'error');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`/api/dataset/upload-csv?mode=${uploadMode}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Success: Ingested ${data.inserted_records} rows from ${data.filename}!`, 'success');
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchFiles();
        fetchReadings();
      } else {
        showToast(`Error: ${data.detail || 'Upload failed'}`, 'error');
      }
    } catch (err) {
      showToast(`Upload error: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Delete specific CSV file
  const handleDeleteFile = async (filename) => {
    if (!confirm(`Are you sure you want to delete file "${filename}" from server storage?`)) return;
    try {
      const res = await fetch(`/api/dataset/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`File ${filename} deleted successfully.`, 'success');
        fetchFiles();
      } else {
        const err = await res.json();
        showToast(`Failed to delete: ${err.detail}`, 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  // Clear dataset by source
  const handleClearSource = async (srcType) => {
    const label = srcType === 'all' ? 'ALL database records' : `${srcType.toUpperCase()} telemetry records`;
    if (!confirm(`Are you sure you want to permanently clear ${label}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/dataset/clear-type?source=${srcType}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Cleared ${label} successfully.`, 'success');
        fetchReadings();
      } else {
        showToast('Failed to clear records.', 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  // Start inline row editing
  const startEditing = (row) => {
    setEditingId(row.id);
    setEditForm({
      temperature_c: row.temperature_c ?? 35.0,
      pwm_duty: row.pwm_duty ?? 80.0,
      vibration_rms: row.vibration_rms ?? 0.25,
      health_score: row.health_score ?? 90.0,
      status: row.status || 'Normal',
      fault_type: row.fault_type || 'Normal'
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Save inline row edits
  const saveEditing = async (id) => {
    try {
      const payload = {
        temperature_c: parseFloat(editForm.temperature_c),
        pwm_duty: parseFloat(editForm.pwm_duty),
        vibration_rms: parseFloat(editForm.vibration_rms),
        health_score: parseFloat(editForm.health_score),
        status: editForm.status,
        fault_type: editForm.fault_type
      };
      const res = await fetch(`/api/dataset/readings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(`Reading #${id} updated successfully.`, 'success');
        setEditingId(null);
        fetchReadings();
      } else {
        const err = await res.json();
        showToast(`Update failed: ${err.detail}`, 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  // Delete single row
  const handleDeleteRow = async (id) => {
    if (!confirm(`Delete telemetry record #${id}?`)) return;
    try {
      const res = await fetch(`/api/dataset/readings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Record #${id} deleted.`, 'success');
        fetchReadings();
      } else {
        showToast('Failed to delete record.', 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  // Add new row submit
  const handleAddRowSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newRow,
        temperature_c: parseFloat(newRow.temperature_c),
        pwm_duty: parseFloat(newRow.pwm_duty),
        ax: parseFloat(newRow.ax),
        ay: parseFloat(newRow.ay),
        az: parseFloat(newRow.az),
        vibration_rms: parseFloat(newRow.vibration_rms)
      };
      const res = await fetch('/api/dataset/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Record #${data.reading_id} added successfully!`, 'success');
        setShowAddModal(false);
        fetchReadings();
      } else {
        showToast('Failed to add record.', 'error');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {actionMessage.text && (
        <div className={`p-3.5 rounded-xl text-xs font-mono flex items-center justify-between border shadow-lg transition-all ${
          actionMessage.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            : actionMessage.type === 'error'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {actionMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {actionMessage.type === 'info' && <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage({ text: '', type: 'info' })} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="glass-card rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            CSV Data Studio & Interactive Telemetry Editor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload custom CSVs, delete or clear datasets, edit telemetry rows inline, and export modified data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md glow-cyan transition-all"
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-navy-800 hover:bg-navy-750 text-emerald-400 border border-emerald-500/40 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>

          <a
            href="/api/export/csv"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>

          <div className="relative inline-block text-left">
            <button
              onClick={() => handleClearSource('real')}
              className="px-2.5 py-2 rounded-xl text-xs font-mono font-bold text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 transition-all"
              title="Delete all real telemetry records"
            >
              Clear Real Data
            </button>
          </div>

          <button
            onClick={() => handleClearSource('all')}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-navy-800 transition-all"
            title="Purge All Records in Database"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSV FILES REPOSITORY CARD */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-cyan-400" />
          Server CSV Datasets Repository ({files.length} Files)
        </h3>

        {files.length === 0 ? (
          <div className="text-xs text-slate-400 font-mono py-4 text-center">
            No CSV datasets found on server. Upload one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((f) => (
              <div key={f.filename} className="p-3.5 rounded-xl bg-navy-850/70 border border-navy-800 flex items-center justify-between hover:border-cyan-500/40 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-white truncate" title={f.filename}>
                      {f.filename}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {f.rows.toLocaleString()} rows • {f.size_kb} KB • {f.modified}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => handleDeleteFile(f.filename)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete CSV file from server"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIVE EDITABLE DATA TABLE CARD */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800 mb-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 font-mono">Source:</span>
            {['all', 'real', 'synthetic'].map((s) => (
              <button
                key={s}
                onClick={() => { setSourceFilter(s); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                  sourceFilter === s
                    ? 'bg-cyan-500 text-navy-950 font-extrabold shadow-sm'
                    : 'bg-navy-850 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}

            <span className="text-xs font-bold text-slate-400 font-mono ml-2">Status:</span>
            {['all', 'Normal', 'Warning', 'Critical'].map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white font-extrabold'
                    : 'bg-navy-850 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search timestamp / fault..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-850 border border-navy-750 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Editable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-2.5">ID</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Source</th>
                <th className="pb-2.5">Temp (°C)</th>
                <th className="pb-2.5">PWM (%)</th>
                <th className="pb-2.5">Vib RMS (g)</th>
                <th className="pb-2.5">Health</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Fault Pattern</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-mono">
                    Loading telemetry records...
                  </td>
                </tr>
              ) : readings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-mono">
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                readings.map((r) => {
                  const isEditing = editingId === r.id;
                  return (
                    <tr key={r.id} className={`transition-colors ${isEditing ? 'bg-cyan-950/40' : 'hover:bg-navy-850/50'}`}>
                      <td className="py-2.5 text-slate-400">#{r.id}</td>
                      <td className="py-2.5 text-slate-300">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.source === 'real' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {r.source}
                        </span>
                      </td>

                      {/* Temperature */}
                      <td className="py-2.5 font-bold text-amber-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editForm.temperature_c}
                            onChange={(e) => setEditForm({ ...editForm, temperature_c: e.target.value })}
                            className="w-16 px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-amber-300 font-mono text-xs"
                          />
                        ) : (
                          `${r.temperature_c?.toFixed(1)}°`
                        )}
                      </td>

                      {/* PWM */}
                      <td className="py-2.5 text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={editForm.pwm_duty}
                            onChange={(e) => setEditForm({ ...editForm, pwm_duty: e.target.value })}
                            className="w-14 px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-white font-mono text-xs"
                          />
                        ) : (
                          `${r.pwm_duty?.toFixed(0)}%`
                        )}
                      </td>

                      {/* Vibration RMS */}
                      <td className="py-2.5 font-bold text-cyan-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.vibration_rms}
                            onChange={(e) => setEditForm({ ...editForm, vibration_rms: e.target.value })}
                            className="w-16 px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-cyan-300 font-mono text-xs"
                          />
                        ) : (
                          r.vibration_rms ? `${r.vibration_rms.toFixed(3)}g` : '-'
                        )}
                      </td>

                      {/* Health */}
                      <td className="py-2.5 font-bold text-emerald-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={editForm.health_score}
                            onChange={(e) => setEditForm({ ...editForm, health_score: e.target.value })}
                            className="w-14 px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-emerald-300 font-mono text-xs"
                          />
                        ) : (
                          `${Math.round(r.health_score || 0)}%`
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5">
                        {isEditing ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-white font-mono text-xs"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Warning">Warning</option>
                            <option value="Critical">Critical</option>
                          </select>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                            r.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {r.status || 'Normal'}
                          </span>
                        )}
                      </td>

                      {/* Fault Pattern */}
                      <td className="py-2.5 text-slate-200">
                        {isEditing ? (
                          <select
                            value={editForm.fault_type}
                            onChange={(e) => setEditForm({ ...editForm, fault_type: e.target.value })}
                            className="px-1.5 py-0.5 rounded bg-navy-900 border border-cyan-500 text-white font-mono text-xs max-w-[160px]"
                          >
                            {FAULT_OPTIONS.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        ) : (
                          r.fault_type || 'Normal'
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => saveEditing(r.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                              title="Save edits"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 rounded bg-navy-750 hover:bg-navy-700 text-slate-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEditing(r)}
                              className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                              title="Edit row"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(r.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-navy-800 text-xs font-mono text-slate-400">
          <div>
            Showing page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span> ({totalCount.toLocaleString()} total rows)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* UPLOAD CSV MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-mono">
                <Upload className="w-4 h-4 text-cyan-400" />
                Upload Telemetry CSV
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Select CSV File:</label>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs font-mono text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-mono file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports DOC-20261012-WA0014.csv hardware logs or standard exported telemetry CSVs.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Ingestion Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                    uploadMode === 'append' ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300' : 'bg-navy-850 border-navy-750 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="append"
                      checked={uploadMode === 'append'}
                      onChange={() => setUploadMode('append')}
                      className="hidden"
                    />
                    <span>Append to Database</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer ${
                    uploadMode === 'replace' ? 'bg-rose-950/60 border-rose-500 text-rose-300' : 'bg-navy-850 border-navy-750 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="uploadMode"
                      value="replace"
                      checked={uploadMode === 'replace'}
                      onChange={() => setUploadMode('replace')}
                      className="hidden"
                    />
                    <span>Replace Real Records</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-navy-850 text-slate-400 hover:text-white font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {uploading ? 'Ingesting...' : 'Start Ingest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROW MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full rounded-2xl p-6 border border-emerald-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add New Telemetry Reading
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRowSubmit} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5">Temperature (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRow.temperature_c}
                    onChange={(e) => setNewRow({ ...newRow, temperature_c: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-amber-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">PWM Duty (%):</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={newRow.pwm_duty}
                    onChange={(e) => setNewRow({ ...newRow, pwm_duty: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-0.5">Accel X (g):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.ax}
                    onChange={(e) => setNewRow({ ...newRow, ax: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Accel Y (g):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.ay}
                    onChange={(e) => setNewRow({ ...newRow, ay: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Accel Z (g):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.az}
                    onChange={(e) => setNewRow({ ...newRow, az: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-0.5">Vibration RMS (g):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRow.vibration_rms}
                    onChange={(e) => setNewRow({ ...newRow, vibration_rms: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-cyan-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Fault Pattern:</label>
                  <select
                    value={newRow.fault_type}
                    onChange={(e) => setNewRow({ ...newRow, fault_type: e.target.value })}
                    className="w-full px-2 py-1 rounded-lg bg-navy-850 border border-navy-750 text-white"
                  >
                    {FAULT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-navy-850 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Insert Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CsvStudioView;
