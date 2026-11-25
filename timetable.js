import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let reservations = [];
let activePrinterId =
localStorage.getItem("activePrinterId") || "printer-1";

const timelineStartMinute = 8 * 60;
const timelineEndMinute = 22 * 60;
const timelineHourCount =
(timelineEndMinute - timelineStartMinute) / 60;

const printers = [
    {
        id: "printer-1",
        name: "A1mini 1号機",
        color: "#9225eb"
    },
    {
        id: "printer-2",
        name: "A1mini 2号機",
        color: "#dc2626"
    },
    {
        id: "printer-3",
        name: "A1mini 3号機",
        color: "#ea9308"
    }
];

// 初期化処理
async function init(){
    createTimeHeader();
    createWeekView(); 
    setupPrinterSelects();
    await loadReservations();
    setupMobileNavigation();
}

init();

async function loadReservations(){
    reservations = [];

    const snapshot =
    await getDocs(
        collection(
            db,
            "reservations"
        )
    );
    reservations = [];

    snapshot.forEach(doc=>{
        const reservation = {
            id:doc.id,
            ...doc.data()
        };

        reservations.push(
            reservation
        );

        if(
            getReservationPrinterId(reservation) ===
            activePrinterId
        ){
            addReservation(reservation);
        }
    });
}

function setupPrinterSelects(){
    const printerSelect =
    document.getElementById("printerSelect");

    const reservationPrinter =
    document.getElementById("reservationPrinter");

    printerSelect.value =
    activePrinterId;

    reservationPrinter.value =
    activePrinterId;

    printerSelect.addEventListener("change",()=>{
        activePrinterId =
        printerSelect.value;

        localStorage.setItem(
            "activePrinterId",
            activePrinterId
        );

        reservationPrinter.value =
        activePrinterId;

        renderReservations();
    });
}

function getReservationPrinterId(reservation){
    return reservation.printerId || "printer-1";
}

function getPrinterName(printerId){
    const printer =
    printers.find(item => item.id === printerId);

    return printer ? printer.name : printers[0].name;
}

function getPrinterColor(printerId){
    const printer =
    printers.find(item => item.id === printerId);

    return printer ? printer.color : "#2563eb";
}

function renderReservations(){
    document
    .querySelectorAll(".reservation-bar")
    .forEach(bar => bar.remove());

    reservations
    .filter(reservation => (
        getReservationPrinterId(reservation) ===
        activePrinterId
    ))
    .forEach(addReservation);
}

function createTimeHeader(){
    const header =
    document.getElementById("time-header");

    for(let h=timelineStartMinute / 60; h<timelineEndMinute / 60; h++){
        const div =
        document.createElement("div");

        div.className = "hour";
        div.textContent = `${h}:00`;

        header.appendChild(div);
    }
}

function createWeekView(){
    const body =
    document.getElementById("timeline-body");

    const weekdays =
    ["日","月","火","水","木","金","土"];

    const today =
    new Date();

   for(let i=0;i<14;i++){
        const date =
        new Date(today);

        date.setDate(
            today.getDate()+i
        );

        const row =
        document.createElement("div");

        row.className =
        "day-row";

        row.dataset.date =
        formatDateKey(date);

        let cells = "";

        for(let j=0;j<timelineHourCount;j++){
            cells +=
            '<div class="hour-cell"></div>';
        }

        row.innerHTML = `
            <div class="day-label">
                ${date.getMonth()+1}/${date.getDate()}
                (${weekdays[date.getDay()]})
            </div>

            <div class="day-grid">
                ${cells}
            </div>
        `;

        body.appendChild(row);
    }           
}

const modal =
document.getElementById("modal");

document
.getElementById("reserveBtn")
.addEventListener("click",()=>{
    document.getElementById("reservationPrinter").value = activePrinterId;

    const savedName = localStorage.getItem("lastReserveName") || "";
    const nameInput = document.getElementById("reserveName");
    if(nameInput && !nameInput.value){
        nameInput.value = savedName;
    }

    modal.classList.remove("hidden");
});

document
.getElementById("closeReservationModal")
.addEventListener("click",()=>{
    modal.classList.add("hidden");
});

let selectedReservation = null;

document
.getElementById("saveReservation")
.addEventListener("click",async()=>{
    const name = document.getElementById("reserveName").value.trim();
    const date = document.getElementById("reserveDate").value;
    const startTime = document.getElementById("startTime").value;
    const duration = document.getElementById("duration").value;
    const printerId = document.getElementById("reservationPrinter").value;
    const purpose = document.getElementById("purpose").value.trim();
    const message = document.getElementById("message").value.trim();
    const color = getPrinterColor(printerId);

    if(!name){
        alert("お名前を入力してください");
        return;
    }

    if(
        !date ||
        !startTime ||
        !duration ||
        durationToMinutes(duration) <= 0
    ){
        alert(
            "日付、開始時間、利用時間を入力してください"
        );
        return;
    }

    const reservation = {
        id: crypto.randomUUID(),
        name: name,
        date: date,
        startTime: startTime,
        duration: duration,
        printerId: printerId,
        purpose: purpose,
        message: message,
        color: color
    };

    const isOverlap =
    reservations.some(existing => {
        if(
            getReservationPrinterId(existing) !==
            reservation.printerId
        ){
            return false;
        }

        return rangesOverlap(
            existing,
            reservation
        );
    });

    if(isOverlap){
        alert(
            "この3Dプリンターは、この時間帯に既に予約されています"
        );
        return;
    }

    try {
        await setDoc(doc(db, "reservations", reservation.id), reservation);

        localStorage.setItem("lastReserveName", name);

        activePrinterId = reservation.printerId;
        localStorage.setItem(
            "activePrinterId",
            activePrinterId
        );

        document.getElementById("printerSelect").value = activePrinterId;

        reservations.push(reservation);
        renderReservations();

        // フォームのリセット
        document.getElementById("reserveDate").value = "";
        document.getElementById("startTime").value = "";
        document.getElementById("duration").value = "01:00";
        document.getElementById("reservationPrinter").value = activePrinterId;
        document.getElementById("purpose").value = "";
        document.getElementById("message").value = "";

        modal.classList.add("hidden");
        location.reload(); 
    } catch (error) {
        console.error("予約の保存に失敗しました:", error);
        alert("予約の保存に失敗しました。時間をおいてやり直してください。");
    }
});

function timeToMinutes(time){
    const [hour, minute] =
    time.split(":").map(Number);

    return hour * 60 + minute;
}

function durationToMinutes(duration){
    const [
        durationHour,
        durationMinute
    ] =
    duration
    .split(":")
    .map(Number);

    return durationHour * 60 + durationMinute;
}

function parseDateKey(dateKey){
    const [year, month, day] =
    dateKey
    .split("-")
    .map(Number);

    return new Date(
        year,
        month - 1,
        day
    );
}

function formatDateKey(date){
    const year =
    date.getFullYear();

    const month =
    String(date.getMonth() + 1)
    .padStart(2, "0");

    const day =
    String(date.getDate())
    .padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function addDays(date, days){
    const result =
    new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
}

function getReservationRange(reservation){
    const startDate =
    parseDateKey(reservation.date);

    const start =
    startDate.getTime() +
    timeToMinutes(reservation.startTime) * 60 * 1000;

    const end =
    start +
    durationToMinutes(reservation.duration) * 60 * 1000;

    return {
        start,
        end
    };
}

function rangesOverlap(reservationA, reservationB){
    const rangeA =
    getReservationRange(reservationA);

    const rangeB =
    getReservationRange(reservationB);

    return (
        rangeA.start < rangeB.end &&
        rangeA.end > rangeB.start
    );
}

function getVisibleReservationSegments(reservation){
    const range =
    getReservationRange(reservation);

    const startDate =
    parseDateKey(reservation.date);

    const endDate =
    new Date(range.end - 1);

    const dayCount =
    Math.max(
        1,
        Math.floor(
            (parseDateKey(formatDateKey(endDate)) - startDate) /
            (24 * 60 * 60 * 1000)
        ) + 1
    );

    const segments = [];

    for(let i=0; i<dayCount; i++){
        const date =
        addDays(startDate, i);

        const dayStart =
        date.getTime();

        const visibleStart =
        dayStart + timelineStartMinute * 60 * 1000;

        const visibleEnd =
        dayStart + timelineEndMinute * 60 * 1000;

        const segmentStart =
        Math.max(range.start, visibleStart);

        const segmentEnd =
        Math.min(range.end, visibleEnd);

        if(segmentStart >= segmentEnd){
            continue;
        }

        segments.push({
            date: formatDateKey(date),
            startHour:
            (segmentStart - visibleStart) / (60 * 60 * 1000),
            durationHours:
            (segmentEnd - segmentStart) / (60 * 60 * 1000)
        });
    }

    return segments;
}

function getReservationEndText(reservation){
    const range =
    getReservationRange(reservation);

    const end =
    new Date(range.end);

    const date =
    formatDateKey(end);

    const time =
    `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

    return `${date} ${time}`;
}

function addReservation(reservation){
    if(!reservation.date){
        return;
    }   

    getVisibleReservationSegments(reservation)
    .forEach(segment=>{
        const row =
        document.querySelector(
            `[data-date="${segment.date}"]`
        );

        if(!row){
            return;
        }

        const grid =
        row.querySelector(".day-grid");

        const bar =
        document.createElement("div");

        const printerId = getReservationPrinterId(reservation);
        const barColor = getPrinterColor(printerId);

        bar.className =
        "reservation-bar";
        bar.style.background =
        barColor;
        if (printerId === "printer-3") {
            bar.style.color = "#1f2937";
        } else {
            bar.style.color = "#ffffff";
        }

        bar.style.left =
        `calc(${segment.startHour} * (100% / ${timelineHourCount}))`;

        bar.style.width =
        `calc(${segment.durationHours} * (100% / ${timelineHourCount}))`;
        bar.style.setProperty(
            "--js-left-percent",
            segment.startHour * (100 / timelineHourCount)
        );
        bar.style.setProperty(
            "--js-width-percent",
            segment.durationHours * (100 / timelineHourCount)
        );
        const nameDisplay = reservation.emoji ? `${reservation.emoji} ${reservation.name}` : (reservation.name || "");
        bar.textContent = nameDisplay;

        bar.addEventListener("click",()=>{
            showReservationDetail(
                reservation
            );
        });

        grid.appendChild(bar);
    });
}

function showReservationDetail(reservation){
    selectedReservation = reservation;

    const content =
    document.getElementById(
        "detailContent"
    );

    const nameDisplay = reservation.emoji ? `${reservation.emoji} ${reservation.name}` : (reservation.name || "未登録");

    content.innerHTML = `
        <p>
            <strong>${nameDisplay}</strong>
        </p>

        <p>
            3Dプリンター：
            ${getPrinterName(getReservationPrinterId(reservation))}
        </p>

        <p>
            日付：
            ${reservation.date}
        </p>

        <p>
            開始時間：
            ${reservation.startTime}
        </p>

        <p>
            終了日時：
            ${getReservationEndText(reservation)}
        </p>

        <p>
            利用時間：
            ${reservation.duration}
        </p>

        <p>
            利用目的：
            ${reservation.purpose || "未入力"}
        </p>

        <p>
            ばんぶーに一言：
            ${reservation.message || "なし"}
        </p>
    `;

    document
    .getElementById("detailModal")
    .classList.remove("hidden");

    const deleteButton =
    document.getElementById(
        "deleteReservation"
    );

    deleteButton.style.display = "block";
}

document
.getElementById("closeDetail")
.addEventListener("click",()=>{
    document
    .getElementById("detailModal")
    .classList.add("hidden");
});

document
.getElementById("deleteReservation")
.addEventListener("click",async()=>{
    if(!selectedReservation){
        return;
    }

    const confirmDelete =
    confirm(
        `「${selectedReservation.name}」さんの予約をキャンセルしますか？`
    );

    if(!confirmDelete){
        return;
    }
    try {
        await deleteDoc(doc(db, "reservations", selectedReservation.id));

        reservations = reservations.filter(
            reservation => reservation.id !== selectedReservation.id
        );

        document.getElementById("detailModal").classList.add("hidden");
        location.reload();
    } catch (error) {
        console.error("予約の削除に失敗しました:", error);
        alert("予約のキャンセルに失敗しました。");
    }
});

// スマホで2日分ずつ表示するための関数
function setupMobileNavigation() {
    if (document.getElementById("prevDateBtn")) return;

    const timeline = document.querySelector(".timeline");
    if (!timeline) return;
    
    const navDiv = document.createElement("div");
    navDiv.className = "date-navigation";
    navDiv.innerHTML = `
        <button id="prevDateBtn">◀ 前</button>
        <span id="mobileDateLabel">読み込み中...</span>
        <button id="nextDateBtn">次 ▶</button>
    `;
    timeline.parentNode.insertBefore(navDiv, timeline);

    let currentIndex = 0; 
    
    function updateVisibility() {
        const rows = document.querySelectorAll(".day-row");
        if (rows.length === 0) return;

        const isMobile = window.innerWidth <= 768;

        rows.forEach((row, index) => {
            if (isMobile) {
                if (index === currentIndex || index === currentIndex + 1) {
                    row.style.setProperty("display", "block", "important");
                    row.classList.add("mobile-visible");
                } else {
                    row.style.setProperty("display", "none", "important");
                    row.classList.remove("mobile-visible");
                }
            } else {
                row.style.display = "";
                row.classList.remove("mobile-visible");
            }
        });

        if (isMobile) {
            const formatLabel = (row) => {
                if (!row) return "";
                return row.querySelector(".day-label").textContent.trim().replace(/\s+/g, ' ');
            };
            
            let date1 = formatLabel(rows[currentIndex]);
            let date2 = formatLabel(rows[currentIndex + 1]);
            
            document.getElementById("mobileDateLabel").textContent = `${date1} 〜 ${date2}`;
        }
    }

    document.getElementById("prevDateBtn").addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateVisibility();
        }
    });

    document.getElementById("nextDateBtn").addEventListener("click", () => {
        const rows = document.querySelectorAll(".day-row");
        if (currentIndex < rows.length - 2) {
            currentIndex++;
            updateVisibility();
        }
    });

    window.addEventListener("resize", updateVisibility);
    updateVisibility();
}
