// --- INPUT VE SES KONTROL MİMARİSİ ---

// Tıklama Ses Efekti (Web Audio API)
function playClickSound() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        let clickOsc = audioCtx.createOscillator();
        let clickGain = audioCtx.createGain();
        
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(450, audioCtx.currentTime);
        clickOsc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.05);
        
        clickGain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        
        clickOsc.connect(clickGain);
        clickGain.connect(audioCtx.destination);
        
        clickOsc.start();
        clickOsc.stop(audioCtx.currentTime + 0.05);
    } catch(e) {}
}

// Global buton tıklamalarına ses entegrasyonu
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('profile-card')) {
        playClickSound();
    }
});

// Vites kolu (slider) dinleyicisi
leverSlider.addEventListener('input', function(e) {
    currentFlow = parseInt(e.target.value);
    leverVal.innerText = "%" + currentFlow;
    liveFlowTxt.innerText = "%" + currentFlow;
    
    if (isAnalysisMode) {
        calibValTxt.innerText = "%" + currentFlow;
        if (currentFlow > highestMeasured) {
            highestMeasured = currentFlow;
            peakValTxt.innerText = "%" + highestMeasured;
        }
        if (highestMeasured > 0) {
            confirmBtn.disabled = false;
            alertTxt.style.color = "#00ffcc";
            alertTxt.innerText = "✅ Başarıyla ölçüldü! Onaylayıp ilerleyebilirsiniz.";
        }
    }

    updateLungTwinSimulation(currentFlow);
    updateAudioTone(currentFlow);
});

// Ses Modu Aç/Kapat
function toggleSoundMode() {
    isSoundActive = !isSoundActive;
    if (isSoundActive) {
        initAudioContext();
        soundToggleBtn.innerText = "🔊 Ses Efekti: AÇIK";
        soundToggleBtn.style.backgroundColor = "#ff0055";
        soundToggleBtn.style.color = "#fff";
    } else {
        stopAudioStream();
        soundToggleBtn.innerText = "🔊 Ses Efekti: KAPALI";
        soundToggleBtn.style.backgroundColor = "rgba(0,0,0,0.8)";
        soundToggleBtn.style.color = "#ff0055";
    }
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!oscillator) {
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine'; 
        oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime); 
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
    }
}

function updateAudioTone(flowValue) {
    if (!currentUserKey || profileDashboardModal.style.display === 'flex' || !isSoundActive || !audioCtx || !oscillator || !gainNode) {
        if (gainNode && audioCtx) {
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        }
        return;
    }
    
    if (flowValue === 0) {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    } else {
        let freq = 100 + (flowValue * 6); 
        let volume = (flowValue / 100) * 0.15; 
        
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
}

function stopAudioStream() {
    if (gainNode && audioCtx) {
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    }
}
// Örnek Bluetooth veri okuma anı (input.js içinde)
function onBluetoothDataReceived(receivedString) {
    try {
        // Örn gelen veri: {"b1": 40, "b2": 20, "b3": 10} veya "40,20,10"
        let data = JSON.parse(receivedString); 
        
        // game.js içindeki fonksiyonumuzu çağırıyoruz
        updateFlowFromHardware(data.b1, data.b2, data.b3);
    } catch (e) {
        console.log("Veri ayrıştırılamadı:", receivedString);
    }
}
// Üst menüdeki "Giriş Yap" butonuna bağlanacak ana fonksiyon
function openLoginFlow() {
    closeAllModals();
    let roleModal = document.getElementById('roleSelectModal');
    if (roleModal) roleModal.style.display = 'flex';
}

// Rol seçim yönlendiricisi
function selectRole(role) {
    closeAllModals();
    if (role === 'patient') {
        // Hasta seçildiyse Ad-Soyad-Şifre modalını aç[span_2](start_span)[span_2](end_span)
        let patientModal = document.getElementById('patientLoginModal');
        if (patientModal) patientModal.style.display = 'flex';
    } else if (role === 'doctor') {
        // Doktor seçildiyse doğrudan Doktor Paneli modalını aç
        let doctorModal = document.getElementById('doctorViewModal');
        if (doctorModal) {
            doctorModal.style.display = 'flex';
            if (typeof renderDoctorPanel === 'function') {
                renderDoctorPanel();
            }
        }
    }
}

// Tüm modalları kapatma yardımcısı
function closeAllModals() {
    let modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.style.display = 'none');
}

// Hasta giriş kontrolü
function handlePatientLogin() {
    let name = document.getElementById('patientNameInput').value.trim();
    let surname = document.getElementById('patientSurnameInput').value.trim();
    
    if (!name || !surname) {
        alert("Lütfen ad ve soyad alanlarını doldurun kanka!");
        return;
    }
    
    // Giriş başarılı olunca paneli kapatıp oyuna/simülasyona devam edebiliriz
    closeAllModals();
    console.log("Giriş yapan hasta:", name, surname);
}
// =========================================================
//  WEB SERIAL (USB SERİ PORT) CANLI VERİ BAĞLANTI MİMARİSİ
// =========================================================

let port = null;
let reader = null;
let keepReading = false;

async function connectToArduinoSerial() {
    // Tarayıcı Web Serial API'sini destekliyor mu kontrol et
    if (!("serial" in navigator)) {
        alert("⚠️ Tarayıcınız Web Serial API'yi desteklemiyor. Lütfen Chrome/Edge kullanın veya projeyi bir yerel sunucuda (http://) açın!");
        return;
    }

    try {
        // 1. Kullanıcıdan USB Seri Cihazını (Arduino Nano ESP32) seçmesini iste
        port = await navigator.serial.requestPort();
        
        // 2. Portu Arduino varsayılan baud hızıyla aç (115200)
        await port.open({ baudRate: 115200 });
        
        alert("⚡ Arduino Nano ESP32 Bağlantısı Başarılı! Üfleme Verileri Alınıyor...");

        keepReading = true;
        readSerialData();

    } catch (err) {
        console.error("Seri port bağlantı hatası:", err);
        alert("❌ Bağlantı kurulamadı veya iptal edildi: " + err.message);
    }
}

async function readSerialData() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    let buffer = "";

    try {
        while (keepReading) {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            if (value) {
                buffer += value;
                // Satır sonu karakterine (\n) göre tamponu böl
                let lines = buffer.split("\n");
                buffer = lines.pop(); // Son tamamlanmamış satırı tamponda tut

                for (let line of lines) {
                    processIncomingLine(line.trim());
                }
            }
        }
    } catch (error) {
        console.error("Veri okuma hatası:", error);
    }
}

// Gelen veriyi (Örn: "30,20,10" veya tek sayı "60") ayrıştırıp oyuna gönderen fonksiyon
function processIncomingLine(line) {
    if (!line) return;

    // 1. Eğer gelen veri JSON formatındaysa: {"b1": 40, "b2": 20, "b3": 10}
    if (line.startsWith("{") && line.endsWith("}")) {
        try {
            let data = JSON.parse(line);
            let b1 = Number(data.b1) || 0;
            let b2 = Number(data.b2) || 0;
            let b3 = Number(data.b3) || 0;
            if (typeof updateFlowFromHardware === "function") {
                updateFlowFromHardware(b1, b2, b3);
            }
            return;
        } catch (e) {}
    }

    // 2. Eğer gelen veri virgülle ayrılmışsa: "30,20,10"
    if (line.includes(",")) {
        let parts = line.split(",").map(Number);
        if (parts.length >= 3) {
            if (typeof updateFlowFromHardware === "function") {
                updateFlowFromHardware(parts[0], parts[1], parts[2]);
            }
            return;
        }
    }

    // 3. Eğer gelen veri tek bir yüzde veya akış değeri ise: "75"
    let singleVal = Number(line);
    if (!isNaN(singleVal)) {
        if (typeof updateFlowFromHardware === "function") {
            updateFlowFromHardware(singleVal, 0, 0);
        }
    }
}

// Bağlantıyı güvenli kapatma fonksiyonu
async function disconnectSerial() {
    keepReading = false;
    if (reader) {
        await reader.cancel();
    }
    if (port) {
        await port.close();
    }
    console.log("Seri port bağlantısı kapatıldı.");
}
