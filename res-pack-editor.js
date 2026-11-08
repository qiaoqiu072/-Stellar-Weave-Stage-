// Res-Pack Editor 多语言 · iOS兼容 · 图片下载+段落语音录音版 res-pack-editor.js
const ZIP = JSZip;

// ========== Cookie兼容工具 同主index逻辑 ==========
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
function setCookie(name,value,days=365){
  let d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  document.cookie = name + "=" + encodeURIComponent(value) + ";expires="+ d.toUTCString() + ";path=/";
}
function getCookie(name){
  let arr = document.cookie.split('; ');
  for(let i=0;i<arr.length;i++){
    let item = arr[i].split('=');
    if(item[0] === name) return decodeURIComponent(item[1]);
  }
  return null;
}
function safeSaveEditorLang(lang){
  try{
    if(isIOS){ setCookie("editor_ui_lang", lang); }
    else{ localStorage.setItem("editor_ui_lang", lang); }
  }catch(e){ console.warn("存储语言失败(无痕模式)",e); }
}
function safeGetEditorLang(){
  try{
    let val;
    if(isIOS){ val = getCookie("editor_ui_lang"); }
    else{ val = localStorage.getItem("editor_ui_lang"); }
    return val;
  }catch(e){ console.warn("读取语言失败",e); return null; }
}
// ==============================================

// =====录音全局状态====
let mediaRecorder = null;
let recordChunks = [];
let currentRecordVoiceIdx = null;

const editorLocale = {
  zh:{
    title:"自制资源包编辑器 Res-Pack Maker",
    langLabel:"语言：",
    langZh:"中文",
    langEn:"English",
    langJa:"日本語",
    btnAdd:"+ 添加条目",
    btnUpload:"上传",
    btnDraw:"手绘",
    btnDel:"删除",
    btnDownload:"下载",
    btnRecord:"录音",
    btnGenZip:"生成 ResPack.zip (下载)",
    panelChar:"🖼️立绘资源",
    panelFont:"🔤全局字体",
    panelVoice:"🔊段落语音",
    panelBgm:"🎵每幕BGM",
    panelBg:"🏞️幕背景图",
    panelDialogBg:"💬对话框自定义背景(强制16:5)",
    hintChar:"角色下拉读取剧本speaker；支持PNG/JPG，手绘导出JPG",
    hintFont:"仅支持OTF / TTF，全局只生效一个字体",
    hintVoice:"音频：MP3 / WAV / M4A；选择幕，再选择段落索引；支持麦克风录音",
    hintBgm:"音频：MP3 / WAV / M4A",
    hintBg:"PNG/JPG；手绘导出JPG，绑定对应幕",
    hintDialogBg:"必须16:5，用于覆盖storyBox",
    hintGenZip:"生成后zip下载，回到叙事台主页面点【加载资源包ZIP】选中文件即可使用。苹果设备请把文件保存到「在我的iPhone」文件夹。",
    drawPen:"水笔",
    drawBrush:"毛刷",
    drawHighlighter:"荧光笔",
    drawEraser:"橡皮",
    drawClear:"清空画布",
    drawUndo:"撤销",
    drawRedo:"重做",
    drawHue:"色相:",
    drawSat:"饱和度:",
    drawLum:"明度:",
    drawScale:"缩放:",
    drawOk:"确定导出JPG",
    drawCancel:"取消",
    selPlaceholderSpeaker:"-请选择角色-",
    selPlaceholderScene:"-选择幕-",
    selPlaceholderSeg:"-先选幕-",
    selPlaceholderSegItem:"-段落-",
    tipNoFile:"未选择文件",
    tipZipComplete:"\n❗请切换回叙事台标签页，手动点【加载资源包ZIP】，选中下载好的ResPack.zip。\n苹果设备请确认文件保存到「在我的iPhone」文件夹。",
    btnReloadScene:"重新加载目录剧本",
    tipFetchSceneOk:"剧本加载成功",
    tipFetchSceneFail:"自动读取目录剧本失败！\nfile://本地打开不支持，请部署HTTP服务。",
    tipResPackLangWarn:"⚠️重要提醒：\n当前编辑器语言：【{langName}】\n本资源包基于scenes_{langCode}.json生成。\n👉只能在叙事台切换到【{langName}】语言时正常工作！\n切换叙事台为其他语言，角色、语音、BGM映射会不匹配，资源失效。",
    tipRecNeedHttps:"录音需要HTTP/HTTPS服务，file://协议不可用",
    tipRecNoMic:"没有麦克风权限或浏览器不支持录音",
    tipRecRecording:"录音中…再次点击录音按钮停止结束"
  },
  en:{
    title:"Res-Pack Resource Editor",
    langLabel:"Language:",
    langZh:"中文",
    langEn:"English",
    langJa:"日本語",
    btnAdd:"+ Add item",
    btnUpload:"Upload",
    btnDraw:"Draw",
    btnDel:"Delete",
    btnDownload:"Download",
    btnRecord:"Record",
    btnGenZip:"Generate ResPack.zip (Download)",
    panelChar:"🖼️Character Sprite",
    panelFont:"🔤Global Font",
    panelVoice:"🔊Segment Voice",
    panelBgm:"🎵Scene BGM",
    panelBg:"🏞️Scene Background",
    panelDialogBg:"💬Dialog Box Background (16:5 required)",
    hintChar:"Select speaker from script; PNG/JPG supported, draw exports JPG",
    hintFont:"OTF / TTF only, single global font",
    hintVoice:"Audio: MP3 / WAV / M4A; select scene then segment index; microphone recording supported",
    hintBgm:"Audio: MP3 / WAV / M4A",
    hintBg:"PNG/JPG; draw exports JPG, bind to scene",
    hintDialogBg:"Must be 16:5, overrides storyBox background",
    hintGenZip:"Zip downloaded. Go back to main app and click Load Resource ZIP. For iOS save files to 'On My iPhone'.",
    drawPen:"Pen",
    drawBrush:"Brush",
    drawHighlighter:"Highlighter",
    drawEraser:"Eraser",
    drawClear:"Clear",
    drawUndo:"Undo",
    drawRedo:"Redo",
    drawHue:"Hue:",
    drawSat:"Saturation:",
    drawLum:"Lightness:",
    drawScale:"Scale:",
    drawOk:"Export JPG",
    drawCancel:"Cancel",
    selPlaceholderSpeaker:"-Select speaker-",
    selPlaceholderScene:"-Select scene-",
    selPlaceholderSeg:"-Select scene first-",
    selPlaceholderSegItem:"-Segment-",
    tipNoFile:"No file selected",
    tipZipComplete:"ResPack.zip downloaded!\nLoad this zip on main page.",
    btnReloadScene:"Reload scene json from folder",
    tipFetchSceneOk:"Scene json loaded",
    tipFetchSceneFail:"Failed auto-load scene json.\nfile:// not supported, use http server.",
    tipRecNeedHttps:"Recording requires HTTP/HTTPS, file:// not supported",
    tipRecNoMic:"No microphone permission or unsupported browser",
    tipRecRecording:"Recording… click record button again to stop"
  },
  ja:{
    title:"リソースパックエディタ Res-Pack",
    langLabel:"言語：",
    langZh:"中文",
    langEn:"English",
    langJa:"日本語",
    btnAdd:"+ 項目追加",
    btnUpload:"アップロード",
    btnDraw:"描画",
    btnDel:"削除",
    btnDownload:"ダウンロード",
    btnRecord:"録音",
    btnGenZip:"ResPack.zip生成 (ダウンロード)",
    panelChar:"🖼️キャラクター立ち絵",
    panelFont:"🔤グローバルフォント",
    panelVoice:"🔊セグメント音声",
    panelBgm:"🎵シーンBGM",
    panelBg:"🏞️シーン背景",
    panelDialogBg:"💬ダイアログ背景(16:5必須)",
    hintChar:"台詞キャラクター選択。PNG/JPG、描画はJPG出力",
    hintFont:"OTF / TTFのみ、グローバルフォントは1つ",
    hintVoice:"音声形式 MP3 / WAV / M4A；シーン選択後段落インデックス選択。マイク録音対応",
    hintBgm:"音声形式 MP3 / WAV / M4A",
    hintBg:"PNG/JPG。描画はJPG出力、シーンに紐付け",
    hintDialogBg:"16:5必須、storyBox背景上書き",
    hintGenZip:"ZIPをダウンロード後、本体ページのリソースZIP読込から選択。iOSは「このiPhone内」に保存してください。",
    drawPen:"ペン",
    drawBrush:"ブラシ",
    drawHighlighter:"蛍光ペン",
    drawEraser:"消しゴム",
    drawClear:"クリア",
    drawUndo:"取り消し",
    drawRedo:"やり直し",
    drawHue:"色相:",
    drawSat:"彩度:",
    drawLum:"明度:",
    drawScale:"拡大縮小:",
    drawOk:"JPG出力",
    drawCancel:"キャンセル",
    selPlaceholderSpeaker:"-キャラクター選択-",
    selPlaceholderScene:"-シーン選択-",
    selPlaceholderSeg:"-先にシーンを選択-",
    selPlaceholderSegItem:"-段落-",
    tipNoFile:"ファイル未選択",
    tipZipComplete:"\n❗本体タブに切り替え、リソースZIP読込をクリックし、ダウンロードしたResPack.zipを選択してください。\niOSは「このiPhone内」に保存されているか確認。",
    btnReloadScene:"フォルダからシナリオ再読込",
    tipFetchSceneOk:"シナリオ読み込み完了",
    tipFetchSceneFail:"フォルダから自動読み込み失敗。\nfile://では動作しません、HTTPサーバーを使用してください。",
    tipResPackLangWarn:"⚠️重要お知らせ：\n現在エディタ言語：【{langName}】\nこのパックはscenes_{langCode}.json向けに作成。\n👉本体を【{langName}】に設定した場合のみ動作します！\n本体を他言語に切替えると紐付けが壊れます。",
    tipRecNeedHttps:"録音はHTTP/HTTPS必須。file://は使用不可",
    tipRecNoMic:"マイク権限なし、または非対応ブラウザ",
    tipRecRecording:"録音中…録音ボタンを再度押して停止"
  }
};

let editorCurrentLang = "zh";
const editorState = {
  charList:[],
  fontItem:null,
  voiceList:[],
  bgmList:[],
  bgList:[],
  dialogBoxBg:null,
  scenes:null,
  drawCallback:null
};

// =====多语言工具=====
function applyEditorLocale(){
  const dict = editorLocale[editorCurrentLang];
  document.querySelectorAll("[data-editor-key]").forEach(el=>{
    const k = el.getAttribute("data-editor-key");
    if(dict[k] !== undefined) el.innerText = dict[k];
  });
  const selLang = document.getElementById("editorLangSel");
  if(selLang){
    selLang.options[0].textContent = dict.langZh;
    selLang.options[1].textContent = dict.langEn;
    selLang.options[2].textContent = dict.langJa;
    selLang.value = editorCurrentLang;
  }
}
function detectEditorLang(){
  const navLang = navigator.language||navigator.userLanguage;
  if(navLang.startsWith("zh")) return "zh";
  if(navLang.startsWith("en")) return "en";
  if(navLang.startsWith("ja")) return "ja";
  return "zh";
}
function getLangDisplayName(code){
  const map = {zh:"中文",en:"English",ja:"日本語"};
  return map[code]||code;
}

async function fetchCurrentLangSceneJson(){
  const dict = editorLocale[editorCurrentLang];
  const url = `./scenes_${editorCurrentLang}.json`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    editorState.scenes = await res.json();
    alert(dict.tipFetchSceneOk);
    renderCharRows();renderVoiceRows();renderBgmRows();renderBgRows();
  }catch(err){
    console.error("fetch scenes json failed",err);
    editorState.scenes = null;
    alert(dict.tipFetchSceneFail);
    renderCharRows();renderVoiceRows();renderBgmRows();renderBgRows();
  }
}

// 图片Blob下载通用工具
function downloadBlob(blob, filename){
  const a = document.createElement("a");
  const objUrl = URL.createObjectURL(blob);
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}

/**
 * 开始/停止段落语音录音
 * @param {number} idx voiceList行索引
 */
async function toggleVoiceRecord(idx){
  const dict = editorLocale[editorCurrentLang];

  if(window.location.protocol === "file:"){
    alert(dict.tipRecNeedHttps);
    return;
  }
  if(!window.MediaRecorder){
    alert(dict.tipRecNoMic);
    return;
  }

  // 已在录音 -> 停止
  if(mediaRecorder && mediaRecorder.state !== "inactive"){
    mediaRecorder.stop();
    return;
  }

  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recordChunks = [];
    let mimeType = "audio/mp4";
    if(!MediaRecorder.isTypeSupported(mimeType)){
      mimeType = "audio/webm";
    }
    mediaRecorder = new MediaRecorder(stream,{mimeType});
    currentRecordVoiceIdx = idx;
    mediaRecorder.ondataavailable = (e)=>{
      if(e.data.size>0) recordChunks.push(e.data);
    };
    mediaRecorder.onstop = ()=>{
      const blob = new Blob(recordChunks,{type:mediaRecorder.mimeType});
      const item = editorState.voiceList[currentRecordVoiceIdx];
      if(item){
        item.blob = blob;
        item.fileName = `record_${Date.now()}.${blob.type==="audio/mp4"?"m4a":"webm"}`;
      }
      stream.getTracks().forEach(t=>t.stop());
      mediaRecorder = null;
      currentRecordVoiceIdx = null;
      renderVoiceRows();
    };
    mediaRecorder.start();
    alert(dict.tipRecRecording);
  }catch(err){
    console.error("录音异常",err);
    alert(dict.tipRecNoMic);
    mediaRecorder = null;
    currentRecordVoiceIdx = null;
  }
}

// =====手绘模块（修复版：线条丢失、导出变黑、颜色预览）=====
const drawModule = (()=>{
    const modal = document.getElementById('drawModal');
    const canvas = document.getElementById('drawCanvas');
    const drawCtx = canvas.getContext('2d');

    let offscreenCanvas = null;
    let offCtx = null;

    let tool = "pen";
    let hue = 0, sat = 100, lum = 50;
    let scale = 1.0;

    let isDrawing = false;
    let currentPath = [];
    let history = [];
    let redoStack = [];
    const MAX_HISTORY = 40;

    let touch0 = null, touch1 = null;

    const hueSlider = document.getElementById('hueSlider');
    const satSlider = document.getElementById('satSlider');
    const lumSlider = document.getElementById('lumSlider');
    const scaleSlider = document.getElementById('scaleSlider');
    const colorPreviewBox = document.getElementById("colorPreviewBox");

    function getHslColor(){
        return `hsl(${hue},${sat}%,${lum}%)`;
    }

    function updateColorPreview(){
        if(!colorPreviewBox) return;
        colorPreviewBox.style.backgroundColor = getHslColor();
    }

    function drawSegment(ctx, x0, y0, x1, y1, brush){
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineCap = "round";
        const col = getHslColor();

        if(brush === "pen"){
            ctx.strokeStyle = col;
            ctx.lineWidth = 3;
            ctx.stroke();
        }else if(brush === "brush"){
            ctx.strokeStyle = col;
            ctx.lineWidth = 12;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }else if(brush === "highlighter"){
            ctx.strokeStyle = col;
            ctx.lineWidth = 18;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }else if(brush === "eraser"){
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = 20;
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
        }
    }

    function replayPath(ctx, path, brush){
        if(path.length < 2) return;
        for(let i = 1; i < path.length; i++){
            const p0 = path[i-1];
            const p1 = path[i];
            drawSegment(ctx, p0.x, p0.y, p1.x, p1.y, brush);
        }
    }

    function redrawDisplay(){
        drawCtx.clearRect(0,0,canvas.width,canvas.height);
        drawCtx.drawImage(offscreenCanvas, 0, 0);
    }

    function commitStroke(){
        if(currentPath.length < 2) return;
        replayPath(offCtx, currentPath, tool);
        redoStack = [];
        history.push(offscreenCanvas.toDataURL());
        if(history.length > MAX_HISTORY) history.shift();
        redrawDisplay();
        currentPath = [];
    }

    function undo(){
        if(history.length === 0) return;
        redoStack.push(history.pop());
        offCtx.clearRect(0,0,offscreenCanvas.width,offscreenCanvas.height);
        if(history.length > 0){
            const img = new Image();
            img.onload = ()=>{
                offCtx.drawImage(img,0,0);
                redrawDisplay();
            };
            img.src = history[history.length-1];
        }else{
            redrawDisplay();
        }
    }

    function redo(){
        if(redoStack.length === 0) return;
        const data = redoStack.pop();
        history.push(data);
        const img = new Image();
        img.onload = ()=>{
            offCtx.drawImage(img,0,0);
            redrawDisplay();
        };
        img.src = data;
    }

    function clearAll(){
        redoStack = [];
        commitStroke();
        offCtx.clearRect(0,0,offscreenCanvas.width,offscreenCanvas.height);
        history = [];
        redrawDisplay();
    }

    function initCanvas(w=1280,h=400){
        offscreenCanvas = document.createElement("canvas");
        offCtx = offscreenCanvas.getContext("2d");
        offscreenCanvas.width = w;
        offscreenCanvas.height = h;
        offCtx.fillStyle="#ffffff";
        offCtx.fillRect(0,0,w,h);

        canvas.width = w;
        canvas.height = h;
        scale = 1.0;
        if(scaleSlider) scaleSlider.value = 100;

        history = [];
        redoStack = [];
        currentPath = [];
        redrawDisplay();
        updateColorPreview();
    }

    function getPointerPos(e){
        const rect = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {
            x: (t.clientX - rect.left) / scale,
            y: (t.clientY - rect.top) / scale
        };
    }

    canvas.addEventListener('mousedown',e=>{
        e.preventDefault();
        const p = getPointerPos(e);
        isDrawing = true;
        currentPath = [{x:p.x,y:p.y}];
    });

    canvas.addEventListener('mousemove',e=>{
        if(!isDrawing) return;
        const p = getPointerPos(e);
        const lastPt = currentPath[currentPath.length-1];
        drawSegment(drawCtx, lastPt.x, lastPt.y, p.x, p.y, tool);
        currentPath.push({x:p.x,y:p.y});
    });

    canvas.addEventListener('mouseup',()=>{
        if(isDrawing){
            isDrawing = false;
            commitStroke();
        }
    });

    canvas.addEventListener('mouseleave',()=>{
        if(isDrawing){
            isDrawing = false;
            commitStroke();
        }
    });

    canvas.addEventListener('touchstart',e=>{
        e.preventDefault();
        const touches = e.touches;
        if(touches.length === 1){
            const p = getPointerPos(e);
            isDrawing = true;
            currentPath = [{x:p.x,y:p.y}];
            touch0 = {x:touches[0].clientX, y:touches[0].clientY};
            touch1 = null;
        }else if(touches.length === 2){
            touch0 = {x:touches[0].clientX, y:touches[0].clientY};
            touch1 = {x:touches[1].clientX, y:touches[1].clientY};
        }
    },{passive:false});

    canvas.addEventListener('touchmove',e=>{
        e.preventDefault();
        const touches = e.touches;
        if(touches.length === 1 && isDrawing){
            const p = getPointerPos(e);
            const lastPt = currentPath[currentPath.length-1];
            drawSegment(drawCtx, lastPt.x, lastPt.y, p.x, p.y, tool);
            currentPath.push({x:p.x,y:p.y});
        }else if(touches.length === 2 && touch0 && touch1){
            const p0 = {x:touches[0].clientX,y:touches[0].clientY};
            const p1 = {x:touches[1].clientX,y:touches[1].clientY};
            const oldDist = Math.hypot(touch1.x-touch0.x, touch1.y-touch0.y);
            const newDist = Math.hypot(p1.x-p0.x, p1.y-p0.y);
            if(oldDist > 0){
                scale *= newDist / oldDist;
                scale = Math.max(0.25, Math.min(3.0, scale));
                if(scaleSlider) scaleSlider.value = Math.round(scale*100);
            }
            touch0 = p0;
            touch1 = p1;
        }
    },{passive:false});

    canvas.addEventListener('touchend',()=>{
        if(isDrawing){
            isDrawing = false;
            commitStroke();
        }
        touch0 = null;
        touch1 = null;
    },{passive:false});

    document.querySelectorAll('.draw-dock [data-tool]').forEach(btn=>{
        btn.onclick=()=>{
            document.querySelectorAll('.draw-dock [data-tool]').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const t = btn.dataset.tool;
            if(["pen","brush","highlighter","eraser"].includes(t)){
                tool = t;
            }
            if(t==="clear"){ clearAll(); }
            if(t==="undo"){ undo(); }
            if(t==="redo"){ redo(); }
        }
    });

    if(hueSlider) hueSlider.oninput=()=>{ hue=Number(hueSlider.value); updateColorPreview(); };
    if(satSlider) satSlider.oninput=()=>{ sat=Number(satSlider.value); updateColorPreview(); };
    if(lumSlider) lumSlider.oninput=()=>{ lum=Number(lumSlider.value); updateColorPreview(); };
    if(scaleSlider) scaleSlider.oninput=()=>{ scale = Number(scaleSlider.value)/100; };

    document.getElementById('drawOkBtn').onclick = async ()=>{
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = offscreenCanvas.width;
        tempCanvas.height = offscreenCanvas.height;
        const tctx = tempCanvas.getContext("2d");
        tctx.fillStyle="#ffffff";
        tctx.fillRect(0,0,tempCanvas.width,tempCanvas.height);
        tctx.drawImage(offscreenCanvas,0,0);
        const blob = await new Promise(resolve=>{
            tempCanvas.toBlob(b=>resolve(b),"image/jpeg",0.92);
        });
        modal.classList.remove("active");
        if(editorState.drawCallback) editorState.drawCallback(blob);
    };

    document.getElementById('drawCancelBtn').onclick = ()=>{
        modal.classList.remove("active");
        if(editorState.drawCallback) editorState.drawCallback(null);
    };

    function open(callback,canvasW=1280,canvasH=400){
        editorState.drawCallback = callback;
        initCanvas(canvasW,canvasH);
        modal.classList.add("active");
    }

    return {open};
})();

function renderCharRows(){
  const dict = editorLocale[editorCurrentLang];
  const wrap = document.getElementById("charRows");
  wrap.innerHTML="";
  editorState.charList.forEach((it,idx)=>{
    const div = document.createElement("div");div.className="row-item";
    let speakerOpts = `<option value="">${dict.selPlaceholderSpeaker}</option>`;
    if(editorState.scenes){
      const spkSet = new Set();
      Object.values(editorState.scenes).forEach(sc=>{
        sc.content.forEach(c=>{if(c.type==="dialog"&&c.speaker) spkSet.add(c.speaker);})
      });
      [...spkSet].forEach(s=>speakerOpts+=`<option value="${s}" ${it.speakerKey===s?"selected":""}>${s}</option>`);
    }
    div.innerHTML = `
      <select class="sel-spk" data-idx="${idx}">${speakerOpts}</select>
      <button class="btn btn-upload up-char" data-idx="${idx}">${dict.btnUpload}</button>
      <button class="btn btn-draw draw-char" data-idx="${idx}">${dict.btnDraw}</button>
      <button class="btn btn-dl dl-char" data-idx="${idx}" ${!it.fileBlob?"disabled":""}>${dict.btnDownload}</button>
      <span class="file-hint">${it.fileName||dict.tipNoFile}</span>
      <button class="btn btn-del del-char" data-idx="${idx}">${dict.btnDel}</button>
      <input type="file" class="inp-char file-input" accept=".png,.jpg,.jpeg">
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.up-char').forEach(btn=>btn.onclick=function(ev){
    const idx = Number(ev.target.dataset.idx);
    const inp = ev.target.parentElement.querySelector('.inp-char');
    inp.onchange = async (e)=>{
      const f = e.target.files[0];if(!f)return;
      editorState.charList[idx].fileBlob = await f.arrayBuffer();
      editorState.charList[idx].fileName = f.name;
      renderCharRows();
      inp.value="";
    };
    inp.click();
  });
  wrap.querySelectorAll('.draw-char').forEach(btn=>btn.onclick=(ev)=>{
    const idx = Number(ev.target.dataset.idx);
    drawModule.open((blob)=>{
      if(!blob) return;
      editorState.charList[idx].fileBlob = blob;
      editorState.charList[idx].fileName = `char_${idx}.jpg`;
      renderCharRows();
    });
  });
  wrap.querySelectorAll('.dl-char').forEach(btn=>btn.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    const item = editorState.charList[idx];
    if(!item.fileBlob) return;
    const blob = new Blob([item.fileBlob],{type:"image/jpeg"});
    downloadBlob(blob, item.fileName||`char_${idx}.jpg`);
  });
  wrap.querySelectorAll('.sel-spk').forEach(s=>s.onchange=(ev)=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.charList[idx].speakerKey = ev.target.value;
  });
  wrap.querySelectorAll('.del-char').forEach(b=>b.onclick=(ev)=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.charList.splice(idx,1);
    renderCharRows();
  });
}

function renderFontRows(){
  const dict = editorLocale[editorCurrentLang];
  const wrap = document.getElementById("fontRows");
  wrap.innerHTML="";
  if(editorState.fontItem){
    wrap.innerHTML = `<div class="row-item">
      <span>${dict.panelFont}:</span>
      <span class="file-hint">${editorState.fontItem.fileName}</span>
      <button class="btn btn-del del-font">${dict.btnDel}</button>
    </div>`;
    wrap.querySelector('.del-font').onclick=()=>{editorState.fontItem=null;renderFontRows();};
  }else{
    wrap.innerHTML=`<div class="row-item">
      <button class="btn btn-upload up-font">${dict.btnUpload} OTF/TTF</button>
      <input type="file" id="inpFont" class="file-input" accept=".otf,.ttf">
    </div>`;
    wrap.querySelector('.up-font').onclick=function(){
      const inp = document.getElementById("inpFont");
      inp.onchange = async e=>{
        const f = e.target.files[0];if(!f)return;
        editorState.fontItem = {blob:await f.arrayBuffer(),fileName:f.name};
        renderFontRows();
        inp.value="";
      };
      inp.click();
    };
  }
}

function renderVoiceRows(){
  const dict = editorLocale[editorCurrentLang];
  const wrap = document.getElementById("voiceRows");
  wrap.innerHTML="";
  editorState.voiceList.forEach((it,idx)=>{
    const div = document.createElement("div");div.className="row-item";
    let sceneOpts=`<option value="">${dict.selPlaceholderScene}</option>`;
    if(editorState.scenes){
      Object.keys(editorState.scenes).filter(k=>k.startsWith("scene")).sort((a,b)=>Number(a.replace("scene",""))-Number(b.replace("scene",""))).forEach(sid=>{
        sceneOpts += `<option value="${sid}" ${it.sceneId===sid?"selected":""}>${sid} ${editorState.scenes[sid].title||""}</option>`;
      })
    }
    div.innerHTML=`
      <select class="sel-scene-v" data-idx="${idx}">${sceneOpts}</select>
      <select class="sel-seg-v" data-idx="${idx}"><option value="">${dict.selPlaceholderSeg}</option></select>
      <button class="btn btn-upload up-voice" data-idx="${idx}">${dict.btnUpload}</button>
      <button class="btn btn-record up-record" data-idx="${idx}">${dict.btnRecord}</button>
      <span class="file-hint">${it.fileName||""}</span>
      <button class="btn btn-del del-voice" data-idx="${idx}">${dict.btnDel}</button>
      <input type="file" class="inp-voice file-input" accept=".mp3,.wav,.m4a">
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.sel-scene-v').forEach(s=>{
    s.onchange=(ev)=>{
      const idx = Number(ev.target.dataset.idx);
      const sid = ev.target.value;
      editorState.voiceList[idx].sceneId = sid;
      const segSel = ev.target.parentElement.querySelector('.sel-seg-v');
      segSel.innerHTML = `<option value="">${dict.selPlaceholderSegItem}</option>`;
      if(sid && editorState.scenes?.[sid]){
        const len = editorState.scenes[sid].content.length;
        for(let i=0;i<len;i++) segSel.innerHTML+=`<option value="${i}">${i}</option>`;
      }
    }
  });
  wrap.querySelectorAll('.sel-seg-v').forEach(s=>s.onchange=(ev)=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.voiceList[idx].index = ev.target.value === "" ? undefined : Number(ev.target.value);
  });
  wrap.querySelectorAll('.up-voice').forEach(btn=>btn.onclick=function(ev){
    const idx = Number(ev.target.dataset.idx);
    const inp = ev.target.parentElement.querySelector('.inp-voice');
    inp.onchange=async e=>{
      const f = e.target.files[0];if(!f) return;
      editorState.voiceList[idx].blob = await f.arrayBuffer();
      editorState.voiceList[idx].fileName = f.name;
      renderVoiceRows();
      inp.value="";
    };
    inp.click();
  });
  wrap.querySelectorAll('.up-record').forEach(btn=>btn.onclick=function(ev){
    const idx = Number(ev.target.dataset.idx);
    toggleVoiceRecord(idx);
  });
  wrap.querySelectorAll('.del-voice').forEach(b=>b.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.voiceList.splice(idx,1);
    renderVoiceRows();
  })
}

function renderBgmRows(){
  const dict = editorLocale[editorCurrentLang];
  const wrap = document.getElementById("bgmRows");
  wrap.innerHTML="";
  editorState.bgmList.forEach((it,idx)=>{
    const div = document.createElement("div");div.className="row-item";
    let sceneOpts=`<option value="">${dict.selPlaceholderScene}</option>`;
    if(editorState.scenes){
      Object.keys(editorState.scenes).filter(k=>k.startsWith("scene")).sort((a,b)=>Number(a.replace("scene",""))-Number(b.replace("scene",""))).forEach(sid=>{
        sceneOpts += `<option value="${sid}" ${it.sceneId===sid?"selected":""}>${sid} ${editorState.scenes[sid].title||""}</option>`;
      })
    }
    div.innerHTML=`
      <select class="sel-scene-bgm" data-idx="${idx}">${sceneOpts}</select>
      <button class="btn btn-upload up-bgm" data-idx="${idx}">${dict.btnUpload}</button>
      <span class="file-hint">${it.fileName||""}</span>
      <button class="btn btn-del del-bgm" data-idx="${idx}">${dict.btnDel}</button>
      <input type="file" class="inp-bgm file-input" accept=".mp3,.wav,.m4a">
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.sel-scene-bgm').forEach(s=>s.onchange=ev=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.bgmList[idx].sceneId = ev.target.value;
  });
  wrap.querySelectorAll('.up-bgm').forEach(btn=>btn.onclick=function(ev){
    const idx = Number(ev.target.dataset.idx);
    const inp = ev.target.parentElement.querySelector('.inp-bgm');
    inp.onchange=async e=>{
      const f = e.target.files[0];if(!f) return;
      editorState.bgmList[idx].blob = await f.arrayBuffer();
      editorState.bgmList[idx].fileName = f.name;
      renderBgmRows();
      inp.value="";
    };
    inp.click();
  });
  wrap.querySelectorAll('.del-bgm').forEach(b=>b.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.bgmList.splice(idx,1);
    renderBgmRows();
  })
}

function renderBgRows(){
  const dict = editorLocale[editorCurrentLang];
  const wrap = document.getElementById("bgRows");
  wrap.innerHTML="";
  editorState.bgList.forEach((it,idx)=>{
    const div = document.createElement("div");div.className="row-item";
    let sceneOpts=`<option value="">${dict.selPlaceholderScene}</option>`;
    if(editorState.scenes){
      Object.keys(editorState.scenes).filter(k=>k.startsWith("scene")).sort((a,b)=>Number(a.replace("scene",""))-Number(b.replace("scene",""))).forEach(sid=>{
        sceneOpts += `<option value="${sid}" ${it.sceneId===sid?"selected":""}>${sid} ${editorState.scenes[sid].title||""}</option>`;
      })
    }
    div.innerHTML=`
      <select class="sel-scene-bg" data-idx="${idx}">${sceneOpts}</select>
      <button class="btn btn-upload up-bg" data-idx="${idx}">${dict.btnUpload}</button>
      <button class="btn btn-draw draw-bg" data-idx="${idx}">${dict.btnDraw}</button>
      <button class="btn btn-dl dl-bg" data-idx="${idx}" ${!it.fileBlob?"disabled":""}>${dict.btnDownload}</button>
      <span class="file-hint">${it.fileName||""}</span>
      <button class="btn btn-del del-bg" data-idx="${idx}">${dict.btnDel}</button>
      <input type="file" class="inp-bg file-input" accept=".png,.jpg,.jpeg">
    `;
    wrap.appendChild(div);
  });
  wrap.querySelectorAll('.sel-scene-bg').forEach(s=>s.onchange=ev=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.bgList[idx].sceneId = ev.target.value;
  });
  wrap.querySelectorAll('.up-bg').forEach(btn=>btn.onclick=function(ev){
    const idx = Number(ev.target.dataset.idx);
    const inp = ev.target.parentElement.querySelector('.inp-bg');
    inp.onchange=async e=>{
      const f = e.target.files[0];if(!f) return;
      editorState.bgList[idx].fileBlob = await f.arrayBuffer();
      editorState.bgList[idx].fileName = f.name;
      renderBgRows();
      inp.value="";
    };
    inp.click();
  });
  wrap.querySelectorAll('.draw-bg').forEach(btn=>btn.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    drawModule.open((blob)=>{
      if(!blob) return;
      editorState.bgList[idx].fileBlob = blob;
      editorState.bgList[idx].fileName = `scene_bg_${idx}.jpg`;
      renderBgRows();
    });
  });
  wrap.querySelectorAll('.dl-bg').forEach(btn=>btn.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    const item = editorState.bgList[idx];
    if(!item.fileBlob) return;
    const blob = new Blob([item.fileBlob],{type:"image/jpeg"});
    downloadBlob(blob, item.fileName||`scene_bg_${idx}.jpg`);
  });
  wrap.querySelectorAll('.del-bg').forEach(b=>b.onclick=ev=>{
    const idx = Number(ev.target.dataset.idx);
    editorState.bgList.splice(idx,1);
    renderBgRows();
  })
}

async function buildResPackZip(){
  const zip = new ZIP();
  const resMap = {
    speakerToChar:{},
    indexVoice:{},
    sceneBg:{},
    bgm:{},
    global:{}
  };
  for(const item of editorState.charList){
    if(!item.speakerKey||!item.fileBlob) continue;
    const fn = `char/${item.speakerKey}.jpg`;
    zip.file(fn,item.fileBlob);
    resMap.speakerToChar[item.speakerKey]=fn;
  }
  if(editorState.fontItem){
    const fn = `font/${editorState.fontItem.fileName}`;
    zip.file(fn,editorState.fontItem.blob);
    resMap.global.fontPath = fn;
  }
  for(const item of editorState.voiceList){
    if(!item.sceneId||item.index===undefined||!item.blob) continue;
    let ext = "m4a";
    if(item.fileName){
      const sp = item.fileName.split(".");
      ext = sp[sp.length-1];
    }else if(item.blob.type && item.blob.type.indexOf("webm")>=0){
      ext="webm";
    }
    const fn = `voice/${item.sceneId}_${item.index}.${ext}`;
    zip.file(fn,item.blob);
    // 保持与主程序 getVoiceUrlByIndex(idx) 一致：按段落索引存
    resMap.indexVoice[String(item.index)] = fn;
  }
  for(const item of editorState.bgmList){
    if(!item.sceneId||!item.blob) continue;
    const fn = `bgm/${item.sceneId}.m4a`;
    zip.file(fn,item.blob);
    resMap.bgm[item.sceneId] = fn;
  }
  for(const item of editorState.bgList){
    if(!item.sceneId||!item.fileBlob) continue;
    const fn = `bg/${item.sceneId}.jpg`;
    zip.file(fn,item.fileBlob);
    resMap.sceneBg[item.sceneId]=fn;
  }
  if(editorState.dialogBoxBg){
    const fn = `ui/dialog_box_bg.jpg`;
    zip.file(fn,editorState.dialogBoxBg.blob);
    resMap.global.dialogBoxBg = fn;
  }
  zip.file("res_map.json", JSON.stringify(resMap,null,2));
  const zipBuf = await zip.generateAsync({type:"arraybuffer"});
  const blob = new Blob([zipBuf],{type:"application/zip"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download="ResPack.zip";
  a.click();
  return zipBuf;
}

document.addEventListener('DOMContentLoaded',async ()=>{
  let savedLang = safeGetEditorLang();
  if(savedLang && editorLocale[savedLang]){
    editorCurrentLang = savedLang;
  }else{
    editorCurrentLang = detectEditorLang();
  }
  applyEditorLocale();

  document.getElementById("editorLangSel").onchange = async function(){
    editorCurrentLang = this.value;
    safeSaveEditorLang(editorCurrentLang);
    applyEditorLocale();
    await fetchCurrentLangSceneJson();
    renderCharRows();renderFontRows();renderVoiceRows();renderBgmRows();renderBgRows();
  };
  document.getElementById("reloadSceneJsonBtn").onclick = fetchCurrentLangSceneJson;

  document.getElementById('addCharRow').onclick=()=>{editorState.charList.push({speakerKey:"",fileBlob:null,fileName:""});renderCharRows();};
  document.getElementById('addFontRow').onclick=()=>{
    if(editorState.fontItem) return; // 已有一个字体
    renderFontRows();
    const upBtn = document.querySelector('#fontRows .up-font');
    if(upBtn) upBtn.click();
  };
  document.getElementById('addVoiceRow').onclick=()=>{editorState.voiceList.push({sceneId:"",index:undefined,blob:null,fileName:""});renderVoiceRows();};
  document.getElementById('addBgmRow').onclick=()=>{editorState.bgmList.push({sceneId:"",blob:null,fileName:""});renderBgmRows();};
  document.getElementById('addBgRow').onclick=()=>{editorState.bgList.push({sceneId:"",fileBlob:null,fileName:""});renderBgRows();};

  //对话框背景上传、手绘、下载
  const dlDialogBgBtn = document.getElementById("dlDialogBg");
  document.getElementById('uploadDialogBg').onclick=()=>{
    const inp = document.getElementById("fileDialogBg");
    inp.onchange = async e=>{
      const f = e.target.files[0];if(!f)return;
      editorState.dialogBoxBg = {blob:await f.arrayBuffer(),fileName:f.name};
      dlDialogBgBtn.disabled = false;
      inp.value="";
    };
    inp.click();
  };
  document.getElementById('drawDialogBg').onclick=()=>{
    drawModule.open(async (blob)=>{
      if(!blob) return;
      const ab = await blob.arrayBuffer();
      editorState.dialogBoxBg = {blob:ab,fileName:"dialog_box_bg.jpg"};
      dlDialogBgBtn.disabled = false;
    },1600,500);
  };
  dlDialogBgBtn.onclick = ()=>{
    if(!editorState.dialogBoxBg) return;
    const blob = new Blob([editorState.dialogBoxBg.blob],{type:"image/jpeg"});
    downloadBlob(blob, editorState.dialogBoxBg.fileName||"dialog_box_bg.jpg");
  };

  //生成zip按钮，语言警告确认弹窗
  document.getElementById('genZipBtn').onclick = async ()=>{
    const dict = editorLocale[editorCurrentLang];
    const langName = getLangDisplayName(editorCurrentLang);
    const warnText = dict.tipResPackLangWarn.replace(/{langName}/g,langName).replace(/{langCode}/g,editorCurrentLang);
    if(!confirm(warnText)){
      return;
    }
    await buildResPackZip();
    alert(editorLocale[editorCurrentLang].tipZipComplete);
  };

  await fetchCurrentLangSceneJson();
  renderCharRows();renderFontRows();renderVoiceRows();renderBgmRows();renderBgRows();
});