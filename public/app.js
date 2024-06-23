import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';

let scene, camera, renderer;
let ball, ballVelocity, roomSize = 100;
let positionDisplay, prevPositionDisplay, startStopButton, clearDashboardButton, positionTable, clearAllEntriesButton, saveAllEntriesButton;
let isAnimating = true;
let animationId;
let prevPosition = { x: 0, y: 0, z: 0 };
let positions = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 150;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create ball
    let ballGeometry = new THREE.SphereGeometry(5, 32, 32);
    let ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(ball);

    // Initial ball position and velocity
    ball.position.set(0, 0, 0);
    ballVelocity = new THREE.Vector3(1, 2, 1.5);

    // Create room (simple box)
    let roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
    let roomMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    let room = new THREE.Mesh(roomGeometry, roomMaterial);
    scene.add(room);

    positionDisplay = document.getElementById('position');
    prevPositionDisplay = document.getElementById('prevPosition');
    positionTable = document.getElementById('positionTable');
    startStopButton = document.getElementById('startStopButton');
    clearDashboardButton = document.getElementById('clearDashboardButton');
    clearAllEntriesButton = document.getElementById('clearAllEntriesButton');
    saveAllEntriesButton = document.getElementById('saveAllEntriesButton'); 

    startStopButton.addEventListener('click', toggleAnimation);
    clearDashboardButton.addEventListener('click', clearDashboard);
    clearAllEntriesButton.addEventListener('click', clearAllEntries);
    saveAllEntriesButton.addEventListener('click', saveAllEntries); 

    fetchPositions();
}

function animate() {
    if (isAnimating) {
        animationId = requestAnimationFrame(animate);
    }

    // Update ball position
    ball.position.add(ballVelocity);

    // Check for collisions with room walls and reverse direction if hit
    if (Math.abs(ball.position.x) >= roomSize / 2 - 5) ballVelocity.x = -ballVelocity.x;
    if (Math.abs(ball.position.y) >= roomSize / 2 - 5) ballVelocity.y = -ballVelocity.y;
    if (Math.abs(ball.position.z) >= roomSize / 2 - 5) ballVelocity.z = -ballVelocity.z;

    // Update position display
    positionDisplay.textContent = `x: ${ball.position.x.toFixed(2)}, y: ${ball.position.y.toFixed(2)}, z: ${ball.position.z.toFixed(2)}`;

    renderer.render(scene, camera);
}

function toggleAnimation() {
    if (isAnimating) {
        isAnimating = false;
        cancelAnimationFrame(animationId);

        // Store and display the previous position
        prevPosition = { x: ball.position.x, y: ball.position.y, z: ball.position.z };
        prevPositionDisplay.textContent = `x: ${prevPosition.x.toFixed(2)}, y: ${prevPosition.y.toFixed(2)}, z: ${prevPosition.z.toFixed(2)}`;

        savePosition(prevPosition);
        positions.push(prevPosition); 
        startStopButton.textContent = 'Start';
    } else {
        isAnimating = true;
        animate();
        startStopButton.textContent = 'Stop';
    }
}

function clearDashboard() {
    fetch('/clearDashboard', {
        method: 'DELETE'
    }).then(response => {
        if (response.ok) {
            console.log('Dashboard cleared.');
            fetchPositions(); 
        }
    }).catch(error => {
        console.error('Error clearing dashboard:', error);
    });
}

function clearAllEntries() {
    fetch('/clearAllEntries', {
        method: 'DELETE'
    }).then(response => {
        if (response.ok) {
            console.log('All entries cleared.');
            fetchPositions(); 
        }
    }).catch(error => {
        console.error('Error clearing all entries:', error);
    });
}

function savePosition(position) {
    fetch('/savePosition', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(position)
    }).then(response => response.text())
      .then(data => {
          console.log(data);
          fetchPositions();
      }).catch(error => {
          console.error('Error saving position:', error);
      });
}

function fetchPositions() {
    fetch('/getPositions')
        .then(response => response.json())
        .then(data => {
            positionTable.innerHTML = '';
            data.forEach(pos => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${pos.id}</td>
                    <td>${pos.x.toFixed(2)}</td>
                    <td>${pos.y.toFixed(2)}</td>
                    <td>${pos.z.toFixed(2)}</td>
                    <td>${pos.timestamp}</td>
                    <td><button class="deleteBtn" data-id="${pos.id}">Delete</button></td>
                `;
                positionTable.appendChild(row);
            });

            // Add event listeners to delete buttons
            const deleteButtons = document.querySelectorAll('.deleteBtn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', deleteEntry);
            });
        });
}

function deleteEntry(event) {
    const entryId = event.target.dataset.id;

    fetch('/deleteEntry', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: entryId })
    }).then(response => {
        if (response.ok) {
            console.log('Entry deleted.');
            fetchPositions(); 
        }
    }).catch(error => {
        console.error('Error deleting entry:', error);
    });
}

function saveAllEntries() {
    fetch('/saveAllPositions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ positions })
    }).then(response => response.text())
      .then(data => {
          console.log(data);
          fetchPositions();
      }).catch(error => {
          console.error('Error saving all positions:', error);
      });
}

// WebSocket for real-time location update
const socket = new WebSocket('ws://localhost:3000/location');

socket.addEventListener('open', () => {
    console.log('WebSocket connection established.');
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received location data:', data);
   
});

socket.addEventListener('close', () => {
    console.log('WebSocket connection closed.');
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});
