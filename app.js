import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

let currentUser = null

// LOGIN
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const phone = document.getElementById('phone').value
  const username = document.getElementById('username').value
  
  const { data, error } = await supabase.auth.signUp({
    phone: phone,
    password: phone, // Simple for MVP. Use OTP in prod
    options: { data: { username: username } }
  })
  
  if (!error) location.reload()
  else alert(error.message)
})

// CHECK AUTH
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    currentUser = session.user
    document.getElementById('auth-section').classList.add('hidden')
    document.getElementById('app-section').classList.remove('hidden')
    loadChatList()
  }
})

// LOAD CHAT LIST
async function loadChatList() {
  const { data: chats } = await supabase
    .from('chat_members')
    .select(`chat_id, chats(id, is_group, group_name)`)
    .eq('user_id', currentUser.id)
  
  const chatList = document.getElementById('chat-list')
  chatList.innerHTML = ''
  
  for (let item of chats || []) {
    const chat = item.chats
    const { data: lastMsg } = await supabase
      .from('messages')
      .select('text, created_at')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    chatList.innerHTML += `
      <div onclick="location.href='chat.html?id=${chat.id}'" class="bg-white p-4 border-b flex">
        <div class="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
        <div class="flex-1">
          <div class="font-bold">${chat.group_name || 'Chat'}</div>
          <div class="text-sm text-gray-500 truncate">${lastMsg?.text || 'No messages'}</div>
        </div>
      </div>`
  }
}

// NEW CHAT - simplified: creates chat with first user found
document.getElementById('new-chat-btn')?.addEventListener('click', async () => {
  const phone = prompt('Enter phone number to chat:')
  const { data: user } = await supabase.from('profiles').select('id').eq('phone', phone).single()
  if (!user) return alert('User not found')
  
  const { data: chat } = await supabase.from('chats').insert({}).select().single()
  await supabase.from('chat_members').insert([
    { chat_id: chat.id, user_id: currentUser.id },
    { chat_id: chat.id, user_id: user.id }
  ])
  location.href = `chat.html?id=${chat.id}`
})

// LOAD CHAT + REALTIME
export async function loadChat(chatId) {
  const msgContainer = document.getElementById('messages')
  
  // Load old messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`*, profiles(username)`)
    .eq('chat_id', chatId)
    .order('created_at')
  
  messages?.forEach(m => addMessage(m))
  
  // Listen for new messages = WhatsApp realtime
  supabase
    .channel('chat-' + chatId)
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, 
      payload => addMessage(payload.new)
    )
    .subscribe()
  
  // Send message
  document.getElementById('send-btn').onclick = async () => {
    const text = document.getElementById('msg-input').value
    if (!text) return
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: currentUser.id,
      text: text
    })
    document.getElementById('msg-input').value = ''
  }
}

function addMessage(msg) {
  const isMe = msg.sender_id === currentUser?.id
  document.getElementById('messages').innerHTML += `
    <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
      <div class="${isMe ? 'bg-green-200' : 'bg-white'} rounded-lg px-3 py-2 max-w-xs">
        ${msg.text}
      </div>
    </div>`
  document.getElementById('messages').scrollTop = 999999
}
