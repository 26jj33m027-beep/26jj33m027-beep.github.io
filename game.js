(() => {
'use strict';
const $ = id => document.getElementById(id);
const songs = [
 {id:'pulse',title:'Pulse Runner',artist:'NEON BEAT ORIGINAL',bpm:120,length:34,color:'#42e8ee',seed:1},
 {id:'afterglow',title:'Afterglow Circuit',artist:'NEON BEAT ORIGINAL',bpm:142,length:38,color:'#ff4fa3',seed:2},
 {id:'zero',title:'Zero Gravity',artist:'NEON BEAT ORIGINAL',bpm:105,length:42,color:'#a78bfa',seed:3}
];
const defaultKeys = ['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];
let keys = JSON.parse(localStorage.getItem('neonKeys') || 'null') || [...defaultKeys];
let selectedSong = songs[0], selectedDifficulty='normal', selectedSkin='classic';
let chartDraft=[], game=null, audioCtx=null, soundOn=true, effectsOn=true, selectedSongIndex=0;
const laneNames=['LEFT','DOWN','UP','RIGHT'], laneSymbols=['←','↓','↑','→'];
function showScreen(name){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(name+'Screen').classList.add('active');}
function renderSongs(){
 $('songList').innerHTML='';
 songs.forEach((s,i)=>{const b=document.createElement('button');b.className='song-card'+(i===selectedSongIndex?' selected':'');b.innerHTML='<span class="song-no">TRACK 0'+(i+1)+' / '+s.bpm+' BPM</span><strong>'+s.title+'</strong><small>'+s.artist+'</small>';b.addEventListener('click',()=>{selectedSongIndex=i;selectedSong=s;renderSongs();updateBest();});$('songList').appendChild(b);});
}
function recordKey(){return 'neonBest_'+selectedSong.id+'_'+selectedDifficulty;}
function updateBest(){$('bestRecord').textContent='BEST SCORE  '+(localStorage.getItem(recordKey())||'—');}
function renderKeySettings(){
 $('keySettings').innerHTML='';
 keys.forEach((k,i)=>{const row=document.createElement('div');row.className='key-row';const name=document.createElement('span');name.textContent=laneNames[i];const btn=document.createElement('button');btn.textContent=prettyKey(k);btn.addEventListener('click',()=>{btn.textContent='입력 대기…';const handler=e=>{e.preventDefault();keys[i]=e.code;localStorage.setItem('neonKeys',JSON.stringify(keys));window.removeEventListener('keydown',handler,true);renderKeySettings();};window.addEventListener('keydown',handler,true);});row.append(name,btn);$('keySettings').appendChild(row);});
}
function prettyKey(k){return ({ArrowLeft:'←',ArrowDown:'↓',ArrowUp:'↑',ArrowRight:'→',Space:'SPACE'})[k]||k.replace('Key','');}
function generateChart(song,diff){
 const spacing={easy:1,normal:.5,hard:.375,expert:.25}[diff];
 const notes=[];let beat=0,idx=0;
 while(beat*60/song.bpm<song.length-1){
  const time=beat*60/song.bpm+1.8;
  let lane=(Math.floor(beat*3+song.seed*7)+Math.floor(beat/4))%4;
  if(idx%7===4)lane=(lane+2)%4;
  notes.push({time,lane,hit:false,missed:false});
  if(diff==='hard'||diff==='expert'){if(idx%4===2)notes.push({time:time+spacing*.5,lane:(lane+1+idx%2)%4,hit:false,missed:false});}
  beat+=spacing/(60/song.bpm);idx++;
 }
 return notes.sort((a,b)=>a.time-b.time);
}
function ensureAudio(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(C)audioCtx=new C();}if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();}
function beep(freq=520,duration=.055,volume=.04){if(!soundOn)return;ensureAudio();if(!audioCtx)return;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}
function startGame(){
 selectedDifficulty=$('difficulty').value;selectedSkin=$('skin').value;
 const notes=generateChart(selectedSong,selectedDifficulty);
 game={notes,start:performance.now()+3200,paused:false,score:0,combo:0,maxCombo:0,judged:0,perfect:0,good:0,miss:0,fever:0,finished:false,lastBeat:-1};
 $('playingTitle').textContent=selectedSong.title;$('score').textContent='000000';$('combo').textContent='0';$('accuracy').textContent='100.0%';$('judgement').textContent='READY';$('feverFill').style.width='0%';$('resultOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');showScreen('game');$('countdown').classList.add('show');$('countdown').textContent='3';
 setTimeout(()=>{if(!game)return;$('countdown').textContent='2';},1000);setTimeout(()=>{if(!game)return;$('countdown').textContent='1';},2000);setTimeout(()=>{if(!game)return;$('countdown').classList.remove('show');},3000);
 requestAnimationFrame(loop);
}
function loop(now){
 if(!game||game.finished||game.paused)return;
 const t=(now-game.start)/1000;
 if(t<0){requestAnimationFrame(loop);return;}
 const beat=Math.floor(t*selectedSong.bpm/60);
 if(beat!==game.lastBeat&&beat>=0){game.lastBeat=beat;if(beat%2===0)beep(beat%4===0?440:330,.045,.018);}
 const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');drawStage(ctx,t);
 game.notes.forEach(n=>{if(!n.hit&&!n.missed&&t-n.time>.19){n.missed=true;registerJudgement('MISS');}});
 if(t>selectedSong.length+2){finishGame();return;}
 requestAnimationFrame(loop);
}
function drawStage(ctx,t){
 const w=960,h=640;ctx.clearRect(0,0,w,h);ctx.fillStyle='#10101a';ctx.fillRect(0,0,w,h);
 const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#1b1c2b');grad.addColorStop(1,'#101018');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 const left=230,laneW=125,top=0,bottom=575,hitY=500,travel=430,travelTime=2.1;
 ctx.fillStyle='#171724';ctx.fillRect(left,0,laneW*4,bottom);
 for(let i=0;i<4;i++){const x=left+i*laneW;ctx.fillStyle=i%2?'#ffffff06':'#ffffff0b';ctx.fillRect(x,0,laneW,bottom);ctx.strokeStyle='#ffffff18';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,bottom);ctx.stroke();}
 ctx.strokeStyle=selectedSong.color;ctx.lineWidth=3;ctx.shadowColor=selectedSong.color;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(left,hitY);ctx.lineTo(left+laneW*4,hitY);ctx.stroke();ctx.shadowBlur=0;
 for(let i=0;i<4;i++){const x=left+i*laneW+laneW/2;ctx.fillStyle='#222333';ctx.fillRect(x-37,hitY-37,74,74);ctx.strokeStyle=selectedSong.color+'99';ctx.lineWidth=2;ctx.strokeRect(x-37,hitY-37,74,74);ctx.fillStyle=selectedSong.color;ctx.font='bold 38px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(selectedSkin==='minimal'?'•':laneSymbols[i],x,hitY);}
 game.notes.forEach(n=>{if(n.hit||n.missed)return;const y=hitY-(n.time-t)*(travel/travelTime);if(y<-40||y>bottom+40)return;const x=left+n.lane*laneW+laneW/2;ctx.shadowColor=selectedSong.color;ctx.shadowBlur=12;ctx.fillStyle=selectedSong.color;ctx.beginPath();if(selectedSkin==='arrows'){ctx.moveTo(x,y-23);ctx.lineTo(x+23,y);ctx.lineTo(x,y+23);ctx.lineTo(x-23,y);ctx.closePath();}else{ctx.roundRect(x-24,y-24,48,48,selectedSkin==='minimal'?24:9);}ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#101018';ctx.font='bold 27px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(laneSymbols[n.lane],x,y+1);});
 ctx.textAlign='left';ctx.fillStyle='#ffffff55';ctx.font='bold 13px Arial';ctx.fillText('NEON BEAT // '+selectedDifficulty.toUpperCase(),28,34);
 ctx.fillStyle='#ffffffaa';ctx.font='12px Arial';ctx.fillText('TIME  '+Math.max(0,t).toFixed(1)+'s / '+selectedSong.length+'s',28,57);
 if(game.fever>=100){ctx.fillStyle='#ff4fa322';ctx.fillRect(left,0,laneW*4,bottom);ctx.fillStyle='#ffe16a';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.fillText('FEVER!',left+laneW*2,90);}
}
function registerJudgement(type){
 game.judged++;
 if(type==='PERFECT'){game.perfect++;game.combo++;game.score+=1000+Math.min(game.combo,100)*10;game.fever=Math.min(100,game.fever+7);beep(660,.06,.035);}
 else if(type==='GOOD'){game.good++;game.combo++;game.score+=500;game.fever=Math.min(100,game.fever+3);beep(500,.05,.025);}
 else{game.miss++;game.combo=0;game.fever=Math.max(0,game.fever-15);}
 game.maxCombo=Math.max(game.maxCombo,game.combo);
 $('score').textContent=String(game.score).padStart(6,'0');$('combo').textContent=game.combo;$('accuracy').textContent=(((game.perfect+game.good*.7)/Math.max(1,game.judged))*100).toFixed(1)+'%';$('judgement').textContent=type;$('judgement').style.color=type==='MISS'?'#ff4f75':type==='PERFECT'?'#42e8ee':'#ffe16a';$('feverFill').style.width=game.fever+'%';
}
function onLane(lane){
 if(!game||game.paused||game.finished)return;
 const t=(performance.now()-game.start)/1000;
 let candidate=null,best=Infinity;
 game.notes.forEach(n=>{if(!n.hit&&!n.missed&&n.lane===lane){const d=Math.abs(n.time-t);if(d<best){best=d;candidate=n;}}});
 if(candidate&&best<=.19){candidate.hit=true;registerJudgement(best<=.075?'PERFECT':'GOOD');}
 else{registerJudgement('MISS');}
}
function finishGame(){
 if(!game||game.finished)return;game.finished=true;
 const acc=((game.perfect+game.good*.7)/Math.max(1,game.judged))*100;
 const rank=acc>=97?'S':acc>=90?'A':acc>=80?'B':acc>=65?'C':'D';
 const old=Number(localStorage.getItem(recordKey())||0);if(game.score>old)localStorage.setItem(recordKey(),String(game.score));
 $('resultRank').textContent=rank+' RANK';$('resultScore').textContent=String(game.score).padStart(6,'0');$('resultAccuracy').textContent='정확도 '+acc.toFixed(1)+'% · 최대 콤보 '+game.maxCombo;$('resultOverlay').classList.remove('hidden');updateBest();
}
function pauseGame(){if(!game||game.finished||game.paused)return;game.elapsed=Math.max(0,(performance.now()-game.start)/1000);game.paused=true;$('pauseOverlay').classList.remove('hidden');}
function resumeGame(){if(!game)return;game.paused=false;$('pauseOverlay').classList.add('hidden');game.start=performance.now()-(game.elapsed||0)*1000;requestAnimationFrame(loop);}
function leaveGame(){game=null;showScreen('home');updateBest();}
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowDown','ArrowUp','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;const lane=keys.indexOf(e.code);if(lane!==-1){onLane(lane);return;}if(e.code==='Escape'&&game)pauseGame();});
$('playBtn').addEventListener('click',()=>{ensureAudio();startGame();});
$('backBtn').addEventListener('click',leaveGame);$('pauseBtn').addEventListener('click',pauseGame);$('resumeBtn').addEventListener('click',()=>{if(!game)return;game.paused=false;$('pauseOverlay').classList.add('hidden');game.start=performance.now()-game.elapsed*1000;requestAnimationFrame(loop);});
$('retryBtn').addEventListener('click',startGame);$('resultHomeBtn').addEventListener('click',leaveGame);
$('settingsBtn').addEventListener('click',()=>{renderKeySettings();showScreen('settings');});$('settingsBackBtn').addEventListener('click',()=>showScreen('home'));
$('resetKeysBtn').addEventListener('click',()=>{keys=[...defaultKeys];localStorage.setItem('neonKeys',JSON.stringify(keys));renderKeySettings();});
$('soundToggle').addEventListener('change',e=>soundOn=e.target.checked);$('effectsToggle').addEventListener('change',e=>effectsOn=e.target.checked);
$('editorBtn').addEventListener('click',()=>{renderDraft();showScreen('editor');});$('editorBackBtn').addEventListener('click',()=>showScreen('home'));
$('addNoteBtn').addEventListener('click',()=>{const time=Number($('chartTime').value),lane=Number($('chartLane').value);if(Number.isFinite(time)&&time>=0){chartDraft.push({time,lane});chartDraft.sort((a,b)=>a.time-b.time);renderDraft();}});
$('clearChartBtn').addEventListener('click',()=>{chartDraft=[];renderDraft();});
$('exportChartBtn').addEventListener('click',async()=>{const data=JSON.stringify({name:$('chartName').value,bpm:Number($('chartBpm').value),notes:chartDraft},null,2);try{await navigator.clipboard.writeText(data);$('exportChartBtn').textContent='복사 완료!';setTimeout(()=>$('exportChartBtn').textContent='JSON 복사',1300);}catch(e){$('chartOutput').textContent=data;}});
function renderDraft(){$('chartOutput').textContent=JSON.stringify({name:$('chartName').value,bpm:Number($('chartBpm').value),notes:chartDraft},null,2);}
$('difficulty').addEventListener('change',()=>{selectedDifficulty=$('difficulty').value;updateBest();});
$('skin').addEventListener('change',e=>selectedSkin=e.target.value);
renderSongs();renderKeySettings();updateBest();
})();