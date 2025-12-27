import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = import.meta.env.VITE_API || 'http://localhost:8080';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', email: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' or 'users'
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '', role: 'admin' });
  const [editingUser, setEditingUser] = useState(null);
  const [userError, setUserError] = useState('');
  const [deleteLogType, setDeleteLogType] = useState('all');
  const [exportLogType, setExportLogType] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [deletingLogs, setDeletingLogs] = useState(false);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState(false);
  const socketRef = useRef(null);

  // Check authentication on mount
  useEffect(() => {
    if (token) {
      verifyToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load devices list (only if authenticated)
  useEffect(() => {
    if (token && user) {
      loadDevices();
      const interval = setInterval(loadDevices, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Load users list (only if authenticated and admin)
  useEffect(() => {
    if (token && user && user.role === 'admin' && activeTab === 'users') {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, activeTab]);

  // Socket.IO connection (only when authenticated)
  useEffect(() => {
    if (!token || !user) return;

    socketRef.current = io(API_URL);

    socketRef.current.on('connect', () => {
      console.log('[Socket.IO] Connected');
    });

    socketRef.current.on('telemetry', (data) => {
      if (selectedDevice && data.device_id === selectedDevice) {
        setLiveTelemetry(data);
      }
    });

    socketRef.current.on('event', (data) => {
      if (selectedDevice && data.device_id === selectedDevice) {
        setEvents((prev) => {
          const newEvents = [data, ...prev];
          return newEvents.slice(0, 50); // Keep latest 50
        });
      }
    });

    socketRef.current.on('status', (data) => {
      // Update device status in list
      setDevices((prev) =>
        prev.map((d) =>
          d.device_id === data.device_id
            ? { ...d, status: data.status, last_ts: data.ts }
            : d
        )
      );
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, user, selectedDevice]);

  // Load latest telemetry when device selected
  useEffect(() => {
    if (selectedDevice && token && user) {
      loadLatestTelemetry();
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice, token, user]);

  async function verifyToken() {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid, logout
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Verify token error:', error);
      handleLogout();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoginError('');
    setRegisterLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setRegisterForm({ username: '', password: '', email: '' });
        setShowRegister(false);
      } else {
        setLoginError(data.error || 'Registration failed');
      }
    } catch (error) {
      setLoginError('Network error. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
    setDevices([]);
    setSelectedDevice(null);
    setLiveTelemetry(null);
    setEvents([]);
    setHistory([]);
    localStorage.removeItem('token');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }

  async function loadDevices() {
    try {
      const res = await fetch(`${API_URL}/api/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
        
        // Auto-select first device if none selected
        if (!selectedDevice && data.length > 0) {
          setSelectedDevice(data[0].device_id);
        }
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Load devices error:', error);
    }
  }

  async function loadLatestTelemetry() {
    if (!selectedDevice || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/telemetry/latest?device_id=${selectedDevice}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveTelemetry(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Load latest telemetry error:', error);
    }
  }

  async function loadEvents() {
    if (!selectedDevice || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/events?device_id=${selectedDevice}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Load events error:', error);
    }
  }

  async function loadHistory() {
    if (!selectedDevice || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/telemetry?device_id=${selectedDevice}&limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Load history error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (error) {
      console.error('[API] Load users error:', error);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setUserError('');
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUserForm({ username: '', password: '', email: '', role: 'admin' });
        loadUsers();
      } else {
        setUserError(data.error || 'Failed to create user');
      }
    } catch (error) {
      setUserError('Network error. Please try again.');
    }
  }

  async function handleUpdateUser(e) {
    e.preventDefault();
    setUserError('');
    try {
      const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        setUserForm({ username: '', password: '', email: '', role: 'admin' });
        loadUsers();
      } else {
        setUserError(data.error || 'Failed to update user');
      }
    } catch (error) {
      setUserError('Network error. Please try again.');
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa user này?')) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  }

  function startEditUser(user) {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: '', // Don't prefill password
      email: user.email || '',
      role: user.role || 'admin'
    });
    setUserError('');
  }

  function cancelEdit() {
    setEditingUser(null);
    setUserForm({ username: '', password: '', email: '', role: 'admin' });
    setUserError('');
  }

  async function handleDeleteLogs() {
    if (!selectedDevice || !token) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa logs ${deleteLogType === 'all' ? 'tất cả' : deleteLogType} của device ${selectedDevice}?`)) {
      return;
    }

    setDeletingLogs(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/${selectedDevice}/logs?type=${deleteLogType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Đã xóa thành công:\n${Object.entries(data.deleted).map(([k, v]) => `${k}: ${v} records`).join('\n')}`);
        // Reload data
        loadLatestTelemetry();
        loadEvents();
        loadHistory();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete logs');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setDeletingLogs(false);
    }
  }

  async function handleExportLogs() {
    if (!selectedDevice || !token) return;

    setExportingLogs(true);
    try {
      const url = `${API_URL}/api/devices/${selectedDevice}/logs/export?type=${exportLogType}&format=${exportFormat}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `device_${selectedDevice}_logs.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to export logs');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setExportingLogs(false);
    }
  }

  async function handleDeleteDevice(deviceId, e) {
    e.stopPropagation(); // Prevent device selection
    if (!confirm(`Bạn có chắc chắn muốn xóa device "${deviceId}"? Tất cả logs sẽ bị xóa vĩnh viễn!`)) {
      return;
    }

    setDeletingDevice(true);
    try {
      const res = await fetch(`${API_URL}/api/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Đã xóa device "${deviceId}" thành công!\nTổng số records đã xóa: ${data.total_deleted}`);
        // Clear selected device if it was deleted
        if (selectedDevice === deviceId) {
          setSelectedDevice(null);
          setLiveTelemetry(null);
          setEvents([]);
          setHistory([]);
        }
        // Reload devices list
        loadDevices();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete device');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setDeletingDevice(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return formatDate(dateStr);
  }

  // Show login form if not authenticated
  if (!token || !user) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-box">
            <h1>ESP32 Car Admin Panel</h1>
            <h2>Đăng nhập</h2>
            {!showRegister ? (
              <>
                <form onSubmit={handleLogin}>
                  {loginError && <div className="error-message">{loginError}</div>}
                  <div className="form-group">
                    <label>Username:</label>
                    <input
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Password:</label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="login-btn" disabled={loginLoading}>
                    {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>
                </form>
                <div className="login-switch">
                  <p>Chưa có tài khoản? <button type="button" onClick={() => { setShowRegister(true); setLoginError(''); }} className="link-btn">Đăng ký</button></p>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleRegister}>
                  {loginError && <div className="error-message">{loginError}</div>}
                  <div className="form-group">
                    <label>Username:</label>
                    <input
                      type="text"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Password:</label>
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (optional):</label>
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="login-btn" disabled={registerLoading}>
                    {registerLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                  </button>
                </form>
                <div className="login-switch">
                  <p>Đã có tài khoản? <button type="button" onClick={() => { setShowRegister(false); setLoginError(''); }} className="link-btn">Đăng nhập</button></p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>ESP32 Car Admin Panel</h1>
          <div className="user-info">
            <span className="username">{user.username}</span>
            <button onClick={handleLogout} className="logout-btn">Đăng xuất</button>
          </div>
        </div>
      </header>

      <div className="app-container">
        {/* Left Panel - Navigation */}
        <div className="left-panel">
          <div className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveTab('devices')}
            >
              Devices
            </button>
            {user && user.role === 'admin' && (
              <button
                className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                Users
              </button>
            )}
          </div>

          {activeTab === 'devices' && (
            <>
              <h2>Devices</h2>
              <div className="device-list">
                {devices.length === 0 ? (
                  <p className="empty">No devices found</p>
                ) : (
                  devices.map((device) => (
                    <div
                      key={device.device_id}
                      className={`device-item ${selectedDevice === device.device_id ? 'active' : ''}`}
                      onClick={() => setSelectedDevice(device.device_id)}
                    >
                      <div className="device-item-content">
                        <div className="device-id">{device.device_id}</div>
                        <div className={`device-status ${device.status}`}>
                          {device.status || 'unknown'}
                        </div>
                        <div className="device-time">
                          {formatTimeAgo(device.last_ts)}
                        </div>
                      </div>
                      {user && user.role === 'admin' && (
                        <button
                          className="device-delete-btn"
                          onClick={(e) => handleDeleteDevice(device.device_id, e)}
                          disabled={deletingDevice}
                          title="Delete device"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'users' && user && user.role === 'admin' && (
            <div className="users-panel">
              <h2>User Management</h2>
              <div className="user-form-section">
                <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
                {userError && <div className="error-message">{userError}</div>}
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                  <div className="form-group">
                    <label>Username:</label>
                    <input
                      type="text"
                      value={userForm.username}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password {editingUser && '(leave empty to keep current)'}:</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Role:</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    >
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      {editingUser ? 'Update' : 'Create'}
                    </button>
                    {editingUser && (
                      <button type="button" onClick={cancelEdit} className="btn-secondary">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div className="main-panel">
          {activeTab === 'users' && user && user.role === 'admin' ? (
            <div className="panel-section">
              <h2>All Users</h2>
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty">No users found</td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.username}</td>
                          <td>{u.email || '-'}</td>
                          <td>{u.role}</td>
                          <td>{formatDate(u.created_at)}</td>
                          <td>
                            <button
                              onClick={() => startEditUser(u)}
                              className="btn-edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="btn-delete"
                              disabled={u.id === user.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'devices' && (
            selectedDevice ? (
              <>
                {user && user.role === 'admin' && (
                  <div className="panel-section">
                    <h2>Log Management - {selectedDevice}</h2>
                    <div className="log-management">
                      <div className="log-action-group">
                        <h3>Delete Logs</h3>
                        <div className="form-row">
                          <select
                            value={deleteLogType}
                            onChange={(e) => setDeleteLogType(e.target.value)}
                            className="log-select"
                          >
                            <option value="all">All Logs</option>
                            <option value="telemetry">Telemetry Only</option>
                            <option value="events">Events Only</option>
                            <option value="status">Status Only</option>
                          </select>
                          <button
                            onClick={handleDeleteLogs}
                            disabled={deletingLogs}
                            className="btn-delete-logs"
                          >
                            {deletingLogs ? 'Deleting...' : 'Delete Logs'}
                          </button>
                        </div>
                      </div>
                      <div className="log-action-group">
                        <h3>Export Logs</h3>
                        <div className="form-row">
                          <select
                            value={exportLogType}
                            onChange={(e) => setExportLogType(e.target.value)}
                            className="log-select"
                          >
                            <option value="all">All Logs</option>
                            <option value="telemetry">Telemetry Only</option>
                            <option value="events">Events Only</option>
                            <option value="status">Status Only</option>
                          </select>
                          <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value)}
                            className="log-select"
                          >
                            <option value="csv">CSV</option>
                            <option value="txt">TXT</option>
                          </select>
                          <button
                            onClick={handleExportLogs}
                            disabled={exportingLogs}
                            className="btn-export-logs"
                          >
                            {exportingLogs ? 'Exporting...' : 'Export Logs'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="panel-section">
                  <h2>Live Telemetry - {selectedDevice}</h2>
                  {liveTelemetry ? (
                    <div className="telemetry-box">
                      <div className="telemetry-grid">
                        <div className="telemetry-item">
                          <label>Mode:</label>
                          <span className="value">{liveTelemetry.mode || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Motion:</label>
                          <span className="value">{liveTelemetry.motion || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Distance:</label>
                          <span className="value">{liveTelemetry.distance_cm?.toFixed(1) || '-'} cm</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Obstacle:</label>
                          <span className={`value ${liveTelemetry.obstacle ? 'danger' : ''}`}>
                            {liveTelemetry.obstacle ? 'YES' : 'NO'}
                          </span>
                        </div>
                        <div className="telemetry-item">
                          <label>Speed Linear:</label>
                          <span className="value">{liveTelemetry.speed?.linear || liveTelemetry.speed_linear || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Speed Rot:</label>
                          <span className="value">{liveTelemetry.speed?.rot || liveTelemetry.speed_rot || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Speed Linear (direct):</label>
                          <span className="value">{liveTelemetry.speed_linear || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Speed Rot (direct):</label>
                          <span className="value">{liveTelemetry.speed_rot || '-'}</span>
                        </div>
                        <div className="telemetry-item">
                          <label>WiFi RSSI:</label>
                          <span className="value">{liveTelemetry.wifi_rssi || '-'} dBm</span>
                        </div>
                        <div className="telemetry-item">
                          <label>Uptime:</label>
                          <span className="value">{liveTelemetry.uptime_ms ? Math.floor(liveTelemetry.uptime_ms / 1000) : '-'}s</span>
                        </div>
                      </div>
                      <details className="json-view">
                        <summary>Raw JSON</summary>
                        <pre>{JSON.stringify(liveTelemetry, null, 2)}</pre>
                      </details>
                    </div>
                  ) : (
                    <p className="empty">No telemetry data</p>
                  )}
                </div>

                <div className="panel-section">
                  <h2>Events Log (Latest 50)</h2>
                  <div className="events-list">
                    {events.length === 0 ? (
                      <p className="empty">No events</p>
                    ) : (
                      events.map((event, idx) => (
                        <div key={idx} className="event-item">
                          <span className="event-time">{formatDate(event.ts)}</span>
                          <span className="event-type">{event.event}</span>
                          <span className="event-data">
                            {event.distance_cm ? `${event.distance_cm.toFixed(1)} cm` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="panel-section">
                  <h2>History</h2>
                  <button onClick={loadHistory} disabled={loading} className="load-btn">
                    {loading ? 'Loading...' : 'Load History (200 records)'}
                  </button>
                  {history.length > 0 && (
                    <div className="history-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Distance (cm)</th>
                            <th>Obstacle</th>
                            <th>Mode</th>
                            <th>Motion</th>
                            <th>Speed Linear</th>
                            <th>Speed Rot</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, idx) => (
                            <tr key={idx}>
                              <td>{formatDate(item.ts)}</td>
                              <td>{item.distance_cm?.toFixed(1) || '-'}</td>
                              <td>{item.obstacle ? 'YES' : 'NO'}</td>
                              <td>{item.mode || '-'}</td>
                              <td>{item.motion || '-'}</td>
                              <td>{item.speed_linear || item.speed?.linear || '-'}</td>
                              <td>{item.speed_rot || item.speed?.rot || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Select a device from the left panel</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
