let timer;
let isRunning = false;
let minutes = 25;
let seconds = 0;
let isBreak = false; 
let workCount = 0; // number of completed work sessions (pomodoros)
let lastBreakLong = false; // whether the most recent break was the long break
let alarm = document.getElementById("Alarm");
alarm.volume = 0.5;

// Settings (defaults)
let workDuration = 25; // minutes
let shortBreakDuration = 5; // minutes
let longBreakDuration = 30; // minutes
let longBreakInterval = 4; // every N work sessions use a long break

const timeDisplay = document.getElementById('time');
const statusDisplay = document.getElementById('status');
const startButton = document.getElementById('start');
const resetButton = document.getElementById('reset');
const todoBtn = document.getElementById('todoBtn');
const todoSidebar = document.getElementById('todoSidebar');
const closeTodo = document.getElementById('closeTodo');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const todoListEl = document.getElementById('todoList');


function updateDisplay() {
    let formattedSeconds = seconds < 10 ? "0" + seconds : seconds;
    let formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    timeDisplay.innerText = `${formattedMinutes}:${formattedSeconds}`;
    if (statusDisplay) {
        statusDisplay.innerText = isBreak ? "Break Time" : "Work Time";
    }
    // nothing else here; confetti is started/stopped where break state changes
}

function startStopTimer() {
    if (isRunning) {
        clearInterval(timer); // Stop the timer
        startButton.innerText = "▶ Start"; 
    } else {
        timer = setInterval(function () {
            if (seconds === 0) {
                if (minutes === 0) {
                    if (isBreak) {
                        // Break finished -> go back to work
                        minutes = workDuration;
                        isBreak = false;
                        stopConfetti();
                        // if last break was long, reset the work count
                        if (lastBreakLong) {
                            workCount = 0;
                            lastBreakLong = false;
                        }
                        alarm.play();
                    } else {
                        // Work session finished -> start break
                        workCount++;
                        // Every longBreakInterval-th pomodoro use a long break
                        if (workCount % longBreakInterval === 0) {
                            minutes = longBreakDuration;
                            lastBreakLong = true;
                        } else {
                            minutes = shortBreakDuration;
                            lastBreakLong = false;
                        }
                        isBreak = true;
                        startConfetti();
                        alarm.play();
                    }
                } else {
                    minutes--;
                    seconds = 59;
                }
            } else {
                seconds--;
            }
            updateDisplay();
        }, 1000);   //change to make timer go faster/slower
        startButton.innerText = "❚❚ Pause";
    }
    isRunning = !isRunning; // Toggle running state
}

function resetTimer() {
    clearInterval(timer);
    // ensure any running confetti animation is stopped when resetting
    stopConfetti();
    minutes = workDuration;
    seconds = 0;
    isBreak = false;
    workCount = 0;
    lastBreakLong = false;
    updateDisplay();
    startButton.innerText = "▶ Start";
    isRunning = false;
}

startButton.addEventListener('click', startStopTimer);
resetButton.addEventListener('click', resetTimer);

// load settings on startup and apply
loadSettings();
minutes = workDuration;
updateDisplay();

// Fullscreen toggle: show minimal UI with only task, timer, status and start/pause
const fullscreenButton = document.getElementById('fullscreen');
function toggleFullscreenView() {
    const isNow = document.body.classList.toggle('fullscreen-mode');
    if (isNow) {
        // try entering browser fullscreen for immersion
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(()=>{});
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(()=>{});
        }
    }
}

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', toggleFullscreenView);
}

// If user exits fullscreen via ESC or browser control, remove the CSS class
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-mode');
        // leaving fullscreen should not affect confetti or break state
    }
});

// -----------------
// Todo list sidebar
// -----------------
let tasks = [];
const TASKS_KEY = 'pomodoroTasks';

function loadTasks() {
    try {
        const raw = localStorage.getItem(TASKS_KEY);
        tasks = raw ? JSON.parse(raw) : [];
        // clear tasks that are not from today
        const today = new Date().toISOString().slice(0,10);
        const filtered = tasks.filter(t => t && t.date === today);
        if (filtered.length !== tasks.length) {
            tasks = filtered;
            try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch (e) {}
        }
    } catch (e) { tasks = []; }
}

function saveTasks() {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch (e) {}
}

function makeTaskEl(task, index) {
    const li = document.createElement('li');
    li.className = 'todo-row' + (task.done ? ' done' : '');
    // drag/drop removed; keep swap buttons for keyboard/precision control

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!task.done;
    chk.addEventListener('change', () => {
        const wasChecked = chk.checked;
        const realIndex = tasks.findIndex(t => t.id === task.id);
        if (realIndex === -1) return;
        tasks[realIndex].done = wasChecked;
        // if a task is checked, move it to the end so top task becomes the next active one
        if (wasChecked) {
            const t = tasks.splice(realIndex, 1)[0];
            tasks.push(t);
        }
        saveTasks();
        renderTasks();
    });

    const txt = document.createElement('div');
    txt.className = 'todo-text';
    txt.contentEditable = true;
    txt.innerText = task.text;
        txt.addEventListener('blur', () => {
            const realIndex = tasks.findIndex(t => t.id === task.id);
            if (realIndex !== -1) {
                tasks[realIndex].text = txt.innerText.trim() || tasks[realIndex].text;
                saveTasks();
                renderTasks();
            }
        });
    txt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); txt.blur(); }
    });

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const up = document.createElement('button'); up.title = 'Move up'; up.innerText = '↑';
    up.addEventListener('click', () => {
        const realIndex = tasks.findIndex(t => t.id === task.id);
        if (realIndex > 0) { [tasks[realIndex-1], tasks[realIndex]] = [tasks[realIndex], tasks[realIndex-1]]; saveTasks(); renderTasks(); }
    });
    const down = document.createElement('button'); down.title = 'Move down'; down.innerText = '↓';
    down.addEventListener('click', () => {
        const realIndex = tasks.findIndex(t => t.id === task.id);
        if (realIndex !== -1 && realIndex < tasks.length-1) { [tasks[realIndex+1], tasks[realIndex]] = [tasks[realIndex], tasks[realIndex+1]]; saveTasks(); renderTasks(); }
    });
    const del = document.createElement('button'); del.title = 'Delete'; del.innerText = '✕';
    del.addEventListener('click', () => { const realIndex = tasks.findIndex(t => t.id === task.id); if (realIndex !== -1) { tasks.splice(realIndex,1); saveTasks(); renderTasks(); } });

    actions.appendChild(up); actions.appendChild(down); actions.appendChild(del);

    li.appendChild(chk); li.appendChild(txt); li.appendChild(actions);
    return li;
}

function renderTasks() {
    if (!todoListEl) return;
    todoListEl.innerHTML = '';
    tasks.forEach((t,i) => todoListEl.appendChild(makeTaskEl(t,i)));
    // sync top task with #task input
    const top = tasks[0];
    const taskInput = document.getElementById('task');
    if (taskInput) {
        if (top) {
            taskInput.value = top.text;
        } else {
            taskInput.value = '';
        }
    }
}

function addTask(text) {
    const today = new Date().toISOString().slice(0,10);
    const t = { id: Date.now() + '-' + Math.floor(Math.random()*1000), text: String(text).trim(), done: false, date: today };
    // add to top
    tasks.unshift(t);
    saveTasks();
    renderTasks();
}

if (todoBtn && todoSidebar) {
    todoBtn.addEventListener('click', () => {
        const open = todoSidebar.classList.toggle('open');
        todoSidebar.setAttribute('aria-hidden', String(!open));
        if (open) { newTaskInput.focus(); }
    });
}
if (closeTodo && todoSidebar) {
    closeTodo.addEventListener('click', () => { todoSidebar.classList.remove('open'); todoSidebar.setAttribute('aria-hidden','true'); });
}
if (addTaskBtn && newTaskInput) {
    addTaskBtn.addEventListener('click', () => { const v = newTaskInput.value.trim(); if (v) { addTask(v); newTaskInput.value=''; newTaskInput.focus(); } });
    newTaskInput.addEventListener('keydown', (e)=> { if (e.key==='Enter') { e.preventDefault(); addTaskBtn.click(); } });
}

// keep the timer title in sync with the top task; if user edits the main task input update top task
const mainTaskInput = document.getElementById('task');
if (mainTaskInput) {
    mainTaskInput.addEventListener('input', () => {
        if (tasks.length > 0) {
            tasks[0].text = mainTaskInput.value;
            saveTasks();
            renderTasks();
        }
    });
}

// init tasks on load
loadTasks();
renderTasks();

// -----------------
// Confetti for breaks
// -----------------
let confettiCanvas = null;
let confettiCtx = null;
let confettiPieces = [];
let confettiAnimId = null;

function makeConfettiPiece(w, h) {
    return {
        x: Math.random() * w,
        y: -Math.random() * h,
        size: 6 + Math.random() * 10,
        wobble: Math.random() * 6,
        vx: -1 + Math.random() * 2,
        vy: 1 + Math.random() * 3,
        angle: Math.random() * Math.PI * 2,
        va: (-0.1 + Math.random() * 0.2),
        color: ['#f94144','#f3722c','#f8961e','#f9c74f','#90be6d','#577590'][Math.floor(Math.random()*6)]
    };
}

function createConfettiCanvas() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-canvas';
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.width = '100%';
    confettiCanvas.style.height = '100%';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '99998';
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
    // populate pieces
    const count = Math.min(160, Math.floor((window.innerWidth * window.innerHeight) / 8000));
    confettiPieces = [];
    for (let i=0;i<count;i++) confettiPieces.push(makeConfettiPiece(confettiCanvas.width, confettiCanvas.height));
}

function resizeConfettiCanvas() {
    if (!confettiCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = Math.floor(window.innerWidth * dpr);
    confettiCanvas.height = Math.floor(window.innerHeight * dpr);
    confettiCtx.setTransform(dpr,0,0,dpr,0,0);
}

function drawConfetti() {
    if (!confettiCtx) return;
    const ctx = confettiCtx;
    const w = confettiCanvas.width / (window.devicePixelRatio || 1);
    const h = confettiCanvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0,0,w,h);
    for (let p of confettiPieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // gravity
        p.angle += p.va;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
        if (p.y > h + 40) {
            // reset to top
            p.x = Math.random() * w;
            p.y = -20 - Math.random() * 200;
            p.vx = -1 + Math.random() * 2;
            p.vy = 1 + Math.random() * 3;
        }
    }
}

function confettiLoop() {
    drawConfetti();
    confettiAnimId = requestAnimationFrame(confettiLoop);
}

function startConfetti() {
    if (confettiCanvas) return; // already running
    createConfettiCanvas();
    confettiAnimId = requestAnimationFrame(confettiLoop);
}

function stopConfetti() {
    if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
    }
    if (confettiCanvas) {
        window.removeEventListener('resize', resizeConfettiCanvas);
        confettiCanvas.remove();
        confettiCanvas = null;
        confettiCtx = null;
        confettiPieces = [];
    }
}


/* Settings Button */
document.getElementById("settings").addEventListener("click", function() {
    // Toggle settings menu
    const existing = document.getElementById('settingsMenu');
    if (existing) {
        existing.remove();
        return;
    }
    createSettingsMenu();
});

// Load saved settings from localStorage (if any)
function loadSettings() {
    try {
        const raw = localStorage.getItem('pomodoroSettings');
        if (raw) {
            const s = JSON.parse(raw);
            workDuration = Number.isFinite(+s.work) ? +s.work : workDuration;
            shortBreakDuration = Number.isFinite(+s.short) ? +s.short : shortBreakDuration;
            longBreakDuration = Number.isFinite(+s.long) ? +s.long : longBreakDuration;
            longBreakInterval = Number.isFinite(+s.interval) ? +s.interval : longBreakInterval;
        }
    } catch (e) {
        console.warn('Failed to load settings', e);
    }
}

// Save settings object {work, short, long, interval}
function saveSettings(settings) {
    try {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save settings', e);
    }
}

function createSettingsMenu() {
    loadSettings();
        const html = `
        <div id="settingsMenu">
            <form id="settingsForm" class="settings-form" aria-label="Timer Settings">
                <h3>Timer Settings</h3>
                <div class="setting-row"><span class="label-text">Work minutes:</span><input id="setWork" type="number" min="1" value="${workDuration}"></div>
                <div class="setting-row"><span class="label-text">Short break minutes:</span><input id="setShort" type="number" min="1" value="${shortBreakDuration}"></div>
                <div class="setting-row"><span class="label-text">Long break minutes:</span><input id="setLong" type="number" min="1" value="${longBreakDuration}"></div>
                <div class="setting-row"><span class="label-text">Long break every N sessions:</span><input id="setInterval" type="number" min="1" value="${longBreakInterval}"></div>
                <div class="settings-actions">
                    <button type="button" id="settingsSave" class="btns">Save</button>
                    <button type="button" id="settingsCancel" class="btns">Cancel</button>
                </div>
            </form>
        </div>`;
    document.getElementById('div1').insertAdjacentHTML('afterend', html);

    const saveBtn = document.getElementById('settingsSave');
    const cancelBtn = document.getElementById('settingsCancel');

    saveBtn.addEventListener('click', function() {
        const w = parseInt(document.getElementById('setWork').value, 10) || workDuration;
        const s = parseInt(document.getElementById('setShort').value, 10) || shortBreakDuration;
        const l = parseInt(document.getElementById('setLong').value, 10) || longBreakDuration;
        const i = parseInt(document.getElementById('setInterval').value, 10) || longBreakInterval;

        workDuration = w;
        shortBreakDuration = s;
        longBreakDuration = l;
        longBreakInterval = i;

        // persist
        saveSettings({ work: workDuration, short: shortBreakDuration, long: longBreakDuration, interval: longBreakInterval });

        // Apply immediately for next resets / when break finishes
        if (!isBreak) {
            minutes = workDuration;
            seconds = 0;
        }
        updateDisplay();
        const menu = document.getElementById('settingsMenu');
        if (menu) menu.remove();
    });

    cancelBtn.addEventListener('click', function() {
        const menu = document.getElementById('settingsMenu');
        if (menu) menu.remove();
    });
}





/* Dark Light Mode removed - app is dark-only */
