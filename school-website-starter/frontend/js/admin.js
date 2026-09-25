document.addEventListener('DOMContentLoaded', () => {

    /* Backend API base URL — points to deployed Vercel backend in production */
    const API_BASE = 'https://sbps-home-website-y3ox.vercel.app';

    // Auth & View Panels
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const adminNameDisplay = document.getElementById('admin-name');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    // Forms
    const loginForm = document.getElementById('admin-login-form');
    const detailsForm = document.getElementById('settings-details-form');
    const feesForm = document.getElementById('settings-fees-form');
    const addAdminForm = document.getElementById('add-admin-form');
    
    // Tab controls
    const navButtons = document.querySelectorAll('.nav-btn');
    const viewPanels = document.querySelectorAll('.view-panel');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    // Sidebar titles and summaries mapping
    const navMeta = {
        'inquiries': {
            title: 'Inquiry Messages',
            subtitle: 'Monitor and review prospective admission and general inquiries.'
        },
        'details': {
            title: 'School Profile Settings',
            subtitle: 'Manage general contact numbers, email, campus address, and taglines.'
        },
        'fees-panel': {
            title: 'Fee Calculator Parameters',
            subtitle: 'Configure grade-wise tuition matrices and transport rates for the estimator.'
        },
        'admins': {
            title: 'Manage Portal Admins',
            subtitle: 'Register additional portal administrators and view authorized accounts.'
        },
        'cms': {
            title: 'Website CMS Editor',
            subtitle: 'Directly modify the copy, text blocks, and messages of the home website.'
        },
        'news-events': {
            title: 'Manage News & Events',
            subtitle: 'Add, update, or remove circular notices and upcoming school events.'
        }
    };

    // Cache for school details retrieved from server (contains both contact and fees)
    let currentSettingsCached = {};

    /* ==========================================================================
       Safe API Fetch & Session Expiration Helper
       ========================================================================== */
    const safeFetchJson = async (url, options = {}) => {
        // Prefix relative /api/ paths with the deployed backend base URL
        const resolvedUrl = url.startsWith('/api/') ? API_BASE + url : url;
        try {
            const res = await fetch(resolvedUrl, options);
            let data = null;
            const contentType = res.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                try {
                    data = await res.json();
                } catch (jsonErr) {
                    data = { success: false, message: 'Invalid JSON response from server.' };
                }
            } else {
                const text = await res.text();
                data = { 
                    success: false, 
                    message: res.ok ? 'Unexpected response format.' : `Server returned HTTP ${res.status}: ${text.substring(0, 100)}` 
                };
            }

            // Handle Session Expiration automatically
            if (res.status === 401 || res.status === 403 || (data && data.message && (data.message.includes('expired session') || data.message.includes('Access denied')))) {
                if (sessionStorage.getItem('sbps_admin_token')) {
                    sessionStorage.removeItem('sbps_admin_token');
                    sessionStorage.removeItem('sbps_admin_name');
                    checkAuth();
                    const loginResDiv = document.getElementById('login-response');
                    if (loginResDiv) {
                        loginResDiv.className = 'form-response error';
                        loginResDiv.innerText = 'Your session has expired or is invalid. Please log in again.';
                        loginResDiv.style.display = 'block';
                    }
                }
            }

            return { ok: res.ok, status: res.status, data };
        } catch (err) {
            console.error('[Network Error]', err);
            return { 
                ok: false, 
                status: 0, 
                data: { success: false, message: 'Unable to communicate with server. Please ensure the backend server is running.' } 
            };
        }
    };

    /* ==========================================================================
       1. Authentication & Session Management
       ========================================================================== */
    const getToken = () => sessionStorage.getItem('sbps_admin_token');
    
    const checkAuth = () => {
        const token = getToken();
        if (token) {
            loginSection.style.display = 'none';
            dashboardSection.style.display = 'flex';
            adminNameDisplay.innerText = sessionStorage.getItem('sbps_admin_name') || 'Administrator';
            
            // Initial data pull
            loadInquiries();
            loadSettings();
            loadAdmins();
        } else {
            loginSection.style.display = 'flex';
            dashboardSection.style.display = 'none';
        }
    };

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            const responseDiv = document.getElementById('login-response');
            
            // Button spinner feedback
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';

            try {
                const { ok, data } = await safeFetchJson('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: (usernameInput.value || '').trim(),
                        password: (passwordInput.value || '').trim()
                    })
                });
                
                if (ok && data && data.success) {
                    sessionStorage.setItem('sbps_admin_token', data.token);
                    sessionStorage.setItem('sbps_admin_name', data.name);
                    responseDiv.style.display = 'none';
                    loginForm.reset();
                    checkAuth();
                } else {
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = (data && data.message) || 'Login credentials rejected.';
                    responseDiv.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                responseDiv.className = 'form-response error';
                responseDiv.innerText = 'Unable to establish server connection.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
            }
        });
    }

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const token = getToken();
            if (token) {
                await safeFetchJson('/api/admin/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            
            sessionStorage.removeItem('sbps_admin_token');
            sessionStorage.removeItem('sbps_admin_name');
            checkAuth();
        });
    }


    /* ==========================================================================
       2. Dashboard Layout Tab Toggles
       ========================================================================== */
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Set nav buttons active states
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch viewports
            viewPanels.forEach(panel => {
                if (panel.id === `view-${targetTab}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Set titles dynamically
            const meta = navMeta[targetTab] || { title: 'Admin Panel', subtitle: '' };
            viewTitle.innerText = meta.title;
            viewSubtitle.innerText = meta.subtitle;
        });
    });


    /* ==========================================================================
       3. Fetch & Render Inquiry Form Submissions
       ========================================================================== */
    const inquiriesTbody = document.getElementById('inquiries-tbody');
    const inquiryCountBadge = document.getElementById('inquiry-count');
    const refreshInquiriesBtn = document.getElementById('refresh-inquiries');
    const searchInput = document.getElementById('inquiry-search');
    let inquiriesCached = [];

    const loadInquiries = async () => {
        const token = getToken();
        if (!token) return;
        
        const { ok, data } = await safeFetchJson('/api/admin/inquiries', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ok && data && data.success) {
            inquiriesCached = data.inquiries;
            // Update metrics overview card
            if (document.getElementById('stat-card-inquiries')) {
                document.getElementById('stat-card-inquiries').innerText = inquiriesCached.length;
            }
            renderInquiries(inquiriesCached);
        } else {
            const errMsg = (data && data.message) || 'Failed to load inquiries.';
            inquiriesTbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--secondary-color);">${errMsg}</td></tr>`;
        }
    };

    const renderInquiries = (data) => {
        inquiriesTbody.innerHTML = '';
        inquiryCountBadge.innerText = data.length;
        
        if (data.length === 0) {
            inquiriesTbody.innerHTML = '<tr><td colspan="7" class="text-center">No inquiry messages found in the database.</td></tr>';
            return;
        }

        // Sort inquiries descending by timestamp (newest first)
        const sorted = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sorted.forEach(inq => {
            const tr = document.createElement('tr');
            
            // Format Timestamp
            const date = new Date(inq.timestamp);
            const formattedDate = date.toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });

            tr.innerHTML = `
                <td><strong>${formattedDate}</strong></td>
                <td>
                    <span class="table-name">${inq.name}</span>
                </td>
                <td>
                    <div><i class="fa-solid fa-phone" style="font-size:0.75rem; color:var(--text-muted);"></i> ${inq.phone}</div>
                    ${inq.email ? `<div><i class="fa-solid fa-envelope" style="font-size:0.75rem; color:var(--text-muted);"></i> ${inq.email}</div>` : ''}
                </td>
                <td><span class="badge" style="background-color: var(--primary-color); color: white; padding: 4px 8px; border-radius:4px; font-size:0.75rem;">${inq.grade}</span></td>
                <td><div class="table-message-cell">${inq.message || '<em style="color:var(--text-muted)">No notes</em>'}</div></td>
                <td><span class="tag-type" style="font-weight:700; font-size:0.75rem; color:${(inq.type || '').includes('Admission') ? 'var(--accent-color)' : 'var(--text-muted)'}">${inq.type || 'General Inquiry'}</span></td>
                <td>
                    <button class="btn btn-xs delete-inq-btn" style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color:#ef4444;" data-id="${inq.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            inquiriesTbody.appendChild(tr);
        });

        // Attach delete event listeners
        document.querySelectorAll('.delete-inq-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this inquiry submission? This action cannot be undone.')) {
                    deleteInquiry(id);
                }
            });
        });
    };

    const deleteInquiry = async (id) => {
        const token = getToken();
        if (!token) return;

        const { ok, data } = await safeFetchJson(`/api/admin/inquiries/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ok && data && data.success) {
            loadInquiries();
        } else {
            alert(`Error deleting inquiry: ${(data && data.message) || 'Unknown error'}`);
        }
    };

    // Filter/Search Input handler
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            const filtered = inquiriesCached.filter(inq => {
                return (inq.name && inq.name.toLowerCase().includes(term)) ||
                       (inq.phone && inq.phone.includes(term)) ||
                       (inq.grade && inq.grade.toLowerCase().includes(term)) ||
                       (inq.message && inq.message.toLowerCase().includes(term)) ||
                       (inq.type && inq.type.toLowerCase().includes(term));
            });
            renderInquiries(filtered);
        });
    }

    if (refreshInquiriesBtn) {
        refreshInquiriesBtn.addEventListener('click', loadInquiries);
    }


    // Custom Category Tag Map
    const tagMap = {
        campus: 'Campus',
        sports: 'Sports',
        events: 'Events',
        academic: 'Classroom',
        activities: 'Activities'
    };

    // Save customized settings payload helper
    const saveCustomSettings = async (partialPayload) => {
        const token = getToken();
        if (!token) return;
        
        const updatedPayload = {
            ...currentSettingsCached,
            ...partialPayload
        };
        
        const { ok, data } = await safeFetchJson('/api/admin/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedPayload)
        });

        if (ok && data && data.success) {
            currentSettingsCached = updatedPayload;
            renderAdminAnnouncements(currentSettingsCached.notifications);
            renderAdminGallery(currentSettingsCached.gallery);
            renderAdminVideos(currentSettingsCached.videos);
            renderAdminFaculties(currentSettingsCached.faculties);
            renderAdminStudents(currentSettingsCached.students);
            renderAdminNotices(currentSettingsCached.notices);
            renderAdminEvents(currentSettingsCached.events);
        } else {
            alert((data && data.message) || 'Failed to update settings parameters.');
        }
    };

    // Render announcements helper
    const renderAdminAnnouncements = (notifications) => {
        const tbody = document.getElementById('announcements-list-tbody');
        if (!tbody) return;
        
        const list = notifications || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color:var(--text-muted); padding: 15px;">No announcements configured.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = list.map((note, idx) => `
            <tr>
                <td style="color: var(--primary-dark, #0f172a); padding: 12px; font-weight: 600;">${note}</td>
                <td style="text-align: center; padding: 12px;">
                    <button class="btn delete-announcement-btn" data-index="${idx}" style="background-color: var(--secondary-color); color: #fff; border-radius: 4px; padding: 6px 12px; border: none; font-size: 0.8rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Bind delete triggers
        tbody.querySelectorAll('.delete-announcement-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this announcement?')) {
                    const updatedNotifications = [...currentSettingsCached.notifications];
                    updatedNotifications.splice(index, 1);
                    await saveCustomSettings({ notifications: updatedNotifications });
                }
            });
        });
    };

    const renderAdminGallery = (gallery) => {
        const grid = document.getElementById('admin-gallery-preview-grid');
        if (!grid) return;
        
        const list = gallery || [];
        // Update gallery photos metrics card
        if (document.getElementById('stat-card-gallery')) {
            document.getElementById('stat-card-gallery').innerText = list.length;
        }
        if (list.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 25px; background: rgba(255,255,255,0.02); border-radius:8px;">No campus gallery photos uploaded.</div>`;
            return;
        }
        
        grid.innerHTML = list.map((item, idx) => `
            <div style="background: #f8fafc; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 12px; position: relative;">
                <div style="height: 120px; background-image: url('${item.image}'); background-size: cover; background-position: center; border-radius: 6px; margin-bottom: 10px;"></div>
                <div style="font-size: 0.85rem; font-weight: 700; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--primary-dark, #0f172a); margin-bottom: 4px;" title="${item.title}">${item.title}</div>
                <div style="font-size: 0.72rem; color: var(--primary-color); text-transform: uppercase; font-weight: bold;">${item.tag}</div>
                <button class="delete-photo-btn" data-index="${idx}" style="position: absolute; top: 20px; right: 20px; background: rgba(211, 47, 47, 0.9); border: none; color: white; border-radius: 4px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-md);">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Bind delete triggers
        grid.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this gallery photo?')) {
                    const updatedGallery = [...currentSettingsCached.gallery];
                    updatedGallery.splice(index, 1);
                    await saveCustomSettings({ gallery: updatedGallery });
                }
            });
        });
    };

    const renderAdminVideos = (videos) => {
        const grid = document.getElementById('admin-video-preview-grid');
        if (!grid) return;
        
        const list = videos || [];
        if (document.getElementById('stat-card-videos')) {
            document.getElementById('stat-card-videos').innerText = list.length;
        }
        if (list.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 25px; background: rgba(255,255,255,0.02); border-radius:8px;">No video showcase items added.</div>`;
            return;
        }
        
        grid.innerHTML = list.map((item, idx) => {
            const thumb = item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400';
            return `
            <div style="background: #f8fafc; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 12px; position: relative;">
                <div style="height: 130px; background-image: url('${thumb}'); background-size: cover; background-position: center; border-radius: 6px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-circle-play" style="font-size: 2.2rem; color: #f59e0b; background: rgba(0,0,0,0.5); border-radius: 50%;"></i>
                </div>
                <div style="font-size: 0.9rem; font-weight: 700; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--primary-dark, #0f172a); margin-bottom: 4px;" title="${item.title}">${item.title}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; margin-bottom: 6px;">${item.description || ''}</div>
                <div style="font-size: 0.72rem; color: var(--primary-color); text-transform: uppercase; font-weight: bold;">${item.category || 'general'}</div>
                <button class="delete-video-btn" data-index="${idx}" style="position: absolute; top: 20px; right: 20px; background: rgba(211, 47, 47, 0.9); border: none; color: white; border-radius: 4px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-md);">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `}).join('');
        
        // Bind delete triggers
        grid.querySelectorAll('.delete-video-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this video from the showcase?')) {
                    const updatedVideos = [...(currentSettingsCached.videos || [])];
                    updatedVideos.splice(index, 1);
                    await saveCustomSettings({ videos: updatedVideos });
                }
            });
        });
    };
    const renderAdminFaculties = (faculties) => {
        const grid = document.getElementById('admin-faculty-preview-grid');
        if (!grid) return;
        const list = faculties || [];
        if (list.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 25px;">No educators in directory.</div>`;
            return;
        }
        grid.innerHTML = list.map((item, idx) => `
            <div style="background: #f8fafc; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 12px; position: relative;">
                <div style="height: 100px; width: 100px; margin: 0 auto 10px; background-image: url('${item.image}'); background-size: cover; background-position: center; border-radius: 50%;"></div>
                <div style="font-size: 0.85rem; font-weight: 700; text-align:center; color: var(--primary-dark, #0f172a); margin-bottom: 4px;">${item.name}</div>
                <div style="font-size: 0.72rem; text-align:center; color: var(--primary-color); font-weight: bold;">${item.role}</div>
                <button class="delete-faculty-btn" data-index="${idx}" style="position: absolute; top: 10px; right: 10px; background: rgba(211, 47, 47, 0.9); border: none; color: white; border-radius: 4px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <i class="fa-solid fa-trash" style="font-size: 0.8rem;"></i>
                </button>
            </div>
        `).join('');

        grid.querySelectorAll('.delete-faculty-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this educator?')) {
                    const updated = [...currentSettingsCached.faculties];
                    updated.splice(index, 1);
                    await saveCustomSettings({ faculties: updated });
                }
            });
        });
    };

    const renderAdminStudents = (students) => {
        const grid = document.getElementById('admin-student-preview-grid');
        if (!grid) return;
        const list = students || [];
        if (list.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 25px;">No students in directory.</div>`;
            return;
        }
        grid.innerHTML = list.map((item, idx) => `
            <div style="background: #f8fafc; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 12px; position: relative;">
                <div style="height: 100px; width: 100px; margin: 0 auto 10px; background-image: url('${item.image}'); background-size: cover; background-position: center; border-radius: 50%;"></div>
                <div style="font-size: 0.85rem; font-weight: 700; text-align:center; color: var(--primary-dark, #0f172a); margin-bottom: 4px;">${item.name}</div>
                <div style="font-size: 0.72rem; text-align:center; color: var(--primary-color); font-weight: bold;">${item.role}</div>
                <button class="delete-student-btn" data-index="${idx}" style="position: absolute; top: 10px; right: 10px; background: rgba(211, 47, 47, 0.9); border: none; color: white; border-radius: 4px; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <i class="fa-solid fa-trash" style="font-size: 0.8rem;"></i>
                </button>
            </div>
        `).join('');

        grid.querySelectorAll('.delete-student-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this achiever?')) {
                    const updated = [...currentSettingsCached.students];
                    updated.splice(index, 1);
                    await saveCustomSettings({ students: updated });
                }
            });
        });
    };

    const renderAdminNotices = (notices) => {
        const tbody = document.getElementById('notices-list-tbody');
        if (!tbody) return;
        const list = notices || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted); padding: 15px;">No circular notices published.</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="color: var(--primary-dark, #0f172a); font-weight: 600; white-space: nowrap;">${item.date}</td>
                <td>
                    <div style="font-weight: 700; color: var(--primary-dark, #0f172a);">${item.title}</div>
                    <div style="font-size: 0.82rem; color: var(--text-dark, #334155); margin-top: 2px;">${item.description}</div>
                    ${item.link ? `<div style="font-size: 0.75rem; color: var(--primary-color); margin-top: 2px;"><i class="fa-solid fa-link"></i> ${item.link}</div>` : ''}
                </td>
                <td style="text-align: center;">
                    <button class="btn delete-notice-btn" data-index="${idx}" style="background-color: var(--secondary-color); color: #fff; border-radius: 4px; padding: 6px 12px; border: none; font-size: 0.8rem; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.delete-notice-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this notice?')) {
                    const updated = [...(currentSettingsCached.notices || [])];
                    updated.splice(index, 1);
                    await saveCustomSettings({ notices: updated });
                }
            });
        });
    };

    const renderAdminEvents = (events) => {
        const tbody = document.getElementById('events-list-tbody');
        if (!tbody) return;
        const list = events || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-muted); padding: 15px;">No upcoming events scheduled.</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map((item, idx) => `
            <tr>
                <td style="color: #fff; font-weight: 700; white-space: nowrap;"><span style="background: var(--primary-color); padding: 4px 8px; border-radius: 4px; color: white;">${item.day} ${item.month}</span></td>
                <td>
                    <div style="font-weight: 700; color: var(--primary-dark, #0f172a);">${item.title}</div>
                    <div style="font-size: 0.82rem; color: var(--text-dark, #334155); margin-top: 2px;">${item.description}</div>
                </td>
                <td style="text-align: center;">
                    <button class="btn delete-event-btn" data-index="${idx}" style="background-color: var(--secondary-color); color: #fff; border-radius: 4px; padding: 6px 12px; border: none; font-size: 0.8rem; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.delete-event-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this event?')) {
                    const updated = [...(currentSettingsCached.events || [])];
                    updated.splice(index, 1);
                    await saveCustomSettings({ events: updated });
                }
            });
        });
    };

    const renderAdminTestimonials = (testimonials) => {
        const tbody = document.getElementById('testimonials-list-tbody');
        if (!tbody) return;
        const list = testimonials || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--text-muted); padding: 15px;">No parent testimonials added.</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map((item, idx) => {
            const ratingStars = '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5));
            return `
                <tr>
                    <td style="font-weight: 700; color: var(--primary-dark, #0f172a); white-space: nowrap;">${item.parentName}</td>
                    <td style="color: var(--text-dark, #334155); font-size: 0.85rem; white-space: nowrap;">${item.studentInfo || ''}</td>
                    <td style="font-size: 0.85rem; color: var(--text-dark, #334155); font-style: italic;">"${item.quote}"</td>
                    <td style="text-align: center; color: var(--accent-gold, #f59e0b); white-space: nowrap;">${ratingStars}</td>
                    <td style="text-align: center;">
                        <button class="btn delete-testimonial-btn" data-index="${idx}" style="background-color: var(--secondary-color); color: #fff; border-radius: 4px; padding: 6px 12px; border: none; font-size: 0.8rem; cursor: pointer;">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.getAttribute('data-index'), 10);
                if (confirm('Are you sure you want to delete this parent testimonial?')) {
                    const updated = [...(currentSettingsCached.testimonials || [])];
                    updated.splice(index, 1);
                    await saveCustomSettings({ testimonials: updated });
                }
            });
        });
    };
    /* ==========================================================================
       4. Fetch & Update Settings Details (Contacts & Fees)
       ========================================================================== */
    const loadSettings = async () => {
        const { ok, data } = await safeFetchJson('/api/admin/settings?t=' + Date.now());
        if (ok && data) {
            currentSettingsCached = data;
            const settings = data;
            
            // Update gallery photos metrics card
            if (document.getElementById('stat-card-gallery') && settings.gallery) {
                document.getElementById('stat-card-gallery').innerText = settings.gallery.length;
            }
            
            // Populate Profile fields
            if (document.getElementById('set-phone')) document.getElementById('set-phone').value = settings.phone || '';
            if (document.getElementById('set-mobile')) document.getElementById('set-mobile').value = settings.mobile || '';
            if (document.getElementById('set-email')) document.getElementById('set-email').value = settings.email || '';
            if (document.getElementById('set-address')) document.getElementById('set-address').value = settings.address || '';
            if (document.getElementById('set-motto')) document.getElementById('set-motto').value = settings.motto || '';
            if (document.getElementById('set-slogan')) document.getElementById('set-slogan').value = settings.slogan || '';

            // Populate Fees fields
            if (settings.fees) {
                const f = settings.fees;
                if (f['pre-primary']) {
                    document.getElementById('fee-pre-admission').value = f['pre-primary'].admission;
                    document.getElementById('fee-pre-tuition').value = f['pre-primary'].tuition;
                    document.getElementById('fee-pre-lab').value = f['pre-primary'].lab;
                }
                if (f['primary']) {
                    document.getElementById('fee-pri-admission').value = f['primary'].admission;
                    document.getElementById('fee-pri-tuition').value = f['primary'].tuition;
                    document.getElementById('fee-pri-lab').value = f['primary'].lab;
                }
                if (f['middle']) {
                    document.getElementById('fee-mid-admission').value = f['middle'].admission;
                    document.getElementById('fee-mid-tuition').value = f['middle'].tuition;
                    document.getElementById('fee-mid-lab').value = f['middle'].lab;
                }
                if (f['high']) {
                    document.getElementById('fee-high-admission').value = f['high'].admission;
                    document.getElementById('fee-high-tuition').value = f['high'].tuition;
                    document.getElementById('fee-high-lab').value = f['high'].lab;
                }
            }
            
            if (settings.transportFees) {
                document.getElementById('fee-trans-under5').value = settings.transportFees['under-5km'] || 0;
                document.getElementById('fee-trans-above5').value = settings.transportFees['above-5km'] || 0;
            }

            // Populate Statistics fields
            if (settings.stats) {
                if (document.getElementById('set-stat-legacy')) document.getElementById('set-stat-legacy').value = settings.stats.legacyYears || 0;
                if (document.getElementById('set-stat-students')) document.getElementById('set-stat-students').value = settings.stats.activeStudents || 0;
                if (document.getElementById('set-stat-mentors')) document.getElementById('set-stat-mentors').value = settings.stats.expertMentors || 0;
                if (document.getElementById('set-stat-pass')) document.getElementById('set-stat-pass').value = settings.stats.passRate || 0;
            }

            // Populate Constraints fields
            if (settings.ageConstraints) {
                if (document.getElementById('set-constraint-nursery')) document.getElementById('set-constraint-nursery').value = settings.ageConstraints.nursery || 0;
                if (document.getElementById('set-constraint-class1')) document.getElementById('set-constraint-class1').value = settings.ageConstraints.class1 || 0;
            }

            // Populate CMS copy content fields
            if (settings.about) {
                if (document.getElementById('cms-about-heading')) document.getElementById('cms-about-heading').value = settings.about.heading || '';
                if (document.getElementById('cms-about-text1')) document.getElementById('cms-about-text1').value = settings.about.text1 || '';
                if (document.getElementById('cms-about-text2')) document.getElementById('cms-about-text2').value = settings.about.text2 || '';
                if (document.getElementById('cms-about-quote')) document.getElementById('cms-about-quote').value = settings.about.quote || '';
            }

            if (settings.chairman) {
                if (document.getElementById('cms-chairman-name')) document.getElementById('cms-chairman-name').value = settings.chairman.name || '';
                if (document.getElementById('cms-chairman-role')) document.getElementById('cms-chairman-role').value = settings.chairman.role || '';
                if (document.getElementById('cms-chairman-avatar')) document.getElementById('cms-chairman-avatar').value = settings.chairman.avatar || '';
                if (document.getElementById('cms-chairman-message')) document.getElementById('cms-chairman-message').value = settings.chairman.message || '';
            }

            if (settings.visionMission) {
                if (document.getElementById('cms-vision-text')) document.getElementById('cms-vision-text').value = settings.visionMission.visionText || '';
                if (document.getElementById('cms-mission-text')) document.getElementById('cms-mission-text').value = settings.visionMission.missionText || '';
            }

            // Render custom managers lists
            renderAdminAnnouncements(settings.notifications);
            renderAdminGallery(settings.gallery);
            renderAdminVideos(settings.videos);
            renderAdminFaculties(settings.faculties);
            renderAdminStudents(settings.students);
            renderAdminNotices(settings.notices);
            renderAdminEvents(settings.events);
            renderAdminTestimonials(settings.testimonials);
        }
    };

    // Construct settings payload from all forms currently in the DOM
    const constructSettingsPayload = () => {
        const base = currentSettingsCached || {};
        const payload = {
            ...base,
            phone: document.getElementById('set-phone')?.value || base.phone || '',
            mobile: document.getElementById('set-mobile')?.value || base.mobile || '',
            email: document.getElementById('set-email')?.value || base.email || '',
            address: document.getElementById('set-address')?.value || base.address || '',
            motto: document.getElementById('set-motto')?.value || base.motto || '',
            slogan: document.getElementById('set-slogan')?.value || base.slogan || '',
            stats: {
                legacyYears: parseInt(document.getElementById('set-stat-legacy')?.value || '0', 10),
                activeStudents: parseInt(document.getElementById('set-stat-students')?.value || '0', 10),
                expertMentors: parseInt(document.getElementById('set-stat-mentors')?.value || '0', 10),
                passRate: parseInt(document.getElementById('set-stat-pass')?.value || '0', 10)
            },
            ageConstraints: {
                nursery: parseInt(document.getElementById('set-constraint-nursery')?.value || '0', 10),
                class1: parseInt(document.getElementById('set-constraint-class1')?.value || '0', 10)
            },
            fees: {
                'pre-primary': {
                    admission: parseInt(document.getElementById('fee-pre-admission')?.value || '0', 10),
                    tuition: parseInt(document.getElementById('fee-pre-tuition')?.value || '0', 10),
                    lab: parseInt(document.getElementById('fee-pre-lab')?.value || '0', 10)
                },
                'primary': {
                    admission: parseInt(document.getElementById('fee-pri-admission')?.value || '0', 10),
                    tuition: parseInt(document.getElementById('fee-pri-tuition')?.value || '0', 10),
                    lab: parseInt(document.getElementById('fee-pri-lab')?.value || '0', 10)
                },
                'middle': {
                    admission: parseInt(document.getElementById('fee-mid-admission')?.value || '0', 10),
                    tuition: parseInt(document.getElementById('fee-mid-tuition')?.value || '0', 10),
                    lab: parseInt(document.getElementById('fee-mid-lab')?.value || '0', 10)
                },
                'high': {
                    admission: parseInt(document.getElementById('fee-high-admission')?.value || '0', 10),
                    tuition: parseInt(document.getElementById('fee-high-tuition')?.value || '0', 10),
                    lab: parseInt(document.getElementById('fee-high-lab')?.value || '0', 10)
                }
            },
            transportFees: {
                'self': 0,
                'under-5km': parseInt(document.getElementById('fee-trans-under5')?.value || '0', 10),
                'above-5km': parseInt(document.getElementById('fee-trans-above5')?.value || '0', 10)
            },
            about: {
                heading: document.getElementById('cms-about-heading')?.value || (base.about ? base.about.heading : ''),
                text1: document.getElementById('cms-about-text1')?.value || (base.about ? base.about.text1 : ''),
                text2: document.getElementById('cms-about-text2')?.value || (base.about ? base.about.text2 : ''),
                quote: document.getElementById('cms-about-quote')?.value || (base.about ? base.about.quote : '')
            },
            chairman: {
                name: document.getElementById('cms-chairman-name')?.value || (base.chairman ? base.chairman.name : ''),
                role: document.getElementById('cms-chairman-role')?.value || (base.chairman ? base.chairman.role : ''),
                avatar: document.getElementById('cms-chairman-avatar')?.value || (base.chairman ? base.chairman.avatar : ''),
                message: document.getElementById('cms-chairman-message')?.value || (base.chairman ? base.chairman.message : '')
            },
            visionMission: {
                visionText: document.getElementById('cms-vision-text')?.value || (base.visionMission ? base.visionMission.visionText : ''),
                visionBullets: base.visionMission ? base.visionMission.visionBullets : [],
                missionText: document.getElementById('cms-mission-text')?.value || (base.visionMission ? base.visionMission.missionText : ''),
                missionBullets: base.visionMission ? base.visionMission.missionBullets : []
            },
            notifications: base.notifications || [],
            gallery: base.gallery || [],
            videos: base.videos || [],
            faculties: base.faculties || [],
            students: base.students || [],
            notices: base.notices || [],
            events: base.events || [],
            testimonials: base.testimonials || []
        };
        return payload;
    };

    // Submit details form
    if (detailsForm) {
        detailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const submitBtn = detailsForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            const responseDiv = document.getElementById('details-form-response');

            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';

            try {
                const updatedPayload = constructSettingsPayload();
                const { ok, data } = await safeFetchJson('/api/admin/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedPayload)
                });
                
                if (ok && data && data.success) {
                    responseDiv.className = 'form-response success';
                    responseDiv.innerText = data.message;
                    responseDiv.style.display = 'block';
                    currentSettingsCached = updatedPayload; // sync cache
                } else {
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = (data && data.message) || 'Details save rejected.';
                    responseDiv.style.display = 'block';
                }
            } catch (err) {
                responseDiv.className = 'form-response error';
                responseDiv.innerText = 'Unable to connect to server.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
                setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
            }
        });
    }

    // Submit fee estimator parameters form
    if (feesForm) {
        feesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const submitBtn = feesForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            const responseDiv = document.getElementById('fees-form-response');

            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';

            try {
                const updatedPayload = constructSettingsPayload();
                const { ok, data } = await safeFetchJson('/api/admin/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedPayload)
                });
                
                if (ok && data && data.success) {
                    responseDiv.className = 'form-response success';
                    responseDiv.innerText = data.message;
                    responseDiv.style.display = 'block';
                    currentSettingsCached = updatedPayload; // sync cache
                } else {
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = (data && data.message) || 'Fee matrices save rejected.';
                    responseDiv.style.display = 'block';
                }
            } catch (err) {
                responseDiv.className = 'form-response error';
                responseDiv.innerText = 'Unable to connect to server.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
                setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
            }
        });
    }


    /* ==========================================================================
       5. Administrators Account Management
       ========================================================================== */
    const adminsListTbody = document.getElementById('admins-list-tbody');

    const loadAdmins = async () => {
        const token = getToken();
        if (!token) return;

        const { ok, data } = await safeFetchJson('/api/admin/users', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ok && data && data.success) {
            // Update admins metrics card
            if (document.getElementById('stat-card-admins')) {
                document.getElementById('stat-card-admins').innerText = data.users.length;
            }
            adminsListTbody.innerHTML = '';
            data.users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${user.name}</strong></td>
                    <td><code>${user.username}</code></td>
                    <td><span class="badge" style="background-color: var(--accent-light); color: var(--primary-dark); font-size:0.75rem; border-radius:4px; padding:4px 8px;">Administrator</span></td>
                `;
                adminsListTbody.appendChild(tr);
            });
        } else {
            const errMsg = (data && data.message) || 'Failed to load admin list.';
            adminsListTbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--secondary-color);">${errMsg}</td></tr>`;
        }
    };

    // Register a new admin user
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const nameInput = document.getElementById('new-admin-name');
            const usernameInput = document.getElementById('new-admin-user');
            const passwordInput = document.getElementById('new-admin-pass');
            const responseDiv = document.getElementById('add-admin-response');
            
            const submitBtn = addAdminForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');

            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';

            try {
                const { ok, data } = await safeFetchJson('/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: nameInput.value,
                        username: usernameInput.value,
                        password: passwordInput.value
                    })
                });
                
                if (ok && data && data.success) {
                    responseDiv.className = 'form-response success';
                    responseDiv.innerText = data.message;
                    responseDiv.style.display = 'block';
                    addAdminForm.reset();
                    loadAdmins(); // refresh admin list
                } else {
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = (data && data.message) || 'Creation of admin failed.';
                    responseDiv.style.display = 'block';
                }
            } catch (err) {
                responseDiv.className = 'form-response error';
                responseDiv.innerText = 'Unable to establish server connection.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
                setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
            }
        });
    }


    // Submit CMS editor form
    const cmsForm = document.getElementById('settings-cms-form');
    if (cmsForm) {
        cmsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const submitBtn = cmsForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            const responseDiv = document.getElementById('cms-form-response');

            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';

            try {
                const updatedPayload = constructSettingsPayload();
                const { ok, data } = await safeFetchJson('/api/admin/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedPayload)
                });
                
                if (ok && data && data.success) {
                    responseDiv.className = 'form-response success';
                    responseDiv.innerText = data.message;
                    responseDiv.style.display = 'block';
                    currentSettingsCached = updatedPayload; // sync cache
                } else {
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = (data && data.message) || 'CMS save rejected.';
                    responseDiv.style.display = 'block';
                }
            } catch (err) {
                responseDiv.className = 'form-response error';
                responseDiv.innerText = 'Unable to connect to server.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
                setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
            }
        });
    }


    // Bind Announcements Add form
    const announceForm = document.getElementById('announcements-manager-form');
    if (announceForm) {
        announceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('new-announcement-text');
            const newText = input.value.trim();
            if (!newText) return;
            
            const currentList = currentSettingsCached.notifications || [];
            const updatedNotifications = [...currentList, newText];
            
            await saveCustomSettings({ notifications: updatedNotifications });
            announceForm.reset();
        });
    }

    // Bind Notice Add Form
    const noticeForm = document.getElementById('notice-manager-form');
    if (noticeForm) {
        noticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawDate = document.getElementById('notice-date').value.trim();
            const title = document.getElementById('notice-title').value.trim();
            const desc = document.getElementById('notice-desc').value.trim();
            const link = document.getElementById('notice-link').value.trim();
            const resDiv = document.getElementById('notice-manager-response');

            if (!rawDate || !title || !desc) return;

            // Format YYYY-MM-DD date into readable string e.g. "July 25, 2026"
            let formattedDate = rawDate;
            const d = new Date(rawDate + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }

            const newNotice = { date: formattedDate, title, description: desc };
            if (link) newNotice.link = link;

            const currentNotices = currentSettingsCached.notices || [];
            const updatedNotices = [newNotice, ...currentNotices];

            await saveCustomSettings({ notices: updatedNotices });
            resDiv.className = 'form-response success';
            resDiv.innerText = 'Circular notice added successfully!';
            resDiv.style.display = 'block';
            noticeForm.reset();
            setTimeout(() => { resDiv.style.display = 'none'; }, 4000);
        });
    }

    // Bind Event Add Form
    const eventForm = document.getElementById('event-manager-form');
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rawDate = document.getElementById('event-date').value.trim();
            const title = document.getElementById('event-title').value.trim();
            const desc = document.getElementById('event-desc').value.trim();
            const resDiv = document.getElementById('event-manager-response');

            if (!rawDate || !title || !desc) return;

            const d = new Date(rawDate + 'T00:00:00');
            let day = '01';
            let month = 'JAN';
            if (!isNaN(d.getTime())) {
                day = String(d.getDate()).padStart(2, '0');
                month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
            }

            const newEvent = { day, month, title, description: desc };
            const currentEvents = currentSettingsCached.events || [];
            const updatedEvents = [...currentEvents, newEvent];

            await saveCustomSettings({ events: updatedEvents });
            resDiv.className = 'form-response success';
            resDiv.innerText = 'Upcoming event added successfully!';
            resDiv.style.display = 'block';
            eventForm.reset();
            setTimeout(() => { resDiv.style.display = 'none'; }, 4000);
        });
    }

    // Bind Parent Testimonial Add Form
    const testimonialForm = document.getElementById('testimonial-manager-form');
    if (testimonialForm) {
        testimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const parentName = document.getElementById('testi-parent-name').value.trim();
            const studentInfo = document.getElementById('testi-student-info').value.trim();
            const quote = document.getElementById('testi-quote').value.trim();
            const rating = parseInt(document.getElementById('testi-rating').value, 10) || 5;
            const resDiv = document.getElementById('testimonial-manager-response');

            if (!parentName || !studentInfo || !quote) return;

            const newTestimonial = { parentName, studentInfo, quote, rating };
            const currentTestimonials = currentSettingsCached.testimonials || [];
            const updatedTestimonials = [...currentTestimonials, newTestimonial];

            await saveCustomSettings({ testimonials: updatedTestimonials });
            resDiv.className = 'form-response success';
            resDiv.innerText = 'Parent testimonial added successfully!';
            resDiv.style.display = 'block';
            testimonialForm.reset();
            setTimeout(() => { resDiv.style.display = 'none'; }, 4000);
        });
    }

    // Helper for uploading single avatar photos directly from local disk
    const setupAvatarFileUpload = (fileInputId, textInputId, statusDivId) => {
        const fileInput = document.getElementById(fileInputId);
        const textInput = document.getElementById(textInputId);
        const statusDiv = document.getElementById(statusDivId);
        if (!fileInput || !textInput) return;

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (statusDiv) {
                statusDiv.className = 'form-response';
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading photo from local disk...';
            }

            const reader = new FileReader();
            reader.onload = async () => {
                const token = getToken();
                try {
                    const { ok, data } = await safeFetchJson('/api/admin/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            filename: file.name,
                            base64Data: reader.result
                        })
                    });

                    if (ok && data && data.success) {
                        textInput.value = data.url;
                        if (statusDiv) {
                            statusDiv.className = 'form-response success';
                            statusDiv.innerText = 'Photo uploaded successfully! Click Save Copy Content below to apply.';
                        }
                    } else {
                        if (statusDiv) {
                            statusDiv.className = 'form-response error';
                            statusDiv.innerText = (data && data.message) || 'Image upload failed on server.';
                        }
                    }
                } catch (err) {
                    if (statusDiv) {
                        statusDiv.className = 'form-response error';
                        statusDiv.innerText = 'Connection error uploading photo.';
                    }
                } finally {
                    setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 5000);
                }
            };

            reader.onerror = () => {
                if (statusDiv) {
                    statusDiv.className = 'form-response error';
                    statusDiv.innerText = 'Error reading file.';
                }
            };

            reader.readAsDataURL(file);
        });
    };

    setupAvatarFileUpload('cms-chairman-avatar-file', 'cms-chairman-avatar', 'cms-chairman-avatar-status');

    // Bind Photo Gallery Upload form
    const galleryForm = document.getElementById('gallery-upload-form');
    if (galleryForm) {
        galleryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('gallery-photo-file');
            const categorySelect = document.getElementById('gallery-photo-category');
            const titleInput = document.getElementById('gallery-photo-title');
            const responseDiv = document.getElementById('gallery-upload-response');
            
            const submitBtn = galleryForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            if (fileInput.files.length === 0) return;
            
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async () => {
                const base64Data = reader.result;
                const token = getToken();
                
                try {
                    const { ok, data } = await safeFetchJson('/api/admin/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            filename: file.name,
                            base64Data: base64Data
                        })
                    });
                    
                    if (ok && data && data.success) {
                        const newUrl = data.url;
                        const category = categorySelect.value;
                        const tag = tagMap[category] || 'Campus';
                        
                        const newPhoto = {
                            category: category,
                            title: titleInput.value.trim(),
                            tag: tag,
                            image: newUrl
                        };
                        
                        const currentGallery = currentSettingsCached.gallery || [];
                        const updatedGallery = [...currentGallery, newPhoto];
                        
                        await saveCustomSettings({ gallery: updatedGallery });
                        
                        responseDiv.className = 'form-response success';
                        responseDiv.innerText = 'Photo uploaded and added to the gallery successfully!';
                        responseDiv.style.display = 'block';
                        galleryForm.reset();
                    } else {
                        responseDiv.className = 'form-response error';
                        responseDiv.innerText = (data && data.message) || 'Image upload failed on the server.';
                        responseDiv.style.display = 'block';
                    }
                } catch (err) {
                    console.error('[Upload Request Error]', err);
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = 'Server upload connection error.';
                    responseDiv.style.display = 'block';
                } finally {
                    btnText.style.display = 'inline-flex';
                    btnSpinner.style.display = 'none';
                    setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
                }
            };
            
            reader.onerror = () => {
                alert('Error reading input image file.');
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Bind Video Gallery Upload form
    const videoForm = document.getElementById('video-upload-form');
    if (videoForm) {
        videoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('gallery-video-title');
            const categorySelect = document.getElementById('gallery-video-category');
            const urlInput = document.getElementById('gallery-video-url');
            const videoFileInput = document.getElementById('gallery-video-file');
            const thumbFileInput = document.getElementById('gallery-video-thumbnail-file');
            const thumbUrlInput = document.getElementById('gallery-video-thumbnail-url');
            const descInput = document.getElementById('gallery-video-desc');
            const responseDiv = document.getElementById('video-upload-response');
            
            const submitBtn = videoForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            const token = getToken();
            if (!token) return;

            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-flex';
            responseDiv.style.display = 'none';

            const uploadFileAsync = (fileObj) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const { ok, data } = await safeFetchJson('/api/admin/upload', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    filename: fileObj.name,
                                    base64Data: reader.result
                                })
                            });
                            if (ok && data && data.success) {
                                resolve(data.url);
                            } else {
                                reject(new Error((data && data.message) || 'Upload failed'));
                            }
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(fileObj);
                });
            };

            try {
                let finalVideoUrl = urlInput ? urlInput.value.trim() : '';
                if (videoFileInput && videoFileInput.files.length > 0) {
                    finalVideoUrl = await uploadFileAsync(videoFileInput.files[0]);
                }

                if (!finalVideoUrl) {
                    throw new Error('Please provide a Video URL link or select a Video File to upload.');
                }

                // Format YouTube links if necessary
                if (finalVideoUrl.includes('youtube.com/watch?v=')) {
                    finalVideoUrl = finalVideoUrl.replace('watch?v=', 'embed/');
                } else if (finalVideoUrl.includes('youtu.be/')) {
                    const videoId = finalVideoUrl.split('youtu.be/')[1].split('?')[0];
                    finalVideoUrl = `https://www.youtube.com/embed/${videoId}`;
                }

                let finalThumbnailUrl = thumbUrlInput ? thumbUrlInput.value.trim() : '';
                if (thumbFileInput && thumbFileInput.files.length > 0) {
                    finalThumbnailUrl = await uploadFileAsync(thumbFileInput.files[0]);
                }

                if (!finalThumbnailUrl) {
                    finalThumbnailUrl = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600';
                }

                const newVideo = {
                    title: titleInput.value.trim(),
                    category: categorySelect.value,
                    videoUrl: finalVideoUrl,
                    thumbnail: finalThumbnailUrl,
                    description: descInput ? descInput.value.trim() : ''
                };

                const currentVideos = currentSettingsCached.videos || [];
                const updatedVideos = [...currentVideos, newVideo];

                await saveCustomSettings({ videos: updatedVideos });

                responseDiv.className = 'form-response success';
                responseDiv.innerText = 'Video added to the gallery showcase successfully!';
                responseDiv.style.display = 'block';
                videoForm.reset();
            } catch (err) {
                console.error('[Video Submit Error]', err);
                responseDiv.className = 'form-response error';
                responseDiv.innerText = err.message || 'Error adding video to gallery.';
                responseDiv.style.display = 'block';
            } finally {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
                setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
            }
        });
    }

    // Bind Faculty upload & add form
    const facultyForm = document.getElementById('faculty-manager-form');
    if (facultyForm) {
        facultyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('fac-member-name');
            const roleInput = document.getElementById('fac-member-role');
            const msgInput = document.getElementById('fac-member-msg');
            const fileInput = document.getElementById('fac-member-photo');
            const responseDiv = document.getElementById('faculty-manager-response');
            
            const submitBtn = facultyForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            if (fileInput.files.length === 0) return;
            
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async () => {
                const base64Data = reader.result;
                const token = getToken();
                
                try {
                    const { ok, data } = await safeFetchJson('/api/admin/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            filename: file.name,
                            base64Data: base64Data
                        })
                    });
                    
                    if (ok && data && data.success) {
                        const newUrl = data.url;
                        const newMember = {
                            name: nameInput.value.trim(),
                            role: roleInput.value.trim(),
                            message: msgInput ? msgInput.value.trim() : '',
                            image: newUrl
                        };
                        
                        const currentFaculties = currentSettingsCached.faculties || [];
                        const updatedFaculties = [...currentFaculties, newMember];
                        
                        await saveCustomSettings({ faculties: updatedFaculties });
                        
                        responseDiv.className = 'form-response success';
                        responseDiv.innerText = 'Educator added to directory successfully!';
                        responseDiv.style.display = 'block';
                        facultyForm.reset();
                    } else {
                        responseDiv.className = 'form-response error';
                        responseDiv.innerText = (data && data.message) || 'Image upload failed on the server.';
                        responseDiv.style.display = 'block';
                    }
                } catch (err) {
                    console.error('[Upload Request Error]', err);
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = 'Server upload connection error.';
                    responseDiv.style.display = 'block';
                } finally {
                    btnText.style.display = 'inline-flex';
                    btnSpinner.style.display = 'none';
                    setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
                }
            };
            
            reader.onerror = () => {
                alert('Error reading input image file.');
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Bind Student upload & add form
    const studentForm = document.getElementById('student-manager-form');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('stud-member-name');
            const roleInput = document.getElementById('stud-member-role');
            const msgInput = document.getElementById('stud-member-msg');
            const fileInput = document.getElementById('stud-member-photo');
            const responseDiv = document.getElementById('student-manager-response');
            
            const submitBtn = studentForm.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnSpinner = submitBtn.querySelector('.btn-spinner');
            
            if (fileInput.files.length === 0) return;
            
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
            responseDiv.style.display = 'none';
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async () => {
                const base64Data = reader.result;
                const token = getToken();
                
                try {
                    const { ok, data } = await safeFetchJson('/api/admin/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            filename: file.name,
                            base64Data: base64Data
                        })
                    });
                    
                    if (ok && data && data.success) {
                        const newUrl = data.url;
                        const newMember = {
                            name: nameInput.value.trim(),
                            role: roleInput.value.trim(),
                            message: msgInput ? msgInput.value.trim() : '',
                            image: newUrl
                        };
                        
                        const currentStudents = currentSettingsCached.students || [];
                        const updatedStudents = [...currentStudents, newMember];
                        
                        await saveCustomSettings({ students: updatedStudents });
                        
                        responseDiv.className = 'form-response success';
                        responseDiv.innerText = 'Student achiever added to directory successfully!';
                        responseDiv.style.display = 'block';
                        studentForm.reset();
                    } else {
                        responseDiv.className = 'form-response error';
                        responseDiv.innerText = (data && data.message) || 'Image upload failed on the server.';
                        responseDiv.style.display = 'block';
                    }
                } catch (err) {
                    console.error('[Upload Request Error]', err);
                    responseDiv.className = 'form-response error';
                    responseDiv.innerText = 'Server upload connection error.';
                    responseDiv.style.display = 'block';
                } finally {
                    btnText.style.display = 'inline-flex';
                    btnSpinner.style.display = 'none';
                    setTimeout(() => { responseDiv.style.display = 'none'; }, 6000);
                }
            };
            
            reader.onerror = () => {
                alert('Error reading input image file.');
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Run check auth on mount
    checkAuth();
});
