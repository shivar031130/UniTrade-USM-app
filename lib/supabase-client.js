// lib/supabase-client.js
const SUPABASE_URL = 'https://dkpnhswjjmjligemxoet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrcG5oc3dqam1qbGlnZW14b2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNTg4MjksImV4cCI6MjA4MTczNDgyOX0.aGk9fC0-u_ClnxfOVh_BH4_Xj-cF7i0_XVydYV_T-RM';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1. THEME MANAGEMENT ---
function applyTheme() {
    const theme = localStorage.getItem('ut_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.innerText = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
    const current = localStorage.getItem('ut_theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('ut_theme', current);
    applyTheme();
}

// --- 2. SESSION TIMEOUT (15 Minutes) ---
let timeout;
function resetTimer() {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
        const { data } = await _supabase.auth.getSession();
        if (data.session) {
            await _supabase.auth.signOut();
            alert("Session expired due to inactivity.");
            window.location.href = 'index.html';
        }
    }, 15 * 60 * 1000); 
}

// Global Activity Listeners
['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(e => 
    document.addEventListener(e, resetTimer)
);

// --- 3. SESSION CHECK ---
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) return null;
    const { data: profile } = await _supabase.from('profiles').select('*').eq('id', session.user.id).single();
    return { session, profile };
}

document.addEventListener('DOMContentLoaded', applyTheme);