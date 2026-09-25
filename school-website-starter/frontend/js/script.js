document.addEventListener('DOMContentLoaded', () => {

    /* Backend API base URL — points to deployed Vercel backend in production */
    const API_BASE = 'https://sbps-home-website-y3ox.vercel.app';

    /* ==========================================================================
       1. Navigation Menu & Scroll Handling
       ========================================================================== */
    const header = document.querySelector('.main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Mobile Drawer navigation controls
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerClose = document.getElementById('drawer-close');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    const openDrawer = () => {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // prevent scroll when menu open
    };

    const closeDrawer = () => {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
    };

    mobileToggle.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));


    /* ==========================================================================
       2. Key Stats Count-Up Animation
       ========================================================================== */
    const statsSection = document.querySelector('.stats-section');
    const statNumbers = document.querySelectorAll('.stat-number');
    let animated = false;

    const startCounting = () => {
        statNumbers.forEach(num => {
            const target = parseInt(num.getAttribute('data-target'), 10);
            const duration = 2000; // 2 seconds animation duration
            const increment = target / (duration / 16); // ~60fps
            let current = 0;

            const updateCount = () => {
                current += increment;
                if (current < target) {
                    num.innerText = Math.floor(current);
                    requestAnimationFrame(updateCount);
                } else {
                    num.innerText = target;
                }
            };
            updateCount();
        });
    };

    // Intersection Observer to run statistics counters once scrolled into view
    if ('IntersectionObserver' in window && statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animated) {
                    startCounting();
                    animated = true;
                }
            });
        }, { threshold: 0.2 });

        observer.observe(statsSection);
    } else {
        // Fallback for older browsers
        setTimeout(startCounting, 500);
    }


    /* ==========================================================================
       3. Tab System (About Section & Vision/Mission)
       ========================================================================== */
    const tabTriggers = document.querySelectorAll('.tab-trigger');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const targetTab = trigger.getAttribute('data-tab');

            // Toggle active classes on buttons
            tabTriggers.forEach(t => t.classList.remove('active'));
            trigger.classList.add('active');

            // Toggle active classes on panels
            tabPanes.forEach(pane => {
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });


    /* ==========================================================================
       4. Academics Program Tabs (Interactive)
       ========================================================================== */
    // Academics tab bindings are set dynamically after CMS content loads.



    /* ==========================================================================
       5. Interactive Fee Estimator Engine
       ========================================================================== */
    const gradeSelect = document.getElementById('calc-grade');
    const transportRadios = document.getElementsByName('calc-transport');
    
    // Receipt Output Elements
    const resAdmission = document.getElementById('res-admission');
    const resTuition = document.getElementById('res-tuition');
    const resLab = document.getElementById('res-lab');
    const resTransport = document.getElementById('res-transport');
    const resTotal = document.getElementById('res-total');

    // Default Fallbacks - overwritten dynamically by settings API
    let feeStructures = {
        'nursery': { admission: 5000, tuition: 28000, lab: 2000 },
        'lkg': { admission: 5000, tuition: 28000, lab: 2000 },
        'ukg': { admission: 5000, tuition: 28000, lab: 2000 },
        'class-1': { admission: 6000, tuition: 34000, lab: 2500 },
        'class-2': { admission: 6000, tuition: 34000, lab: 2500 },
        'class-3': { admission: 6000, tuition: 34000, lab: 2500 },
        'class-4': { admission: 6000, tuition: 34000, lab: 2500 },
        'class-5': { admission: 6000, tuition: 34000, lab: 2500 },
        'class-6': { admission: 8000, tuition: 42000, lab: 3000 },
        'class-7': { admission: 8000, tuition: 42000, lab: 3000 },
        'class-8': { admission: 8000, tuition: 42000, lab: 3000 },
        'class-9': { admission: 10000, tuition: 50000, lab: 4000 },
        'class-10': { admission: 10000, tuition: 50000, lab: 4000 },
        'pre-primary': { admission: 5000, tuition: 28000, lab: 2000 },
        'primary': { admission: 6000, tuition: 34000, lab: 2500 },
        'middle': { admission: 8000, tuition: 42000, lab: 3000 },
        'high': { admission: 10000, tuition: 50000, lab: 4000 }
    };

    let transportFees = {
        'self': 0,
        'under-5km': 12000,
        'above-5km': 18000
    };

    const formatCurrency = (val) => {
        return '₹ ' + val.toLocaleString('en-IN');
    };

    const calculateTotalFee = () => {
        if (!gradeSelect) return;
        const selectedGrade = gradeSelect.value;
        
        let selectedStructure = feeStructures[selectedGrade];
        if (!selectedStructure) {
            if (['nursery', 'lkg', 'ukg'].includes(selectedGrade)) {
                selectedStructure = feeStructures['pre-primary'];
            } else if (['class-1', 'class-2', 'class-3', 'class-4', 'class-5'].includes(selectedGrade)) {
                selectedStructure = feeStructures['primary'];
            } else if (['class-6', 'class-7', 'class-8'].includes(selectedGrade)) {
                selectedStructure = feeStructures['middle'];
            } else if (['class-9', 'class-10'].includes(selectedGrade)) {
                selectedStructure = feeStructures['high'];
            }
        }
        if (!selectedStructure) selectedStructure = feeStructures['nursery'] || feeStructures['pre-primary'];

        // Get Transport Value
        let transportVal = 'self';
        for (let i = 0; i < transportRadios.length; i++) {
            if (transportRadios[i].checked) {
                transportVal = transportRadios[i].value;
                break;
            }
        }
        const selectedTransportFee = transportFees[transportVal] || 0;

        // Base Fee Components
        const admissionFee = selectedStructure.admission;
        const tuitionFee = selectedStructure.tuition;
        const labFee = selectedStructure.lab;

        const totalEstimated = admissionFee + tuitionFee + labFee + selectedTransportFee;

        // Render to view
        if (resAdmission) resAdmission.innerText = formatCurrency(admissionFee);
        if (resTuition) resTuition.innerText = formatCurrency(tuitionFee);
        if (resLab) resLab.innerText = formatCurrency(labFee);
        if (resTransport) resTransport.innerText = formatCurrency(selectedTransportFee);
        if (resTotal) resTotal.innerText = formatCurrency(totalEstimated);
    };

    const loadSchoolSettings = async () => {
        try {
            const response = await fetch(API_BASE + '/api/admin/settings?t=' + Date.now());
            if (response.ok) {
                const settings = await response.json();
                window.cachedSettings = settings;
                
                // Update basic elements dynamically
                const tickerContent = document.getElementById('ticker-content');
                if (tickerContent && settings.notifications && settings.notifications.length > 0) {
                    const doubleNotifications = [...settings.notifications, ...settings.notifications];
                    tickerContent.innerHTML = doubleNotifications.map(note => `
                        <span class="ticker-item">${note}</span>
                    `).join('');
                } else if (tickerContent) {
                    tickerContent.innerHTML = '<span class="ticker-item">Welcome to Sri Bhashyam Public School! Nurturing minds, shaping leaders.</span>';
                }

                if (document.getElementById('top-phone')) document.getElementById('top-phone').innerText = settings.phone;
                if (document.getElementById('top-email')) document.getElementById('top-email').innerText = settings.email;
                
                if (document.getElementById('top-address-short')) {
                    const parts = settings.address.split(',');
                    const shortAddr = parts.length > 2 
                        ? `${parts[parts.length-3].trim()}, ${parts[parts.length-2].trim()}, ${parts[parts.length-1].trim()}` 
                        : settings.address;
                    document.getElementById('top-address-short').innerText = shortAddr;
                }
                
                if (document.getElementById('contact-address')) document.getElementById('contact-address').innerText = settings.address;
                if (document.getElementById('contact-phone')) document.getElementById('contact-phone').innerText = settings.phone;
                if (document.getElementById('contact-mobile')) document.getElementById('contact-mobile').innerText = settings.mobile;
                if (document.getElementById('contact-email')) document.getElementById('contact-email').innerText = settings.email;
                if (document.getElementById('hero-motto')) document.getElementById('hero-motto').innerText = settings.motto;
                if (document.getElementById('logo-slogan')) document.getElementById('logo-slogan').innerText = settings.slogan;

                // Load custom fee configuration matrix
                if (settings.fees) {
                    feeStructures = { ...feeStructures, ...settings.fees };
                    ['nursery', 'lkg', 'ukg'].forEach(c => {
                        if (!settings.fees[c] && settings.fees['pre-primary']) feeStructures[c] = settings.fees['pre-primary'];
                    });
                    ['class-1', 'class-2', 'class-3', 'class-4', 'class-5'].forEach(c => {
                        if (!settings.fees[c] && settings.fees['primary']) feeStructures[c] = settings.fees['primary'];
                    });
                    ['class-6', 'class-7', 'class-8'].forEach(c => {
                        if (!settings.fees[c] && settings.fees['middle']) feeStructures[c] = settings.fees['middle'];
                    });
                    ['class-9', 'class-10'].forEach(c => {
                        if (!settings.fees[c] && settings.fees['high']) feeStructures[c] = settings.fees['high'];
                    });
                }
                if (settings.transportFees) transportFees = settings.transportFees;

                // Update stats counter targets dynamically
                if (settings.stats) {
                    const stats = settings.stats;
                    const legacyEl = document.getElementById('stat-legacy');
                    const studentsEl = document.getElementById('stat-students');
                    const mentorsEl = document.getElementById('stat-mentors');
                    const passEl = document.getElementById('stat-pass');

                    if (legacyEl) {
                        legacyEl.setAttribute('data-target', stats.legacyYears);
                        legacyEl.innerText = stats.legacyYears;
                    }
                    if (studentsEl) {
                        studentsEl.setAttribute('data-target', stats.activeStudents);
                        studentsEl.innerText = stats.activeStudents;
                    }
                    if (mentorsEl) {
                        mentorsEl.setAttribute('data-target', stats.expertMentors);
                        mentorsEl.innerText = stats.expertMentors;
                    }
                    if (passEl) {
                        passEl.setAttribute('data-target', stats.passRate);
                        passEl.innerText = stats.passRate;
                    }
                }

                // Populate homepage Chairman welcome card dynamically
                if (settings.chairman) {
                    if (document.getElementById('home-chair-avatar') && settings.chairman.avatar) {
                        document.getElementById('home-chair-avatar').style.backgroundImage = `url('${settings.chairman.avatar}')`;
                    }
                    if (document.getElementById('home-chair-name') && settings.chairman.name) {
                        document.getElementById('home-chair-name').innerText = settings.chairman.name;
                    }
                    if (document.getElementById('home-chair-role') && settings.chairman.role) {
                        document.getElementById('home-chair-role').innerText = settings.chairman.role;
                    }
                    if (document.getElementById('home-chair-quote') && settings.chairman.message) {
                        document.getElementById('home-chair-quote').innerText = `"${settings.chairman.message}"`;
                    }
                }

                // Render Desk Messages
                window.deskMessages = {
                    chairman: settings.chairman || {
                        name: "V. Naga Subba Reddy",
                        role: "Chairman",
                        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
                        message: "Our vision is to build an environment where student talent is discovered and channeled toward creative excellence."
                    },
                    faculty: settings.facultyMessage || {
                        name: "Smt. S. Lakshmi Devi",
                        role: "Dean of Academics",
                        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
                        message: "Our dedicated educators are committed to fostering a supportive and engaging atmosphere where every student is inspired to reach their full potential."
                    },
                    student: settings.studentMessage || {
                        name: "Master P. Sai Charan",
                        role: "Student Council President",
                        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600",
                        message: "At Sri Bhashyam, we are encouraged to explore our passions in science, arts, and sports, making our school journey truly memorable and enjoyable."
                    },
                    parents: settings.parentsMessage || {
                        name: "K. Raghunath Reddy",
                        role: "Parent Representative",
                        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
                        message: "Sri Bhashyam Public School provides an outstanding learning environment. Teachers pay individual attention to every student and encourage moral values along with top-grade academics."
                    }
                };

                window.updateMessageCard = (type) => {
                    const data = window.deskMessages[type];
                    if (!data) return;
                    const avatar = document.getElementById('desk-avatar');
                    const name = document.getElementById('desk-name');
                    const role = document.getElementById('desk-role');
                    const msg = document.getElementById('desk-message');
                    if (avatar) avatar.style.backgroundImage = `url('${data.avatar}')`;
                    if (name) name.innerText = data.name;
                    if (role) role.innerText = data.role;
                    if (msg) msg.innerText = data.message;
                };

                // Initialize with Chairman message
                window.updateMessageCard('chairman');
                bindMessageTabs();

                // Render Vision / Mission / Values
                if (settings.visionMission) {
                    if (document.getElementById('vision-text')) document.getElementById('vision-text').innerText = settings.visionMission.visionText;
                    const visionBullets = document.getElementById('vision-bullets');
                    if (visionBullets && settings.visionMission.visionBullets) {
                        visionBullets.innerHTML = settings.visionMission.visionBullets.map(b => `<li><i class="fa-solid fa-check"></i> ${b}</li>`).join('');
                    }

                    if (document.getElementById('mission-text')) document.getElementById('mission-text').innerText = settings.visionMission.missionText;
                    const missionBullets = document.getElementById('mission-bullets');
                    if (missionBullets && settings.visionMission.missionBullets) {
                        missionBullets.innerHTML = settings.visionMission.missionBullets.map(b => `<li><i class="fa-solid fa-check"></i> ${b}</li>`).join('');
                    }
                }

                // Default fallback constants in case keys are missing from server response
                const defaultAcademics = {
                    'little-champs': {
                        title: 'Little Champs (Nursery to Class V)',
                        lead: 'Foundational learning encouraging curiosity, active exploration, and creative skill development.',
                        description: 'Our primary program focuses on activity-based and play-way methods. We nurture fundamental literacy, numeracy, social skills, and creative thinking in a safe, vibrant environment.',
                        features: [
                            'Phonics & Early Reading Mastery',
                            'Interactive Smart Classroom Activities',
                            'Activity-Based Math & Science Concepts',
                            'Personalized Attention & Caring Mentorship'
                        ],
                        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=600'
                    },
                    'middle': {
                        title: 'Middle School (Class VI to Class VIII)',
                        lead: 'Empowering critical thinking, scientific curiosity, and experiential conceptual clarity.',
                        description: 'Middle school builds strong subject foundations across Mathematics, Sciences, Social Studies, and Languages, integrating practical laboratory sessions, project work, and interactive problem solving.',
                        features: [
                            'Hands-on Science & Computer Lab Practice',
                            'Structured Analytical & Mathematical Problem Solving',
                            'Language Communication & Debate Workshops',
                            'Holistic Personality & Moral Value Integration'
                        ],
                        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600'
                    },
                    'high': {
                        title: 'High School (Class IX to Class X)',
                        lead: 'Rigorous academic preparation for Board Examinations and future competitive success.',
                        description: 'Comprehensive curriculum aligned with state standards, emphasizing in-depth subject mastery, systematic revision plans, mock assessments, and personalized exam orientation.',
                        features: [
                            'State Board Syllabus Deep-Dive & Practice',
                            'Weekly Formative & Summative Mock Evaluations',
                            'Specialized Mentorship for Board Aspirants',
                            'Career Guidance & Skill Building Orientation'
                        ],
                        image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600'
                    },
                    'competitive': {
                        title: 'NEET & JEE Integrated Prep',
                        lead: 'Special focus batches preparing students for medical and engineering entrance exams.',
                        description: 'Integrated coaching embedded within regular school hours to strengthen Physics, Chemistry, and Mathematics/Biology concepts for national competitive entrance tests.',
                        features: [
                            'Daily Concept Practice Sheets & Micro-Tests',
                            'IIT/NEET Expert Guest Faculty Sessions',
                            'Advanced Problem Solving & Speed Techniques',
                            'Performance Analytics & Progress Tracking'
                        ],
                        image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600'
                    }
                };

                const defaultTestimonials = [
                    {
                        rating: 5,
                        quote: 'Sri Bhashyam Public School provides an outstanding learning environment. Teachers pay individual attention to every student and encourage moral values along with top-grade academics.',
                        parentName: 'K. Raghunath Reddy',
                        studentInfo: 'Parent of Class IX Student'
                    },
                    {
                        rating: 5,
                        quote: 'The NEET & JEE foundation program is fantastic. My son has developed immense confidence in Math and Science thanks to the dedicated faculty members.',
                        parentName: 'Smt. S. Anitha',
                        studentInfo: 'Parent of Class X Student'
                    },
                    {
                        rating: 5,
                        quote: 'A perfect blend of modern smart classrooms, discipline, and cultural heritage. We are extremely happy with our daughter\'s progress over the years.',
                        parentName: 'P. Sudhakar Rao',
                        studentInfo: 'Parent of Class V Student'
                    }
                ];

                const defaultFacilities = [
                    {
                        title: 'Interactive Smart Classrooms',
                        description: 'Digitally equipped classrooms with audio-visual learning tools and interactive smart boards for immersive learning.',
                        icon: 'fa-solid fa-chalkboard-user',
                        image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=600'
                    },
                    {
                        title: 'Hi-Tech Science Laboratories',
                        description: 'Fully equipped Physics, Chemistry, and Biology labs enabling practical experiments and scientific exploration.',
                        icon: 'fa-solid fa-flask-vial',
                        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=600'
                    },
                    {
                        title: 'Computer & Digital Innovation Hub',
                        description: 'Modern computer lab with high-speed connectivity, programming environments, and digital literacy training.',
                        icon: 'fa-solid fa-laptop-code',
                        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600'
                    },
                    {
                        title: 'Library & Knowledge Resource Center',
                        description: 'Vast repository of academic textbooks, reference journals, literature, encyclopedias, and digital learning assets.',
                        icon: 'fa-solid fa-book-bookmark',
                        image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600'
                    },
                    {
                        title: 'Sports & Athletic Arena',
                        description: 'Expansive outdoor play fields and indoor sports facilities supporting athletics, cricket, volleyball, chess, and karate.',
                        icon: 'fa-solid fa-volleyball',
                        image: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&q=80&w=600'
                    },
                    {
                        title: 'Safe & Monitored Campus Transport',
                        description: 'Fleet of GPS-tracked school buses covering key locations across Kadapa with trained drivers and attendants.',
                        icon: 'fa-solid fa-bus-simple',
                        image: 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&q=80&w=600'
                    }
                ];

                const defaultValues = [
                    {
                        title: 'Academic Excellence',
                        description: 'Delivering conceptual clarity, rigorous assessment routines, and competitive edge in state & national standards.'
                    },
                    {
                        title: 'Moral Integrity & Ethics',
                        description: 'Instilling truthfulness, discipline, respect for elders, and traditional Indian moral values.'
                    },
                    {
                        title: 'Holistic Development',
                        description: 'Balancing academic studies with sports, cultural arts, public speaking, and physical fitness.'
                    },
                    {
                        title: 'Innovation & Critical Thinking',
                        description: 'Encouraging scientific inquiry, practical problem-solving, and independent analytical capabilities.'
                    }
                ];

                const valuesGrid = document.getElementById('values-grid');
                const valuesData = settings.values || defaultValues;
                if (valuesGrid && valuesData) {
                    valuesGrid.innerHTML = valuesData.map((v, idx) => `
                        <div class="value-card">
                            <span class="val-num">0${idx+1}</span>
                            <h5>${v.title}</h5>
                            <p>${v.description}</p>
                        </div>
                    `).join('');
                }

                // Render Academics
                const programPanelsContainer = document.getElementById('program-panels-container');
                const academicsData = (settings.academics && Object.keys(settings.academics).length > 0) ? settings.academics : defaultAcademics;
                if (programPanelsContainer && academicsData) {
                    const keys = ['little-champs', 'middle', 'high', 'competitive'];
                    programPanelsContainer.innerHTML = keys.map((key, idx) => {
                        const p = academicsData[key] || defaultAcademics[key];
                        return `
                            <div class="program-panel ${idx === 0 ? 'active' : ''}" id="prog-${key}">
                                <div class="panel-grid">
                                    <div class="panel-text">
                                        <h3>${p.title}</h3>
                                        <p class="lead">${p.lead}</p>
                                        <p>${p.description}</p>
                                        <div class="features-list">
                                            ${p.features.map(f => `<div class="f-list-item"><i class="fa-solid fa-chevron-right"></i> ${f}</div>`).join('')}
                                        </div>
                                    </div>
                                    <div class="panel-image" style="background-image: url('${p.image}');"></div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    bindAcademicsTabs();
                }

                // Render Facilities
                const facilitiesGrid = document.getElementById('facilities-grid');
                const facilitiesData = (settings.facilities && settings.facilities.length > 0) ? settings.facilities : defaultFacilities;
                if (facilitiesGrid && facilitiesData) {
                    facilitiesGrid.innerHTML = facilitiesData.map(fac => `
                        <div class="facility-card">
                            <div class="fac-image" style="background-image: url('${fac.image}');"></div>
                            <div class="fac-content">
                                <div class="fac-icon"><i class="${fac.icon}"></i></div>
                                <h3>${fac.title}</h3>
                                <p>${fac.description}</p>
                            </div>
                        </div>
                    `).join('');
                }

                // Render Educators & Achievers inside Grids
                const modalEducatorsGrid = document.getElementById('modal-educators-grid');
                if (modalEducatorsGrid && settings.faculties) {
                    modalEducatorsGrid.innerHTML = settings.faculties.map(fac => {
                        let msg = fac.message || '';
                        if (!msg && settings.facultyMessage && (fac.name === settings.facultyMessage.name || fac.role.includes('Dean'))) {
                            msg = settings.facultyMessage.message;
                        }
                        if (!msg) {
                            msg = "Dedicated to fostering academic excellence, moral values, and student success at Sri Bhashyam.";
                        }
                        return `
                            <div class="faculty-profile-card">
                                <div class="fac-card-img-wrapper">
                                    <img src="${fac.image}" alt="${fac.name}" class="fac-card-img" loading="lazy" />
                                </div>
                                <div class="fac-card-body">
                                    <h4>${fac.name}</h4>
                                    <div class="fac-card-role">${fac.role}</div>
                                    <p class="fac-card-msg">"${msg}"</p>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                const modalStudentsGrid = document.getElementById('modal-students-grid');
                if (modalStudentsGrid && settings.students) {
                    modalStudentsGrid.innerHTML = settings.students.map(stud => {
                        let msg = stud.message || '';
                        if (!msg && settings.studentMessage && (stud.name === settings.studentMessage.name || stud.role.includes('President'))) {
                            msg = settings.studentMessage.message;
                        }
                        if (!msg) {
                            msg = "Striving for academic excellence, leadership, and active participation in school activities.";
                        }
                        return `
                            <div class="faculty-profile-card">
                                <div class="fac-card-img-wrapper">
                                    <img src="${stud.image}" alt="${stud.name}" class="fac-card-img" loading="lazy" />
                                </div>
                                <div class="fac-card-body">
                                    <h4>${stud.name}</h4>
                                    <div class="fac-card-role">${stud.role}</div>
                                    <p class="fac-card-msg">"${msg}"</p>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                // Render Testimonials
                const carouselTrack = document.getElementById('carousel-track');
                const carouselDots = document.getElementById('carousel-dots');
                const testimonialsData = (settings.testimonials && settings.testimonials.length > 0) ? settings.testimonials : defaultTestimonials;
                if (carouselTrack && testimonialsData) {
                    carouselTrack.innerHTML = testimonialsData.map(t => `
                        <div class="carousel-slide">
                            <div class="testimonial-card glassmorphism">
                                <div class="rating">
                                    ${Array(t.rating).fill('<i class="fa-solid fa-star"></i>').join('')}
                                </div>
                                <p class="quote">"${t.quote}"</p>
                                <div class="parent-info">
                                    <h5>${t.parentName}</h5>
                                    <span>${t.studentInfo}</span>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    
                    if (carouselDots) {
                        carouselDots.innerHTML = testimonialsData.map((_, idx) => `
                            <span class="dot ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                        `).join('');
                    }
                    bindCarousel();
                }

                // Render Gallery
                const galleryGrid = document.getElementById('gallery-grid');
                if (galleryGrid && settings.gallery) {
                    galleryGrid.innerHTML = settings.gallery.map(g => `
                        <div class="gallery-item" data-category="${g.category}">
                            <div class="gal-image-blur-bg" style="background-image: url('${g.image}');"></div>
                            <div class="gal-image-holder" style="background-image: url('${g.image}');">
                                <div class="gal-overlay">
                                    <span class="tag">${g.tag}</span>
                                    <h4>${g.title}</h4>
                                    <button class="zoom-btn" data-img="${g.image}"><i class="fa-solid fa-expand"></i></button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    bindGallery();
                }

                // Render Video Gallery Showcase
                const videoGrid = document.getElementById('video-gallery-grid');
                if (videoGrid && settings.videos && settings.videos.length > 0) {
                    videoGrid.innerHTML = settings.videos.map(v => {
                        const thumb = v.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400';
                        return `
                        <div class="video-card-item" data-video="${v.videoUrl}" style="background: var(--bg-light); border-radius: var(--border-radius-md); overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; cursor: pointer; transition: transform 0.3s ease;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                            <div style="position: relative; padding-top: 56.25%; background: #000; overflow: hidden;">
                                <div style="position: absolute; top:0; left:0; width:100%; height:100%; display: flex; flex-direction: column; align-items:center; justify-content:center; background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('${thumb}'); background-size: cover; background-position: center;">
                                    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(15, 23, 42, 0.75); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                                        <i class="fa-solid fa-play" style="font-size: 1.8rem; color: #f59e0b; margin-left: 4px;"></i>
                                    </div>
                                    <span style="color:#fff; font-weight:700; margin-top:12px; font-family: var(--font-heading); text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${v.title}</span>
                                </div>
                            </div>
                            <div style="padding: 20px; flex-grow: 1;">
                                <h4 style="margin:0 0 8px 0; font-family: var(--font-heading); font-size: 1.1rem; color: var(--primary-dark);">${v.title}</h4>
                                <p style="margin:0; font-size: 0.88rem; color: var(--text-muted);">${v.description || ''}</p>
                            </div>
                        </div>
                    `}).join('');
                }

                document.querySelectorAll('.video-card-item').forEach(card => {
                    card.addEventListener('click', () => {
                        const videoUrl = card.getAttribute('data-video');
                        if (videoUrl) openVideoModal(videoUrl);
                    });
                });

                // Render News & Home Notices
                const noticesContainer = document.getElementById('news-notices-container');
                const homeNoticesContainer = document.getElementById('home-notices-container');
                const borderColors = ['var(--primary-light, #2563eb)', 'var(--secondary-color, #d32f2f)', 'var(--accent-color, #d97706)'];

                if (noticesContainer && settings.notices) {
                    noticesContainer.innerHTML = settings.notices.map((n, idx) => `
                        <div style="background: var(--bg-light); padding: 20px; border-radius: var(--border-radius-sm); border-left: 4px solid ${borderColors[idx % borderColors.length]};">
                            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight:600;"><i class="fa-solid fa-calendar-day"></i> ${n.date}</span>
                            <h4 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--primary-dark); margin: 5px 0 10px 0;">${n.title}</h4>
                            <p style="font-size:0.9rem; color:var(--text-muted); margin:0; line-height: 1.5;">${n.description}</p>
                            ${n.link ? `<a href="${n.link}" style="display:inline-block; margin-top: 10px; font-weight:700; color:var(--primary-color); font-size:0.88rem;">Proceed to Admissions <i class="fa-solid fa-angle-right"></i></a>` : ''}
                        </div>
                    `).join('');
                }

                if (homeNoticesContainer && settings.notices && settings.notices.length > 0) {
                    homeNoticesContainer.innerHTML = settings.notices.slice(0, 3).map((n, idx) => `
                        <div class="news-preview-card" style="background: var(--bg-white, #ffffff); padding: 20px; border-radius: var(--border-radius-sm, 8px); border-left: 4px solid ${borderColors[idx % borderColors.length]}; box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));">
                            <span style="font-size: 0.8rem; color: #64748b; font-weight: 600;"><i class="fa-solid fa-calendar-day"></i> ${n.date}</span>
                            <h4 style="font-family: var(--font-heading); margin: 8px 0; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${n.title}</h4>
                            <p style="font-size: 0.88rem; color: #475569; line-height: 1.5; margin: 0;">${n.description}</p>
                            ${n.link ? `<a href="${n.link}" style="display:inline-block; margin-top: 8px; font-weight:700; color:var(--primary-color, #1e3a8a); font-size:0.85rem;">Read Details <i class="fa-solid fa-angle-right"></i></a>` : ''}
                        </div>
                    `).join('');
                }

                // Render News & Home Events
                const eventsContainer = document.getElementById('news-events-container');
                const homeEventsContainer = document.getElementById('home-events-container');
                const badgeColors = ['#2563eb', '#d32f2f', '#d97706', '#059669'];

                if (eventsContainer && settings.events) {
                    eventsContainer.innerHTML = settings.events.map((ev, idx) => `
                        <div style="display: flex; gap: 15px; align-items: flex-start; background: var(--bg-light); padding: 20px; border-radius: var(--border-radius-sm);">
                            <div style="background: ${badgeColors[idx % badgeColors.length]}; color: #ffffff; padding: 10px; border-radius: 6px; text-align: center; min-width: 60px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                                <span style="display: block; font-size: 1.25rem; font-weight: 800; line-height: 1; color: #ffffff;">${ev.day || '01'}</span>
                                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${ev.month || 'EVENT'}</span>
                            </div>
                            <div>
                                <h4 style="font-family: var(--font-heading); margin: 0 0 5px 0; font-size: 1.1rem; color: var(--primary-dark); font-weight: 700;">${ev.title}</h4>
                                <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin: 0;">${ev.description}</p>
                            </div>
                        </div>
                    `).join('');
                }

                if (homeEventsContainer && settings.events && settings.events.length > 0) {
                    homeEventsContainer.innerHTML = settings.events.slice(0, 3).map((ev, idx) => `
                        <div style="display: flex; gap: 15px; align-items: flex-start; background: var(--bg-white, #ffffff); padding: 20px; border-radius: var(--border-radius-sm, 8px); box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));">
                            <div style="background: ${badgeColors[idx % badgeColors.length]}; color: #ffffff; padding: 10px; border-radius: 6px; text-align: center; min-width: 60px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                                <span style="display: block; font-size: 1.25rem; font-weight: 800; line-height: 1; color: #ffffff;">${ev.day || '01'}</span>
                                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${ev.month || 'EVENT'}</span>
                            </div>
                            <div style="flex: 1;">
                                <h4 style="font-family: var(--font-heading); margin: 0 0 5px 0; font-size: 1.05rem; color: #0f172a; font-weight: 700;">${ev.title}</h4>
                                <p style="font-size: 0.88rem; color: #475569; line-height: 1.5; margin: 0;">${ev.description}</p>
                            </div>
                        </div>
                    `).join('');
                }

                // Trigger layouts calculation
                calculateTotalFee();
            }
        } catch (error) {
            console.error('Failed to load dynamic settings:', error);
        }
    };

    const bindMessageTabs = () => {
        const tabs = document.querySelectorAll('.msg-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const type = tab.getAttribute('data-msg-type');
                if (window.updateMessageCard) {
                    window.updateMessageCard(type);
                }
            });
        });
    };

    // 3. Dynamic Interactive Bindings
    const bindAcademicsTabs = () => {
        const progButtons = document.querySelectorAll('.prog-btn');
        progButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        const newProgButtons = document.querySelectorAll('.prog-btn');
        newProgButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetProgram = btn.getAttribute('data-program');
                const progPanels = document.querySelectorAll('.program-panel');

                newProgButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                progPanels.forEach(panel => {
                    if (panel.id === `prog-${targetProgram}`) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                });
            });
        });
    };

    const bindGallery = () => {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const galleryItems = document.querySelectorAll('.gallery-item');
        const lightboxModal = document.getElementById('lightbox-modal');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxClose = document.getElementById('lightbox-close');

        filterButtons.forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        const newFilterButtons = document.querySelectorAll('.filter-btn');
        newFilterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterValue = btn.getAttribute('data-filter');
                newFilterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                galleryItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filterValue === 'all' || category === filterValue) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });

        const zoomButtons = document.querySelectorAll('.zoom-btn');
        zoomButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const imgSrc = btn.getAttribute('data-img');
                if (lightboxImg) lightboxImg.src = imgSrc;
                if (lightboxModal) {
                    lightboxModal.classList.add('open');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        const closeLightbox = () => {
            if (lightboxModal) {
                lightboxModal.classList.remove('open');
                if (lightboxImg) lightboxImg.src = '';
                document.body.style.overflow = 'auto';
            }
        };

        if (lightboxClose) {
            lightboxClose.replaceWith(lightboxClose.cloneNode(true));
            const newClose = document.getElementById('lightbox-close');
            newClose.addEventListener('click', closeLightbox);
        }

        if (lightboxModal) {
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal) closeLightbox();
            });
        }

        const videoModal = document.getElementById('video-modal');
        const videoModalClose = document.getElementById('video-modal-close');
        const closeVideoModal = () => {
            if (videoModal) videoModal.classList.remove('open');
            const videoFrame = document.getElementById('video-frame');
            const videoTag = document.getElementById('video-tag');
            if (videoFrame) videoFrame.src = '';
            if (videoTag) { videoTag.pause(); videoTag.src = ''; }
            document.body.style.overflow = 'auto';
        };

        if (videoModalClose) {
            videoModalClose.replaceWith(videoModalClose.cloneNode(true));
            const newVideoClose = document.getElementById('video-modal-close');
            newVideoClose.addEventListener('click', closeVideoModal);
        }
        if (videoModal) {
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) closeVideoModal();
            });
        }

        document.querySelectorAll('.video-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const videoUrl = card.getAttribute('data-video');
                if (videoUrl) openVideoModal(videoUrl);
            });
        });
    };

    const openVideoModal = (rawUrl) => {
        if (!rawUrl) return;
        const videoModal = document.getElementById('video-modal');
        const videoFrame = document.getElementById('video-frame');
        const videoTag = document.getElementById('video-tag');
        if (!videoModal) return;

        let url = rawUrl.trim();
        // Convert standard YouTube URLs to embed format with autoplay
        if (url.includes('youtube.com/watch?v=')) {
            const vId = url.split('watch?v=')[1].split('&')[0];
            url = `https://www.youtube.com/embed/${vId}?autoplay=1&rel=0`;
        } else if (url.includes('youtu.be/')) {
            const vId = url.split('youtu.be/')[1].split('?')[0];
            url = `https://www.youtube.com/embed/${vId}?autoplay=1&rel=0`;
        } else if (url.includes('youtube.com/embed/') && !url.includes('autoplay=')) {
            url += (url.includes('?') ? '&' : '?') + 'autoplay=1&rel=0';
        }

        if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('/embed/')) {
            if (videoFrame) {
                videoFrame.src = url;
                videoFrame.style.display = 'block';
            }
            if (videoTag) {
                videoTag.pause();
                videoTag.style.display = 'none';
            }
        } else {
            if (videoTag) {
                videoTag.src = url;
                videoTag.style.display = 'block';
                videoTag.play().catch(() => {});
            }
            if (videoFrame) {
                videoFrame.src = '';
                videoFrame.style.display = 'none';
            }
        }

        videoModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    let autoplayTimer = null;
    const bindCarousel = () => {
        const track = document.getElementById('carousel-track');
        const nextButton = document.getElementById('car-next');
        const prevButton = document.getElementById('car-prev');
        const dotsContainer = document.getElementById('carousel-dots');
        if (!track || !dotsContainer) return;

        const slides = track.querySelectorAll('.carousel-slide');
        let currentIndex = 0;
        const totalSlides = slides.length;
        if (totalSlides === 0) return;

        const updateSlider = () => {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            const dots = dotsContainer.querySelectorAll('.dot');
            dots.forEach((dot, idx) => {
                if (idx === currentIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };

        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSlider();
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSlider();
        };

        if (nextButton && prevButton) {
            const newNext = nextButton.cloneNode(true);
            const newPrev = prevButton.cloneNode(true);
            nextButton.parentNode.replaceChild(newNext, nextButton);
            prevButton.parentNode.replaceChild(newPrev, prevButton);

            newNext.addEventListener('click', () => {
                nextSlide();
                resetAutoplay();
            });
            newPrev.addEventListener('click', () => {
                prevSlide();
                resetAutoplay();
            });
        }

        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                currentIndex = parseInt(dot.getAttribute('data-index'), 10);
                updateSlider();
                resetAutoplay();
            });
        });

        const startAutoplay = () => {
            if (autoplayTimer) clearInterval(autoplayTimer);
            autoplayTimer = setInterval(nextSlide, 5000);
        };

        const resetAutoplay = () => {
            clearInterval(autoplayTimer);
            startAutoplay();
        };

        startAutoplay();
    };

    // Load settings globally on all pages
    loadSchoolSettings();

    // Bind listeners for fee elements if calculator is present
    if (gradeSelect) {
        gradeSelect.addEventListener('change', calculateTotalFee);
        if (transportRadios) transportRadios.forEach(radio => radio.addEventListener('change', calculateTotalFee));
        calculateTotalFee();
    }



    /* ==========================================================================
       8. AJAX Form Inquiry & Newsletter Submission Engine
       ========================================================================== */
    const quickForm = document.getElementById('quick-inquiry-form');
    const mainForm = document.getElementById('main-inquiry-form');
    const newsletterForm = document.getElementById('newsletter-form');

    const handleFormSubmit = async (e, formElement, responseElementId) => {
        e.preventDefault();
        const responseDiv = document.getElementById(responseElementId);
        
        // UI feedback - disable submit
        const submitBtn = formElement.querySelector('button[type="submit"]');
        const originalBtnHTML = submitBtn.innerHTML;
        
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        if (btnText && btnSpinner) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'flex';
        } else {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';
        }

        // Collect Form Data
        const formData = new FormData(formElement);
        const data = {};
        formData.forEach((value, key) => data[key] = value);

        // Add defaults if missing
        if (!data.type) {
            data.type = 'General Inquiry';
        }
        
        try {
            const response = await fetch(API_BASE + '/api/inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Success message
                responseDiv.className = 'form-response success';
                responseDiv.innerText = result.message;
                formElement.reset();
                if (calculateTotalFee) calculateTotalFee(); // reset estimator pricing
            } else {
                // Error message
                responseDiv.className = 'form-response error';
                responseDiv.innerText = result.message || 'An error occurred. Please try again.';
            }
        } catch (error) {
            console.error('Submission error:', error);
            responseDiv.className = 'form-response error';
            responseDiv.innerText = 'Unable to connect to server. Please try again later.';
        } finally {
            // Restore button
            if (btnText && btnSpinner) {
                btnText.style.display = 'inline-flex';
                btnSpinner.style.display = 'none';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHTML;
            }
        }
    };

    if (quickForm) {
        quickForm.addEventListener('submit', (e) => {
            handleFormSubmit(e, quickForm, 'quick-form-response');
        });
    }

    if (mainForm) {
        mainForm.addEventListener('submit', (e) => {
            handleFormSubmit(e, mainForm, 'main-form-response');
        });
    }

    // Newsletter footer simulation
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input');
            const resDiv = document.getElementById('newsletter-response');
            
            resDiv.className = 'newsletter-response success';
            resDiv.innerText = `Subscribed successfully! Updates will be sent to ${emailInput.value}.`;
            resDiv.style.display = 'block';
            
            emailInput.value = '';
            setTimeout(() => {
                resDiv.style.display = 'none';
            }, 6000);
        });
    }

    /* ==========================================================================
       9. Scroll Reveal Intersection Observer
       ========================================================================== */
    const initScrollReveal = () => {
        const revealElements = document.querySelectorAll('.reveal-element, .reveal-left, .reveal-right');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -40px 0px'
            });

            revealElements.forEach(el => observer.observe(el));
        } else {
            revealElements.forEach(el => el.classList.add('revealed'));
        }
    };
    
    initScrollReveal();

    console.log('Sri Bhashyam Public School Website Logic Loaded Successfully.');
});