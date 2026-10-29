// Сервердегі хабарламаларды алып, бетке шығару
const API = location.protocol === 'file:' ? 'http://localhost:8080/api/messages' : '/api/messages';
const info = document.getElementById('info');
const list = document.getElementById('list');

function safe(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

fetch(API)
  .then(r => r.json())
  .then(messages => {
    if (messages.length === 0) {
      info.textContent = 'Әзірге хабарлама жоқ.';
      return;
    }
    info.textContent = 'Барлығы: ' + messages.length + ' хабарлама';
    messages.reverse().forEach(m => {
      list.innerHTML +=
        '<div class="msg"><div class="head"><b>' + safe(m.name) + '</b><span>' +
        safe(m.email) + ' · ' + safe(m.time) + '</span></div><p>' + safe(m.message) + '</p></div>';
    });
  })
  .catch(() => {
    info.textContent = 'Java серверіне қосылмады. README.md бойынша серверді іске қосыңыз.';
  });
