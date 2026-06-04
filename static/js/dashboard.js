// =====================================
// CLOCK
// =====================================

function updateClock(){

    const clock =
    document.getElementById(
        "liveClock"
    );

    if(clock){

        clock.innerHTML =
        new Date()
        .toLocaleTimeString();

    }

}

setInterval(
    updateClock,
    1000
);

updateClock();


// =====================================
// TOAST
// =====================================

function showToast(message){

    const container =
    document.getElementById(
        "toastContainer"
    );

    const toast =
    document.createElement(
        "div"
    );

    toast.className =
    "toast-card";

    toast.innerHTML =
    message;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.remove();

    }, 3000);

}


// =====================================
// LOADING
// =====================================

function showLoading(){

    const overlay =
    document.getElementById(
        "loadingOverlay"
    );

    if(overlay){

        overlay.style.display =
        "flex";

    }

}

function hideLoading(){

    const overlay =
    document.getElementById(
        "loadingOverlay"
    );

    if(overlay){

        overlay.style.display =
        "none";

    }

}


// =====================================
// LIGHT
// =====================================

async function toggleLight(){

    const sw =
    document.getElementById(
        "lightSwitch"
    );

    // Optimistically disable UI until server confirms
    sw.disabled = true;

    try{
        const response = await fetch(
            "/api/light/toggle",
            { method: "POST" }
        );

        const data = await response.json();

        if(data.success){
            // Refresh status to pick up global state
            await refreshStatus();
            showToast("💡 Light Updated");
        }
        else{
            // revert toggle
            sw.checked = !sw.checked;
            showToast(data.error === "RFID_REQUIRED" ? "⚠ Scan RFID first to enable controls" : "❌ Failed to update light");
        }

    }
    catch(err){
        console.error(err);
        sw.checked = !sw.checked;
        showToast("❌ Failed to update light");
    }
    finally{
        sw.disabled = false;
    }

}


// =====================================
// FAN MODE
// =====================================

async function setFanMode(mode){

    await fetch(
        "/api/fan/mode",
        {
            method:"POST",

            headers:{
                "Content-Type":
                "application/json"
            },

            body:JSON.stringify({
                mode
            })
        }
    );

    const autoBtn =
    document.getElementById(
        "autoBtn"
    );

    const manualBtn =
    document.getElementById(
        "manualBtn"
    );

    const fanSwitch =
    document.getElementById(
        "fanSwitch"
    );

    if(mode === "auto"){

        autoBtn.classList.add(
            "btn-primary"
        );

        autoBtn.classList.remove(
            "btn-secondary"
        );

        manualBtn.classList.add(
            "btn-secondary"
        );

        manualBtn.classList.remove(
            "btn-primary"
        );

        fanSwitch.disabled =
        true;

        showToast(
            "🌀 Auto Mode Enabled"
        );

    }
    else{

        manualBtn.classList.add(
            "btn-primary"
        );

        manualBtn.classList.remove(
            "btn-secondary"
        );

        autoBtn.classList.add(
            "btn-secondary"
        );

        autoBtn.classList.remove(
            "btn-primary"
        );

        fanSwitch.disabled =
        false;

        showToast(
            "🌀 Manual Mode Enabled"
        );

    }

}


// =====================================
// FAN TOGGLE
// =====================================

async function toggleFan(){

    const fanSwitch =
    document.getElementById(
        "fanSwitch"
    );

    const fanStatus =
    document.getElementById(
        "fanStatus"
    );

    if(fanSwitch.disabled){

        showToast(
            "⚠ Fan In Auto Mode or RFID not scanned"
        );

        // revert visual if user tried
        await refreshStatus();
        return;

    }

    // disable while processing
    fanSwitch.disabled = true;

    try{
        if(fanSwitch.checked){

            const response = await fetch(
                "/api/fan/on",
                { method: "POST" }
            );

            const data = await response.json();

            if(data.success){
                await refreshStatus();
                showToast("🌀 Fan ON");
            }
            else{
                fanSwitch.checked = !fanSwitch.checked;
                showToast(data.error === "RFID_REQUIRED" ? "⚠ Scan RFID first to enable controls" : "❌ Failed to update fan");
            }

        }
        else{

            const response = await fetch(
                "/api/fan/off",
                { method: "POST" }
            );

            const data = await response.json();

            if(data.success){
                await refreshStatus();
                showToast("🌀 Fan OFF");
            }
            else{
                fanSwitch.checked = !fanSwitch.checked;
                showToast(data.error === "RFID_REQUIRED" ? "⚠ Scan RFID first to enable controls" : "❌ Failed to update fan");
            }

        }
    }
    catch(err){
        console.error(err);
        fanSwitch.checked = !fanSwitch.checked;
        showToast("❌ Failed to update fan");
    }
    finally{
        // re-evaluate disabled state from server
        await refreshStatus();
    }

}
// =====================================
// DOOR
// =====================================

async function toggleDoor(){
    const doorSwitch = document.getElementById("doorSwitch");
    doorSwitch.disabled = true;

    try {
        const response = await fetch(
            "/api/door/toggle",
            { method: "POST" }
        );
        const data = await response.json();

        if (!data.success) {
            showToast(data.error === "RFID_REQUIRED" ? "⚠ Scan RFID first to unlock door control" : "❌ Door update failed");
        }
    }
    catch (error) {
        console.error(error);
        showToast("❌ Door update failed");
    }
    finally {
        await refreshStatus();
    }
}


// =====================================
// GATE
// =====================================

async function toggleGate(){
    const gateSwitch = document.getElementById("gateSwitch");
    gateSwitch.disabled = true;

    try {
        const response = await fetch(
            "/api/gate/toggle",
            { method: "POST" }
        );
        const data = await response.json();

        if (!data.success) {
            showToast(data.error === "RFID_REQUIRED" ? "⚠ Scan RFID first to unlock gate control" : "❌ Gate update failed");
        }
    }
    catch (error) {
        console.error(error);
        showToast("❌ Gate update failed");
    }
    finally {
        await refreshStatus();
    }
}


// =====================================
// RFID
// =====================================

async function scanRFID(){

    const card =
    document.getElementById(
        "rfidCard"
    ).value;

    if(!card){

        showToast(
            "⚠ Enter RFID Card"
        );

        return;

    }

    const response =
    await fetch(
        "/api/rfid",
        {
            method:"POST",

            headers:{
                "Content-Type":
                "application/json"
            },

            body:JSON.stringify({
                card
            })
        }
    );

    const data =
    await response.json();

    const result =
    document.getElementById(
        "rfidResult"
    );

    if(data.granted){

        result.innerHTML =
        "✔ Access Granted";

        result.className =
        "status-open";

        showToast(
            "🔐 RFID Granted"
        );

    }
    else{

        result.innerHTML =
        "❌ Access Denied";

        result.className =
        "status-danger";

        showToast(
            "❌ RFID Denied"
        );

    }

}


// =====================================
// GAS SENSOR
// =====================================

let lastGasStatus = "SAFE";

async function updateGas(){

    const value =
    document.getElementById(
        "gasSlider"
    ).value;

    document.getElementById(
        "gasValue"
    ).innerHTML =
    value + "%";

    const gasStatus =
    document.getElementById(
        "gasStatus"
    );

    let currentStatus =
    "SAFE";

    if(value <= 30){

        currentStatus =
        "SAFE";

        gasStatus.className =
        "status-safe";

    }
    else if(value <= 60){

        currentStatus =
        "WARNING";

        gasStatus.className =
        "status-warning";

    }
    else{

        currentStatus =
        "DANGER";

        gasStatus.className =
        "status-danger";

    }

    gasStatus.innerHTML =
    currentStatus;

    if(
        currentStatus !==
        lastGasStatus
    ){

        showToast(
            "⛽ " +
            currentStatus
        );

        lastGasStatus =
        currentStatus;

    }

    fetch(
        "/api/gas",
        {
            method:"POST",

            headers:{
                "Content-Type":
                "application/json"
            },

            body:JSON.stringify({
                value
            })
        }
    );

}


// =====================================
// CAMERA
// =====================================

let currentDeviceIsOwner = false;

async function toggleCamera(){

    const cameraSwitch =
    document.getElementById(
        "cameraSwitch"
    );

    const cameraStatus =
    document.getElementById(
        "cameraStatus"
    );

    const video =
    document.getElementById(
        "cameraFeed"
    );

    const shareInfo =
    document.getElementById(
        "cameraShareInfo"
    );

    if(cameraSwitch.checked){

        try{

            const response =
            await fetch(
                "/api/camera/toggle",
                {
                    method:"POST"
                }
            );

            const data =
            await response.json();

            video.src =
            "/api/video_feed";

            video.style.display =
            "block";

            cameraStatus.innerHTML =
            "ON";

            cameraStatus.className =
            "device-state on";

            shareInfo.style.display =
            "block";

            showToast(
                "📹 CCTV Feed Started"
            );

        }
        catch(error){

            cameraSwitch.checked =
            false;

            showToast(
                "❌ Camera Feed Error"
            );

        }

    }
    else{

        video.src = "";

        video.style.display =
        "none";

        shareInfo.style.display =
        "none";

        cameraStatus.innerHTML =
        "OFF";

        cameraStatus.className =
        "device-state off";

        fetch(
            "/api/camera/toggle",
            {
                method:"POST"
            }
        );

        showToast(
            "📹 CCTV Feed Stopped"
        );

    }

}


// =====================================
// EXPORT CSV
// =====================================

function exportLogs(){

    window.location =
    "/export/csv";

}


// =====================================
// CLEAR LOGS
// =====================================

async function clearLogs(){

    try{

        const response =
        await fetch(
            "/api/logs/clear",
            {
                method:"POST"
            }
        );

        const data =
        await response.json();

        if(data.success){

            document.getElementById(
                "activityLog"
            ).innerHTML = "";

            showToast(
                "🗑 Logs Cleared"
            );

            refreshLogs();

        }

    }
    catch(error){

        console.log(error);

        showToast(
            "❌ Failed To Clear Logs"
        );

    }

}

async function ackAlarm(){

    try{

        const response =
        await fetch(
            "/api/alarm/ack",
            {
                method:"POST"
            }
        );

        const data =
        await response.json();

        if(data.success){

            document.getElementById(
                "buzzerStatus"
            ).innerHTML =
            "OFF";

            showToast(
                "🔕 Alarm Silenced"
            );

            refreshStatus();

        }

    }
    catch(error){

        console.log(error);

    }

}

// =====================================
// ACTIVITY LOGS
// =====================================

async function refreshLogs(){

    try{

        const response =
        await fetch(
            "/api/logs"
        );

        const logs =
        await response.json();

        const container =
        document.getElementById(
            "activityLog"
        );

        if(!container) return;

        container.innerHTML = "";

        logs.forEach(item => {

            container.innerHTML +=
            `
            <div class="timeline-item">

                <div class="timeline-time">
                    ${item.time}
                </div>

                <div>
                    ${item.event}
                </div>

            </div>
            `;

        });

    }
    catch(error){

        console.log(error);

    }

}


// =====================================
// STATUS SYNC
// =====================================

async function refreshStatus(){

    try{

        const response =
        await fetch(
            "/api/status"
        );

        const data =
        await response.json();

        // Show sync indicator
        showSyncBadge();

        // =====================
        // TEMPERATURE
        // =====================

        document.getElementById(
            "temperatureValue"
        ).innerHTML =
        data.temperature + "°C";

        const humidity =
        document.getElementById(
            "humidityValue"
        );

        if(humidity){
            humidity.innerHTML =
            data.humidity + "%";
        }

        // =====================
        // GAS
        // =====================

        const gasStatus =
        document.getElementById(
            "gasStatus"
        );

        gasStatus.innerHTML =
        data.gas_status;

        gasStatus.className =
        data.gas_status === "SAFE"
        ? "status-safe"
        : data.gas_status === "WARNING"
        ? "status-warning"
        : "status-danger";

        const gasSlider =
        document.getElementById(
            "gasSlider"
        );

        if(gasSlider){
            gasSlider.value = data.gas;
            gasSlider.disabled = data.gas_sensor_available;
        }

        // =====================
        // BUZZER
        // =====================

        const buzzer =
        document.getElementById(
            "buzzerStatus"
        );

        buzzer.innerHTML =
        data.buzzer
        ? "🚨 ON"
        : "OFF";

        buzzer.className =
        data.buzzer
        ? "status-danger"
        : "status-safe";

        // =====================
        // LIGHT
        // =====================

        const light =
        document.getElementById(
            "lightStatus"
        );

        light.innerHTML =
        data.light
        ? "ON"
        : "OFF";

        light.className =
        data.light
        ? "device-state on"
        : "device-state off";

        const lightSwitchEl = document.getElementById("lightSwitch");
        lightSwitchEl.checked = data.light;
        // disable light control until RFID accepted
        lightSwitchEl.disabled = !data.rfid_unlocked;

        // =====================
        // FAN
        // =====================

        const fan = document.getElementById("fanStatus");

        fan.innerHTML = data.fan ? "ON" : "OFF";

        fan.className = data.fan ? "device-state on" : "device-state off";

        const fanSwitch = document.getElementById("fanSwitch");

        fanSwitch.checked = data.fan;

        // disable fan control when in auto mode or when RFID not accepted
        fanSwitch.disabled = (data.fan_mode === "auto") || (!data.rfid_unlocked);

        const autoBtn =
        document.getElementById(
            "autoBtn"
        );

        const manualBtn =
        document.getElementById(
            "manualBtn"
        );

        if(data.fan_mode === "auto"){

            autoBtn.classList.add(
                "btn-primary"
            );

            autoBtn.classList.remove(
                "btn-secondary"
            );

            manualBtn.classList.add(
                "btn-secondary"
            );

            manualBtn.classList.remove(
                "btn-primary"
            );

        }
        else{

            manualBtn.classList.add(
                "btn-primary"
            );

            manualBtn.classList.remove(
                "btn-secondary"
            );

            autoBtn.classList.add(
                "btn-secondary"
            );

            autoBtn.classList.remove(
                "btn-primary"
            );

        }

        // =====================
        // DOOR
        // =====================

        const door =
        document.getElementById(
            "doorStatus"
        );

        door.innerHTML =
        data.door
        ? "OPEN"
        : "CLOSED";

        door.className =
        data.door
        ? "device-state on"
        : "device-state off";

        const doorSwitch =
        document.getElementById(
            "doorSwitch"
        );

        doorSwitch.checked =
        data.door;
        doorSwitch.disabled = !data.rfid_unlocked;

        // =====================
        // GATE
        // =====================

        const gateSwitch = document.getElementById("gateSwitch");
        gateSwitch.disabled = !data.rfid_unlocked;

        const gate =
        document.getElementById(
            "gateStatus"
        );

        gate.innerHTML =
        data.gate
        ? "OPEN"
        : "CLOSED";

        gate.className =
        data.gate
        ? "device-state on"
        : "device-state off";

        document.getElementById(
            "gateSwitch"
        ).checked =
        data.gate;

        // =====================
        // CAMERA
        // =====================

        const camera =
        document.getElementById(
            "cameraStatus"
        );

        const video =
        document.getElementById(
            "cameraFeed"
        );

        const shareInfo =
        document.getElementById(
            "cameraShareInfo"
        );

        camera.innerHTML =
        data.camera
        ? "ON"
        : "OFF";

        camera.className =
        data.camera
        ? "device-state on"
        : "device-state off";

        const cameraSwitch =
        document.getElementById(
            "cameraSwitch"
        );

        cameraSwitch.checked =
        data.camera;

        if(data.camera){

            video.src =
            "/api/video_feed";

            video.style.display =
            "block";

            if(shareInfo){
                shareInfo.style.display =
                "block";
            }

        }
        else{

            video.src = "";

            video.style.display =
            "none";

            if(shareInfo){
                shareInfo.style.display =
                "none";
            }

        }

    }
    catch(error){

        console.log(error);

    }

}

function showSyncBadge(){
    
    const badge =
    document.getElementById(
        "syncBadge"
    );
    
    if(badge){
        badge.style.opacity = "1";
        
        clearTimeout(
            badge.fadeTimeout
        );
        
        badge.fadeTimeout =
        setTimeout(() => {
            badge.style.opacity = "0.3";
        }, 500);
    }
}


// =====================================
// TEMPERATURE UPDATE
// =====================================

async function refreshTemperature(){

    try{

        await fetch(
            "/api/temperature"
        );

    }
    catch(error){

        console.log(error);

    }

}


// =====================================
// STARTUP
// =====================================

window.onload = function(){

    refreshStatus();

    refreshLogs();

};


// =====================================
// AUTO REFRESH
// =====================================

// Status sync every 2 seconds (real-time across devices)

setInterval(
    refreshStatus,
    2000
);

// Logs every 2 seconds

setInterval(
    refreshLogs,
    2000
);

// Temperature simulation every 3 seconds

setInterval(
    refreshTemperature,
    3000
);
