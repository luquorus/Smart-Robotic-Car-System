import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from './mongo.js';
import { parseDateRange } from './utils.js';
import { hashPassword, comparePassword, generateToken } from './auth.js';
import { authenticateToken, requireAdmin } from './authMiddleware.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ========== Authentication Routes ==========

// Register new admin user
router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = {
      username,
      password: hashedPassword,
      email: email || null,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate token
    const token = generateToken({ _id: result.insertedId, username, role: 'admin' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: result.insertedId.toString(),
        username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('[API] /auth/register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDb();
    const usersCollection = db.collection('users');

    // Find user
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[API] /auth/login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify token
router.get('/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

// Get current user info
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('[API] /auth/me error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== User Management Routes (Admin Only) ==========

// Get all users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const usersCollection = db.collection('users');
    const users = await usersCollection.find(
      {},
      { projection: { password: 0 } }
    ).sort({ created_at: -1 }).toArray();

    const usersWithId = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    res.json(usersWithId);
  } catch (error) {
    console.error('[API] /users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (Admin only)
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error('[API] /users/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user (Admin only)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = {
      username,
      password: hashedPassword,
      email: email || null,
      role: role || 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: result.insertedId.toString(),
        username,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('[API] POST /users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user (Admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email, role } = req.body;

    const db = getDb();
    const usersCollection = db.collection('users');

    // Check if user exists
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update object
    const updateData = {
      updated_at: new Date(),
    };

    if (username !== undefined) {
      // Check if new username already exists (excluding current user)
      const usernameExists = await usersCollection.findOne({
        username,
        _id: { $ne: new ObjectId(id) }
      });
      if (usernameExists) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updateData.username = username;
    }

    if (email !== undefined) {
      updateData.email = email || null;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      updateData.password = await hashPassword(password);
    }

    // Update user
    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Get updated user
    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error('[API] PUT /users/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const usersCollection = db.collection('users');

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await usersCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[API] DELETE /users/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all devices with latest status
router.get('/devices', async (req, res) => {
  try {
    const db = getDb();

    // Get devices from all collections (status, telemetry, events)
    const [statusDevices, telemetryDevices, eventDevices] = await Promise.all([
      db.collection('status').aggregate([
        { $sort: { ts: -1 } },
        { $group: { _id: '$device_id', status: { $first: '$status' }, last_ts: { $first: '$ts' } } },
        { $project: { _id: 0, device_id: '$_id', status: 1, last_ts: 1, source: { $literal: 'status' } } }
      ]).toArray(),
      db.collection('telemetry').aggregate([
        { $sort: { ts: -1 } },
        { $group: { _id: '$device_id', last_ts: { $first: '$ts' } } },
        { $project: { _id: 0, device_id: '$_id', last_ts: 1, source: { $literal: 'telemetry' } } }
      ]).toArray(),
      db.collection('events').aggregate([
        { $sort: { ts: -1 } },
        { $group: { _id: '$device_id', last_ts: { $first: '$ts' } } },
        { $project: { _id: 0, device_id: '$_id', last_ts: 1, source: { $literal: 'events' } } }
      ]).toArray()
    ]);

    // Merge all devices
    const deviceMap = new Map();

    // Add status devices (has status field)
    statusDevices.forEach(device => {
      deviceMap.set(device.device_id, device);
    });

    // Add telemetry devices (if not in status)
    telemetryDevices.forEach(device => {
      if (!deviceMap.has(device.device_id)) {
        deviceMap.set(device.device_id, { ...device, status: 'unknown' });
      } else {
        // Update last_ts if newer
        const existing = deviceMap.get(device.device_id);
        if (new Date(device.last_ts) > new Date(existing.last_ts)) {
          existing.last_ts = device.last_ts;
        }
      }
    });

    // Add event devices (if not exists)
    eventDevices.forEach(device => {
      if (!deviceMap.has(device.device_id)) {
        deviceMap.set(device.device_id, { ...device, status: 'unknown' });
      } else {
        const existing = deviceMap.get(device.device_id);
        if (new Date(device.last_ts) > new Date(existing.last_ts)) {
          existing.last_ts = device.last_ts;
        }
      }
    });

    // Convert to array and sort by last_ts
    const devices = Array.from(deviceMap.values())
      .map(({ source, ...device }) => device) // Remove source field
      .sort((a, b) => new Date(b.last_ts) - new Date(a.last_ts));

    res.json(devices);
  } catch (error) {
    console.error('[API] /devices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete device (Admin only) - Deletes all logs for the device
router.delete('/devices/:device_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { device_id } = req.params;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const collections = ['telemetry', 'events', 'status'];

    const results = {};
    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({ device_id });
      results[collectionName] = result.deletedCount;
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    res.json({
      message: 'Device deleted successfully',
      device_id,
      deleted: results,
      total_deleted: totalDeleted,
    });
  } catch (error) {
    console.error('[API] DELETE /devices/:device_id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest telemetry
router.get('/telemetry/latest', async (req, res) => {
  try {
    const { device_id } = req.query;
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const doc = await db
      .collection('telemetry')
      .findOne(
        { device_id },
        { sort: { ts: -1 } }
      );

    if (!doc) {
      return res.status(404).json({ error: 'No telemetry found' });
    }

    res.json(doc);
  } catch (error) {
    console.error('[API] /telemetry/latest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get telemetry history
router.get('/telemetry', async (req, res) => {
  try {
    const { device_id, limit = 100, from, to } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const query = { device_id };

    // Add date range if provided
    try {
      const { fromDate, toDate } = parseDateRange(from, to);
      if (fromDate || toDate) {
        query.ts = {};
        if (fromDate) query.ts.$gte = fromDate;
        if (toDate) query.ts.$lte = toDate;
      }
    } catch (dateError) {
      return res.status(400).json({ error: dateError.message });
    }

    const docs = await db
      .collection('telemetry')
      .find(query)
      .sort({ ts: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(docs);
  } catch (error) {
    console.error('[API] /telemetry error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get events history
router.get('/events', async (req, res) => {
  try {
    const { device_id, limit = 100, from, to } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const query = { device_id };

    try {
      const { fromDate, toDate } = parseDateRange(from, to);
      if (fromDate || toDate) {
        query.ts = {};
        if (fromDate) query.ts.$gte = fromDate;
        if (toDate) query.ts.$lte = toDate;
      }
    } catch (dateError) {
      return res.status(400).json({ error: dateError.message });
    }

    const docs = await db
      .collection('events')
      .find(query)
      .sort({ ts: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(docs);
  } catch (error) {
    console.error('[API] /events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get status history
router.get('/status', async (req, res) => {
  try {
    const { device_id, limit = 100, from, to } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const query = { device_id };

    try {
      const { fromDate, toDate } = parseDateRange(from, to);
      if (fromDate || toDate) {
        query.ts = {};
        if (fromDate) query.ts.$gte = fromDate;
        if (toDate) query.ts.$lte = toDate;
      }
    } catch (dateError) {
      return res.status(400).json({ error: dateError.message });
    }

    const docs = await db
      .collection('status')
      .find(query)
      .sort({ ts: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json(docs);
  } catch (error) {
    console.error('[API] /status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== Device Logs Management ==========

// Delete device logs (Admin only)
router.delete('/devices/:device_id/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { device_id } = req.params;
    const { type } = req.query; // 'telemetry', 'events', 'status', or 'all'

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    const db = getDb();
    const collections = [];
    
    if (!type || type === 'all') {
      collections.push('telemetry', 'events', 'status');
    } else if (['telemetry', 'events', 'status'].includes(type)) {
      collections.push(type);
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: telemetry, events, status, or all' });
    }

    const results = {};
    for (const collectionName of collections) {
      const result = await db.collection(collectionName).deleteMany({ device_id });
      results[collectionName] = result.deletedCount;
    }

    res.json({
      message: 'Logs deleted successfully',
      device_id,
      deleted: results,
    });
  } catch (error) {
    console.error('[API] DELETE /devices/:device_id/logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export device logs (Admin only)
router.get('/devices/:device_id/logs/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { device_id } = req.params;
    const { type, format = 'csv', from, to } = req.query;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    if (!['telemetry', 'events', 'status', 'all'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Use: telemetry, events, status, or all' });
    }

    if (!['csv', 'txt'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use: csv or txt' });
    }

    const db = getDb();
    const collections = type === 'all' 
      ? ['telemetry', 'events', 'status'] 
      : [type];

    let allData = [];

    for (const collectionName of collections) {
      const query = { device_id };

      // Add date range if provided
      try {
        const { fromDate, toDate } = parseDateRange(from, to);
        if (fromDate || toDate) {
          query.ts = {};
          if (fromDate) query.ts.$gte = fromDate;
          if (toDate) query.ts.$lte = toDate;
        }
      } catch (dateError) {
        return res.status(400).json({ error: dateError.message });
      }

      const docs = await db
        .collection(collectionName)
        .find(query)
        .sort({ ts: 1 }) // Sort ascending for chronological order
        .toArray();

      // Add collection type to each doc
      docs.forEach(doc => {
        doc._collection = collectionName;
      });

      allData = allData.concat(docs);
    }

    // Sort all data by timestamp
    allData.sort((a, b) => new Date(a.ts) - new Date(b.ts));

    if (format === 'csv') {
      // Generate CSV
      if (allData.length === 0) {
        return res.status(404).json({ error: 'No data found' });
      }

      // Get all unique keys from all documents
      const allKeys = new Set();
      allData.forEach(doc => {
        Object.keys(doc).forEach(key => {
          if (key !== '_id' && key !== '_collection') {
            allKeys.add(key);
          }
        });
      });

      const headers = ['collection', ...Array.from(allKeys).sort()];
      const csvRows = [headers.join(',')];

      allData.forEach(doc => {
        const row = [doc._collection];
        headers.slice(1).forEach(key => {
          let value = doc[key];
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          } else {
            value = String(value);
          }
          // Escape commas and quotes
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          row.push(value);
        });
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const filename = `device_${device_id}_logs_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } else {
      // Generate TXT
      if (allData.length === 0) {
        return res.status(404).json({ error: 'No data found' });
      }

      let txt = `Device Logs Export\n`;
      txt += `Device ID: ${device_id}\n`;
      txt += `Export Date: ${new Date().toISOString()}\n`;
      txt += `Total Records: ${allData.length}\n`;
      txt += `${'='.repeat(80)}\n\n`;

      allData.forEach((doc, index) => {
        txt += `[${index + 1}] Collection: ${doc._collection}\n`;
        txt += `Timestamp: ${new Date(doc.ts).toISOString()}\n`;
        Object.keys(doc).forEach(key => {
          if (key !== '_id' && key !== '_collection' && key !== 'ts') {
            let value = doc[key];
            if (value === null || value === undefined) {
              value = 'null';
            } else if (typeof value === 'object') {
              value = JSON.stringify(value, null, 2);
            }
            txt += `${key}: ${value}\n`;
          }
        });
        txt += `${'-'.repeat(80)}\n\n`;
      });

      const filename = `device_${device_id}_logs_${new Date().toISOString().split('T')[0]}.txt`;

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(txt);
    }
  } catch (error) {
    console.error('[API] GET /devices/:device_id/logs/export error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

