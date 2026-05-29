const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_KEY = 'sb_publishable_bhx6sfmyZOYixc6RNARoeg_6SXEB_2b6ec26a42207908901a88dfb841a100ce643690c7eb1dfbb09206771d371d3a';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let activeChatFriend = null;
let messageSubscription = null;

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

if (mainTitle) {
    mainTitle.addEventListener('click', () => showScreen(mainMenu));
}

document.querySelectorAll('.to-menu').forEach(btn => {
    btn.addEventListener('click', () => showScreen(mainMenu));
});

const backBtn = document.getElementById('messenger-back-btn');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        if (messageSubscription) supabase.removeChannel(messageSubscription);
        showScreen(mainMenu);
    });
}

const mProj = document.getElementById('menu-projects');
if (mProj) mProj.addEventListener('click', () => showScreen(boxProjects));

const mAb = document.getElementById('menu-about');
if (mAb) mAb.addEventListener('click', () => showScreen(boxAbout));

const mCont = document.getElementById('menu-contacts');
if (mCont) mCont.addEventListener('click', () => showScreen(boxContacts));

const mMain = document.getElementById('menu-main');
if (mMain) {
    mMain.addEventListener('click', () => {
        showScreen(boxMessenger);
        renderMessenger();
    });
}
async function renderMessenger() {
    if (!messengerView) return;
    messengerView.innerHTML = '';
    
    let session = null;
    try {
        const res = await supabase.auth.getSession();
        session = res.data.session;
    } catch (e) {
        console.error(e);
    }
    
    currentUser = session ? session.user : null;

    if (!currentUser) {
        messengerView.innerHTML = '<div class="auth-form"><h3>Вход / Регистрация</h3><input type="email" id="auth-email" placeholder="Email"><input type="password" id="auth-password" placeholder="Пароль"><input type="text" id="auth-username" placeholder="Никнейм"><button id="btn-login">Войти</button><button id="btn-register" style="background:#222; color:#fff;">Создать аккаунт</button></div>';
        
        const loginBtn = document.getElementById('btn-login');
        const regBtn = document.getElementById('btn-register');
        if (loginBtn) loginBtn.addEventListener('click', login);
        if (regBtn) regBtn.addEventListener('click', register);
    } else {
        let profile = null;
        try {
            const res = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
            profile = res.data;
        } catch (e) {
            console.error(e);
        }
        
        messengerView.innerHTML = '<div class="my-id-tag">Вы: <b>' + (profile?.username || 'Юзер') + '</b> | ID: <b>' + (profile?.custom_id || '...') + '</b></div><div class="chat-layout" id="chat-layout-view"><div>Добавить друга по ID:</div><div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="friend-id-input" placeholder="winter_xxxx"><button id="btn-add-friend">+</button></div><div>Друзья и заявки:</div><div class="friends-list" id="friends-list-container">Загрузка...</div></div>';
        
        const addFriendBtn = document.getElementById('btn-add-friend');
        if (addFriendBtn) addFriendBtn.addEventListener('click', sendFriendRequest);
        loadFriendsList();
    }
}

async function register() {
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const userInput = document.getElementById('auth-username');
    
    const email = emailInput ? emailInput.value : '';
    const password = passInput ? passInput.value : '';
    const username = userInput ? userInput.value : '';
    
    if(!email || !password || !username) return alert('Заполни поля!');

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);

    if(data.user) {
        const customId = 'winter_' + Math.floor(1000 + Math.random() * 9000);
        await supabase.from('profiles').insert({ id: data.user.id, username: username, custom_id: customId });
        alert('Успех! Твой ID: ' + customId);
        renderMessenger();
    }
}

async function login() {
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    
    const email = emailInput ? emailInput.value : '';
    const password = passInput ? passInput.value : '';
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    renderMessenger();
}

async function sendFriendRequest() {
    const input = document.getElementById('friend-id-input');
    const targetCustomId = input ? input.value.trim() : '';
    if(!targetCustomId) return;

    const { data: targetProfile } = await supabase.from('profiles').select('id').eq('custom_id', targetCustomId).maybeSingle();
    if(!targetProfile) return alert('ID не найден!');
    if(targetProfile.id === currentUser.id) return alert('Это твой ID!');

    await supabase.from('friendships').insert({ user_id: currentUser.id, friend_id: targetProfile.id, status: 'pending' });
    alert('Заявка отправлена!');
    loadFriendsList();
}

async function loadFriendsList() {
    const containerList = document.getElementById('friends-list-container');
    if(!containerList) return;

    const { data: outReq } = await supabase.from('friendships').select('*, profiles:friend_id(username, id)').eq('user_id', currentUser.id);
    const { data: inReq } = await supabase.from('friendships').select('*, profiles:user_id(username, id)').eq('friend_id', currentUser.id);

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
                const accBtn = document.getElementById('acc-' + req.id);
                if (accBtn) {
                    accBtn.addEventListener('click', async () => {
                        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', req.id);
                        loadFriendsList();
                    });
                }
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
}

function openChatWindow(friendProfile) {
    activeChatFriend = friendProfile;
    const layout = document.getElementById('chat-layout-view');
    if (!layout) return;
    
    layout.innerHTML = '<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>Чат: ' + friendProfile.username + '</span><span id="close-chat-btn" style="cursor:pointer;">❌ Выйти</span></div><div class="chat-messages" id="chat-messages-box">Загрузка...</div><div class="chat-input-area"><input type="text" id="chat-msg-input" placeholder="Сообщение..."><button id="btn-send-msg">-></button></div>';

    const closeChat = document.getElementById('close-chat-btn');
    if (closeChat) {
        closeChat.addEventListener('click', () => {
            if(messageSubscription) supabase.removeChannel(messageSubscription);
            renderMessenger();
        });
    }
    
    const sendMsgBtn = document.getElementById('btn-send-msg');
    if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendMessage);
    
    const msgInput = document.getElementById('chat-msg-input');
    if (msgInput) {
        msgInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendMessage(); });
    }

    loadMessages();
    messageSubscription = supabase.channel('schema-db-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadMessages())
    .subscribe();
}

async function loadMessages() {
    const box = document.getElementById('chat-messages-box');
    if(!box) return;

    const { data: msgs } = await supabase.from('messages').select('*')
        .or('and(sender_id.eq.' + currentUser.id + ',receiver_id.eq.' + activeChatFriend.id + '),and(sender_id.eq.' + activeChatFriend.id + ',receiver_id.eq.' + currentUser.id + ')')
        .order('created_at', { ascending: true });

    box.innerHTML = '';
    msgs?.forEach(msg => {
        const mDiv = document.createElement('div');
        mDiv.className = 'msg ' + (msg.sender_id === currentUser.id ? 'sent' : 'received');
        mDiv.textContent = msg.text;
        box.appendChild(mDiv);
    });
    box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input ? input.value.trim() : '';
    if(!text) return;
    if (input) input.value = '';
    await supabase.from('messages').insert({ sender_id: currentUser.id, receiver_id: activeChatFriend.id, text: text });
}
