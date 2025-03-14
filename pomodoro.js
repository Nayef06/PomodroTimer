let timer;
let isRunning = false;
let minutes = 25;
let seconds = 0;
let isBreak = false; 
let alarm = document.getElementById("Alarm");
alarm.volume = 0.5;

const timeDisplay = document.getElementById('time');
const startButton = document.getElementById('start');
const resetButton = document.getElementById('reset');


function updateDisplay() {
    let formattedSeconds = seconds < 10 ? "0" + seconds : seconds;
    let formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    timeDisplay.innerText = `${formattedMinutes}:${formattedSeconds}`;
}

function startStopTimer() {
    if (isRunning) {
        clearInterval(timer); // Stop the timer
        startButton.innerText = "▶ Start"; 
    } else {
        timer = setInterval(function () {
            if (seconds === 0) {
                if (minutes === 0) {
                    if (isBreak) {
                        // If break, reset to 25 min
                        minutes = 25;
                        isBreak = false;
                        alarm.play();
                    } else {
                        // If Pomodoro, break
                        minutes = 5;
                        isBreak = true;
                        alarm.play();
                    }
                } else {
                    minutes--;
                    seconds = 59;
                }
            } else {
                seconds--;
            }
            updateDisplay();
        }, 1);   //change to make timer go faster/slower
        startButton.innerText = "❚❚ Pause";
    }
    isRunning = !isRunning; // Toggle running state
}

function resetTimer() {
    clearInterval(timer);
    minutes = 25;
    seconds = 0;
    isBreak = false;
    updateDisplay();
    startButton.innerText = "▶ Start";
    isRunning = false;
}

startButton.addEventListener('click', startStopTimer);
resetButton.addEventListener('click', resetTimer);

updateDisplay();



/* Dark Light Mode */
const themeButton = document.getElementById('theme');
const body = document.body;

function toggleTheme() {
    body.classList.toggle('light-mode');

}

themeButton.addEventListener('click', toggleTheme);
