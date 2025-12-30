let current = null;

search.oninput = async () => {
  const r = await fetch("/search?q=" + search.value);
  const u = await r.json();
  users.innerHTML = "";
  u.forEach(x => {
    const d = document.createElement("div");
    d.innerText = x.username;
    d.onclick = () => { current = x.username; load(); };
    users.appendChild(d);
  });
};

async function load() {
  const r = await fetch("/messages?withUser=" + current);
  const m = await r.json();
  chat.innerHTML = "";
  m.forEach(x => {
    chat.innerHTML += `<div><b>${x.from_user}:</b> ${x.text}</div>`;
  });
}

async function send() {
  await fetch("/send", {
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({to:current,text:msg.value})
  });
  msg.value="";
  load();
}

setInterval(()=>current && load(),2000);
