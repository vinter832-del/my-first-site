const container = document.getElementById('content');
let currentUser = null;
let activeChatFriend = null;

const mainTitle = document.getElementById('main-title');
const mainMenu = document.getElementById('main-menu');
const boxProjects = document.getElementById('box-projects');
const boxAbout = document.getElementById('box-about');
const boxContacts = document.getElementById('box-contacts');
const boxMessenger = document.getElementById('box-messenger');
const messengerView = document.getElementById('messenger-view');

function showScreen(screen) {
    if(!mainTitle || !mainMenu || !boxProjects || !boxAbout || !boxContacts || !boxMessenger) return;
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

const backBtn = document.getElementById('messenger-back-btn');
if (backBtn) {
    backBtn.addEventListener('click', () => showScreen(mainMenu));
}

if (document.getElementById('menu-projects')) document.getElementById('menu-projects').addEventListener('click', () => showScreen(boxProjects));
if (document.getElementById('menu-about')) document.getElementById('menu-about').addEventListener('click', () => showScreen(boxAbout));
if (document.getElementById('menu-contacts')) document.getElementById('menu-contacts').addEventListener('click', () => showScreen(boxContacts));
if (document.getElementById('menu-main')) {
    document.getElementById('menu-main').addEventListener('click', () => {
        showScreen(boxMessenger);
        renderMessenger();
    });
}

function getStorage(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setStorage(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function renderMessenger() {
    if (!messengerView) return;
    messengerView.innerHTML = '';
    
    if (!currentUser) {
        messengerView.innerHTML = '<div class="auth-form"><h3>Вход / Регистрация</h3><input type="email" id="auth-email" placeholder="Email"><input type="password" id="auth-password" placeholder="Пароль"><input type="text" id="auth-username" placeholder="Никнейм"><button id="btn-login">Войти</button><button id="btn-register" style="background:#222; color:#fff;">Создать аккаунт</button></div>';
        document.getElementById('btn-login').addEventListener('click', login);
        document.getElementById('btn-register').addEventListener('click', register);
    } else {
        messengerView.innerHTML = '<div class="my-id-tag">Вы: <b>' + currentUser.username + '</b> | ID: <b>' + currentUser.custom_id + '</b></div><div class="chat-layout" id="chat-layout-view"><div>Добавить друга по ID:</div><div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="friend-id-input" placeholder="winter_xxxx"><button id="btn-add-friend">+</button></div><div>Друзья и заявки:</div><div class="friends-list" id="friends-list-container">Загрузка...</div></div>';
        document.getElementById('btn-add-friend').addEventListener('click', sendFriendRequest);
        loadFriendsList();
    }
}

function register() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value;
    if(!email || !password || !username) return alert('Заполни поля!');

    const users = getStorage('w_users');
    if (users.find(u => u.email === email)) return alert('Такой email уже есть!');

    const customId = 'winter_' + Math.floor(1000 + Math.random() * 9000);
    const newUser = { id: 'u_' + Date.now(), email, password, username, custom_id: customId };
    users.push(newUser);
    setStorage('w_users', users);

    currentUser = newUser;
    alert('Успех! Твой ID: ' + customId);
    renderMessenger();
}

function login() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const users = getStorage('w_users');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return alert('Неверный логин или пароль!');
    currentUser = user;
    renderMessenger();
}

function sendFriendRequest() {
    const targetCustomId = document.getElementById('friend-id-input').value.trim();
    if(!targetCustomId) return;

    const users = getStorage('w_users');
    const targetUser = users.find(u => u.custom_id === targetCustomId);
    if(!targetUser) return alert('ID не найден!');
    if(targetUser.id === currentUser.id) return alert('Это твой ID!');

    const friendships = getStorage('w_friendships');
    if (friendships.find(f => (f.user_id === currentUser.id && f.friend_id === targetUser.id))) return alert('Заявка уже отправлена!');

    friendships.push({ id: 'f_' + Date.now(), user_id: currentUser.id, friend_id: targetUser.id, status: 'accepted' });
    setStorage('w_friendships', friendships);
    alert('Друг успешно добавлен!');
    loadFriendsList();
}

function loadFriendsList() {
    const containerList = document.getElementById('friends-list-container');
    if(!containerList) return;
    containerList.innerHTML = '';

    const friendships = getStorage('w_friendships');
    const users = getStorage('w_users');
    let hasItems = false;

    friendships.forEach(f => {
        if (f.user_id === currentUser.id || f.friend_id === currentUser.id) {
            const friendId = f.user_id === currentUser.id ? f.friend_id : f.user_id;
            const friend = users.find(u => u.id === friendId);
            if (friend) {
                hasItems = true;
                const item = document.createElement('div');
                item.className = 'friend-item';
                item.innerHTML = '<span>👤 <b>' + friend.username + '</b></span> <span>Чат →</span>';
                item.addEventListener('click', () => openChatWindow(friend));
                containerList.appendChild(item);
            }
        }
    });
    if(!hasItems) containerList.innerHTML = '<div>Список пуст</div>';
}

function openChatWindow(friendProfile) {
    activeChatFriend = friendProfile;
    const layout = document.getElementById('chat-layout-view');
    layout.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Чат: ' + friendProfile.username + '</span><span id="close-chat-btn" style="cursor:pointer;">❌ Выйти</span></div><div class="chat-messages" id="chat-messages-box">Загрузка...</div><div class="chat-input-area"><input type="text" id="chat-msg-input" placeholder="Сообщение..."><button id="btn-send-msg">-></button></div>';

    document.getElementById('close-chat-btn').addEventListener('click', () => renderMessenger());
    document.getElementById('btn-send-msg').addEventListener('click', sendMessage);
    document.getElementById('chat-msg-input').addEventListener('keydown', (e) => { if(e.key === 'Enter') sendMessage(); });
    loadMessages();
}

function loadMessages() {
    const box = document.getElementById('chat-messages-box');
    if(!box || !activeChatFriend) return;

    const messages = getStorage('w_messages');
    box.innerHTML = '';
    messages.forEach(msg => {
        if ((msg.sender_id === currentUser.id && msg.receiver_id === activeChatFriend.id) || 
            (msg.sender_id === activeChatFriend.id && msg.receiver_id === currentUser.id)) {
            const mDiv = document.createElement('div');
            mDiv.className = 'msg ' + (msg.sender_id === currentUser.id ? 'sent' : 'received');
            mDiv.textContent = msg.text;
            box.appendChild(mDiv);
        }
    });
    box.scrollTop = box.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input ? input.value.trim() : '';
    if(!text) return;
    input.value = '';

    const messages = getStorage('w_messages');
    messages.push({ sender_id: currentUser.id, receiver_id: activeChatFriend.id, text: text });
    setStorage('w_messages', messages);
    loadMessages();
}
