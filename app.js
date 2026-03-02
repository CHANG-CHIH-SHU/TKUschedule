// ====== State ======
let allCourses = [];
let filteredCourses = [];
let selectedCourses = {}; // course.id -> course
const gridState = Array(6).fill().map(() => Array(11).fill(null)); // 1-indexed for both day(1-5) and period(1-10+)

// Free-time filter state
let freeTimeMode = false;
const freeSlots = new Set(); // stores "day-period" strings e.g. "1-3"

// ====== DOM Elements ======
const deptSelect = document.getElementById('department-select');
const searchInput = document.getElementById('course-search');
const courseList = document.getElementById('course-list');
const courseCount = document.getElementById('course-count');
const timetableBody = document.getElementById('timetable-body');
const totalCreditsEl = document.getElementById('total-credits');
const clearBtn = document.getElementById('clear-schedule-btn');
const freeTimeToggle = document.getElementById('free-time-toggle');
const clearFreeSlotsBtn = document.getElementById('clear-free-slots-btn');
const freeTimeHint = document.getElementById('free-time-hint');
const viewSelectedListBtn = document.getElementById('view-selected-list-btn');

const selectedListModal = document.getElementById('selected-list-modal');
const selectedListContent = document.getElementById('selected-list-content');
const selectedListCloseBtn = document.getElementById('selected-list-close-btn');

// Modals
const conflictModal = document.getElementById('conflict-modal');
const conflictMsg = document.getElementById('conflict-message');
const conflictCloseBtn = document.getElementById('conflict-close-btn');

const detailsModal = document.getElementById('details-modal');
const detailsTitle = document.getElementById('details-title');
const detailsBadge = document.getElementById('details-badge');
const detailsContent = document.getElementById('details-content');
const detailsCloseBtn = document.getElementById('details-close-btn');
const detailsRemoveBtn = document.getElementById('details-remove-btn');

let currentDetailsCourseId = null;

// ====== Initialization ======
async function init() {
    initTimetableGrid();

    try {
        const response = await fetch('courses.json');
        if (!response.ok) throw new Error('Failed to load courses.json');

        allCourses = await response.json();

        // Populate department selector
        populateDepartments();

        // Setup Event Listeners
        deptSelect.addEventListener('change', filterCourses);
        searchInput.addEventListener('input', filterCourses);
        clearBtn.addEventListener('click', clearSchedule);
        freeTimeToggle.addEventListener('click', toggleFreeTimeMode);
        clearFreeSlotsBtn.addEventListener('click', clearFreeSlots);
        viewSelectedListBtn.addEventListener('click', showSelectedListModal);

        // Modal Event Listeners
        conflictCloseBtn.addEventListener('click', () => conflictModal.classList.add('hidden'));
        detailsCloseBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));
        selectedListCloseBtn.addEventListener('click', () => selectedListModal.classList.add('hidden'));
        detailsRemoveBtn.addEventListener('click', () => {
            if (currentDetailsCourseId) {
                removeCourseFromSchedule(currentDetailsCourseId);
                detailsModal.classList.add('hidden');
            }
        });

        // Initialize default selection
        if (deptSelect.options.length > 1) {
            deptSelect.selectedIndex = 1;
            filterCourses();
        }

    } catch (e) {
        console.error('Initialization error:', e);
        courseList.innerHTML = `<div class="empty-state">無法載入課程資料：${e.message}</div>`;
    }
}

// ====== Setup Timetable Grid ======
function initTimetableGrid() {
    timetableBody.innerHTML = '';

    // Create 10 periods (1-10)
    for (let period = 1; period <= 10; period++) {
        const tr = document.createElement('tr');

        // Time column
        const th = document.createElement('th');
        th.className = 'time-col';

        // Simple time mapping based on standard university hours starting at 08:00
        const startHour = 7 + period;
        const endHour = startHour + 1;
        th.innerHTML = `第 ${period} 節<br><small>${startHour.toString().padStart(2, '0')}:10-${endHour.toString().padStart(2, '0')}:00</small>`;
        tr.appendChild(th);

        // Day columns (Mon-Fri -> 1-5)
        for (let day = 1; day <= 5; day++) {
            const td = document.createElement('td');
            td.id = `cell-${day}-${period}`;
            td.dataset.day = day;
            td.dataset.period = period;
            // Cell click handler for free-time selection
            td.addEventListener('click', () => handleCellClick(day, period, td));
            tr.appendChild(td);
        }
        timetableBody.appendChild(tr);
    }
}

// ====== Sidebar Logic ======
function populateDepartments() {
    // Extract unique departments
    const depts = new Map();
    allCourses.forEach(c => {
        if (!depts.has(c.departmentId)) {
            depts.set(c.departmentId, c.departmentName);
        }
    });

    // Separate pinned categories from the rest
    const pinnedKeywords = ['核心課程', '體育', '校共通課程'];
    const pinned = [];
    const rest = [];

    Array.from(depts.entries()).forEach(([id, name]) => {
        if (pinnedKeywords.some(kw => name.includes(kw))) {
            pinned.push([id, name]);
        } else {
            rest.push([id, name]);
        }
    });

    pinned.sort((a, b) => a[1].localeCompare(b[1]));
    rest.sort((a, b) => a[1].localeCompare(b[1]));

    // Pinned group
    const pinnedGroup = document.createElement('optgroup');
    pinnedGroup.label = '⭐ 常用類別';
    pinned.forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        pinnedGroup.appendChild(option);
    });
    deptSelect.appendChild(pinnedGroup);

    // Rest group
    const restGroup = document.createElement('optgroup');
    restGroup.label = '📚 所有系所';
    rest.forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        restGroup.appendChild(option);
    });
    deptSelect.appendChild(restGroup);
}

function filterCourses() {
    const deptId = deptSelect.value;
    const query = searchInput.value.toLowerCase().trim();

    if (!deptId) return;

    filteredCourses = allCourses.filter(c => {
        const matchDept = c.departmentId === deptId;
        const matchQuery = !query ||
            c.name.toLowerCase().includes(query) ||
            (c.instructor && c.instructor.toLowerCase().includes(query));

        // Free-time filter: course must fit entirely within selected free slots
        // Out-of-grid schedules (day 6/7, period 11+) are ignored — only check in-grid slots
        let matchFreeTime = true;
        if (freeTimeMode && freeSlots.size > 0 && c.schedules && c.schedules.length > 0) {
            matchFreeTime = c.schedules.every(schedule => {
                if (schedule.day < 1 || schedule.day > 5) return true; // skip out-of-grid
                return schedule.periods.every(period => {
                    if (period < 1 || period > 10) return true; // skip out-of-grid
                    return freeSlots.has(`${schedule.day}-${period}`);
                });
            });
        }

        return matchDept && matchQuery && matchFreeTime;
    });

    renderCourseList();
}

function getBadgeType(req) {
    if (req.includes('必')) return { class: 'req', text: '必修' };
    if (req.includes('選')) return { class: 'elec', text: '選修' };
    return { class: 'gen', text: req || '通識' };
}

function renderCourseList() {
    courseCount.textContent = `${filteredCourses.length} 筆`;
    courseList.innerHTML = '';

    if (filteredCourses.length === 0) {
        courseList.innerHTML = `<div class="empty-state">找不到符合的課程</div>`;
        return;
    }

    // Use Fragment for performance
    const fragment = document.createDocumentFragment();

    filteredCourses.forEach(course => {
        const isAdded = !!selectedCourses[course.id];
        const badge = getBadgeType(course.reqElective);

        // Format schedule string for display
        let timeStr = '無時間資訊';
        if (course.schedules && course.schedules.length > 0) {
            const dayMap = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };
            timeStr = course.schedules.map(s => {
                const day = dayMap[s.day] || s.day;
                const p = s.periods.join(',');
                return `週${day} ${p}節`;
            }).join(' / ');
        }

        const div = document.createElement('div');
        div.className = `course-card ${isAdded ? 'added' : ''}`;
        div.dataset.id = course.id;

        div.innerHTML = `
            <div class="card-header">
                <div class="course-name">${course.name} <span style="font-size: 11px; color: var(--text-secondary); font-weight: normal; margin-left: 4px;">${course.seqNumber}</span></div>
                <span class="badge ${badge.class}">${badge.text}</span>
            </div>
            <div class="card-meta">
                <div class="meta-item"><i data-lucide="user" class="icon-sm"></i> ${course.instructor || '未定'}</div>
                <div class="meta-item"><i data-lucide="award" class="icon-sm"></i> ${course.credits} 學分</div>
                <div class="meta-item" style="grid-column: span 2"><i data-lucide="clock" class="icon-sm"></i> ${timeStr}</div>
            </div>
        `;

        div.addEventListener('click', () => {
            if (!isAdded) addCourseToSchedule(course);
        });

        fragment.appendChild(div);
    });

    courseList.appendChild(fragment);
    lucide.createIcons();
}

// ====== Core Business Logic ======

function checkConflicts(course) {
    if (!course.schedules || course.schedules.length === 0) return null;

    for (const schedule of course.schedules) {
        // Only care about valid weekdays
        if (schedule.day < 1 || schedule.day > 5) continue;

        for (const period of schedule.periods) {
            // Check boundaries
            if (period < 1 || period > 10) continue;

            // Check grid state
            const existingCourseId = gridState[schedule.day][period];
            if (existingCourseId) {
                return selectedCourses[existingCourseId]; // Return the conflicting course
            }
        }
    }
    return null;
}

function addCourseToSchedule(course) {
    // 1. Check for conflicts
    const conflict = checkConflicts(course);
    if (conflict) {
        showConflictModal(course, conflict);
        return;
    }

    // 2. Clear to add
    selectedCourses[course.id] = course;

    // Update grid state and UI
    if (course.schedules) {
        const badge = getBadgeType(course.reqElective);

        course.schedules.forEach(schedule => {
            if (schedule.day < 1 || schedule.day > 5) return;

            schedule.periods.forEach(period => {
                if (period < 1 || period > 10) return;

                // Update State
                gridState[schedule.day][period] = course.id;

                // Update UI Cell
                const cell = document.getElementById(`cell-${schedule.day}-${period}`);
                if (cell) {
                    const block = document.createElement('div');
                    block.className = `schedule-block ${badge.class}`;
                    block.dataset.id = course.id;
                    block.innerHTML = `
                        <div class="block-title">${course.name}</div>
                        <div class="block-room">${course.seqNumber}</div>
                        <div class="block-room">${schedule.room || ''}</div>
                    `;

                    // Click to show details/remove
                    block.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showDetailsModal(course);
                    });

                    cell.appendChild(block);
                }
            });
        });
    }

    // Refresh Sidebar and Stats
    renderCourseList();
    updateTotalCredits();
}

function removeCourseFromSchedule(courseId) {
    const course = selectedCourses[courseId];
    if (!course) return;

    // Remove from state
    delete selectedCourses[courseId];

    // Remove from grid map and UI
    if (course.schedules) {
        course.schedules.forEach(schedule => {
            if (schedule.day < 1 || schedule.day > 5) return;

            schedule.periods.forEach(period => {
                if (period < 1 || period > 10) return;

                // Update State
                gridState[schedule.day][period] = null;

                // Update UI Cell
                const cell = document.getElementById(`cell-${schedule.day}-${period}`);
                if (cell) {
                    // Remove the specific block
                    const block = cell.querySelector(`.schedule-block[data-id="${courseId}"]`);
                    if (block) block.remove();
                }
            });
        });
    }

    renderCourseList();
    updateTotalCredits();
}

function clearSchedule() {
    selectedCourses = {};
    for (let d = 1; d <= 5; d++) {
        for (let p = 1; p <= 10; p++) {
            gridState[d][p] = null;
            const cell = document.getElementById(`cell-${d}-${p}`);
            if (cell) cell.innerHTML = '';
        }
    }
    renderCourseList();
    updateTotalCredits();
}

function updateTotalCredits() {
    let sum = 0;
    Object.values(selectedCourses).forEach(c => {
        sum += c.credits || 0;
    });
    totalCreditsEl.textContent = sum;
}

// ====== UI Modals ======
function showConflictModal(newCourse, existingCourse) {
    conflictMsg.innerHTML = `您想加入的 <strong>${newCourse.name}</strong> 與目前課表上的 <strong>${existingCourse.name}</strong> 在時段上有重疊，無法排入。`;
    conflictModal.classList.remove('hidden');
}

function showDetailsModal(course) {
    currentDetailsCourseId = course.id;

    const badge = getBadgeType(course.reqElective);
    detailsTitle.textContent = course.name;
    detailsBadge.textContent = badge.text;
    detailsBadge.className = `badge ${badge.class}`;

    let timeStr = '無時間資訊';
    if (course.schedules && course.schedules.length > 0) {
        const dayMap = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };
        timeStr = course.schedules.map(s => {
            const day = dayMap[s.day] || s.day;
            const p = s.periods.join(',');
            return `週${day} 第 ${p} 節 (${s.room || '無教室'})`;
        }).join('<br>');
    }

    detailsContent.innerHTML = `
        <div class="details-grid">
            <div class="dg-label">開課序號</div>
            <div class="dg-value">${course.seqNumber}</div>
            
            <div class="dg-label">開課單位</div>
            <div class="dg-value">${course.departmentName}</div>
            
            <div class="dg-label">授課教師</div>
            <div class="dg-value">${course.instructor || '未定'}</div>
            
            <div class="dg-label">學分數</div>
            <div class="dg-value">${course.credits}</div>
            
            <div class="dg-label">上課時間</div>
            <div class="dg-value">${timeStr}</div>
        </div>
    `;

    detailsModal.classList.remove('hidden');
}

function showSelectedListModal() {
    const courses = Object.values(selectedCourses);
    if (courses.length === 0) {
        selectedListContent.innerHTML = '<div class="empty-state">目前尚未選擇任何課程</div>';
    } else {
        let html = `
            <table class="selected-list-table">
                <thead>
                    <tr>
                        <th style="width: 30%">課程名稱</th>
                        <th style="width: 10%">學分</th>
                        <th style="width: 15%">必/選</th>
                        <th style="width: 30%">時間</th>
                        <th style="width: 15%">操作</th>
                    </tr>
                </thead>
                <tbody>
        `;

        courses.forEach(course => {
            const badge = getBadgeType(course.reqElective);
            let timeStr = '無時間資訊';
            if (course.schedules && course.schedules.length > 0) {
                const dayMap = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' };
                timeStr = course.schedules.map(s => {
                    const day = dayMap[s.day] || s.day;
                    return `週${day} ${s.periods.join(',')}節`;
                }).join('<br>');
            }

            html += `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${course.name}</div>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${course.seqNumber}</div>
                    </td>
                    <td>${course.credits}</td>
                    <td><span class="badge ${badge.class}">${badge.text}</span></td>
                    <td style="font-size: 13px;">${timeStr}</td>
                    <td><button class="btn-remove-small" data-id="${course.id}"><i data-lucide="x" class="icon-xs"></i> 移除</button></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        selectedListContent.innerHTML = html;

        // Add handlers
        selectedListContent.querySelectorAll('.btn-remove-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                removeCourseFromSchedule(id);
                showSelectedListModal();
            });
        });

        lucide.createIcons({
            root: selectedListContent
        });
    }

    selectedListModal.classList.remove('hidden');
}

// ====== Free Time Filter ======
function toggleFreeTimeMode() {
    freeTimeMode = !freeTimeMode;
    freeTimeToggle.classList.toggle('active', freeTimeMode);
    freeTimeHint.classList.toggle('hidden', !freeTimeMode);
    clearFreeSlotsBtn.classList.toggle('hidden', !freeTimeMode);

    const timetable = document.getElementById('timetable');
    if (timetable) {
        timetable.classList.toggle('free-time-active', freeTimeMode);
    }

    // Toggle selectable styling on empty cells
    for (let d = 1; d <= 5; d++) {
        for (let p = 1; p <= 10; p++) {
            const cell = document.getElementById(`cell-${d}-${p}`);
            if (!cell) continue;
            if (freeTimeMode && !gridState[d][p]) {
                cell.classList.add('free-slot-selectable');
            } else {
                cell.classList.remove('free-slot-selectable');
            }
        }
    }

    // Re-filter courses when toggling mode
    filterCourses();
}

function handleCellClick(day, period, td) {
    if (!freeTimeMode) return;
    // Only allow toggling on empty cells (no course scheduled)
    if (gridState[day][period]) return;

    const key = `${day}-${period}`;
    if (freeSlots.has(key)) {
        freeSlots.delete(key);
        td.classList.remove('free-slot-selected');
    } else {
        freeSlots.add(key);
        td.classList.add('free-slot-selected');
    }

    filterCourses();
}

function clearFreeSlots() {
    freeSlots.clear();
    for (let d = 1; d <= 5; d++) {
        for (let p = 1; p <= 10; p++) {
            const cell = document.getElementById(`cell-${d}-${p}`);
            if (cell) cell.classList.remove('free-slot-selected');
        }
    }
    filterCourses();
}

// Boot the app
window.addEventListener('DOMContentLoaded', init);
