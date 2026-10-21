// --- OYUN MOTORU VE KLİNİK MANTIK ---

// --- HAPTİK (TİTREŞİM) YARDIMCISI ---
function triggerHaptic(pattern) {
    if ("vibrate" in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Tarayıcı izin vermezse sessizce geç
        }
    }
}

// --- PROFESYONEL BİYOMEDİKAL UNVAN VE SEVİYE SİSTEMİ ---
const biyoRanks = [
    { min: 0, max: 30, title: "Seviye 1: Temel Kapasite", badge: "🥉 Bronz Solunum Çırağı" },
    { min: 31, max: 50, title: "Seviye 2: Gelişen Akciğer", badge: "🥈 Gümüş Alveol Avcısı" },
    { min: 51, max: 70, title: "Seviye 3: Güçlü Diyafram", badge: "🥇 Altın Diyafram Ustası" },
    { min: 71, max: 85, title: "Seviye 4: Yüksek Performans", badge: "💎 Platin Ventilasyon Pilotu" },
    { min: 86, max: 100, title: "Seviye 5: Maksimum Kapasite", badge: "👑 Elmas Solunum Lideri" }
];
let activePlayerSessionPoints = 0; // Her profil kendi oturum puanını tutmalı
let currentSessionEarnedPoints = 0; // ✅ DÜZELTME: artık düzgün tanımlı (implicit global değil)

// Hangi seviyede kaç puan kazanılacağını belirleyen fonksiyon
function calculateEarnedPoints(flowValue) {
    if (flowValue <= 30) return 5;       // Bronz Solunum Çırağı
    if (flowValue <= 50) return 10;     // Gümüş Alveol Avcısı
    if (flowValue <= 70) return 15;     // Altın Diyafram Ustası
    if (flowValue <= 85) return 20;     // Platin Ventilasyon Pilotu
    return 25;                          // Elmas Solunum Lideri
}

function calculatePlayerRank(flowValue) {
    for (let i = 0; i < biyoRanks.length; i++) {
        if (flowValue >= biyoRanks[i].min && flowValue <= biyoRanks[i].max) {
            return biyoRanks[i];
        }
    }
    return biyoRanks[0];
}

// --- BASİT MAKİNE ÖĞRENMESİ: LİNEER TREND TAHMİN MODELİ ---
function analyzeTrend(history) {
    const n = history.length;
    if (!history || n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    history.forEach(function (y, i) {
        sumX += i;
        sumY += y;
        sumXY += i * y;
        sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const prediction = Math.max(0, Math.min(100, Math.round(slope * n + intercept)));
    const weeklyProjection = Math.max(0, Math.min(100, Math.round(history[n - 1] + slope * 7)));

    const meanY = sumY / n;
    let ssRes = 0, ssTot = 0;
    history.forEach(function (y, i) {
        ssRes += Math.pow(y - (slope * i + intercept), 2);
        ssTot += Math.pow(y - meanY, 2);
    });
    const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

    return {
        prediction: prediction,
        slope: slope,
        rSquared: rSquared,
        weeklyProjection: weeklyProjection
    };
}

const gameZone = document.getElementById('gameZone');
const bird = document.getElementById('bird');
const targetLine = document.getElementById('targetLine');
const scoreEl = document.getElementById('scoreBoard');
const levelEl = document.getElementById('levelBoard');
const badgeEl = document.getElementById('badgeDisplay');
const overlay = document.getElementById('overlay');
const upgradeScreen = document.getElementById('upgradeScreen');
const chartModal = document.getElementById('chartModal');
const upgMeasured = document.getElementById('upgMeasured');
const upgTarget = document.getElementById('upgTarget');
const calibValTxt = document.getElementById('calibValTxt');
const peakValTxt = document.getElementById('peakValTxt');
const confirmBtn = document.getElementById('confirmBtn');
const alertTxt = document.getElementById('alertTxt');
const leverSlider = document.getElementById('leverSlider');
const liveFlowTxt = document.getElementById('liveFlowTxt');
const targetFlowTxt = document.getElementById('targetFlowTxt');
const leverVal = document.getElementById('leverVal');
const graphContainer = document.getElementById('graphContainer');

const profileDashboardModal = document.getElementById('profileDashboardModal');
const profilesContainer = document.getElementById('profilesContainer');
const addProfileModal = document.getElementById('addProfileModal');
const newNameInput = document.getElementById('newNameInput');
const newSurnameInput = document.getElementById('newSurnameInput');
const activeUserBadge = document.getElementById('activeUserBadge');
const chartTitle = document.getElementById('chartTitle');
const doctorViewModal = document.getElementById('doctorViewModal');
const patientListContainer = document.getElementById('patientListContainer');
const gearContainer = document.getElementById('gearContainer');
const lungTwinContainer = document.getElementById('lungTwinContainer');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const aiCoachModal = document.getElementById('aiCoachModal');
const aiCoachContent = document.getElementById('aiCoachContent');

const entryScreenModal = document.getElementById('entryScreenModal');
const lobbyUserBadge = document.getElementById('lobbyUserBadge');

// --- YENİ: ROL SEÇİM EKRANI ELEMENTLERİ ---
let roleSelectionModal = document.getElementById('roleSelectionModal');

let birdY = 468;
let score = 0;
let currentStage = 0;
let isAnalysisMode = true;
let gameOver = false;
let isPlaying = false;
let pipes = [];
let pipeSpawnTimer = 0;
let highestMeasured = 0;
let clinicalTarget = 0;
let currentFlow = 0;

let originalChartContent = null;
let isUserInteracting = false;

if (leverSlider) {
    leverSlider.addEventListener('mousedown', () => { isUserInteracting = true; });
    leverSlider.addEventListener('touchstart', () => { isUserInteracting = true; });

    leverSlider.addEventListener('input', () => {
        isUserInteracting = true;
        currentFlow = parseFloat(leverSlider.value);
        if (leverVal) leverVal.innerText = "%" + Math.round(currentFlow);
    });
}

window.addEventListener('mouseup', () => { isUserInteracting = false; });
window.addEventListener('touchend', () => { isUserInteracting = false; });

let currentUserKey = "";
let sessionHistory = [];
let bulutProfilleri = {};
let isLungTwinActive = false;
let isSoundActive = false;

const stageGaps = [200, 150, 110];
const stageNames = ["1. Aşama: Geniş Aralık", "2. Aşama: Orta Aralık", "3. Aşama: Dar Aralık"];
const stageBadges = ["🥉 Bronz Solunum Rozeti", "🥈 Gümüş Akciğer Rozeti", "🥇 Altın Güç Rozeti"];

const cloudURL = "https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar.json";

function fetchFromCloud() {
    let localBackup = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};

    if (Object.keys(localBackup).length === 0) {
        localBackup = {
            "yilmaz_berk": { name: "Berk", surname: "Yılmaz", history: [45, 60, 75], totalScore: 0 }
        };
        localStorage.setItem('triflo_local_hastalar', JSON.stringify(localBackup));
    }

    bulutProfilleri = localBackup;
    renderProfilesDashboard();
    renderDoctorPanel();

    fetch(cloudURL)
    .then(response => {
        if (!response.ok) throw new Error("Bulut erişimi kapalı");
        return response.json();
    })
    .then(data => {
        if (data && typeof data === 'object') {
            bulutProfilleri = { ...localBackup, ...data };
            localStorage.setItem('triflo_local_hastalar', JSON.stringify(bulutProfilleri));
            renderProfilesDashboard();
            renderDoctorPanel();
        }
    })
    .catch(err => {
        console.log("Bulut bağlantısı kurulamadı, lokal verilerle devam ediliyor.");
    });
}

window.onload = function () {
    fetchFromCloud();
    // Başlangıçta hiçbir modal/ekran otomatik açılmıyor, ortalık temiz.
};


// --- YENİ: ROL SEÇİM MANTIĞI ---
// --- ROL SEÇİM VE DOĞRUDAN GİRİŞ MANTIĞI ---
// 1. Üst menüdeki "Giriş Yap" butonuna basılınca rol seçim ekranını açar
function showRoleSelection() {
    // Önce diğer modalın açık olmadığından emin olalım
    let patientLoginModal = document.getElementById('patientLoginModal');
    if (patientLoginModal) patientLoginModal.style.display = 'none';
    
    const roleModal = document.getElementById('roleSelectionModal');
    if (roleModal) roleModal.style.display = 'block';
}
// 2. Rol seçildiğinde çalışacak fonksiyon
function selectRole(role) {
    // Rol seçim modalını kapat
    let roleModalEl = document.getElementById('roleSelectionModal');
    if (roleModalEl) roleModalEl.style.display = 'none';
    
    if (role === 'patient') {
        // Eğer hasta seçildiyse senin gönderdiğin görseldeki formu aç
        let patientLoginModal = document.getElementById('patientLoginModal');
        if (patientLoginModal) patientLoginModal.style.display = 'block';
        else openPatientDirectLoginModal();
    } else if (role === 'doctor') {
        // Doktor paneli
        promptDoctorLoginFromRole();
    }
}// Ortak modal kapatma fonksiyonu
function closeModal(modalId) {
    let el = document.getElementById(modalId);
    if (el) el.style.display = 'none';
}

// Hasta giriş yap butonuna basıldığında
function handlePatientLogin() {
    const name = document.getElementById('patientName').value;
    const surname = document.getElementById('patientSurname').value;
    
    if(name && surname) {
        alert(`Hoş geldin ${name} ${surname}, Triflo simülasyonuna bağlanılıyor... 🚀`);
        document.getElementById('patientLoginModal').style.display = 'none';
        // Buraya hasta paneline yönlendirme kodlarını ekleyebilirsin
    } else {
        alert("Lütfen tüm alanları doldur kanka!");
    }
}

function createRoleSelectionModal() {
    roleSelectionModal = document.createElement('div');
    roleSelectionModal.id = 'roleSelectionModal';
    roleSelectionModal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.95); display: flex; justify-content: center;
        align-items: center; z-index: 9999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    
    roleSelectionModal.innerHTML = `
        <div style="background: #1e293b; padding: 30px; border-radius: 16px; border: 2px solid #334155; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h2 style="color: #00ffcc; margin-bottom: 10px; font-size: 22px;">🫁 TRIFLO KLİNİK SİSTEMİ</h2>
            <p style="color: #94a3b8; margin-bottom: 25px; font-size: 14px;">Lütfen devam etmek için rolünüzü seçin:</p>
            
            <button onclick="selectRole('patient')" style="display: block; width: 100%; background: linear-gradient(135deg, #00ffcc, #00bfff); color: #0f172a; border: none; padding: 14px; font-weight: bold; font-size: 16px; border-radius: 8px; cursor: pointer; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,255,204,0.3);">
                👤 Hasta / Oyuncu Girişi
            </button>
            
            <button onclick="selectRole('doctor')" style="display: block; width: 100%; background: #334155; color: #fff; border: 1px solid #475569; padding: 14px; font-weight: bold; font-size: 16px; border-radius: 8px; cursor: pointer;">
                🩺 Doktor Paneli
            </button>
        </div>
    `;
    document.body.appendChild(roleSelectionModal);
}

function promptDoctorLoginFromRole() {
    let password = prompt("Lütfen Doktor Şifresini Giriniz:");
    if (password === "1234") {
        doctorViewModal.style.display = 'flex';
        renderDoctorPanel(); // Doktor paneli açıldığında listeyi doldurur
    } else {
        if (password !== null) {
            alert("Hatalı şifre girdin!");
        }
        showRoleSelection();
    }
}

// Doğrudan Ad, Soyad ve Şifre İsteyen Giriş Ekranı
function openPatientDirectLoginModal() {
    let directLoginModal = document.getElementById('directLoginModal');
    if (!directLoginModal) {
        directLoginModal = document.createElement('div');
        directLoginModal.id = 'directLoginModal';
        directLoginModal.className = 'modal-overlay';
        directLoginModal.style.zIndex = '250';
        directLoginModal.innerHTML = `
            <div class="popup-card" style="width: 340px;">
                <h2 style="color: #00ffcc; margin-top:0; font-size: 20px;">👤 Hasta Girişi</h2>
                <p style="font-size: 13px; color: #a0a0c0; margin-bottom: 15px;">Bilgilerini girerek hesabına bağlan.</p>
                
                <input type="text" id="loginNameInput" class="input-field" placeholder="Adın" required>
                <input type="text" id="loginSurnameInput" class="input-field" placeholder="Soyadın" required>
                <input type="password" id="loginPasswordInput" class="input-field" placeholder="Şifre" autocomplete="current-password">

                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button class="custom-btn" style="margin-top:0; width:100%; background: #00ffcc; color: #0f172a;" onclick="verifyAndLoginPatient()">Giriş Yap ✔️</button>
                    <button class="menu-btn" style="width: 100%; border-color: #ff0055; color: #ff0055; padding: 10px;" onclick="backToRoleSelectionFromLogin()">🔙 Geri Dön</button>
                </div>
            </div>
        `;
        document.body.appendChild(directLoginModal);
    } else {
        document.getElementById('loginNameInput').value = "";
        document.getElementById('loginSurnameInput').value = "";
        document.getElementById('loginPasswordInput').value = "";
        directLoginModal.style.display = 'flex';
    }
}


function verifyAndLoginPatient() {
    let name = document.getElementById('loginNameInput').value.trim().toLowerCase();
    let surname = document.getElementById('loginSurnameInput').value.trim().toLowerCase();
    let password = document.getElementById('loginPasswordInput').value.trim();

    if (!name || !surname) {
        alert("Lütfen adını ve soyadını eksiksiz gir!");
        return;
    }

    let foundKey = null;
    let foundData = null;

    for (let key in bulutProfilleri) {
        let p = bulutProfilleri[key];
        if (p && p.name && p.surname) {
            if (p.name.trim().toLowerCase() === name && p.surname.trim().toLowerCase() === surname) {
                foundKey = key;
                foundData = p;
                break;
            }
        }
    }

    if (!foundKey) {
        alert("Bu bilgilere ait kayıtlı profil bulunamadı.");
        return;
    }

    if (foundData.password && foundData.password.trim() !== "" && foundData.password !== password) {
        alert("Şifre hatalı!");
        return;
    }

    currentUserKey = foundKey;
    sessionHistory = foundData.history || [];
    let fullName = foundData.name.toUpperCase() + " " + (foundData.surname ? foundData.surname.toUpperCase() : "");

    let birdElement = document.getElementById('bird');
    if (birdElement) {
        birdElement.className = "";
        birdElement.classList.add(foundData.skin || 'skin-canarya');
    }

    if (activeUserBadge) activeUserBadge.innerText = "👤 Oyuncu: " + fullName;
    if (chartTitle) chartTitle.innerText = `📈 ${fullName} - GELİŞİM GRAFİĞİ`;
    if (lobbyUserBadge) lobbyUserBadge.innerText = "👤 Oyuncu: " + fullName;

    // ✅ DÜZELTME: Yeni kullanıcı giriş yaptığında oturum puanları sıfırlanır
    currentSessionEarnedPoints = 0;
    activePlayerSessionPoints = 0;

    // ✅ DÜZELTME: Giriş anında kendi puanını görsün (Ahmet'in puanı kalmasın)
    updateAllScoreDisplays();

    let directLoginModal = document.getElementById('directLoginModal');
    if (directLoginModal) directLoginModal.style.display = 'none';

    gameZone.classList.add('game-active');
    entryScreenModal.style.display = 'flex';
}

function openAddProfileModalFromLogin() {
    let directLoginModal = document.getElementById('directLoginModal');
    if (directLoginModal) directLoginModal.style.display = 'none';
    openAddProfileModal();
}

function backToRoleSelectionFromLogin() {
    let directLoginModal = document.getElementById('directLoginModal');
    if (directLoginModal) directLoginModal.style.display = 'none';
    showRoleSelection();
}
// ------------------------------------------

function openAddProfileModal() {
    newNameInput.value = "";
    newSurnameInput.value = "";
    let passInput = document.getElementById('newPasswordInput');
    if (passInput) passInput.value = "";
    addProfileModal.style.display = 'flex';
}

function closeAddProfileModal() {
    addProfileModal.style.display = 'none';
    openPatientDirectLoginModal(); // Profilden çıkınca doğrudan giriş ekranına dönsün
}

function createNewProfile() {
    let name = newNameInput.value.trim();
    let surname = newSurnameInput.value.trim();
    let password = document.getElementById('newPasswordInput') ? document.getElementById('newPasswordInput').value.trim() : "";

    let skinSelect = document.getElementById('newSkinSelect');
    let selectedSkin = skinSelect ? skinSelect.value : "skin-canarya";

    if (name === "" || surname === "") {
        alert("Lütfen geçerli bir Ad ve Soyad girin!");
        return;
    }

    let cleanKey = (surname + "_" + name).toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + Date.now();
    // ✅ DÜZELTME: totalScore: 0 ile başlat, puanlar birbirine karışmasın
    let newProfileObj = { name: name, surname: surname, password: password, skin: selectedSkin, history: [], totalScore: 0 };

    let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
    localData[cleanKey] = newProfileObj;
    localStorage.setItem('triflo_local_hastalar', JSON.stringify(localData));

    bulutProfilleri = localData;
    closeAddProfileModal();
    renderDoctorPanel();

    fetch(`https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${cleanKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfileObj)
    }).catch(() => {});

    alert("Profil başarıyla oluşturuldu! Şimdi giriş yapabilirsin.");
}

function enterGameFromLobby() {
    entryScreenModal.style.display = 'none';
    gearContainer.classList.add('visible');
    gameZone.classList.add('game-active');

    overlay.style.display = 'flex';

    updateClinicChart();
    isPlaying = true;
    requestAnimationFrame(gameLoop);
}

function backToProfilesFromLobby() {
    entryScreenModal.style.display = 'none';
    gearContainer.classList.remove('visible');
    gameZone.classList.remove('game-active');
    openPatientDirectLoginModal(); // Lobiden geri dönünce doğrudan giriş ekranına gitsin
}



function saveCurrentUserData() {
    if (!currentUserKey) return;

    let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
    if (localData[currentUserKey]) {
        localData[currentUserKey].history = sessionHistory;
        localStorage.setItem('triflo_local_hastalar', JSON.stringify(localData));
    }
    bulutProfilleri = localData;

    fetch(`https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${currentUserKey}/history.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionHistory)
    }).catch(() => {});
}

function logoutUser() {
    // ✅ DÜZELTME: Çıkış yapınca kimlik ve oturum puanı temizlenir
    // Böylece kalan puan bir sonraki kullanıcıya aktarılmaz.
    currentUserKey = "";
    currentSessionEarnedPoints = 0;
    activePlayerSessionPoints = 0;
    sessionHistory = [];

    // 1. Tüm oyun içi modalları ve pencereleri gizle
    let modalIds = [
        'profileDashboardModal', 
        'entryScreenModal', 
        'addProfileModal', 
        'doctorViewModal', 
        'aiCoachModal', 
        'overlay', 
        'upgradeScreen', 
        'chartModal', 
        'directLoginModal', 
        'roleSelectModal',
        'roleSelectionModal'
    ];
    
    modalIds.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Oyun alanını gizle, ilk karşılama banner'ını tekrar görünür yap
    let mainContainer = document.getElementById('mainContainer');
    let welcomeBanner = document.getElementById('welcomeBanner');

    if (mainContainer) mainContainer.style.display = 'none';
    if (welcomeBanner) welcomeBanner.style.display = 'flex';

    // 3. Sayfanın en başına (Hero bölümüne) yumuşakça kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


function promptDoctorLogin() {
    let password = prompt("Lütfen Doktor Şifresini Giriniz:");
    if (password === "1234") {
        gearContainer.classList.remove('visible');
        gameZone.classList.remove('game-active');
        doctorViewModal.style.display = 'flex';
    } else if (password !== null) {
        alert("Hatalı şifre girdin!");
    }
}


function closeDoctorPanel() {
    // 1. Doktor panelini gizle
    const doctorModal = document.getElementById('doctorViewModal');
    if (doctorModal) {
        doctorModal.style.display = 'none';
    }

    // 2. Oyun alanını ve gear bileşenlerini kapat
    if (gearContainer) gearContainer.classList.remove('visible');
    if (gameZone) gameZone.classList.remove('game-active');

    // 3. Karşılama banner'ını ve ana container'ı başlangıç durumuna getir
    let mainContainer = document.getElementById('mainContainer');
    let welcomeBanner = document.getElementById('welcomeBanner');

    if (mainContainer) mainContainer.style.display = 'none';
    if (welcomeBanner) welcomeBanner.style.display = 'flex';

    // 4. Sayfanın en başına yumuşakça kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

const levelMascotMessages = {
    level2: "🥉 Bronz seviyeyi usta gibi geçtin kanka, sırada Gümüş var!",
    level3: "🥈 Gümüş seviye de devrildi! Ciğer kapasiten harika açılıyor!",
    level4: "🥇 Altın seviyesindesin! Zirveye çok az kaldı, inanılmazsın!",
    champion: "🏆 Şampiyonlar ligi! Solunum rekorunu kırdın,harikasın!"
};

function updateMascotText(messageKey) {
    let textEl = document.getElementById('mascotText');
    if (textEl && levelMascotMessages[messageKey]) {
        textEl.innerHTML = `"${levelMascotMessages[messageKey]}"`;
    }
}


function viewPatientHistory(patientKey) {
    let pData = bulutProfilleri[patientKey];
    if (pData) {
        sessionHistory = pData.history || [];
        let fullName = pData.name.toUpperCase() + " " + (pData.surname ? pData.surname.toUpperCase() : "");
        chartTitle.innerText = `📈 ${fullName} - GELİŞİM GRAFİĞİ (DOKTOR GÖRÜNÜMÜ)`;
        updateClinicChart();
        chartModal.style.display = 'flex';
    }
}

birdY = convertPercentageToPixelY(0);
bird.style.top = birdY + 'px';

function showUpgradeScreen() {
    if (highestMeasured === 0) return;

    const trend = analyzeTrend(sessionHistory);
    if (trend && sessionHistory.length >= 3 && trend.slope > 0) {
        clinicalTarget = highestMeasured + Math.max(5, Math.round(trend.slope) + 3);
    } else {
        clinicalTarget = highestMeasured + 5;
    }
    if (clinicalTarget > 100) clinicalTarget = 100;

    upgMeasured.innerText = "%" + highestMeasured;
    upgTarget.innerText = "%" + clinicalTarget;

    overlay.style.display = 'none';
    upgradeScreen.style.display = 'flex';
}

function startFirstStage() {
    upgradeScreen.style.display = 'none';

    targetFlowTxt.innerText = "%" + clinicalTarget;
    let targetPixelY = convertPercentageToPixelY(clinicalTarget);
    targetLine.style.top = targetPixelY + 'px';
    targetLine.style.display = 'block';

    isAnalysisMode = false;
    currentStage = 1;

    resetGameMetrics();
}

function clearAllPipes() {
    const existingPipes = document.querySelectorAll('.pipe');
    existingPipes.forEach(function (el) { el.remove(); });
    pipes = [];
}

function resetGameMetrics() {
    clearAllPipes();
    birdY = convertPercentageToPixelY(currentFlow);
    score = 0;
    pipeSpawnTimer = 0;
    gameOver = false;
    scoreEl.innerText = "Skor: 0 / 3";
    levelEl.innerText = isAnalysisMode ? "Aşama: Başlangıç (Sütunsuz)" : stageNames[currentStage - 1];
}

function gameLoop() {
    if (!isPlaying || gameOver || isAsynchronousPause()) {
        if (isPlaying && !gameOver) requestAnimationFrame(gameLoop);
        return;
    }

    if (!isUserInteracting) {
        currentFlow -= 0.7;
        if (currentFlow < 0) currentFlow = 0;

        if (leverSlider) leverSlider.value = currentFlow;
        if (leverVal) leverVal.innerText = "%" + Math.round(currentFlow);
    } else {
        currentFlow = parseFloat(leverSlider.value);
        if (leverVal) leverVal.innerText = "%" + Math.round(currentFlow);
    }
// 1. Akış değiştikçe arka planı ve rüzgarı güncelle
updateAtmosphereAndWind(currentFlow);

// 2. Rüzgarın kuşa uyguladığı sarsıntı miktarını hesapla
let currentWind = applyWindTurbulence(currentFlow);
let hedefY = convertPercentageToPixelY(currentFlow);
    let yumusaklik = 0.04;
birdY = birdY + (hedefY - birdY) * yumusaklik;
birdY = birdY + 0.4;

    if (birdY < 0) birdY = 0;
    if (birdY > 470) birdY = 470;
    bird.style.top = birdY + 'px';

    if (!isAnalysisMode) {
        pipeSpawnTimer += 1;
        if (pipeSpawnTimer >= 150) {
            createClinicalPipe();
            pipeSpawnTimer = 0;
        }
        updatePipes();
    }

    requestAnimationFrame(gameLoop);
}

function isAsynchronousPause() {
    return isLungTwinActive || chartModal.style.display === 'flex' || aiCoachModal.style.display === 'flex';
}

function createClinicalPipe() {
    if (isAnalysisMode) return;

    let gap = stageGaps[currentStage - 1];
    let targetPixelY = convertPercentageToPixelY(clinicalTarget);

    let topHeight = targetPixelY - (gap / 2);
    let bottomTop = targetPixelY + (gap / 2);

    if (topHeight < 20) { topHeight = 20; bottomTop = topHeight + gap; }
    if (bottomTop > 480) { bottomTop = 480; topHeight = bottomTop - gap; }

    let bottomHeight = 500 - bottomTop;
    let spawnX = gameZone.clientWidth;

    let topPipe = document.createElement('div');
    topPipe.className = 'pipe';
    topPipe.style.height = topHeight + 'px';
    topPipe.style.top = '0px';
    topPipe.style.left = spawnX + 'px';
    if (isLungTwinActive) topPipe.style.display = 'none';

    let bottomPipe = document.createElement('div');
    bottomPipe.className = 'pipe';
    bottomPipe.style.height = bottomHeight + 'px';
    bottomPipe.style.top = bottomTop + 'px';
    bottomPipe.style.left = spawnX + 'px';
    if (isLungTwinActive) bottomPipe.style.display = 'none';

    gameZone.appendChild(topPipe);
    gameZone.appendChild(bottomPipe);

    pipes.push({ topEl: topPipe, bottomEl: bottomPipe, left: spawnX, passed: false });
}

function updatePipes() {
    if (isAnalysisMode) return;

    let moveSpeed = 1.8;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.left -= moveSpeed;
        p.topEl.style.left = p.left + 'px';
        p.bottomEl.style.left = p.left + 'px';

        if (!p.passed && p.left < 60) {
            p.passed = true;
            score++;
            scoreEl.innerText = "Skor: " + score + " / 3";

            triggerHaptic([30, 30, 50]);

            if (score >= 3) {
                advanceStage();
                return;
            }
        }

        if (checkCollision(p)) {
            gameOver = true;
            triggerGameOver();
            return;
        }

        if (p.left < -70) {
            p.topEl.remove();
            p.bottomEl.remove();
            pipes.splice(i, 1);
        }
    }
}

function checkCollision(p) {
    let birdRect = { left: 60, right: 98, top: birdY, bottom: birdY + 30 };
    let topPipeBottom = parseFloat(p.topEl.style.height);
    let bottomPipeTop = 500 - parseFloat(p.bottomEl.style.height);

    if (birdRect.right > p.left && birdRect.left < p.left + 65) {
        if (birdRect.top < topPipeBottom || birdRect.bottom > bottomPipeTop) {
            return true;
        }
    }
    return false;
}

function advanceStage() {
    let currentRank = calculatePlayerRank(clinicalTarget);
    badgeEl.innerText = "🏆 Rozet: " + stageBadges[currentStage - 1];

    triggerHaptic([50, 50, 50, 50, 100]);

    if (currentStage < 3) {
        currentStage++;
        
        // 👉 İŞTE BU KISMI EKLEYECEKSİN:
        if (currentStage === 2) updateMascotText('level3');
        else if (currentStage === 3) updateMascotText('level4');

        alert(`MÜKEMMEL! ${stageBadges[currentStage - 2]} Kazanıldı!\nKlinik Seviye: ${currentRank.title}\nZorluk artıyor, sonraki aşama başlıyor!`);
        resetGameMetrics();
    } else {
        // Şampiyon aşaması:
        updateMascotText('champion'); // 👉 Şuraya da şampiyon mesajını ekle

        sessionHistory.push(clinicalTarget);
        saveCurrentUserData();
        updateClinicChart();

        triggerBiyoAnalysis();
    }
}


function triggerBiyoAnalysis() {
    isPlaying = false;
    let lastScore = clinicalTarget;
    let playerRank = calculatePlayerRank(lastScore);
    
    // Bu seans kazanılan puanı hesapla
    currentSessionEarnedPoints = calculateEarnedPoints(lastScore);

    let biyoFeedback = `
        <div class="epic-title-card" style="text-align: center; margin-bottom: 12px;">
            <div style="font-size: 15px; color: #00ffcc; font-weight: bold;">🫁 ${playerRank.title}</div>
            <div style="font-size: 13px; color: #a0a0c0; margin-top: 3px;">Klinik Unvan: ${playerRank.badge}</div>
            <div style="font-size: 14px; color: #fdbb2d; font-weight: bold; margin-top: 6px; background: rgba(253,187,45,0.1); padding: 4px; border-radius: 4px;">🎁 Bu Seans Kazanılan Puan: +${currentSessionEarnedPoints} Puan</div>
        </div>
        <div style="font-size: 14px; color: #fff; line-height: 1.6; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(0,255,204,0.3);">
    `;
    
    // ... (devamındaki trend analiz kodları aynı kalabilir)



    const trend = analyzeTrend(sessionHistory);
    if (trend && sessionHistory.length >= 3) {
        let trendIcon = trend.slope > 0.5 ? "📈" : (trend.slope < -0.5 ? "📉" : "➡️");
        let trendText = trend.slope > 0.5
            ? `Gelişim ivmeniz güçlü (+%${Math.max(1, Math.round(trend.slope))}/seans).`
            : (trend.slope < -0.5
                ? `İvmeniz düşüş yönünde (%${Math.round(trend.slope)}/seans), dinlenme önerilir.`
                : "Performansınız kararlı bir seyirde.");

        biyoFeedback += `
            <div style="margin-top: 12px; padding: 12px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.4); border-radius: 8px;">
                <div style="font-size: 13px; color: #38bdf8; font-weight: bold; margin-bottom: 6px;">🤖 Akıllı Trend Analizi(Doğrusal Regresyon Modeli)</div>
                <div style="font-size: 13px; color: #e2e8f0; line-height: 1.6;">
                    ${trendIcon} ${trendText}<br>
                    📊 Tahmini sonraki seans kapasitesi: <b style="color:#00ffcc;">%${trend.prediction}</b><br>
                    🗓️ 7 seans sonrası projeksiyon: <b style="color:#38bdf8;">%${trend.weeklyProjection}</b><br>
                    <small style="color:#94a3b8;">Model uyum skoru (R²): ${trend.rSquared.toFixed(2)}</small>
                </div>
            </div>`;
    }

    biyoFeedback += `</div>`;

    aiCoachContent.innerHTML = biyoFeedback;
    aiCoachModal.style.display = 'flex';
}

// ✅✅✅ PUAN SİSTEMİ - TAMAMEN YENİDEN YAZILDI ✅✅✅
// Puan SADECE giriş yapan kullanıcıya (currentUserKey) eklenir.
// "İlk profile düş" mantığı tamamen kaldırıldı - artık puanlar asla birleşmiyor.


function getProfileTotalPoints(key) {
    if (!key) return 0;
    let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
    if (localData[key] && localData[key].totalScore !== undefined) {
        return Number(localData[key].totalScore) || 0;
    }
    if (bulutProfilleri[key] && bulutProfilleri[key].totalScore !== undefined) {
        return Number(bulutProfilleri[key].totalScore) || 0;
    }
    return 0;
}
function addPointsToProfile(key, amount) {
    if (!key || Number(amount) <= 0) {
        return false;
    }

    const localData =
        JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};

    // Bu profil gerçekten var mı?
    if (!localData[key]) {
        console.warn("Profil bulunamadı:", key);
        return false;
    }

    // SADECE BU PROFİLİN mevcut puanını al
    const oldScore = Number(localData[key].totalScore) || 0;

    // SADECE BU PROFİLE puan ekle
    const newScore = oldScore + Number(amount);

    localData[key].totalScore = newScore;

    // LocalStorage'a kaydet
    localStorage.setItem(
        'triflo_local_hastalar',
        JSON.stringify(localData)
    );

    // Bellekte de güncelle
    bulutProfilleri[key] = localData[key];

    // Firebase'de SADECE BU PROFİLİ güncelle
    fetch(
        `https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${key}/totalScore.json`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newScore)
        }
    ).catch(err => {
        console.warn("Firebase puan kaydı başarısız:", err);
    });

    return true;
}
function closeAiCoachToLobby() {
    if (!currentUserKey) {
        alert("Aktif kullanıcı bulunamadı!");
        return;
    }

    const earned = Number(currentSessionEarnedPoints) || 0;

    // Bu seansın puanını SADECE aktif profile ekle
    if (earned > 0) {
        const success = addPointsToProfile(currentUserKey, earned);

        if (success) {
            console.log(
                `${currentUserKey} profiline +${earned} puan eklendi.`
            );
        }
    }

    // Aynı puanın ikinci kez eklenmesini engelle
    currentSessionEarnedPoints = 0;

    // Modalları kapat
    if (aiCoachModal) {
        aiCoachModal.style.display = 'none';
    }

    if (chartModal) {
        chartModal.style.display = 'none';
    }

    // Lobiye dön
    if (entryScreenModal) {
        entryScreenModal.style.display = 'flex';
    }

    // Aktif kullanıcının güncel puanını göster
    updateAllScoreDisplays();
    updateLobbyScoreDisplay();

    // Oyunu sıfırla
    if (typeof resetGameState === 'function') {
        resetGameState();
    }
}

// ✅ DÜZELTME: Artık sayfadaki TÜM "Puan:" yazılarını ezemiyor.
// Sadece aktif kullanıcıya ait elementleri günceller.
function updateAllScoreDisplays() {
    // Giriş yapılmamışsa hiçbir şeye dokunma
    if (!currentUserKey) return;

    let totalScore = getProfileTotalPoints(currentUserKey);

    // 1. Lobideki ana skor elementini güncelle
    let scoreValEl = document.getElementById('scoreVal');
    if (scoreValEl) {
        scoreValEl.innerText = totalScore;
    }

    // 2. Aktif kullanıcıya ait işaretlenmiş elementleri güncelle
    // (HTML'de <span data-user-points="aktif"> gibi kullanabilirsin)
    document.querySelectorAll(`[data-user-points-for="${currentUserKey}"]`).forEach(el => {
        el.innerText = `Puan: ${totalScore}`;
    });

    // 3. Profil kartları varsa SADECE kendi kartını güncelle (data-user-key ile)
    let ownCard = document.querySelector(`.profile-card[data-user-key="${currentUserKey}"] .user-points`);
    if (ownCard) {
        ownCard.innerText = `Puan: ${totalScore}`;
    }
}



// Lobide toplam puanı güncelleyen yardımcı fonksiyon
function updateLobbyScoreDisplay() {
    if (!currentUserKey) return;
    let scoreValEl = document.getElementById('scoreVal');
    if (scoreValEl) {
        scoreValEl.innerText = getProfileTotalPoints(currentUserKey);
    }
}

function closeAiCoachAndShowChart() {
    aiCoachModal.style.display = 'none';
    toggleChart(true);
}

function closeAiCoachAndLogout() {
    aiCoachModal.style.display = 'none';
    // ✅ DÜZELTME: Çıkış yapmadan önce kalan seans puanı varsa kullanıcıya sor
    let earned = Number(currentSessionEarnedPoints) || 0;
    if (earned > 0 && currentUserKey) {
        addPointsToProfile(currentUserKey, earned);
        currentSessionEarnedPoints = 0;
    }
    logoutUser();
}

function returnToCalibration() {
    isAnalysisMode = true;
    currentStage = 0;
    highestMeasured = 0;
    targetLine.style.display = 'none';
    levelEl.innerText = "Aşama: Başlangıç (Sütunsuz)";
    targetFlowTxt.innerText = "Ölçülüyor...";
    badgeEl.innerText = "🏆 Kazanılan Rozet: Yok";

    confirmBtn.disabled = true;
    alertTxt.style.color = "#ff0055";
    alertTxt.innerText = "⚠️ Lütfen önce kolu yukarı hareket ettirerek üfleme yapın!";
    peakValTxt.innerText = "%0";
    calibValTxt.innerText = "%" + currentFlow;

    if (currentUserKey) {
        gearContainer.classList.add('visible');
        gameZone.classList.add('game-active');
    }

    clearAllPipes();
    overlay.style.display = 'flex';
    upgradeScreen.style.display = 'none';
    resetGameMetrics();
}

function toggleChart(show) {
    if (show) {
        chartModal.style.display = 'flex';
        isPlaying = false;
        if (typeof renderGraphBars === 'function') renderGraphBars();
    } else {
        chartModal.style.display = 'none';
        if (!isAnalysisMode) {
            isPlaying = true;
            requestAnimationFrame(gameLoop);
        }
    }
}

function triggerGameOver() {
    triggerHaptic([150, 100, 150]);
    alert("Oyun Bitti! Yeniden kalibre olup başlamak için ekrana dönülüyor.");
    returnToCalibration();
}

function setTheme(themeName) {
    document.body.classList.remove('theme-matrix', 'theme-sunset');
    if (themeName === 'matrix') {
        document.body.classList.add('theme-matrix');
    } else if (themeName === 'sunset') {
        document.body.classList.add('theme-sunset');
    }
    localStorage.setItem('triflo_theme', themeName);
}

window.addEventListener('DOMContentLoaded', () => {
    let savedTheme = localStorage.getItem('triflo_theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }
});

function deleteProfile(userKey) {
    let pData = bulutProfilleri[userKey];
    let profileName = pData ? (pData.name + " " + (pData.surname || "")) : "Bu profili";

    let confirmDelete = confirm(`⚠️ "${profileName}" adlı profili kalıcı olarak silmek istediğinden emin misin?`);
    if (!confirmDelete) return;

    let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
    if (localData[userKey]) {
        delete localData[userKey];
        localStorage.setItem('triflo_local_hastalar', JSON.stringify(localData));
    }

    delete bulutProfilleri[userKey];
    renderProfilesDashboard();
    renderDoctorPanel();

    fetch(`https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${userKey}.json`, {
        method: 'DELETE'
    }).catch(() => {});

    alert("Profil silindi!");
}

function openReportInNewTab() {
    let pData = bulutProfilleri[currentUserKey] || { name: "Yağmur", surname: "Taş" };
    let fullName = (pData.name + " " + (pData.surname || "")).toUpperCase();
    let currentDate = new Date().toLocaleDateString('tr-TR');
    let lastScore = sessionHistory.length > 0 ? sessionHistory[sessionHistory.length - 1] : 0;
    let playerRank = calculatePlayerRank(lastScore);

    // --- YENİ BİYOMEDİKAL ANALİZ HESAPLAMALARI ---
    let totalSessions = sessionHistory.length;
    let avgCapacity = totalSessions > 0 ? Math.round(sessionHistory.reduce((a, b) => a + b, 0) / totalSessions) : 0;
    let peakFlow = totalSessions > 0 ? Math.max(...sessionHistory) : 0;
    let peakIndex = totalSessions > 0 ? sessionHistory.indexOf(peakFlow) + 1 : 0;

    // Trend analizi entegrasyonu
    let trend = analyzeTrend(sessionHistory);
    let trendText = "Veri yetersiz";
    let trendColor = "#94a3b8";
    if (trend) {
        if (trend.slope > 0.5) {
            trendText = `Güçlü Yükseliş İvmesi (+%${Math.round(trend.slope)} / seans)`;
            trendColor = "#00ffcc";
        } else if (trend.slope < -0.5) {
            trendText = `Düşüş Eğilimi (%${Math.round(trend.slope)} / seans)`;
            trendColor = "#ff0055";
        } else {
            trendText = "Kararlı / Yatay Seyir";
            trendColor = "#38bdf8";
        }
    }

    let modalContentBox = document.querySelector('#chartModal > div') || document.querySelector('#chartModal');
    if (!modalContentBox) return;

    if (!originalChartContent) {
        originalChartContent = modalContentBox.innerHTML;
    }

    modalContentBox.innerHTML = `
        <div style="text-align: left; padding: 15px; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-height: 82vh; overflow-y: auto;">
            <h2 style="color: #00ffcc; font-size: 20px; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-top: 0;">🫁 TRIFLO KLİNİK RAPORU & ANALİZİ</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #94a3b8; font-size: 13px;">
                <div><b>Hasta / Oyuncu:</b> ${fullName}</div>
                <div><b>Tarih:</b> ${currentDate}</div>
            </div>

            <div style="background: rgba(0,255,204,0.1); border: 1px solid rgba(0,255,204,0.3); padding: 10px; border-radius: 8px; text-align: center; margin-bottom: 12px;">
                <div style="font-size: 15px; font-weight: bold; color: #00ffcc;">${playerRank.title}</div>
                <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Klinik Unvan: ${playerRank.badge}</div>
            </div>

            <!-- BÖLÜM 1: SOLUNUM FONKSİYON VE VOLÜM ANALİZİ -->
            <div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <h3 style="margin-top:0; color: #38bdf8; font-size: 14px; border-bottom: 1px solid #1e293b; padding-bottom: 5px;">📊 1. Solunum Fonksiyon ve Volüm Analizi</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-top: 8px;">
                    <div>🔹 Toplam Seans: <b>${totalSessions}</b></div>
                    <div>🔹 Ortalama Kapasite: <b style="color:#00ffcc;">%${avgCapacity}</b></div>
                    <div>🔹 Pik Akış Hızı: <b style="color:#fdbb2d;">%${peakFlow}</b> (Seans ${peakIndex})</div>
                    <div>🔹 Son Seans Hedefi: <b>%${lastScore}</b></div>
                </div>
            </div>

            <!-- BÖLÜM 2: KLİNİK DEĞERLENDİRME -->
            <div style="background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <h3 style="margin-top:0; color: #38bdf8; font-size: 14px; border-bottom: 1px solid #1e293b; padding-bottom: 5px;">🤖 2. Klinik Değerlendirme  Trendi</h3>
                <div style="font-size: 13px; line-height: 1.6; margin-top: 8px;">
                    <div>📈 Performans İvmesi: <b style="color: ${trendColor};">${trendText}</b></div>
                    ${trend ? `<div>🔮 Tahmini Sonraki Seans: <b style="color: #00ffcc;">%${trend.prediction}</b></div>
                    <div>🗓️ 7 Seans Projeksiyonu: <b style="color: #38bdf8;">%${trend.weeklyProjection}</b></div>` : ''}
                    <div style="margin-top: 6px; color: #94a3b8; font-size: 12px; font-style: italic;">💡 : Diyafram gücünü sabitlemek için düzenli inhalasyon pratiklerine devam edilmelidir.</div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="margin-bottom: 5px; color: #cbd5e1; font-size: 13px;">Tüm Seans Kapasite Geçmişi:</h4>
                <p style="background: #0f172a; padding: 8px; border-radius: 6px; font-family: monospace; color: #38bdf8; font-size: 12px; margin: 0; word-break: break-all;">[ ${sessionHistory.join(', ')} ]</p>
            </div>

            <button onclick="window.print()" style="display: block; width: 100%; background: #00ffcc; color: #0f172a; border: none; padding: 12px; font-weight: bold; font-size: 15px; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                🖨️ PDF Olarak Kaydet / Yazdır
            </button>

            <button onclick="restoreChartModal()" style="display: block; width: 100%; background: #334155; color: #fff; border: none; padding: 9px; font-weight: bold; font-size: 13px; border-radius: 6px; cursor: pointer;">
                ↩️ Grafiğe Geri Dön
            </button>
        </div>
    `;
}
function renderDoctorPanel() {
    // Doktor panelinin başlık kısmına "Yeni Hasta Ekle" butonu entegre ediliyor
    let doctorContainer = document.querySelector('.doctor-container');
    if (doctorContainer) {
        let header = doctorContainer.querySelector('.doctor-header');
        if (header && !document.getElementById('addPatientFromDocBtn')) {
            header.innerHTML = `
                <h2 style="color: #00ffcc; margin:0; font-size: 20px;">🩺 Doktor Klinik İzleme Merkezi</h2>
                <div style="display:flex; gap: 8px;">
                    <button id="addPatientFromDocBtn" class="menu-btn" style="border-color:#00ffcc; color:#00ffcc;" onclick="openDoctorAddPatientModal()">➕ Yeni Hasta Ekle</button>
                    <button class="menu-btn" style="border-color:#ff0055; color:#ff0055;" onclick="closeDoctorPanel()">Paneli Kapat ❌</button>
                </div>
            `;
        }
    }

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
        // ✅ Her hastanın kendi puanını gösterir
        let totalPoints = Number(pData.totalScore) || 0;

                let row = document.createElement('div');
        row.className = 'patient-row';
        row.setAttribute('data-user-key', key); // ✅ Kartı kullanıcıya bağla
        row.innerHTML = `
            <div>
                <strong style="color:#00ffcc; font-size:15px;">${pData.name} ${pData.surname || ""}</strong>
                <div style="font-size:12px; color:#a0a0c0; margin-top:2px;">Seans Sayısı: ${totalSeans} | Şifre: ${pData.password ? "******" : "Yok"} | <span class="user-points" style="color:#fdbb2d; font-weight:bold;">Puan: ${totalPoints}</span></div>
            </div>
            <div style="text-align: right; display: flex; align-items: center; gap: 8px;">
                <div>
                    <div style="font-size:12px; color:#ff0055; font-weight:bold;">Son Seans Hedefi: ${lastSeans}</div>
                    <button class="menu-btn" style="padding: 4px 10px; font-size:11px; margin-top:5px;" onclick="viewPatientHistory('${key}')">Tarihçe Grafiği 📊</button>
                </div>
                <button class="menu-btn" style="border-color:#ff0055; color:#ff0055; padding: 6px 10px; font-size:12px;" onclick="deletePatientProfile('${key}')">Sil 🗑️</button>
            </div>
        `;

       patientListContainer.appendChild(row);
    });
}
function generateRandomPassword(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function deletePatientProfile(key) {
    let pData = bulutProfilleri[key];
    let fullName = pData ? `${pData.name} ${pData.surname || ""}` : "Bu hasta";
    
    if (confirm(`⚠️ ${fullName} adlı hasta profilini silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
        // Lokal hafızadan kaldır
        let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
        delete localData[key];
        localStorage.setItem('triflo_local_hastalar', JSON.stringify(localData));

        // Bellekteki profillerden kaldır
        delete bulutProfilleri[key];

        // Eğer silinen kullanıcı şu an giriş yapmışsa oturumu da temizle
        if (currentUserKey === key) {
            currentUserKey = "";
            currentSessionEarnedPoints = 0;
            activePlayerSessionPoints = 0;
        }

        // Ekranı güncelle
        renderDoctorPanel();
        renderProfilesDashboard();

        // Firebase'den sil
        fetch(`https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${key}.json`, {
            method: 'DELETE'
        }).catch(() => {});

        alert(`${fullName} profili başarıyla silindi.`);
    }
}

// Doktorun yeni hasta eklemesi için tetiklenecek fonksiyon
function openDoctorAddPatientModal() {
    let name = prompt("Yeni Hastanın Adını Girin:");
    if (!name || name.trim() === "") return;
    
    let surname = prompt("Yeni Hastanın Soyadını Girin:");
    if (!surname || surname.trim() === "") return;

    // Otomatik rastgele şifre önerelim veya kullanıcı isterse değiştirebilsin
    let suggestedPassword = generateRandomPassword(8);
    let passwordInput = prompt(
        `"${name.trim()} ${surname.trim()}" için bir şifre belirleyin:\n\n(Rastgele üretilen güvenli şifreyi değiştirebilir veya olduğu gibi bırakabilirsiniz)`, 
        suggestedPassword
    );

    if (passwordInput === null) return; // İptal edilirse

    let cleanKey = (surname.trim() + "_" + name.trim()).toLowerCase().replace(/[^a-z0-9]/g, '') + "_" + Date.now();
    // ✅ DÜZELTME: totalScore: 0 ile başlat
    let newProfileObj = { 
        name: name.trim(), 
        surname: surname.trim(), 
        password: passwordInput.trim(), 
        skin: "skin-canarya", 
        history: [],
        totalScore: 0
    };

    let localData = JSON.parse(localStorage.getItem('triflo_local_hastalar')) || {};
    localData[cleanKey] = newProfileObj;
    localStorage.setItem('triflo_local_hastalar', JSON.stringify(localData));

    bulutProfilleri = localData;
    renderDoctorPanel();
    renderProfilesDashboard();

    // Firebase'e kaydetme
    fetch(`https://triflo-game-default-rtdb.europe-west1.firebasedatabase.app/hastalar/${cleanKey}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfileObj)
    }).catch(() => {});

    alert(`Dr. Onayıyla ${name} ${surname} adlı hasta profili başarıyla oluşturuldu!\nGeçici/Belirlenen Şifre: ${passwordInput.trim()}`);
}


function restoreChartModal() {
    let modalContentBox = document.querySelector('#chartModal > div');
    if (modalContentBox && originalChartContent) {
        modalContentBox.innerHTML = originalChartContent;
        updateClinicChart();
    }
}
// ESP32 Donanımından (Bluetooth/Serial) gelen 3 topun verisini işleyen ana fonksiyon
function updateFlowFromHardware(ball1Value, ball2Value, ball3Value) {
    if (isUserInteracting) return; // Kullanıcı şu an elle slider'a dokunuyorsa donanımdan gelen veriyi ezme

    // 3 topun değerini toplayarak (veya sistemine göre harmanlayarak) toplam akışı buluyoruz
    let calculatedFlow = (ball1Value + ball2Value + ball3Value);
    
    // Değeri %0 ile %100 arasında sınırlandır
    currentFlow = Math.max(0, Math.min(100, calculatedFlow));

    // Slider'ı fiziksel üflemeyle eş zamanlı hareket ettir
    if (leverSlider) {
        leverSlider.value = currentFlow;
    }
    if (leverVal) {
        leverVal.innerText = "%" + Math.round(currentFlow);
    }
    
    // Klinik sensör panelindeki anlık akış metnini güncelle
    if (liveFlowTxt) {
        liveFlowTxt.innerText = "%" + Math.round(currentFlow);
    }

    // Kalibrasyon aşamasındaysak en yüksek gücü takip et
    if (isAnalysisMode && currentFlow > highestMeasured) {
        highestMeasured = Math.round(currentFlow);
        if (peakValTxt) peakValTxt.innerText = "%" + highestMeasured;
        
        if (highestMeasured > 5 && confirmBtn) {
            confirmBtn.disabled = false;
            if (alertTxt) {
                alertTxt.style.color = "#00ffcc";
                alertTxt.innerText = "✔️ Harika üfleme! Seviyeyi onaylayabilirsin.";
            }
        }
    }
}
// --- ATMOSFER VE RÜZGAR YÖNETİMİ ---
let windTimer = 0;
let windForce = 0;

function updateAtmosphereAndWind(flowValue) {
    let gameZone = document.getElementById('gameZone');
    if (!gameZone) return;

    // 1. Akış değerine göre arka plan temasını değiştirme
    if (flowValue < 35) {
        // Normal / Rüzgarlı Vadi Teması
        gameZone.style.background = "linear-gradient(to bottom, #1a2a6c, #b21f1f, #fdbb2d)";
        gameZone.classList.remove('wind-active');
    } else if (flowValue >= 35 && flowValue < 75) {
        // Stratosfer / Bulut Katmanı (Rüzgar artıyor)
        gameZone.style.background = "linear-gradient(to bottom, #0f2027, #203a43, #2c5364)";
        gameZone.classList.add('wind-active');
    } else {
        // Derin Uzay Teması (Zirve Akış & Maksimum Rüzgar)
        gameZone.style.background = "radial-gradient(circle at center, #1b1b3a 0%, #05050f 100%)";
        gameZone.classList.add('wind-active');
    }
}

// Rüzgarın kuşun dikey hareketine (fizik motoruna) etkisini hesaplayan fonksiyon
function applyWindTurbulence(flowValue) {
    if (flowValue < 30) return 0; // Düşük akışta rüzgar yok
    
    windTimer += 0.1;
    // Akış seviyesi ne kadar yüksekse rüzgar o kadar sert sarsar
    let turbulenceIntensity = (flowValue / 100) * 3.5; 
    windForce = Math.sin(windTimer) * turbulenceIntensity;
    
    return windForce;
}
// 1. "Giriş Yap" butonuna basıldığında çalışacak ana fonksiyon
function openRoleSelection() {
    // Önce açık olabilecek tüm modalları kapatalım
    closeAllModals();

    // Kullanıcıya rol soran şık bir prompt veya modal açalım
    let userChoice = confirm("Sisteme nasıl giriş yapmak istiyorsun?\n\n[Tamam] -> Hasta Girişi\n[İptal] -> Doktor / Klinik Paneli");

    if (userChoice) {
        // HASTA SEÇTİYSE: Gönderdiğin 1. görseldeki Ad, Soyad, Şifre ekranını açar
        let patientModal = document.getElementById('profileDashboardModal'); 
        if (patientModal) {
            patientModal.style.display = 'flex';
        } else {
            // Eğer modal ID'si farklıysa buraya senin projedeki ID'yi yazabiliriz
            console.log("Hasta giriş paneli açılıyor...");
        }
    } else {
        // DOKTOR SEÇTİYSE: Doğrudan Doktor Panelini açar
        let doctorModal = document.getElementById('doctorViewModal');
        if (doctorModal) {
            doctorModal.style.display = 'flex';
            if (typeof renderDoctorPanel === 'function') {
                renderDoctorPanel();
            }
        }
    }
}

// Güvenli kapatma fonksiyonu
function closeAllModals() {
    let modals = document.querySelectorAll('.modal-overlay, #profileDashboardModal, #doctorViewModal, #roleSelectModal');
    modals.forEach(m => {
        if (m) m.style.display = 'none';
    });
}

function renderGraphBars() {
    let container = document.getElementById('graphContainer');
    if (!container) return;
    
    container.innerHTML = ''; // Eski içeriği temizle
    
    let sessions = window.sessionHistory || [30, 45, 60, 75, 85, 90, 95, 80, 88]; 
    
    sessions.forEach((val, index) => {
        let barWrapper = document.createElement('div');
        // min-width ekleyerek çubukların sıkışmasını önlüyoruz ve kaydırma alanı yaratıyoruz
        barWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; min-width: 35px; flex-shrink: 0;';
        
        let bar = document.createElement('div');
        bar.style.cssText = `width: 24px; background: linear-gradient(to top, #00bfff, #00ffcc); height: ${val}%; border-radius: 4px 4px 0 0; transition: height 0.3s; box-shadow: 0 0 10px rgba(0,255,204,0.3);`;
        
        let label = document.createElement('span');
        label.style.cssText = 'font-size: 10px; color: #a0a0c0; margin-top: 6px;';
        label.innerText = `S${index + 1}`;
        
        barWrapper.appendChild(bar);
        barWrapper.appendChild(label);
        container.appendChild(barWrapper);
    });

    // Yeni seans eklendiğinde otomatik olarak en sağdaki (en son) üflemeye kaydırması için:
    container.scrollLeft = container.scrollWidth;
}
