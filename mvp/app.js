const $ = (s) => document.querySelector(s);
const storeKey = "verve-v03";
const defaultState = { started:false, goal:null, sessions:0, observations:[], focus:null, material:null };
let state = JSON.parse(localStorage.getItem(storeKey) || "null") || structuredClone(defaultState);
let session = { kind:"diagnosis", turn:0, material:null, purpose:null, userReplies:[] };
let voiceReplies = true;
const prompts = [
  { title:"说说你最近在做的一件事。", detail:"可以是工作、学习，或者今天发生的小事。用你会的英语即可。", ask:"That sounds like a good place to start. What is the main thing you want someone else to understand?" },
  { title:"把重点再说清一点。", detail:"试着说：发生了什么、为什么重要、接下来要做什么。", ask:"Thanks. What would you like to happen next? You can use a short, simple sentence." },
  { title:"现在，给出一个建议。", detail:"不必完美。先给出建议，再说一个简单原因。", ask:"One last question: what would you suggest, and why?" }
];
function save(){localStorage.setItem(storeKey,JSON.stringify(state));window.verveCloud?.saveState?.(state);}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function show(id){["welcome","app","session","summary"].forEach(x=>$("#"+x).classList.toggle("hidden",x!==id));}
function render(){
  $("#date").textContent=new Intl.DateTimeFormat("zh-CN",{month:"long",day:"numeric",weekday:"long"}).format(new Date());
  $("#greeting").textContent=state.sessions?"继续把英语说清楚。":"你好，我们先从一次小表达开始。";
  $("#subheading").textContent=state.sessions?"今天不用选课程，先完成一个明确的小任务。":"你不需要知道自己的等级。先说几句就好。";
  $("#profile-grade").textContent=state.sessions?"↗":"·";
  const focus=state.focus||{title:"让对方听懂你的重点",text:"用 3 句话介绍你最近在做的一件事。卡住时可以随时请求提示。",tag:"自由表达"};
  $("#task-title").textContent=focus.title;$("#task-text").textContent=focus.text;$("#task-tag").textContent=focus.tag;
  $("#signal-list").innerHTML=state.observations.length?state.observations.map(x=>`<span>✓ ${esc(x)}</span>`).join(""):"<span>完成第一次对话后，这里会出现你的观察。</span>";
  show(state.started?"app":"welcome");
}
function speak(text){if(!voiceReplies||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang="en-US";utterance.rate=.9;window.speechSynthesis.speak(utterance);}
function bubble(type,text,label,options={}){$("#chat").insertAdjacentHTML("beforeend",`<div class="bubble ${type}"><label>${label}</label>${esc(text)}</div>`);$("#chat").scrollTop=$("#chat").scrollHeight;if(type==="coach"&&!options.remote)speak(text);}
function playAudio(base64){if(!base64||!voiceReplies)return;const audio=new Audio(`data:audio/mpeg;base64,${base64}`);audio.play().catch(()=>{});}
function begin(kind="diagnosis",material=null,purpose=null){
  session={kind,turn:0,material,purpose,userReplies:[]};show("session");$("#chat").innerHTML="";
  const isMaterial=!!material;$("#session-label").textContent=isMaterial?"素材训练":"第一次对话";$("#session-kicker").textContent=isMaterial?"围绕你的材料练习":"先随便说说";
  const current=isMaterial?{title:"先用自己的话说说这段内容。",detail:"不用逐字复述。先说你理解到的一个重点，AI 会帮助你把它说得更清楚。",ask:`I’ve read the material. In your own words, what is the main idea you want to use?`} : prompts[0];
  $("#session-title").textContent=current.title;$("#session-detail").textContent=current.detail;$("#turn-count").textContent="0 / 3";$("#progress-bar").style.width="3%";bubble("coach",current.ask,"AI 教练");$("#answer").focus();
}
function reply(){const input=$("#answer"), text=input.value.trim();if(!text)return;input.value="";session.userReplies.push(text);session.turn++;bubble("user",text,"你");$("#turn-count").textContent=`${session.turn} / 3`;$("#progress-bar").style.width=`${Math.min(100,session.turn*33)}%`;
  setTimeout(()=>{if(session.turn>=3){bubble("coach","Nice work. I have enough evidence to suggest one clear next step.","AI 教练");setTimeout(finish,450);return;}const next=session.kind==="diagnosis"?prompts[session.turn]:{title:"把它用在一个真实情境里。",detail:"试着用目标表达说明你的观点、原因或下一步。",ask:"Good. Now imagine someone asks you a follow-up question. How would you explain it more clearly?"};$("#session-title").textContent=next.title;$("#session-detail").textContent=next.detail;bubble("coach",next.ask,"AI 教练");},260);
}
function finish(){
  const all=session.userReplies.join(" ").toLowerCase();const isBasic=/\b(i|my|work|like|want)\b/.test(all);const focus=session.kind==="material"?{title:"把材料里的一个表达用在自己的句子中",text:"明天换一个相近话题，再用一次目标表达，而不是重复原文。",tag:"素材迁移"}:{title:isBasic?"把一句话说完整，再补一个原因":"先提出建议，再说明原因",text:isBasic?"明天练习：用一个完整句子说重点，再加 because 说明原因。":"明天练习：用 I’d suggest… because… 说出建议和理由。",tag:"渐进训练"};
  const observations=session.kind==="material"?["你能抓住材料的核心意思", "下一步是把目标表达放进自己的句子", "暂不堆叠发音与语法纠错"]:["你已经能表达核心意思", isBasic?"句子完整度比复杂词汇更值得先练":"建议表达需要更固定的结构", "发音暂未显示出影响理解的信号"];
  state.started=true;state.sessions++;state.observations=observations;state.focus=focus;save();$("#observation").innerHTML=observations.map((x,i)=>`<article class="obs"><b>${i+1}</b><div><strong>${i===0?"你已经做到了":i===1?"下一步最值得练":"暂时不必分心"}</strong><p>${esc(x)}</p></div></article>`).join("");$("#tomorrow-title").textContent=focus.title;$("#tomorrow-text").textContent=focus.text;show("summary");
}
function useHelp(kind){const tips={frame:"你可以从这里开始：I’d like to say that… / I think… because…",idea:"没关系，先用中文说你的意思。AI 会帮你拆成一句你现在能说的英文。",example:"例如：I’d suggest we review the plan, because the timeline is too tight."};bubble("coach",tips[kind],"AI 教练");}
function voiceContext(){return {kind:session.kind, purpose:session.purpose, material:session.material, turn:session.turn, replies:session.userReplies.slice(-3)};}
async function handleVoiceBlob(blob){
  const note=$("#voice-note");
  if(window.verveCloud?.configured){
    note.textContent="正在转写并生成语音回应…";$("#mic").disabled=true;
    try{
      const result=await window.verveCloud.voiceTurn(blob,voiceContext());
      const transcript=(result?.transcript||"").trim();
      const coachText=(result?.coach_text||"").trim();
      if(!transcript||!coachText)throw new Error("empty response");
      session.userReplies.push(transcript);session.turn++;
      bubble("user",transcript,"你");
      bubble("coach",coachText,"AI 教练",{remote:true});playAudio(result.audio_base64);
      if(result.feedback){bubble("coach",`小提示：${result.feedback}`,"发音与表达",{remote:true});}
      $("#turn-count").textContent=`${session.turn} / 3`;$("#progress-bar").style.width=`${Math.min(100,session.turn*33)}%`;
      if(session.turn>=3){setTimeout(finish,500);}
      else{$("#session-title").textContent="继续把重点说清楚。";$("#session-detail").textContent="可以用中文回答，AI 会先帮你变成自然、听得懂的英文。";}
      note.textContent="AI 会用英语语音回应；你也可以继续点击录音。";
    }catch(error){console.warn(error);note.textContent="云端语音暂时不可用，已切换到本地输入。请检查配置或直接输入文字。";}
    finally{$("#mic").disabled=false;}
    return;
  }
  note.textContent="当前是本地演示模式：浏览器会尝试转写，配置 Supabase 后可获得 AI 语音回应。";
}
$("#welcome-start").onclick=()=>begin();
document.addEventListener("click",e=>{const choice=e.target.closest("[data-goal]");if(choice){state.goal=choice.dataset.goal;document.querySelectorAll("[data-goal]").forEach(x=>x.classList.toggle("selected",x===choice));$("#welcome-start").classList.remove("disabled");}});
$("#start-today").onclick=()=>begin();$("#summary-home").onclick=()=>{render();};$("#leave-session").onclick=()=>{state.started=true;save();render();};$("#send").onclick=reply;$("#answer").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();reply();}};document.querySelectorAll("[data-help]").forEach(x=>x.onclick=()=>useHelp(x.dataset.help));
$("#open-material").onclick=()=>$("#material-modal").showModal();$("#open-scenario").onclick=()=>$("#scenario-modal").showModal();
$("#material-form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),material=f.get("material").trim();state.material=material;save();$("#material-modal").close();begin("material",material,f.get("purpose"));};
$("#scenario-form").onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget),material=f.get("scenario").trim();$("#scenario-modal").close();begin("material",material,"meeting");};
$("#reset").onclick=()=>{if(confirm("重置当前浏览器中的体验数据？")){state=structuredClone(defaultState);save();render();}};
$("#keyboard-toggle").onclick=()=>{const composer=$(".voice-composer"),open=!composer.classList.contains("keyboard-open");composer.classList.toggle("keyboard-open",open);$("#keyboard-toggle").setAttribute("aria-pressed",String(open));if(open)$("#answer").focus();};
let recorder=null;let recordingStream=null;let recordingChunks=[];
async function startRecording(){
  const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
  // Until Supabase is configured, use the browser recognizer so a local demo
  // still produces a message instead of recording an audio blob with nowhere to send it.
  if(!window.verveCloud?.configured&&Rec){
    const rec=new Rec();rec.lang=navigator.language?.toLowerCase().startsWith("zh")?"zh-CN":"en-US";rec.interimResults=false;rec.continuous=false;
    rec.onstart=()=>{$("#mic").classList.add("listening");$("#speak-label").textContent="正在听…";$("#voice-note").textContent="可以说中文或英文，说完会自动发送。";};
    rec.onend=()=>{$("#mic").classList.remove("listening");$("#speak-label").textContent="点击，说话";};
    rec.onresult=e=>{$("#answer").value=e.results[0][0].transcript;reply();};
    rec.onerror=()=>{$("#voice-note").textContent="没有收到语音；请检查麦克风权限，或直接输入。";};
    rec.start();return;
  }
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    if(Rec){const rec=new Rec();rec.lang=navigator.language?.toLowerCase().startsWith("zh")?"zh-CN":"en-US";rec.interimResults=false;rec.onresult=e=>{$("#answer").value=e.results[0][0].transcript;reply();};rec.onerror=()=>{$("#voice-note").textContent="没有收到语音；请检查麦克风权限，或直接输入。";};rec.start();return;}
    $("#voice-note").textContent="此浏览器不支持录音，请直接输入文字。";return;
  }
  recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});
  recordingChunks=[];recorder=new MediaRecorder(recordingStream,{mimeType:"audio/webm"});
  recorder.ondataavailable=e=>{if(e.data.size)recordingChunks.push(e.data);};
  recorder.onstop=()=>{const blob=new Blob(recordingChunks,{type:"audio/webm"});recordingStream?.getTracks().forEach(t=>t.stop());handleVoiceBlob(blob);};
  recorder.start();$("#mic").classList.add("listening");$("#speak-label").textContent="点击结束录音";$("#voice-note").textContent="正在录音…说完后再点击一次。";
}
function stopRecording(){if(recorder&&recorder.state!=="inactive"){recorder.stop();recorder=null;$("#mic").classList.remove("listening");$("#speak-label").textContent="点击，说话";}}
$("#mic").onclick=()=>recorder?stopRecording():startRecording().catch(()=>{$("#voice-note").textContent="麦克风权限未开启，请允许访问或直接输入文字。";});
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
