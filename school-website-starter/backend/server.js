const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file at project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// ==========================================
// 1. MIDDLEWARE SETUP & STATIC SERVING
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend directory
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));

// Enable CORS for cross-origin requests (e.g. static dev servers)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Ensure uploads directory exists inside frontend
const uploadDir = path.join(frontendDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Persistent administrative sessions store
const sessionsPath = path.join(__dirname, 'data', 'sessions.json');
let activeSessions = new Set();
try {
    if (fs.existsSync(sessionsPath)) {
        const savedSessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8') || '[]');
        activeSessions = new Set(savedSessions);
    }
} catch (e) {
    console.error('[Sessions Load Error]', e.message);
}

function persistSessions() {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(sessionsPath, JSON.stringify(Array.from(activeSessions), null, 2));
    } catch (e) {
        console.error('[Sessions Save Error]', e.message);
    }
}

// ==========================================
// 2. SUPABASE DATABASE CLIENT SETUP
// ==========================================
let supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

// Normalize Supabase URL by stripping trailing PostgREST path suffixes
if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.substring(0, supabaseUrl.length - 8);
}
if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
}

const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseUrl.startsWith('https://')
);

let supabase = null;
if (isSupabaseConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('[Supabase Setup] Client initialized successfully.');
    } catch (err) {
        console.error('[Supabase Setup] Failed to create client:', err.message);
    }
} else {
    console.log('[Supabase Setup] Running with local JSON database fallback.');
}

// ==========================================
// 3. AUTHENTICATION MIDDLEWARE
// ==========================================
const authAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Access denied. Authorization token missing.' });
    }
    const token = authHeader.substring(7);
    if (!activeSessions.has(token)) {
        return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.sessionToken = token;
    next();
};

// ==========================================
// 4. IN-MEMORY SETTINGS CACHE
// ==========================================
let settingsCache = null;

async function loadSettingsIntoCache() {
    try {
        const settingsPath = path.join(__dirname, 'data', 'school_details.json');
        let localConfig = {};
        if (fs.existsSync(settingsPath)) {
            try {
                localConfig = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            } catch (e) {
                console.error('[Settings] Error reading local settings file:', e.message);
            }
        }

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('school_details')
                    .select('value')
                    .eq('key', 'current_config')
                    .maybeSingle();

                if (!error && data && data.value) {
                    settingsCache = { ...localConfig, ...data.value };
                    if (localConfig.email && settingsCache.email !== localConfig.email) {
                        settingsCache.email = localConfig.email;
                        try {
                            await supabase.from('school_details').upsert({ key: 'current_config', value: settingsCache });
                        } catch (upsertErr) {
                            console.error('[Supabase Sync Error]', upsertErr.message);
                        }
                    }
                    console.log('[Settings Cache] Loaded from Supabase & merged with local defaults.');
                    return settingsCache;
                } else if (error) {
                    console.error('[Settings Fetch Error]', error.message);
                }
            } catch (supabaseErr) {
                console.error('[Settings Exception] Falling back to local disk:', supabaseErr.message);
            }
        }

        settingsCache = localConfig;
        console.log('[Settings Cache] Loaded from local school_details.json.');
        return settingsCache;
    } catch (error) {
        console.error('[Settings Cache Load Failure]', error.message);
        return null;
    }
}

// ==========================================
// 5. ROUTE HANDLERS
// ==========================================

// --- ADMIN AUTHENTICATION ---

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
    try {
        let { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and Password are required.' });
        }

        const cleanUsername = String(username).trim();
        const cleanPassword = String(password).trim();

        console.log(`[Login Attempt] Username: "${cleanUsername}"`);

        // 1. Try Supabase query
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('admins')
                    .select('*')
                    .eq('username', cleanUsername)
                    .eq('password', cleanPassword)
                    .maybeSingle();

                if (!error && data) {
                    const token = 'sbps_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
                    activeSessions.add(token);
                    persistSessions();
                    console.log(`[Admin Logged In] Username: ${cleanUsername} (via Supabase)`);
                    return res.status(200).json({ success: true, token, name: data.name });
                }
            } catch (supabaseErr) {
                console.error('[Supabase Auth Exception] Falling back to local disk:', supabaseErr.message);
            }
        }

        // 2. Fallback to Local JSON DB
        const adminsPath = path.join(__dirname, 'data', 'admins.json');
        let admins = [];
        if (fs.existsSync(adminsPath)) {
            admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8') || '[]');
        }

        const user = admins.find(a => (a.username || '').trim().toLowerCase() === cleanUsername.toLowerCase() && (a.password || '').trim() === cleanPassword);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        const token = 'sbps_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        activeSessions.add(token);
        persistSessions();

        console.log(`[Admin Logged In] Username: ${cleanUsername} (Local Fallback)`);
        return res.status(200).json({ success: true, token, name: user.name });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ success: false, message: 'Login execution failed.' });
    }
});

// POST /api/admin/logout
app.post('/api/admin/logout', authAdmin, (req, res) => {
    activeSessions.delete(req.sessionToken);
    persistSessions();
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// --- MEDIA / IMAGE UPLOAD ---

// POST /api/admin/upload
app.post('/api/admin/upload', authAdmin, async (req, res) => {
    try {
        const { filename, base64Data } = req.body;
        if (!filename || !base64Data) {
            return res.status(400).json({ success: false, message: 'Filename and base64Data are required.' });
        }

        const parts = base64Data.split(';base64,');
        if (parts.length !== 2) {
            return res.status(400).json({ success: false, message: 'Invalid base64 image format.' });
        }

        const buffer = Buffer.from(parts[1], 'base64');
        const headerMatches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,/);
        const contentType = headerMatches ? headerMatches[1] : 'image/jpeg';

        const ext = path.extname(filename) || '.jpg';
        const safeFilename = 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + ext;

        // Try Supabase Storage first
        if (supabase) {
            try {
                const { error: uploadError } = await supabase.storage
                    .from('gallery')
                    .upload(safeFilename, buffer, { contentType, upsert: true });

                if (!uploadError) {
                    const { data: publicUrlData } = supabase.storage
                        .from('gallery')
                        .getPublicUrl(safeFilename);

                    console.log(`[Upload API] Saved to Supabase Storage: ${publicUrlData.publicUrl}`);
                    return res.status(200).json({ success: true, url: publicUrlData.publicUrl });
                }
            } catch (storageErr) {
                console.error('[Supabase Storage Exception]', storageErr.message);
            }
        }

        // Local Storage Fallback
        const filePath = path.join(uploadDir, safeFilename);
        fs.writeFileSync(filePath, buffer);
        console.log(`[Upload API] Saved locally to: ${filePath}`);

        return res.status(200).json({ success: true, url: `/uploads/${safeFilename}` });
    } catch (err) {
        console.error('[Upload Error]', err.message);
        return res.status(500).json({ success: false, message: 'Server error saving uploaded file.' });
    }
});

// --- SCHOOL SETTINGS ---

// GET /api/admin/settings
app.get('/api/admin/settings', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        if (!settingsCache) {
            await loadSettingsIntoCache();
        }
        return res.status(200).json(settingsCache || {});
    } catch (error) {
        console.error('Settings read error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/admin/settings
app.post('/api/admin/settings', authAdmin, async (req, res) => {
    try {
        if (!settingsCache) {
            await loadSettingsIntoCache();
        }

        const mergedSettings = {
            ...(settingsCache || {}),
            ...(req.body || {})
        };

        // 1. Sync to local JSON database
        const settingsPath = path.join(__dirname, 'data', 'school_details.json');
        fs.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2));

        // 2. Sync to Supabase DB if configured
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('school_details')
                    .upsert({ key: 'current_config', value: mergedSettings });

                if (error) {
                    console.error('[Supabase Settings Write Error]', error.message);
                } else {
                    console.log('[Settings Updated] Synced with Supabase.');
                }
            } catch (supabaseErr) {
                console.error('[Supabase Settings Write Exception]', supabaseErr.message);
            }
        }

        settingsCache = mergedSettings;
        return res.status(200).json({ success: true, message: 'School details updated successfully!' });
    } catch (error) {
        console.error('Settings write error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to save settings.' });
    }
});

// --- INQUIRIES MANAGEMENT ---

// GET /api/admin/inquiries
app.get('/api/admin/inquiries', authAdmin, async (req, res) => {
    try {
        let allInquiries = [];

        // 1. Fetch from Supabase
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('inquiries')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const sbInquiries = data.map(inq => ({
                        id: inq.id,
                        name: inq.name,
                        phone: inq.phone,
                        email: inq.email || '',
                        grade: inq.grade || 'N/A',
                        message: inq.message || '',
                        type: inq.type || 'General Inquiry',
                        timestamp: inq.created_at
                    }));
                    allInquiries = allInquiries.concat(sbInquiries);
                }
            } catch (supabaseErr) {
                console.error('[Supabase Inquiries Fetch Exception]', supabaseErr.message);
            }
        }

        // 2. Fetch from Local JSON DB
        const inquiryPath = path.join(__dirname, 'data', 'inquiries.json');
        let localInquiries = [];
        if (fs.existsSync(inquiryPath)) {
            localInquiries = JSON.parse(fs.readFileSync(inquiryPath, 'utf8') || '[]');
        }
        allInquiries = allInquiries.concat(localInquiries);

        // Deduplicate and sort by timestamp
        const seenIds = new Set();
        const uniqueInquiries = allInquiries.filter(inq => {
            if (seenIds.has(inq.id)) return false;
            seenIds.add(inq.id);
            return true;
        });

        uniqueInquiries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return res.status(200).json({ success: true, inquiries: uniqueInquiries });
    } catch (error) {
        console.error('Inquiries read error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to load inquiries.' });
    }
});

// DELETE /api/admin/inquiries/:id
app.delete('/api/admin/inquiries/:id', authAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Delete from Local JSON DB
        const inquiryPath = path.join(__dirname, 'data', 'inquiries.json');
        if (fs.existsSync(inquiryPath)) {
            const inquiries = JSON.parse(fs.readFileSync(inquiryPath, 'utf8') || '[]');
            const filtered = inquiries.filter(inq => inq.id !== id);
            fs.writeFileSync(inquiryPath, JSON.stringify(filtered, null, 2));
        }

        // 2. Delete from Supabase
        if (supabase) {
            try {
                await supabase.from('inquiries').delete().eq('id', id);
            } catch (supabaseErr) {
                console.error('[Supabase Inquiry Delete Exception]', supabaseErr.message);
            }
        }

        return res.status(200).json({ success: true, message: 'Inquiry deleted successfully!' });
    } catch (error) {
        console.error('Inquiry delete error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete inquiry.' });
    }
});

// POST /api/inquiry (Public Form Submission)
app.post('/api/inquiry', async (req, res) => {
    try {
        const { name, email, phone, grade, message, type } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone Number are required.' });
        }

        // 1. Save to Supabase DB if available
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('inquiries')
                    .insert({
                        name,
                        email: email || '',
                        phone,
                        grade: grade || 'N/A',
                        message: message || '',
                        type: type || 'General Inquiry'
                    });

                if (!error) {
                    console.log(`[Inquiry Received] ${name} (${type}) via Supabase`);
                    return res.status(200).json({ success: true, message: 'Your inquiry has been submitted successfully! We will contact you soon.' });
                }
                console.error('[Supabase Inquiry Insert Error]', error.message);
            } catch (supabaseErr) {
                console.error('[Supabase Inquiry Exception]', supabaseErr.message);
            }
        }

        // 2. Local Fallback DB
        const inquiryPath = path.join(__dirname, 'data', 'inquiries.json');
        let inquiries = [];
        if (fs.existsSync(inquiryPath)) {
            inquiries = JSON.parse(fs.readFileSync(inquiryPath, 'utf8') || '[]');
        }

        const newInquiry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            name,
            email: email || '',
            phone,
            grade: grade || 'N/A',
            message: message || '',
            type: type || 'General Inquiry',
            timestamp: new Date().toISOString()
        };

        inquiries.push(newInquiry);
        fs.writeFileSync(inquiryPath, JSON.stringify(inquiries, null, 2));

        console.log(`[Inquiry Received] ${name} (${type}) via Local Fallback`);
        return res.status(200).json({ success: true, message: 'Your inquiry has been submitted successfully! We will contact you soon.' });
    } catch (error) {
        console.error('Error handling inquiry:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
    }
});

// --- ADMIN USER MANAGEMENT ---

// GET /api/admin/users
app.get('/api/admin/users', authAdmin, async (req, res) => {
    try {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('admins')
                    .select('username, name')
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    return res.status(200).json({ success: true, users: data });
                }
            } catch (supabaseErr) {
                console.error('[Supabase Users Fetch Exception]', supabaseErr.message);
            }
        }

        const adminsPath = path.join(__dirname, 'data', 'admins.json');
        let admins = [];
        if (fs.existsSync(adminsPath)) {
            admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8') || '[]');
        }
        const sanitized = admins.map(a => ({ username: a.username, name: a.name }));
        return res.status(200).json({ success: true, users: sanitized });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load admins.' });
    }
});

// POST /api/admin/users
app.post('/api/admin/users', authAdmin, async (req, res) => {
    try {
        const { username, password, name } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ success: false, message: 'Username, Password, and Full Name are required.' });
        }

        if (supabase) {
            try {
                const { data: existing } = await supabase
                    .from('admins')
                    .select('username')
                    .eq('username', username)
                    .maybeSingle();

                if (existing) {
                    return res.status(409).json({ success: false, message: 'Username already exists.' });
                }

                const { error: insertError } = await supabase
                    .from('admins')
                    .insert({ username, password, name });

                if (!insertError) {
                    return res.status(200).json({ success: true, message: `Admin account '${username}' registered successfully!` });
                }
            } catch (supabaseErr) {
                console.error('[Supabase User Registration Exception]', supabaseErr.message);
            }
        }

        const adminsPath = path.join(__dirname, 'data', 'admins.json');
        let admins = [];
        if (fs.existsSync(adminsPath)) {
            admins = JSON.parse(fs.readFileSync(adminsPath, 'utf8') || '[]');
        }

        if (admins.some(a => a.username === username)) {
            return res.status(409).json({ success: false, message: 'Username already exists.' });
        }

        admins.push({ username, password, name });
        fs.writeFileSync(adminsPath, JSON.stringify(admins, null, 2));

        return res.status(200).json({ success: true, message: `Admin account '${username}' registered successfully!` });
    } catch (error) {
        console.error('Admin create error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create admin.' });
    }
});

// ==========================================
// 6. SERVER STARTUP & CACHE INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Server running smoothly on http://localhost:${PORT}`);
    await loadSettingsIntoCache();
});
