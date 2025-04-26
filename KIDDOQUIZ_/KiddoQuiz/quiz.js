// quiz.js
const socket = io();  // Initialize Socket.IO client

// Button to start the quiz
const startQuizBtn = document.getElementById('startQuizBtn');
startQuizBtn.addEventListener('click', () => {
    socket.emit('startQuiz');  // Emit the 'startQuiz' event to the server
});

// Listen for quiz data from the server
socket.on('quizStarted', (quizData) => {
    console.log(quizData);  // This will log the quiz data (questions, options, etc.)
    
    // Generate HTML to display quiz questions dynamically
    const questionsContainer = document.getElementById('questions');
    questionsContainer.innerHTML = '';  // Clear previous content

    quizData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.innerHTML = `
            <p>${index + 1}. ${question.question}</p>
            <ul>
                ${question.options.map(option => `<li><input type="radio" name="q${index}" value="${option}">${option}</li>`).join('')}
            </ul>
        `;
        questionsContainer.appendChild(questionElement);
    });
});

// Emit the answer when the player selects one
function submitAnswer(questionIndex, answer) {
    socket.emit('answer', { questionIndex, answer });
}

// Listen for answers from other players
socket.on('answerReceived', (data) => {
    console.log('Answer received:', data);  // You can display this data in real-time for multiplayer
});
