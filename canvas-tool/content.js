// content.js

// simple button test
const testBtn = document.createElement('button');
testBtn.innerText = "Test Gemini Connection";
testBtn.style.position = "fixed";
testBtn.style.bottom = "20px";
testBtn.style.right = "20px";
testBtn.style.zIndex = "9999";
testBtn.style.padding = "10px";
testBtn.style.backgroundColor = "#3b5bdb";
testBtn.style.color = "white";
testBtn.style.border = "none";
testBtn.style.borderRadius = "5px";
testBtn.style.cursor = "pointer";

document.body.appendChild(testBtn);

// Add click listener to send message to background.js 
// update this to happen when you click the generate quizzes button or assignment breakdown
testBtn.addEventListener('click', () => {
  testBtn.innerText = "Connecting...";
  testBtn.disabled = true;

  chrome.runtime.sendMessage({ type: "TEST_GEMINI" }, (response) => {
    if (response && response.success) {
      alert("Success! Gemini says: " + response.message);
    } else {
      const errorMsg = response ? response.error : "Unknown error";
      alert("Connection Failed: " + errorMsg);
    }
    testBtn.innerText = "Test Gemini Connection";
    testBtn.disabled = false;
  });
});