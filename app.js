import {
auth,
db,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged,
collection,
addDoc,
getDocs
} from "./firebase.js";

const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");

onAuthStateChanged(auth, (user)=>{
if(user){
authDiv.style.display="none";
appDiv.style.display="block";
loadTutorials();
}
});

window.register = async function(){
let email = document.getElementById("email").value;
let password = document.getElementById("password").value;

await createUserWithEmailAndPassword(auth, email, password);
}

window.login = async function(){
let email = document.getElementById("email").value;
let password = document.getElementById("password").value;

await signInWithEmailAndPassword(auth, email, password);
}

window.postTutorial = async function(){
let title = document.getElementById("title").value;
let content = document.getElementById("content").value;

await addDoc(collection(db, "tutorials"), {
title,
content,
time: Date.now()
});

loadTutorials();
}

async function loadTutorials(){
let container = document.getElementById("tutorials");
container.innerHTML = "";

let data = await getDocs(collection(db, "tutorials"));

data.forEach(doc=>{
let t = doc.data();

container.innerHTML += `
<div style="background:#222;padding:10px;margin:10px;">
<h3>${t.title}</h3>
<p>${t.content}</p>
</div>
`;
});
  }
