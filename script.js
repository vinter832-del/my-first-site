const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_KEY = 'sb_publishable_bhx6sfmyZOYixc6RNARoeg_6SXEB_2b6ec26a42207908901a88dfb841a100ce643690c7eb1dfbb09206771d371d3a';

let currentUser = null;
let activeChatFriend = null;
let messageInterval = null;

const mainTitle = document.getElementById('main-title');
const mainMenu = document.getElementById('main-menu');
const boxProjects = document.getElementById('box-projects');
const boxAbout = document.getElementById('box-about');
const boxContacts = document.getElementById('box-contacts');
const boxMessenger = document.getElementById('box-messenger');
const messengerView = document.getElementById('messenger-view');

function showScreen(screen) {
    mainTitle.classList.add('hidden');
    mainMenu.classList.add('hidden');
    boxProjects.classList.add('hidden');
    boxAbout.classList.add('hidden');
    boxContacts.classList.add('hidden');
    boxMessenger.classList.add('hidden');
    screen.classList.remove('hidden');
}

if (mainTitle) mainTitle.addEventListener('click', () => showScreen(mainMenu));

document.querySelectorAll('.to-menu').forEach(btn => {
    btn.addEventListener('click', () => showScreen(mainMenu));
});

document.getElementById('messenger-back-btn').addEventListener('click', () => {
    if (messageInterval) clearInterval(messageInterval);
    showScreen(mainMenu);
});

document.getElementById('menu-projects').addEventListener('click', () => showScreen(boxProjects));
document.getElementById('menu-about').addEventListener('click', () => showScreen(boxAbout));
document.getElementById('menu-contacts').addEventListener('click', () => showScreen(boxContacts));
document.getElementById('menu-main').addEventListener('click', () => {
    showScreen(boxMessenger);
    renderMessenger();
});

// Прямые сетевые запросы к базе без использования внешних библиотек
async function dbFetch(endpoint, options = {}) {
    const url = SUPABASE_URL + endpoint;
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': currentUser ? 'Bearer ' + currentUser.access_token : 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    options.headers = Object.assign(headers, options.headers || {});
    const res = await fetch(url, options);
    if (!res.ok) { const txt = await res.text(); throw new Error(txt); }
    return res.status !== 204 ? await res.json() : null;
}
async function renderMessenger() {
    messengerView.innerHTML = '';
    if (!currentUser) {
        messengerView.innerHTML = '<div class="auth-form"><h3>Вход / Регистрация</h3><input type="email" id="auth-email" placeholder="Email"><input type="password" id="auth-password" placeholder="Пароль"><input type="text" id="auth-username" placeholder="Никнейм"><button id="btn-login">Войти</button><button id="btn-register" style="background:#222; color:#fff;">Создать аккаунт</button></div>';
        document.getElementById('btn-login').addEventListener('click', login);
        document.getElementById('btn-register').addEventListener('click', register);
    } else {
        const profile = await dbFetch('/rest/v1/profiles?id=eq.' + currentUser.user.id + '&select=*').then(d => d[0]);
        messengerView.innerHTML = '<div class="my-id-tag">Вы: <b>' + (profile?.username || 'Юзер') + '</b> | ID: <b>' + (profile?.custom_id || '...') + '</b></div><div class="chat-layout" id="chat-layout-view"><div>Добавить друга по ID:</div><div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="friend-id-input" placeholder="winter_xxxx"><button id="btn-add-friend">+</button></div><div>Друзья и заявки:</div><div class="friends-list" id="friends-list-container">Загрузка...</div></div>';
        document.getElementById('btn-add-friend').addEventListener('click', sendFriendRequest);
        loadFriendsList();
    }
}

async function register() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;
    if(!email || !password || !username) return alert('Заполни поля!');

    try {
        const url = SUPABASE_URL + '/auth/v1/signup';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) return alert(data.error.message);
        
        currentUser = data;
        const customId = 'winter_' + Math.floor(1000 + Math.random() * 9000);
        await dbFetch('/rest/v1/profiles', {
            method: 'POST',
            body: JSON.stringify({ id: data.user.id, username: username, custom_id: customId })
        });
        alert('Успех! Твой ID: ' + customId);
        renderMessenger();
    } catch(e) { alert(e.message); }
}

async function login() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    try {
        const url = SUPABASE_URL + '/auth/v1/token?grant_type=password';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) return alert(data.error.message);
        currentUser = data;
        renderMessenger();
    } catch(e) { alert(e.message); }
}

async function sendFriendRequest() {
    const targetCustomId = document.getElementById('friend-id-input').value.trim();
    if(!targetCustomId) return;

    const targetProfile = await dbFetch('/rest/v1/profiles?custom_id=eq.' + targetCustomId + '&select=id').then(d => d[0]);
    if(!targetProfile) return alert('ID не найден!');
    if(targetProfile.id === currentUser.user.id) return alert('Это твой ID!');

    await dbFetch('/rest/v1/friendships', {
        method: 'POST',
        body: JSON.stringify({ user_id: currentUser.user.id, friend_id: targetProfile.id, status: 'pending' })
    });
    alert('Заявка отправлена!');
    loadFriendsList();
}

async function loadFriendsList() {
    const containerList = document.getElementById('friends-list-container');
    if(!containerList) return;

    try {
        const outReq = await dbFetch('/rest/v1/friendships?user_id=eq.' + currentUser.user.id + '&select=*,profiles:friend_id(username,id)');
        const inReq = await dbFetch('/rest/v1/friendships?friend_id=eq.' + currentUser.user.id + '&select=*,profiles:user_id(username,id)');
        containerList.innerHTML = '';
        let hasItems = false;

        inReq?.forEach(req => {
            if (req.profiles) {
                hasItems = true;
                const item = document.createElement('div');
                item.className = 'friend-item';
                if(req.status === 'pending') {
                    item.innerHTML = '<span>Заявка от: <b>' + req.profiles.username + '</b></span> <button id="acc-' + req.id + '">Принять</button>';
                    containerList.appendChild(item);
                    document.getElementById('acc-' + req.id).addEventListener('click', async () => {
                        await dbFetch('/rest/v1/friendships?id=eq.' + req.id, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) });
                        loadFriendsList();
                    });
                } else {
                    item.innerHTML = '<span>👤 <b>' + req.profiles.username + '</b></span> <span>Чат →</span>';
                    item.addEventListener('click', () => openChatWindow(req.profiles));
                    containerList.appendChild(item);
                }
            }
        });

        outReq?.forEach(req => {
            if (req.profiles) {
                hasItems = true;
                const item = document.createElement('div');
                item.className = 'friend-item';
                if(req.status === 'pending') {
                    item.innerHTML = '<span>Вы отправили: <b>' + req.profiles.username + '</b></span> <span>Ждем...</span>';
                    containerList.appendChild(item);
                } else {
                    item.innerHTML = '<span>👤 <b>' + req.profiles.username + '</b></span> <span>Чат →</span>';
                    item.addEventListener('click', () => openChatWindow(req.profiles));
                    containerList.appendChild(item);
                }
            }
        });
        if(!hasItems) containerList.innerHTML = '<div>Список пуст</div>';
    } catch(e) { containerList.innerHTML = '<div>Ошибка загрузки</div>'; }
}

function openChatWindow(friendProfile) {
    activeChatFriend = friendProfile;
    const layout = document.getElementById('chat-layout-view');
    layout.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Чат: ' + friendProfile.username + '</span><span id="close-chat-btn" style="cursor:pointer;">❌ Выйти</span></div><div class="chat-messages" id="chat-messages-box">Загрузка...</div><div class="chat-input-area"><input type="text" id="chat-msg-input" placeholder="Сообщение..."><button id="btn-send-msg">-></button></div>';

    document.getElementById('close-chat-btn').addEventListener('click', () => {
        if(messageInterval) clearInterval(messageInterval);
        renderMessenger();
    });
    document.getElementById('btn-send-msg').addEventListener('click', sendMessage);
    document.getElementById('chat-msg-input').addEventListener('keydown', (e) => { if(e.key === 'Enter') sendMessage(); });

    loadMessages();
    messageInterval = setInterval(loadMessages, 2000); // Быстрое обновление чата каждые 2 секунды
}

async function loadMessages() {
    const box = document.getElementById('chat-messages-box');
    if(!box || !activeChatFriend) return;

    const msgs = await dbFetch('/rest/v1/messages?or=(and(sender_id.eq.' + currentUser.user.id + ',receiver_id.eq.' + activeChatFriend.id + '),and(sender_id.eq.' + activeChatFriend.id + ',receiver_id.eq.' + currentUser.user.id + '))&order=created_at.asc');
    box.innerHTML = '';
    msgs?.forEach(msg => {
        const mDiv = document.createElement('div');
        mDiv.className = 'msg ' + (msg.sender_id === currentUser.user.id ? 'sent' : 'received');
        mDiv.textContent = msg.text;
        box.appendChild(mDiv);
    });
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input ? input.value.trim() : '';
    if(!text) return;
    input.value = '';
    await dbFetch('/rest/v1/messages', {
        method: 'POST',
        body: JSON.stringify({ sender_id: currentUser.user.id, receiver_id: activeChatFriend.id, text: text })
    });
    loadMessages();
}
