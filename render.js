// --- RENDER VE GÖRSEL YÖNETİMİ ---

function convertPercentageToPixelY(percentage) {
    return 500 - (percentage * 5); 
}

function toggleLungTwinMode() {
    isLungTwinActive = !isLungTwinActive;
    let pipes = document.querySelectorAll('.pipe');
    
    if (isLungTwinActive) {
        if (bird) bird.style.display = 'none';
        if (targetLine) targetLine.style.display = 'none';
        pipes.forEach(p => p.style.display = 'none');
        
        if (lungTwinContainer) lungTwinContainer.style.display = 'flex';
        if (modeToggleBtn) {
            modeToggleBtn.innerText = "🫁 Dijital İkiz: AÇIK";
            modeToggleBtn.style.backgroundColor = "#00b894";
            modeToggleBtn.style.color = "#000";
        }
    } else {
        if (bird) bird.style.display = 'block';
        if (!isAnalysisMode && targetLine) targetLine.style.display = 'block';
        pipes.forEach(p => p.style.display = 'block');
        
        if (lungTwinContainer) lungTwinContainer.style.display = 'none';
        if (modeToggleBtn) {
            modeToggleBtn.innerText = "🫁 Dijital İkiz: KAPALI";
            modeToggleBtn.style.backgroundColor = "rgba(0,0,0,0.8)";
            modeToggleBtn.style.color = "#00ffcc";
        }
    }
}

function updateLungTwinSimulation(flowValue) {
    if (!isLungTwinActive) return;

    let digitalLung = document.getElementById('digitalLung');
    let leftLung = document.getElementById('leftLung');
    let rightLung = document.getElementById('rightLung');
    let lungWarningText = document.getElementById('lungWarningText');

    if (!digitalLung || !leftLung || !rightLung) return;

    let scaleFactor = 0.9 + (flowValue / 280); 
    digitalLung.style.transform = `scale(${scaleFactor})`;

    let targetLimit = 50; 
    if (flowValue < targetLimit) {
        leftLung.setAttribute("fill", "#ff3366");
        rightLung.setAttribute("fill", "#ff3366");
        if (lungWarningText) {
            lungWarningText.style.color = "#ff3366";
            lungWarningText.innerText = "⚠️ Lob dolumu zayıf! Akışı artır.";
        }
    } else {
        leftLung.setAttribute("fill", "#00ffcc");
        rightLung.setAttribute("fill", "#00ffcc");
        if (lungWarningText) {
            lungWarningText.style.color = "#00ffcc";
            lungWarningText.innerText = "✨ Kusursuz Akciğer Genişlemesi ve Ventilasyon!";
        }
    }
}

function renderProfilesDashboard() {
    profilesContainer.innerHTML = '';
    let keys = Object.keys(bulutProfilleri);
    let validKeys = keys.filter(key => {
        let p = bulutProfilleri[key];
        return p && typeof p === 'object' && p.name && p.surname;
    });

    if (validKeys.length === 0) {
        profilesContainer.innerHTML = `
            <div style="color: #a0a0c0; font-size: 14px; text-align: center; margin-top: 40px; width:100%;">
                Kayıtlı profil bulunamadı.<br>Sağ üstteki <b>"Profil Ekle"</b> butonuna basarak hemen ilk profilini oluştur!
            </div>
        `;
        return;
    }

    validKeys.forEach(function(key) {
        let pData = bulutProfilleri[key];
        let nameVal = pData.name || "İsimsiz";
        let surnameVal = pData.surname || "";
        let firstLetter = nameVal.charAt(0).toUpperCase();
        let seansCount = pData.history ? pData.history.length : 0;

        let card = document.createElement('div');
        card.className = 'profile-card';
        card.onclick = function() { selectProfile(key); };

        card.innerHTML = `
            <div style="display: flex; justify-content: flex-end; margin-bottom: -5px;">
                <button onclick="event.stopPropagation(); deleteProfile('${key}')" style="background:none; border:none; color:#ff0055; cursor:pointer; font-size:13px; padding:2px;" title="Profili Sil">🗑️</button>
            </div>
            <div class="profile-avatar">${firstLetter}</div>
            <div class="profile-name" title="${nameVal} ${surnameVal}">${nameVal} ${surnameVal}</div>
            <div class="profile-stats">Seans: ${seansCount}</div>
        `;
        profilesContainer.appendChild(card);
    });
}


function renderDoctorPanel() {
    patientListContainer.innerHTML = '';
    let keys = Object.keys(bulutProfilleri);
    let validKeys = keys.filter(key => {
        let p = bulutProfilleri[key];
        return p && typeof p === 'object' && p.name;
    });

    if (validKeys.length === 0) {
        patientListContainer.innerHTML = `<div style="text-align:center; color:#a0a0c0;">Henüz kayıtlı hasta verisi bulunamadı.</div>`;
        return;
    }

    validKeys.forEach(function(key) {
        let pData = bulutProfilleri[key];
        let hist = pData.history || [];
        let lastSeans = hist.length > 0 ? "%" + hist[hist.length - 1] : "Veri yok";
        let totalSeans = hist.length;

        let row = document.createElement('div');
        row.className = 'patient-row';
        row.innerHTML = `
            <div>
                <strong style="color:#00ffcc; font-size:15px;">${pData.name} ${pData.surname || ""}</strong>
                <div style="font-size:12px; color:#a0a0c0; margin-top:2px;">Seans Sayısı: ${totalSeans}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size:12px; color:#ff0055; font-weight:bold;">Son Seans Hedefi: ${lastSeans}</div>
                <button class="menu-btn" style="padding: 4px 10px; font-size:11px; margin-top:5px;" onclick="viewPatientHistory('${key}')">Tarihçe Grafiği 📊</button>
            </div>
        `;
        patientListContainer.appendChild(row);
    });
}

function updateClinicChart() {
    graphContainer.innerHTML = ''; 
    sessionHistory.forEach(function(val, index) {
        if (val === undefined || val === null) return;
        
        let block = document.createElement('div');
        block.style.display = 'flex';
        block.style.flexDirection = 'column';
        block.style.alignItems = 'center';

        let bar = document.createElement('div');
        bar.className = 'graph-bar';
        bar.style.height = (val * 1.5) + 'px'; 
        bar.innerHTML = `<span>%${val}</span>`;

        let label = document.createElement('div');
        label.className = 'graph-label';
        label.innerText = (index + 1) + ". Seans";

        block.appendChild(bar);
        block.appendChild(label);
        graphContainer.appendChild(block);
    });
}
